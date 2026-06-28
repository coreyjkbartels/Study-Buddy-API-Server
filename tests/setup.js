import mongoose, { Schema } from 'mongoose'
import { beforeAll, afterAll, beforeEach } from 'vitest'

Schema.Types.String.set('validate', {
    validator: (value) => value == null || value.length > 0,
    message: 'String must be null or non-empty.'
})
Schema.Types.String.set('trim', true)

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URL)
})

afterAll(async () => {
    await mongoose.disconnect()
})

beforeEach(async () => {
    const collections = mongoose.connection.collections
    for (const key in collections) {
        await collections[key].deleteMany({})
    }
})
