import Router from 'express'
import Chat from '../models/chat.js'
import auth from '../middleware/auth.js'
import User from '../models/user.js'
import Request from '../models/request.js'
import MessageBucket from '../models/messageBucket.js'

const router = new Router()

// Create Group
router.post('/group', auth, async (req, res) => {
    try {
        const data = req.body
        data.chatType = 'group'
        data.owner = req.user._id

        const otherUsers = data.users

        data.users = [{
            _id: req.user._id,
            username: req.user.username
        }]

        const chat = new Chat(data)

        await User.updateOne(
            { _id: req.user._id },
            { $push: { groups: { groupName: data.groupName, chatId: chat._id } } }
        )

        await chat.save()

        if (otherUsers) {
            for (let i = 0; i < otherUsers.length; i++) {
                await groupInviteHandler(chat._id, req.user._id, otherUsers[i])
            }
        }


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

//Get all group invites
router.get('/group/invites', auth, async (req, res) => {
    try {
        const filter = {
            $and: [
                { receiver: req.user._id },
                { type: 'group' }
            ]
        }

        const pipeline = Request.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'sender',
                    as: 'sender'
                }
            },

            {
                $project: {
                    '_id': 1,
                    'isAccepted': 1,

                    'sender._id': 1,
                    'sender.username': 1,
                    'sender.firstName': 1,
                    'sender.lastName': 1,
                    'sender.email': 1,

                    'group.name': 1
                }
            },
        ])

        const requests = await pipeline.exec()

        res.status(200).send(requests)
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
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
        const request = await groupInviteHandler(req.params.chatId, req.user._id, req.params.userId)
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

async function groupInviteHandler(chatId, senderId, receiverId) {
    const group = await Chat.findById(chatId).select({
        groupName: 1
    })

    if (!group) {
        throw new Error('Group Does Not Exist')
    }

    const receiver = await User.findById(receiverId)
    if (!receiver) {
        throw new Error('User Does Not Exist')
    }

    const data = {
        'type': 'group',
        'sender': senderId,
        'receiver': receiverId,
        'group': {
            name: group.groupName,
            chatId: chatId
        }
    }

    const request = new Request(data)
    await request.save()

    await User.updateOne(
        { _id: request.receiver },
        { $push: { incomingRequests: request._id } }
    )

    return request
}

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
                        groups: {
                            groupName: request.group.name,
                            chatId: request.group.chatId
                        }
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

//Send Message To Group
router.post('/group/:chatId/message', auth, async (req, res) => {
    try {
        const chatId = req.params.chatId
        const chat = Chat.findById(chatId)
        if (!chat) {
            res.status(400).send('Chat does not exist')
            return
        }

        const data = {
            'content': req.body.content,
            'sender': req.user._id
        }

        MessageBucket.insertMessage(chatId, data)

        res.status(200).send(data)

    } catch (error) {
        console.log(error)
    }
})

//Get Messages From Group
router.get('/group/:chatId/messages', auth, async (req, res) => {
    try {
        const chatId = (req.params.chatId)

        const chat = await Chat.findById(chatId)

        if (!chat) {
            res.status(400).send('Chat does not exist')
            return
        }

        const result = await MessageBucket.getMessagesOfChat(chat.id)
        res.status(200).send(result)
    } catch (error) {
        console.log(error)
    }
})

//Get all Groups User is involved in
router.get('/groups', auth, async (req, res) => {
    try {
        res.status(200).send(req.user.groups)
    } catch (error) {
        console.log(error)
    }
})



export default router
