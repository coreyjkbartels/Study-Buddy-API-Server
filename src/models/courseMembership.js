import { model, Schema } from 'mongoose'

const courseMembershipSchema = new Schema({
    course: {
        type: Schema.ObjectId,
        ref: 'Course',
        index: true,
        required: true
    },

    user: {
        type: Schema.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },

    role: {
        type: String,
        enum: ['member', 'moderator', 'admin'],
    },

    status: {
        type: String,
        enum: ['active', 'banned'],
        required: true
    },
}, {
    timestamps: {
        createdAt: 'joinedAt',
        updatedAt: true
    },
})

courseMembershipSchema.index({ course: 1, user: 1 }, { unique: true })

const CourseMembership = model('CourseMembership', courseMembershipSchema)

export default CourseMembership