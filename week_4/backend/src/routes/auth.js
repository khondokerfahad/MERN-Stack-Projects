import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { Router } from 'express'
import User from '../models/User.js'

const router = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/
const phonePattern = /^[+()\d\s-]{7,20}$/
const otpLifetimeMs = 3 * 60 * 1000
const otpResendDelayMs = 60 * 1000
const maxOtpAttempts = 5

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    phoneVerified: Boolean(user.phoneVerified),
    shippingAddress: user.shippingAddress ?? '',
    profileComplete: Boolean(user.phoneVerified && user.shippingAddress),
  }
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function validSignup(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  if (name.length < 2 || name.length > 60) {
    return { error: 'Name must be between 2 and 60 characters.' }
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: 'Enter a valid email address.' }
  }
  if (!strongPasswordPattern.test(password)) {
    return { error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  return { name, email, password }
}

router.post('/register', async (request, response) => {
  const signup = validSignup(request.body ?? {})
  if (signup.error) {
    response.status(400).json({ message: signup.error })
    return
  }

  try {
    const user = await User.create({
      name: signup.name,
      email: signup.email,
      passwordHash: await bcrypt.hash(signup.password, 12),
    })
    await regenerateSession(request)
    request.session.userId = user._id.toString()
    response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: 'An account with this email already exists.' })
      return
    }

    throw error
  }
})

router.post('/phone/send-code', async (request, response) => {
  if (!request.session.userId) {
    response.status(401).json({ message: 'Sign in before verifying a phone number.' })
    return
  }
  if (process.env.NODE_ENV === 'production') {
    response.status(503).json({ message: 'Phone verification SMS is not configured for this deployment.' })
    return
  }

  const phone = typeof request.body?.phone === 'string' ? request.body.phone.trim() : ''
  const phoneDigitCount = (phone.match(/\d/g) ?? []).length
  if (!phonePattern.test(phone) || phoneDigitCount < 7) {
    response.status(400).json({ message: 'Enter a valid phone number.' })
    return
  }

  const user = await User.findById(request.session.userId).select('+phoneOtpSentAt')
  if (!user) {
    response.status(401).json({ message: 'Your account could not be found. Please sign in again.' })
    return
  }
  if (user.phoneVerified) {
    response.status(409).json({ message: 'This phone number is already verified.' })
    return
  }

  const now = new Date()
  if (user.phoneOtpSentAt && now.getTime() - user.phoneOtpSentAt.getTime() < otpResendDelayMs) {
    response.status(429).json({ message: 'Wait one minute before requesting another code.' })
    return
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  user.phone = phone
  user.phoneVerified = false
  user.phoneOtpHash = await bcrypt.hash(code, 10)
  user.phoneOtpExpiresAt = new Date(now.getTime() + otpLifetimeMs)
  user.phoneOtpSentAt = now
  user.phoneOtpAttempts = 0
  await user.save()

  response.json({
    message: 'Enter the development verification code shown below.',
    expiresInSeconds: otpLifetimeMs / 1000,
    developmentCode: code,
  })
})

router.post('/phone/verify-code', async (request, response) => {
  if (!request.session.userId) {
    response.status(401).json({ message: 'Sign in before verifying a phone number.' })
    return
  }

  const code = typeof request.body?.code === 'string' ? request.body.code.trim() : ''
  if (!/^\d{6}$/.test(code)) {
    response.status(400).json({ message: 'Enter the 6-digit verification code.' })
    return
  }

  const user = await User.findById(request.session.userId)
    .select('+phoneOtpHash +phoneOtpExpiresAt +phoneOtpAttempts')
  if (!user) {
    response.status(401).json({ message: 'Your account could not be found. Please sign in again.' })
    return
  }
  if (!user.phoneOtpHash || !user.phoneOtpExpiresAt || user.phoneOtpExpiresAt.getTime() <= Date.now()) {
    response.status(410).json({ message: 'This verification code has expired. Request a new one.' })
    return
  }
  if (user.phoneOtpAttempts >= maxOtpAttempts) {
    response.status(429).json({ message: 'Too many incorrect codes. Request a new one.' })
    return
  }
  if (!(await bcrypt.compare(code, user.phoneOtpHash))) {
    user.phoneOtpAttempts += 1
    await user.save()
    response.status(user.phoneOtpAttempts >= maxOtpAttempts ? 429 : 400).json({
      message: user.phoneOtpAttempts >= maxOtpAttempts
        ? 'Too many incorrect codes. Request a new one.'
        : 'The verification code is incorrect.',
    })
    return
  }

  user.phoneVerified = true
  user.phoneOtpHash = undefined
  user.phoneOtpExpiresAt = undefined
  user.phoneOtpSentAt = undefined
  user.phoneOtpAttempts = 0
  await user.save()
  response.json({ user: publicUser(user) })
})

router.post('/login', async (request, response) => {
  const email = normalizeEmail(request.body?.email)
  const password = typeof request.body?.password === 'string' ? request.body.password : ''

  if (!emailPattern.test(email) || password.length === 0 || password.length > 128) {
    response.status(400).json({ message: 'Enter a valid email address and password.' })
    return
  }

  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ message: 'Email or password is incorrect.' })
    return
  }

  await regenerateSession(request)
  request.session.userId = user._id.toString()
  response.json({ user: publicUser(user) })
})

router.patch('/profile', async (request, response) => {
  if (!request.session.userId) {
    response.status(401).json({ message: 'Sign in to complete your profile.' })
    return
  }

  const shippingAddress = typeof request.body?.shippingAddress === 'string'
    ? request.body.shippingAddress.trim()
    : ''
  if (shippingAddress.length < 10 || shippingAddress.length > 300) {
    response.status(400).json({ message: 'Shipping address must be between 10 and 300 characters.' })
    return
  }

  const user = await User.findById(request.session.userId)
  if (!user) {
    response.status(401).json({ message: 'Your account could not be found. Please sign in again.' })
    return
  }
  if (!user.phoneVerified) {
    response.status(403).json({ message: 'Verify your phone number before completing your profile.' })
    return
  }

  user.shippingAddress = shippingAddress
  await user.save()
  response.json({ user: publicUser(user) })
})

router.get('/me', async (request, response) => {
  if (!request.session.userId) {
    response.status(401).json({ message: 'Sign in to continue.' })
    return
  }

  const user = await User.findById(request.session.userId)
  if (!user) {
    request.session.userId = undefined
    response.status(401).json({ message: 'Sign in to continue.' })
    return
  }

  response.json({ user: publicUser(user) })
})

router.post('/logout', async (request, response) => {
  if (!request.session) {
    response.clearCookie('shopease.sid')
    response.status(204).end()
    return
  }

  await new Promise((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

  response.clearCookie('shopease.sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  response.status(204).end()
})

export default router
