import { isValidObjectId } from 'mongoose'
import Session from '../models/session.js'
import SessionParticipant from '../models/sessionParticipant.js'

export const isSession = async (req, res, next) => {
    const { params } = req

    if (!isValidObjectId(params.sessionId)) {
        res.status(400).send('Invalid ObjectId for Session')
        return
    }

    const session = await Session.findById(params.sessionId)

    if (!session) {
        res.status(404).send('Session does not exist')
        return
    }

    req.session = session

    next()
}

export const isSessionParticipant = async (req, res, next) => {
    const membership = await SessionParticipant.findOne({ session: req.params.sessionId, user: req.user._id })

    if (!membership) {
        res.status(403).send('User is not a participant of session')
        return
    }

    if (membership.status != 'accepted') {
        res.status(403).send('User is not a participant of session')
        return
    }

    next()
}

export const isSessionHost = async (req, res, next) => {
    if (!req.session.host.equals(req.user._id)) {
        res.status(403).send('User is not host of session')
        return
    }

    next()
}
