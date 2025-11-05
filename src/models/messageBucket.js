import { Schema, model } from 'mongoose'

const messageBucketSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },
    startDate: Date,
    endDate: Date,
    size: Number,

    messages: [
        {
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: false
            },
            sender: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        }
    ]
})


messageBucketSchema.statics.findByChat = async (chatId) => {
    const messageBuckets = await messageBucketSchema.find({ chatId: chatId }).exec()

    return messageBuckets
}

const MessageBucket = model('MessageBucket', messageBucketSchema)

export default MessageBucket