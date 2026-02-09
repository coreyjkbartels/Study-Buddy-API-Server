import { model, Schema } from 'mongoose'

const sessionMessageSchema = new Schema({
    session: {
        type: Schema.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },

    sender: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    course: {
        type: Schema.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },

    body: {
        type: String,
        required: true
    },

    edited: {
        type: Boolean,
        default: false
    },

    deletedAt: Date
}, { timestamps: { updatedAt: 'editedAt', createdAt: 'sentAt' } })

sessionMessageSchema.index({ session: 1, createdAt: 1 })

const SessionMessage = model('SessionMessage', sessionMessageSchema)

export default SessionMessage