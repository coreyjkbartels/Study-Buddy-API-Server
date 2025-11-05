import { Schema, model } from 'mongoose'
import Chat from './chat.js'
const messageBucketSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },

    messages: [
        {
            content: {
                type: String,
                required: true
            },
            sender: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        }, { timestamps: true }
    ]
}, { timestamps: true })


messageBucketSchema.statics.findByChat = async (chatId) => {
    const messageBuckets = await messageBucketSchema.find({ chatId: chatId })
    return messageBuckets
}

// messageBucketSchema.statics.insertMessage = async (message, chatId) => {
//     try {
//         let latestBucket = await MessageBucket.find({ chatId: chatId }).sort({ updatedAt: -1 }).limit(1)

//         if (!latestBucket || latestBucket.length == MAX_NUM_MESSAGES) {
//             latestBucket = new MessageBucket({
//                 'chatId': chatId
//             })
//             await latestBucket.save()

//             await Chat.updateOne({ _id: chatId },
//                 { $push: { messageBuckets: latestBucket } })
//         }

//         console.log(latestBucket)
//         latestBucket.push({ messages: message })
//         await latestBucket.save()
//     } catch (error) {
//         console.log(error)
//     }
// }

const MessageBucket = model('MessageBucket', messageBucketSchema)

export default MessageBucket