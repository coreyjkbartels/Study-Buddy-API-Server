import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('POST /users', () => {
    it('creates a user and returns token', async () => {
        const res = await request(app)
            .post('/users')
            .send({ username: 'alice', email: 'alice@example.com', password: 'Password1!' })

        expect(res.status).toBe(201)
        expect(res.body.token).toBeDefined()
        expect(res.body.user.email).toBe('alice@example.com')
    })

    it('rejects duplicate email with 409', async () => {
        const body = { username: 'bob', email: 'bob@example.com', password: 'Password1!' }
        await request(app).post('/users').send(body)
        const res = await request(app).post('/users').send(body)

        expect(res.status).toBe(409)
    })

    it('rejects missing required fields with 400', async () => {
        const res = await request(app)
            .post('/users')
            .send({ username: 'nopass' })

        expect(res.status).toBe(400)
    })
})
