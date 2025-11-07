import { Schema, model } from 'mongoose'

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
    { _id: false, timestamps: true }
)

const messageBucketSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },

    messages: [messageSubSchema]
}, { timestamps: true })

const MessageBucket = model('MessageBucket', messageBucketSchema)

export default MessageBucket