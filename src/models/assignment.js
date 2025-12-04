import { model, Schema } from 'mongoose'

const assignmentSchema = new Schema({
    user: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },

    title: {
        type: String,
        required: true
    },

    description: String,
    course: String,
    isComplete: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Complete'],
        default: 'Not Started'
    },

    dateAssigned: {
        type: Date,
        required: true
    },

    dueDate: {
        type: Date,
        required: true
    }

}, { timestamps: true })


const Assignment = model('Assignment', assignmentSchema)

export default Assignment