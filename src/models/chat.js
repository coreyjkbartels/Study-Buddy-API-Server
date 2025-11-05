import { Schema, model } from 'mongoose'

const chatSchema = new Schema({
    chatType: {
        type: String,
        enum: ['direct', 'group'],
        required: true
    },

    messageBuckets: [
        {
            type: Schema.ObjectId,
            ref: 'MessageBucket'
        }
    ],

    users: {
        type: [
            {
                type: Schema.ObjectId,
                ref: 'User',
                required: function () {
                    return this.chatType == 'direct'
                }
            },
        ],

        max: function () {
            return (this.chatType == 'direct') ? 2 : 32
        }
    },

    groupName: {
        type: String,
        required: function () {
            return this.chatType == 'group'
        }
    },
    owner: {
        type: Schema.ObjectId,
        ref: 'User',
        required: function () {
            return this.chatType == 'group'
        }
    },
}, { timestamps: true })

const Chat = model('Chat', chatSchema)

export default Chat