import Router from 'express'
import auth from '../middleware/auth.js'
import Session from '../models/session.js'
import { isCourse, isMember } from '../middleware/courseAuthentication.js'
import { sendValidationError } from '../assets/error.js'

const router = new Router()

// Create Session
router.post('/course/:courseId/sessions', auth, isCourse, isMember, async (req, res) => {
    try {
        const { body: data, course, user } = req

        data.course = course._id
        data.host = user._id
        data.timezone = user.timezone

        const session = new Session(data)
        await session.save()
        res.status(201).send(session)
    } catch (error) {
        console.log(error)
        if (error.name == 'ValidationError') {
            sendValidationError(res, error)
            return
        }

        if (error.code === 11000) {
            return res.status(409).send('Duplicate Account')
        }

        res.status(500).send({ name: error.name, message: error.message })
    }
})


//Get Sessions
router.get('/courses/:courseId/sessions', auth, async (req, res) => {
    const { user, query } = req
    let filter = {}

    if (query?.mine) {
        filter.host = user._id
    }

    if (query?.status) {
        filter.status = query.status
    }

    const startsAt = {}
    if (query?.from) {
        startsAt.$gte = query.from
    }
    if (query?.to) {
        startsAt.$lte = query.to
    }

    if (Object.keys(startsAt).length > 0) {
        filter.startsAt = startsAt
    }

    const sessions = await Session.find(filter)
    res.status(200).send(sessions)
})



export default router
