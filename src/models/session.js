import { model, Schema } from 'mongoose'

const sessionSchema = new Schema({
    date: {
        type: Date,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    attendees: {
        type: [{
            username: String,
            userId: {
                type: Schema.ObjectId,
                ref: 'User'
            }
        }], required: true
    }
}, { timestamps: true })


const Session = model('Session', sessionSchema)

export default Session