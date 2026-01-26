import crypto from 'crypto'
import { Router } from 'express'
import auth from '../middleware/auth.js'
import Course from '../models/course.js'
import CourseMembership from '../models/courseMembership.js'
import { isAdmin } from '../middleware/courseAuthentication.js'

const router = new Router()

//Create Course
router.post('/courses', auth, async (req, res) => {
    let { user, body: data } = req

    data.createdBy = user._id
    if (!data.title) {
        data.title = `${data.courseCode} - ${data.courseName}`
    }


    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const joinCode = generateJoinCode(8)
            const course = new Course(data)
            course.joinCode = joinCode

            await course.save()

            const courseMembership = new CourseMembership({
                courseId: course._id,
                userId: user._id,
                role: 'admin',
                status: 'active'
            })
            courseMembership.joinedAt = courseMembership.createdAt
            await courseMembership.save()

            return res.status(201).send(course)
        } catch (err) {
            if (err?.code === 11000 && err?.keyPattern?.joinCode) continue
            console.log(err)
        }
    }

    return res.status(500).json({ error: 'Failed to generate unique join code' })
})

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

function generateJoinCode(length = CODE_LENGTH) {
    const bytes = crypto.randomBytes(length)
    let code = ''
    for (let i = 0; i < length; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length]
    }
    return code
}

//Get Course details from id
router.get('/courses/:courseId', auth, async (req, res) => {
    const course = await Course.findPublicCourse(req.params.courseId)

    if (!course) {
        res.status(400).send('Course does not exist')
        return
    }

    res.status(200).send(course)
})

//Get Courses
router.get('/courses', auth, async (req, res) => {  //Add more functionality later
    const courses = await Course.find()

    res.status(200).send(courses)
})

//Delete Course
router.delete('/courses/:courseId', auth, isAdmin, async (req, res) => {
    try {
        await Course.deleteOne({ _id: req.params.courseId })
        await CourseMembership.deleteMany({ courseId: req.params.courseId })

        res.status(200).send('Success')
    } catch (error) {
        res.status(500).send(error)
        console.log(error)
    }
})

//Update Course
router.patch('/courses/:courseId', auth, isAdmin, async (req, res) => {
    const { body: updates, params } = req

    const modifiable = ['title', 'courseName', 'courseCode', 'school', 'isPublic']
    const isValid = Object.keys(updates).every((key) => {
        return modifiable.includes(key)
    })

    if (!isValid) {
        res.status(400).send('Invalid Updates')
        return
    }

    try {
        const course = await Course.findOneAndUpdate({ _id: params.courseId }, updates, { new: true })

        res.status(200).send(course)
    } catch (err) {
        res.status(500).send(err)
        console.log(err)
    }
})

export default router