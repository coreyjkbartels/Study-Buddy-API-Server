import { Schema, model } from 'mongoose'
import Chat from './chat.js'
const MAX_NUM_MESSAGES = 25

const messageSubSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User', required: true
    },
},
    { timestamps: true }
)

const messageBucketSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },

    messages: [messageSubSchema]
}, { timestamps: true })

messageBucketSchema.statics.insertMessage = async function (chatId, data) {
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
}

messageBucketSchema.statics.getMessagesOfChat = async function (chatId) {
    let result = []

    let buckets = await MessageBucket.find({ chatId: chatId }, 'messages')
    for (let i = 0; i < buckets.length; i++) {
        result = result.concat(buckets[i].messages)
    }
    return result
}

const MessageBucket = model('MessageBucket', messageBucketSchema)

export default MessageBucket