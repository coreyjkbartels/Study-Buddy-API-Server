import { model, Schema } from 'mongoose'

const sessionParticipantSchema = new Schema({
    session: {
        type: Schema.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },

    user: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    invitedBy: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },

    status: {
        type: String,
        enum: ['invited', 'accepted', 'declined', 'waitlisted'],
        required: true
    },

    respondedAt: Date
}, { timestamps: true })

const SessionParticipant = model('SessionParticipant', sessionParticipantSchema)

export default SessionParticipant