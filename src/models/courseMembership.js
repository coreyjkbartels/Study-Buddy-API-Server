import { model, Schema } from 'mongoose'

const courseMembershipSchema = new Schema({
    courseId: {
        type: Schema.ObjectId,
        ref: 'Course',
        required: true
    },

    userId: {
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
    }
})

courseMembershipSchema.index({ courseId: 1, userId: 1 }, { unique: true })

const CourseMembership = model('CourseMembership', courseMembershipSchema)

export default CourseMembership