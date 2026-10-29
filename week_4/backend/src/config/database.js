import mongoose from 'mongoose'

async function connectDatabase() {
  const { MONGODB_URI } = process.env
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env.')
  }

  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB.')
}

export default connectDatabase
