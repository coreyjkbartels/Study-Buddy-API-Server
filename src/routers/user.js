import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'

const router = new Router()

// Create User
router.post('/user', async (req, res) => {
    try {
        const data = req.body
        const user = new User(data)

        await user.save()
        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
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

//Get User
router.get('/user', auth, async (req, res) => {
    const user = req.user
    res.status(200).send({ user })
})

//Get Users
router.get('/users', auth, async (req, res) => {
    let filter = {}

    if (req.query.q) {
        filter = {
            $or: [
                { username: { $regex: req.query.q, $options: 'i' } },
                { firstName: { $regex: req.query.q, $options: 'i' } },
                { lastName: { $regex: req.query.q, $options: 'i' } }
            ]
        }
    }

    const users = await User.find(filter, { username: 1, firstName: 1, lastName: 1, _id: 1 })
        .skip(parseInt(req.query.offset))
        .limit(parseInt(req.query.limit))

    res.status(200).send(users)
})

//Get User By Id
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(
            { _id: req.params.userId },
            {
                _id: 1,
                username: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                courses: 1
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
    const modifiable = ['firstName', 'lastName', 'username', 'password', 'email']

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
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Delete User
router.delete('/user', auth, async (req, res) => {
    try {
        await User.deleteOne({ _id: req.user._id })

        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

export default router
