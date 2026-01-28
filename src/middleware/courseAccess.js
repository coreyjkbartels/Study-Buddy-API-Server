import { isValidObjectId } from 'mongoose'
import Course from '../models/course.js'
import CourseMembership from '../models/courseMembership.js'

export const isCourse = async (req, res, next) => {
    const { params } = req

    if (!isValidObjectId(params.courseId)) {
        res.status(400).send('Invalid ObjectId for Course')
        return
    }

    const course = await Course.findById(params.courseId)

    if (!course) {
        res.status(404).send('Course does not exist')
        return
    }

    req.course = course

    next()
}

export const isMember = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ course: req.params.courseId, user: req.user._id })
    if (!membership) {
        res.status(403).send('User is not a member of course')
        return
    }

    if (membership.status == 'banned') {
        res.status(403).send('User has been banned from course')
        return
    }

    next()
}

export const isAdmin = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ course: req.params.courseId, user: req.user._id })

    if (!membership) {
        res.status(403).send('User is not a member of course')
        return
    }

    if (membership.status == 'banned') {
        res.status(403).send('User has been banned from course')
        return
    }

    if (membership.role != 'admin') {
        res.status(403).send('User is not admin of course')
        return
    }

    next()
}

