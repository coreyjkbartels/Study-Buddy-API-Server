import { model, Schema } from 'mongoose'
import Assignment from './assignment.js'

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

// Ensure a state doc exists for this (assignment, user) pair, creating one with
// default fields if absent. The upsert is atomic and backed by the unique
// { assignment, user } index above, so concurrent first-access requests can't
// race into duplicate-key errors.
assignmentUserStateSchema.statics.findOrCreate = async (assignmentId, userId, courseId, dueAt) => {
    return await AssignmentUserState.findOneAndUpdate(
        { assignment: assignmentId, user: userId },
        {
            assignment: assignmentId,
            user: userId,
            course: courseId,
            personalDueAt: dueAt
        },
        { upsert: true, new: true })
}

const AssignmentUserState = model('AssignmentUserState', assignmentUserStateSchema)

export default AssignmentUserState