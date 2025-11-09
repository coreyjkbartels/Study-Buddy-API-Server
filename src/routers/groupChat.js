import Router from 'express'
import Chat from '../models/chat.js'
import auth from '../middleware/auth.js'
import User from '../models/user.js'
import Request from '../models/request.js'

const router = new Router()

// Create Group
router.post('/group', auth, async (req, res) => {
    try {
        const data = req.body
        data.chatType = 'group'
        data.owner = req.user._id
        if (!data.users) {
            data.users = [{ userId: req.user._id, username: req.user.username }]
        } else {
            data.users.push(req.user._id)
            data.users = await User.find({ _id: { $in: data.users } }).select({ username: 1 })
        }
        const chat = new Chat(data)

        await User.updateMany(
            { _id: { $in: data.users } },
            { $push: { groups: { groupName: data.groupName, chatId: chat._id } } }
        )

        await chat.save()

        res.status(201).send({ chat })
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

        res.status(500).send({ name: error.name, message: error.message })
    }
})


//Get Group
router.get('/group/:chatId', auth, async (req, res) => {
    try {
        const chatId = req.params.chatId
        const chat = await Chat.findById(chatId).select({
            users: 1,
            groupName: 1,
            owner: 1
        })
        res.status(200).send(chat)
    } catch (error) {
        res.status(400).send({ error: 'Bad Request' })
    }
})

//Delete Group
router.delete('/group/:chatId', auth, async (req, res) => {
    try {
        const chatId = req.params.chatId
        const chat = await Chat.findById(chatId)

        if (!chat) {
            res.status(400).send({ Error: 'Bad Request' })
        }

        const userIds = chat.users.map((u) => u._id).filter(Boolean)

        await User.updateMany(
            { _id: { $in: userIds } },
            { $pull: { groups: { chatId: chatId } } }
        )
        await Chat.deleteOne({ _id: chatId })


        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Invite Member to Group
router.post('/group/invite/:chatId/:userId', auth, async (req, res) => {
    try {
        const group = await Chat.findById(req.params.chatId).select({
            groupName: 1
        })

        const user = await User.findById(req.params.userId)
        if (!user) {
            res.status(400).send({ Error: 'Bad Request' })
            return
        }

        const data = {
            'type': 'group',
            'sender': req.user._id,
            'receiver': req.params.userId,
            'group': {
                name: group.groupName,
                chatId: req.params.chatId
            }
        }

        const request = new Request(data)
        await request.save()

        await User.updateOne(
            { _id: request.receiver },
            { $push: { incomingRequests: request._id } }
        )

        const sender = await User.findPublicUser(request.sender)
        const receiver = await User.findPublicUser(request.receiver)

        if (sender) {
            request.sender = sender
        }

        if (receiver) {
            request.receiver = receiver
        }

        res.status(201).send({ request })
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
})

//Handle group invite
router.patch('/group/invite/:inviteId', auth, async (req, res) => {
    const mods = req.body

    if (mods.length === 0) {
        res.status(400).send({ Error: 'Missing updates' })
        return
    }

    const props = Object.keys(mods)
    const modifiable = ['isAccepted']

    const isValid = props.every((prop) => modifiable.includes(prop))

    if (!isValid) {
        res.status(400).send({ Error: 'Invalid updates' })
        return
    }

    try {
        const request = await Request.findById({ _id: req.params.inviteId })

        if (!request) {
            res.status(400).send({ Error: 'Invalid request id' })
            return
        }

        props.forEach((prop) => request[prop] = mods[prop])
        await request.save()

        if (req.body.isAccepted) {
            await Chat.updateOne(
                { _id: request.group.chatId },
                {
                    $push: {
                        users: request.receiver
                    }
                }
            )

            await User.updateOne(
                { _id: request.receiver },
                {
                    $push: {
                        groups: request.group.chatId
                    }
                }
            )
        }

        await User.updateOne(
            { _id: request.receiver },
            { $pull: { incomingRequests: request._id } }
        )

        await request.deleteOne({ _id: request._id })

        const sender = await User.findPublicUser(request.sender)
        const receiver = await User.findPublicUser(request.receiver)

        if (sender) {
            request.sender = sender
        }

        if (receiver) {
            request.receiver = receiver
        }

        res.status(200).send({ request })
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
    }
})

export default router
