import Router from 'express'
import auth from '../middleware/auth.js'
import Availability from '../models/availability.js'

const router = new Router()

//Get Availability
router.get('/availability/me', auth, async (req, res) => {
    const { user } = req

    try {
        const availability = await Availability.findOne({ user: user._id })

        if (!availability) {
            res.status(404).send('User has not set availability yet')
            return
        }

        res.status(200).send(availability)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }

})

//Replace Availability
router.put('/availability/me', auth, async (req, res) => {
    const { user, body } = req
    const { timezone, blocks } = body

    try {
        const availability = await Availability.updateOne(
            { user: user._id },
            { $set: { timezone, blocks } },
            { upsert: true }
        )

        res.status(201).send(availability)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }

})

export default router