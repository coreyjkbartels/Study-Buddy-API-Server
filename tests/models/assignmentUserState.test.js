import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import AssignmentUserState from '../../src/models/assignmentUserState.js'

const newId = () => new mongoose.Types.ObjectId()

const baseDoc = () => ({
    assignment: newId(),
    course: newId(),
    user: newId()
})

describe('AssignmentUserState model', () => {
    describe('schema validation', () => {
        it('saves a valid state doc', async () => {
            const doc = await new AssignmentUserState(baseDoc()).save()
            expect(doc._id).toBeDefined()
        })

        it('defaults state to not_started', async () => {
            const doc = await new AssignmentUserState(baseDoc()).save()
            expect(doc.state).toBe('not_started')
        })

        it('requires assignment', async () => {
            const { assignment, ...rest } = baseDoc()
            await expect(new AssignmentUserState(rest).save()).rejects.toThrow()
        })

        it('requires course', async () => {
            const { course, ...rest } = baseDoc()
            await expect(new AssignmentUserState(rest).save()).rejects.toThrow()
        })

        it('requires user', async () => {
            const { user, ...rest } = baseDoc()
            await expect(new AssignmentUserState(rest).save()).rejects.toThrow()
        })

        it('rejects a state outside the enum', async () => {
            await expect(
                new AssignmentUserState({ ...baseDoc(), state: 'nonsense' }).save()
            ).rejects.toThrow()
        })

        it('accepts each valid state enum value', async () => {
            for (const state of ['not_started', 'in_progress', 'complete']) {
                const doc = await new AssignmentUserState({ ...baseDoc(), state }).save()
                expect(doc.state).toBe(state)
            }
        })
    })

    describe('findOrCreate', () => {
        it('creates a new doc with the given fields and default state when none exists', async () => {
            const assignment = newId()
            const user = newId()
            const course = newId()
            const dueAt = new Date('2030-01-01T00:00:00.000Z')

            const doc = await AssignmentUserState.findOrCreate(assignment, user, course, dueAt)

            expect(doc._id).toBeDefined()
            expect(doc.assignment.equals(assignment)).toBe(true)
            expect(doc.user.equals(user)).toBe(true)
            expect(doc.course.equals(course)).toBe(true)
            expect(doc.personalDueAt.toISOString()).toBe(dueAt.toISOString())
            expect(doc.state).toBe('not_started')

            const count = await AssignmentUserState.countDocuments({ assignment, user })
            expect(count).toBe(1)
        })

        it('returns the existing doc without creating a duplicate on repeat calls', async () => {
            const assignment = newId()
            const user = newId()
            const course = newId()
            const dueAt = new Date('2030-01-01T00:00:00.000Z')

            const first = await AssignmentUserState.findOrCreate(assignment, user, course, dueAt)
            const second = await AssignmentUserState.findOrCreate(assignment, user, course, dueAt)

            expect(second._id.equals(first._id)).toBe(true)

            const count = await AssignmentUserState.countDocuments({ assignment, user })
            expect(count).toBe(1)
        })

        it('produces exactly one doc under concurrent first-access calls for the same pair', async () => {
            const assignment = newId()
            const user = newId()
            const course = newId()
            const dueAt = new Date('2030-01-01T00:00:00.000Z')

            const results = await Promise.all(
                Array.from({ length: 5 }, () =>
                    AssignmentUserState.findOrCreate(assignment, user, course, dueAt))
            )

            const count = await AssignmentUserState.countDocuments({ assignment, user })
            expect(count).toBe(1)

            const uniqueIds = new Set(results.map((doc) => doc._id.toString()))
            expect(uniqueIds.size).toBe(1)
        })

        it('keeps distinct docs for different users on the same assignment', async () => {
            const assignment = newId()
            const course = newId()
            const dueAt = new Date('2030-01-01T00:00:00.000Z')

            const a = await AssignmentUserState.findOrCreate(assignment, newId(), course, dueAt)
            const b = await AssignmentUserState.findOrCreate(assignment, newId(), course, dueAt)

            expect(a._id.equals(b._id)).toBe(false)
            expect(await AssignmentUserState.countDocuments({ assignment })).toBe(2)
        })
    })
})
