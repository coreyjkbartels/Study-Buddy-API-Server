import Router from 'express'
import auth from '../middleware/auth.js'
import Session from '../models/session.js'
import { isCourse, isCourseMember } from '../middleware/courseAccess.js'
import { sendValidationError } from '../assets/error.js'
import { isSession, isSessionHost, isSessionParticipant } from '../middleware/sessionAccess.js'
import SessionParticipant from '../models/sessionParticipant.js'
import { isValidObjectId } from 'mongoose'

const router = new Router()

//Create Session
router.post('/courses/:courseId/sessions', auth, isCourse, isCourseMember, async (req, res) => {
    try {
        const { body: data, course, user } = req

        data.course = course._id
        data.host = user._id
        data.timezone = user.timezone

        const session = new Session(data)
        await session.save()

        await SessionParticipant.create({
            session: session._id,
            user: user._id,
            status: 'accepted',
            respondedAt: new Date()
        })

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
router.get('/courses/:courseId/sessions', auth, isCourse, isCourseMember, async (req, res) => {
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

//Get Session
router.get('/courses/:courseId/sessions/:sessionId', auth, isCourse, isCourseMember, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId)

        res.status(200).send(session)
    } catch (error) {
        console.log(error)
    }
})

//Edit Session
router.patch('/courses/:courseId/sessions/:sessionId',
    auth, isCourse, isCourseMember, isSession, isSessionHost,
    async (req, res) => {
        const { body: mods, session } = req

        if (mods.length === 0) {
            res.status(400).send({ Error: 'Missing updates' })
        }

        const props = Object.keys(mods)
        const modifiable = ['title', 'goal', 'description', 'startsAt', 'endsAt', 'location', 'locationType', 'capacity', 'joinPolicy', 'status']

        const isValid = props.every((prop) => modifiable.includes(prop))

        if (!isValid) {
            return res.status(400).send({ error: 'Invalid updates.' })
        }

        try {
            props.forEach((prop) => session[prop] = mods[prop])
            await session.save()

            res.status(200).send(session)
        } catch (error) {
            console.log(error)

            if (error.name == 'ValidationError') {
                sendValidationError(res, error)
                return
            }
            res.status(500).send('🤷‍♂️')
        }
    }
)

//Cancel Session
router.delete('/courses/:courseId/sessions/:sessionId',
    auth, isCourse, isCourseMember, isSession, isSessionHost,
    async (req, res) => {
        try {
            const { session } = req

            session.status = 'cancelled'
            await session.save()

            res.status(200).send('Session Cancelled Successfully')
        } catch (error) {
            console.log(error)
            res.status(500).send('🤷‍♂️')
        }
    }
)

//Get Session Participants
router.get('/courses/:courseId/sessions/:sessionId/participants',
    auth, isCourse, isCourseMember, isSession, isSessionParticipant,
    async (req, res) => {
        try {
            const { session, query } = req

            const filter = {
                session: session._id
            }

            if (query?.status) {
                filter.status = query.status
            }

            const participants = await SessionParticipant.find(filter, { status: 0, session: 0 })
                .populate('user', 'username')

            res.status(200).send(participants)
        } catch (err) {
            res.status(500).json(err)
        }
    }
)

//Invite Users
router.post('/courses/:courseId/sessions/:sessionId/invites',
    auth, isCourse, isCourseMember, isSession, isSessionParticipant,
    async (req, res) => {
        try {
            const { session, body: invitees, user } = req

            const failedUserIds = []

            const data = invitees.filter((i) => isValidObjectId(i))
                .map((i) => {
                    return {
                        session: session._id,
                        user: i,
                        invitedBy: user._id,
                        status: 'invited'
                    }
                })

            let documents = await SessionParticipant.create(data, { aggregateErrors: true })
            documents = documents.map((i) => {
                if (i.session) return i

                return {
                    code: i.code,
                    msg: i.errorResponse.errmsg
                }
            })

            res.status(200).send(documents)
        } catch (err) {
            res.status(500).json(err)
        }
    }
)

//Join Open Session
router.post('/courses/:courseId/sessions/:sessionId/join',
    auth, isCourse, isCourseMember, isSession,
    async (req, res) => {
        const { session, user } = req

        if (session.joinPolicy != 'course_open') {
            res.status(403).send('Not an Open Session')
            return
        }

        const data = {
            session: session._id,
            user: user._id,
            status: 'accepted'
        }

        try {
            let document = await SessionParticipant.create(data)
            res.status(200).send(document)
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).send('User is already a participant')
            }

            res.status(500).json(err)
        }
    }
)

export default router
