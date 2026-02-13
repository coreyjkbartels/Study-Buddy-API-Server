import { model, Schema } from 'mongoose'

const availabilitySchema = new Schema({
    user: {
        type: Schema.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },

    timezone: {
        type: String,
        required: true
    },

    blocks: {
        type: [
            {
                day: {
                    type: Number,
                    required: true,
                    enum: [0, 1, 2, 3, 4, 5, 6]
                },
                startMin: {
                    type: Number,
                    required: true,
                    min: 0,
                    max: 1439
                },
                endMin: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 1440
                }
            }
        ],
    }

}, { timestamps: true })

const Availability = model('Availability', availabilitySchema)

export default Availability