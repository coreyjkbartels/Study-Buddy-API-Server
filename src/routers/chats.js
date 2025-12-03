import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import { isValidObjectId } from 'mongoose'
import Request from '../models/request.js'
import Chat from '../models/chat.js'
import MessageBucket from '../models/messageBucket.js'

const MAX_NUM_MESSAGES = 25

const router = new Router()

//Get Chat
router.get('/chat/:chatId', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
        res.status(200).send(chat)
    } catch (error) {
        res.status(400).send({ error })
    }
})

//Get Chats
router.get('/chats', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ 'users.userId': req.user._id })
        res.status(200).send(chats)
    } catch (error) {
        res.status(400).send({ error })
    }
})


//Send Message To Chat
router.post('/chat/:chatId/message', auth, async (req, res) => {
    try {

        const data = {
            'content': req.body.content,
            'senderId': req.user._id,
            'senderUsername': req.user.username
        }

        let latestBucket = (await MessageBucket.find({ chatId: req.params.chatId }).sort({ updatedAt: -1 }).limit(1))[0]

        if (!latestBucket || latestBucket.messages.length == MAX_NUM_MESSAGES) {
            latestBucket = new MessageBucket({
                'chatId': req.params.chatId
            })
            await latestBucket.save()

            await Chat.updateOne({ _id: req.params.chatId },
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

//Get Chat Messages
router.get('/chat/:chatId/messages', auth, async (req, res) => {
    try {
        const result = await MessageBucket.getMessagesOfChat(req.params.chatId)
        res.status(200).send(result)

    } catch (error) {
        console.log(error)
    }
})



export default router