import Router from 'express'
import Chat from '../models/chat.js'
import auth from '../middleware/auth.js'
import User from '../models/user.js'

const router = new Router()

// Create Group
router.post('/group', auth, async (req, res) => {
    try {
        const data = req.body
        data.chatType = 'group'
        data.owner = req.user._id
        data.users.push(req.user._id)
        const chat = new Chat(data)

        await User.updateMany(
            { _id: { $in: data.users } },
            { $push: { chat_sessions: chat._id } }
        )

        await chat.save()

        res.status(201).send({ chat })
    } catch (error) {
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
        const chat = await Chat.findById(chatId)
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

        await User.updateMany(
            { _id: { $in: chat.users } },
            { $pull: { chat_sessions: chatId } }
        )
        await Chat.deleteOne({ _id: chatId })


        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

//Invite Member to Group
router.post('/group-invite/:chatId/:userId', auth, async (req, res) => {

})

export default router
