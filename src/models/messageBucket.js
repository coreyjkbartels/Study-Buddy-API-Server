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
    const pipeline = [
        { $match: { chatId } },
        { $unwind: '$messages' },
        { $sort: { 'messages.createdAt': 1 } },

        {
            $lookup: {
                from: 'users',
                localField: 'messages.sender',
                foreignField: '_id',
                as: 'senderDoc'
            }
        },
        { $set: { senderDoc: { $first: '$senderDoc' } } },

        {
            $project: {
                _id: 0,
                content: '$messages.content',
                sender: '$messages.sender',
                username: '$senderDoc.username',
                createdAt: '$messages.createdAt',
                updatedAt: '$messages.updatedAt'
            }
        },

        {
            $group: {
                _id: '$$REMOVE',
                messages: {
                    $push: {
                        content: '$content',
                        sender: '$sender',
                        username: '$username',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    }
                }
            }
        }
    ]

    let result
    const chat = await Chat.findById(chatId, 'chatType')
    if (chat.chatType == 'direct') {
        result = await MessageBucket.aggregate(pipeline)
    } else {
        result = await MessageBucket.find({ chatId: chatId }, 'messages')
    }
    return result
}

const MessageBucket = model('MessageBucket', messageBucketSchema)

export default MessageBucket