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