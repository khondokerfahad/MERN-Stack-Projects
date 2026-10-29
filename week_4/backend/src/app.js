import cors from 'cors'
import express from 'express'
import MongoStore from 'connect-mongo'
import session from 'express-session'
import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'

const app = express()
const sessionSecret = process.env.SESSION_SECRET
const sessionCookieMaxAge = 7 * 24 * 60 * 60 * 1000

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters.')
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(session({
  name: 'shopease.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: sessionCookieMaxAge / 1000,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionCookieMaxAge,
  },
}))
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)

export default app
