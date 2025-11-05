import { Schema, model } from 'mongoose'

const requestSchema = new Schema({
    type: {
        type: String,
        enum: ['direct', 'group'],
        required: true
    },
    sender: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    isAccepted: {
        type: Boolean,
        required: false,
        default: false,
    },

    timestamp: Date,

    group: {
        name: String,
        chatId: {
            type: Schema.ObjectId,
            ref: 'Chat',
            required: function () {
                return this.type == 'group'
            }
        }
    }
})

requestSchema.statics.findByUser = async (user) => {
    const incomingRequests = await Request.find({ receiver: user._id }).exec()

    const outgoingRequests = await Request.find({ sender: user._id }).exec()

    const requests = {
        'incoming': incomingRequests,
        'outgoing': outgoingRequests,
    }

    return requests
}

const Request = model('Request', requestSchema)

export default Request