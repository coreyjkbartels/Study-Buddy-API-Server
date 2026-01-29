import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import { sendValidationError } from '../assets/error.js'

const router = new Router()

// Create User
router.post('/user', async (req, res) => {
    try {
        const { body: data } = req

        data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const user = new User(data)

        await user.save()
        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
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

//Get User
router.get('/user', auth, async (req, res) => {
    const user = req.user
    res.status(200).send(user)
})

//Get Users
router.get('/users', auth, async (req, res) => {
    const { query } = req

    const filter = {}

    if (query.q) {
        filter.username = { $regex: query.q, $options: 'i' }
    }

    const users = await User.find(filter, { tokens: 0, password: 0, email: 0 })
        .skip(parseInt(query.offset))
        .limit(parseInt(query.limit))

    res.status(200).send(users)
})

//Get User By Id
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(
            { _id: req.params.userId },
            {
                tokens: 0,
                email: 0,
                password: 0
            }
        )

        if (!user) {
            res.status(400).send({ Error: 'Invalid user id' })
            return
        }

        res.status(200).send({ user })
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Sign In
router.post('/user/sign-in', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()

        res.status(200).send({ user, token })
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Sign Out
router.post('/user/sign-out', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(500).send({ Error: 'Internal Server Error' })
    }
})

//Update User
router.patch('/user', auth, async (req, res) => {
    const mods = req.body

    if (mods.length === 0) {
        res.status(400).send({ Error: 'Missing updates' })
    }

    const props = Object.keys(mods)
    const modifiable = ['username', 'password', 'email', 'timezone']

    const isValid = props.every((prop) => modifiable.includes(prop))

    if (!isValid) {
        return res.status(400).send({ error: 'Invalid updates.' })
    }

    try {
        const user = req.user
        props.forEach((prop) => user[prop] = mods[prop])
        await user.save()

        res.status(200).send({ user })
    } catch (error) {
        console.log(error)

        if (error.name == 'ValidationError') {
            sendValidationError(res, error)
            return
        }
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Delete User
router.delete('/user', auth, async (req, res) => {
    try {
        await req.user.deleteOne()

        res.status(200).send('Account Deleted')
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})



export default router
