import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod

export async function setup() {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URL = mongod.getUri()
    process.env.JSON_WEB_TOKEN_SECRET = 'test-secret'
}

export async function teardown() {
    await mongod.stop()
}
