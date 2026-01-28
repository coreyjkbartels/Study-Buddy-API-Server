import { model, Schema } from 'mongoose'

const assignmentUserStateSchema = new Schema({
    assignment: {
        type: Schema.ObjectId,
        ref: 'Assignment',
        required: true
    },

    course: {
        type: Schema.ObjectId,
        ref: 'Course',
        required: true
    },

    user: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },

    state: {
        type: String,
        enum: ['not_started', 'in_progress', 'complete'],
        default: 'not_started'
    },

    personalNotes: String,
    personalDueAt: Date,
    completedAt: Date
}, { timestamps: true })

assignmentUserStateSchema.index({ assignment: 1, user: 1 }, { unique: true })
assignmentUserStateSchema.index({ course: 1, user: 1 })

const AssignmentUserState = model('AssignmentUserState', assignmentUserStateSchema)

export default AssignmentUserState