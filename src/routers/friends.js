import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import { isValidObjectId } from 'mongoose'
import Request from '../models/request.js'
import Chat from '../models/chat.js'
import MessageBucket from '../models/messageBucket.js'

const MAX_NUM_MESSAGES = 25

const router = new Router()


//Send Friend Request
router.post('/friends/requests/:friendId', auth, async (req, res) => {
    try {
        const friend = await User.findById(req.params.friendId)

        if (!friend) {
            res.status(400).send({ Error: 'Bad Request' })
            return
        }

        const data = {
            'type': 'direct',
            'sender': req.user._id,
            'receiver': req.params.friendId
        }

        const request = new Request(data)
        await request.save()

        await User.updateOne(
            { _id: request.sender },
            { $push: { outgoingRequests: request._id } }
        )

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
        res.status(400).send({ Error: 'Bad Request', error })
    }
})


//Get all requests
router.get('/friends/requests', auth, async (req, res) => {
    try {
        const filter = {
            $and: [
                {
                    $or: [
                        { sender: req.user._id },
                        { receiver: req.user._id },
                    ]
                }, { type: 'direct' }
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
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'receiver',
                    as: 'receiver'
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

                    'receiver._id': 1,
                    'receiver.username': 1,
                    'receiver.firstName': 1,
                    'receiver.lastName': 1,
                    'receiver.email': 1,
                }
            },
        ])

        const requests = await pipeline.exec()

        res.status(200).send(requests)
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
    }
})

//Handle Request
router.patch('/friends/requests/:requestId', auth, async (req, res) => {
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
        const request = await Request.findById({ _id: req.params.requestId })

        if (!request) {
            res.status(400).send({ Error: 'Invalid request id' })
            return
        }

        props.forEach((prop) => request[prop] = mods[prop])
        await request.save()

        const sender = await User.findPublicUser(request.sender)
        const receiver = await User.findPublicUser(request.receiver)

        if (req.body.isAccepted) {
            const data = {
                chatType: 'direct',
                users: [
                    {
                        userId: sender._id,
                        username: sender.username
                    },
                    {
                        userId: receiver._id,
                        username: request.receiver.username
                    },
                ]
            }
            const chat = new Chat(data)

            await chat.save()

            await User.updateOne(
                { _id: request.sender },
                {
                    $push: {
                        friends: {
                            friendId: request.receiver,
                            chatId: chat._id
                        }
                    }
                }
            )

            await User.updateOne(
                { _id: request.receiver },
                {
                    $push: {
                        friends: {
                            friendId: request.sender,
                            chatId: chat._id
                        }
                    }
                }
            )
        }

        await User.updateOne(
            { _id: request.sender },
            { $pull: { outgoingRequests: request._id } }
        )

        await User.updateOne(
            { _id: request.receiver },
            { $pull: { incomingRequests: request._id } }
        )

        await request.deleteOne({ _id: request._id })


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

//Delete Friend Request
router.delete('/friends/requests/:requestId', auth, async (req, res) => {
    try {
        const request = await Request.findById(req.params.requestId)

        if (!request) {
            res.status(400).send({ Error: 'Bad Request' })
            return
        }


        await User.updateOne(
            { _id: req.user._id },
            { $pull: { outgoingRequests: req.params.requestId } }
        )

        await User.updateOne(
            { _id: request.receiver },
            { $pull: { incomingRequests: req.params.requestId } }
        )

        await request.deleteOne({ _id: req.params.requestId })

        res.status(200).send()
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
    }
})

//Get Friends
router.get('/friends', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id, 'friends')

        res.status(200).send(user)
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request', error })
    }
})

//Remove Friend
router.delete('/friends/:friendId', auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.friendId)) {
            res.status(400).send({ Error: 'Invalid friend id' })
            return
        }

        const friendExists = req.user.friends.some(f => f.friendId.toString() === req.params.friendId)

        if (!friendExists) {
            res.status(400).send({ Error: 'friendId missing from user\'s friends list.' })
            return
        }

        await User.updateOne(
            { _id: req.user._id },
            { $pull: { friends: { friendId: req.params.friendId } } }
        )

        await User.updateOne(
            { _id: req.params.friendId },
            { $pull: { friends: { friendId: req.user._id } } }
        )

        res.status(200).send()
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
    }
})

//Send Message To Friend
router.post('/friend/:friendId/message', auth, async (req, res) => {
    try {
        const chatId = await User.getChatIdOfFriend(req.user._id, req.params.friendId)

        if (!chatId) {
            res.status(400).send({ Error: 'Invalid friend id' })
            return
        }
        const data = {
            'content': req.body.content,
            'sender': req.user._id
        }

        let latestBucket = (await MessageBucket.find({ chatId: chatId }).sort({ updatedAt: -1 }).limit(1))[0]

        if (!latestBucket || latestBucket.messages.length == MAX_NUM_MESSAGES) {
            latestBucket = new MessageBucket({
                'chatId': chatId
            })
            await latestBucket.save()

            await Chat.updateOne({ _id: chatId },
                { $push: { messageBuckets: latestBucket } })
        }

        await MessageBucket.updateOne(
            { _id: latestBucket._id },
            {
                $push: { messages: data }
            }
        )

        res.status(200).send(data)

    } catch (error) {
        console.log(error)
    }
})

//Get Messages From Friends
router.get('/friend/:friendId/messages', auth, async (req, res) => {
    try {
        const chatId = await User.getChatIdOfFriend(req.user._id, req.params.friendId)
        console.log(chatId)
        if (!chatId) {
            res.status(400).send('Invalid friend ID')
            return
        }

        const result = await MessageBucket.getMessagesOfChat(chatId)
        res.status(200).send(result)

    } catch (error) {
        console.log(error)
    }
})



export default router