import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import Session from '../models/session.js'

const router = new Router()

// Create Session
router.post('/session', auth, async (req, res) => {
    try {
        const data = req.body
        data.attendees = [{
            username: req.user.username,
            userId: req.user._id
        }]
        const session = new Session(data)

        await session.save()
        res.status(201).send(session)
    } catch (error) {
        console.log(error)
        if (error.name == 'ValidationError') {
            for (let field in error.errors) {
                if (error.errors[field].name === 'CastError') {
                    delete error.errors[field].reason
                    delete error.errors[field].stringValue
                    delete error.errors[field].valueType
                }
                if (error.errors[field].name === 'ValidatorError') {
                    delete error.errors[field].properties
                }
            }

            return res.status(400).send({ name: error.name, errors: error.errors })
        }

        if (error.code === 11000) {
            return res.status(409).send('Duplicate Account')
        }

        res.status(500).send({ name: error.name, message: error.message })
    }
})


//Get Sessions
router.get('/sessions', auth, async (req, res) => {
    let filter = {}

    if (req.query.date) {
        filter = {
            $and: [
                { 'attendees.userId': req.user._id },
                { 'date': { $gte: req.query.date, $lt: req.query.date } }
            ]
        }
    } else {
        filter = { 'attendees.userId': req.user._id }
    }

    const sessions = await Session.find(filter)
    res.status(200).send(sessions)
})



export default router
