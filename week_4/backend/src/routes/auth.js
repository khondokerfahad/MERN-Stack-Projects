import bcrypt from 'bcryptjs'
import { Router } from 'express'
import User from '../models/User.js'

const router = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
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

router.post('/register', async (request, response) => {
  const body = request.body ?? {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (name.length < 2 || name.length > 60) {
    response.status(400).json({ message: 'Name must be between 2 and 60 characters.' })
    return
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    response.status(400).json({ message: 'Enter a valid email address.' })
    return
  }

  if (password.length < 8 || password.length > 128) {
    response.status(400).json({ message: 'Password must be between 8 and 128 characters.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await User.create({ name, email, passwordHash })
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

router.post('/login', async (request, response) => {
  const body = request.body ?? {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

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
