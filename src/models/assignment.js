import { model, Schema } from 'mongoose'

const assignmentSchema = new Schema({
    createdBy: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },

    course: {
        type: Schema.ObjectId,
        ref: 'Course',
        index: true,
        required: true
    },

    title: {
        type: String,
        required: true
    },

    description: String,

    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },

    source: {
        type: String,
        enum: ['community', 'moderator'],
        required: true
    },

    dueAt: {
        type: Date,
        required: true
    }

}, { timestamps: true })

assignmentSchema.index({ course: 1, dueAt: 1 })

const Assignment = model('Assignment', assignmentSchema)

export default Assignment