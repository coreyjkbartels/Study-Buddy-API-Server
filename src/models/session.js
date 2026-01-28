import { model, Schema } from 'mongoose'
import isValidTimeZone from '../assets/timezoneValidation'

const sessionSchema = new Schema({
    title: {
        type: String,
        required: true
    },

    goal: {
        type: String,
        required: true
    },

    description: {
        type: String,
    },

    course: {
        type: Schema.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },

    host: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    startsAt: {
        type: Date,
        required: true
    },

    endsAt: {
        type: Date,
        required: true
    },

    timezone: {
        type: String,
        required: true,
        validate: {
            validator: (tz) => isValidTimeZone(tz),
            message: 'Invalid Time Zone'
        }
    },

    joinPolicy: {
        type: String,
        enum: ['invite_only', 'course_open'],
        default: 'course_open'
    },

    status: {
        type: String,
        enum: ['scheduled', 'cancelled'],
        default: 'scheduled'
    },

    capacity: Number,
    location: String, locationType: String

}, { timestamps: true })


const Session = model('Session', sessionSchema)

export default Session