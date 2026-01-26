import { model, Schema } from 'mongoose'

const courseSchema = new Schema({
    title: String,

    courseName: {
        type: String,
        required: true
    },

    courseCode: {
        type: String,
        required: true,
        index: true
    },

    school: String,

    createdBy: {
        type: Schema.ObjectId,
        ref: 'User'
    },

    joinCode: {
        type: String,
        unique: true,
        index: true
    },

    isPublic: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

courseSchema.statics.findPublicCourse = async (id) => {
    const course = await Course.findById(id, { joinCode: 0 })
    return course
}

const Course = model('Course', courseSchema)

export default Course