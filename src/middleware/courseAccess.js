import { isValidObjectId } from 'mongoose'
import Course from '../models/course.js'
import CourseMembership from '../models/courseMembership.js'
import AppError from '../assets/AppError.js'

export const isCourse = async (req, res, next) => {
    const { params } = req

    if (!isValidObjectId(params.courseId)) {
        return next(new AppError('BAD_REQUEST', { message: 'Invalid course id' }))
    }

    const course = await Course.findById(params.courseId)

    if (!course) {
        return next(new AppError('COURSE_NOT_FOUND'))
    }

    req.course = course

    next()
}

export const isCourseMember = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ course: req.params.courseId, user: req.user._id })
    if (!membership) {
        return next(new AppError('NOT_COURSE_MEMBER'))
    }

    if (membership.status == 'banned') {
        return next(new AppError('COURSE_BANNED'))
    }

    req.courseMembership = membership

    next()
}

export const isCourseAdmin = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ course: req.params.courseId, user: req.user._id })

    if (!membership) {
        return next(new AppError('NOT_COURSE_MEMBER'))
    }

    if (membership.status == 'banned') {
        return next(new AppError('COURSE_BANNED'))
    }

    if (membership.role != 'admin') {
        return next(new AppError('NOT_COURSE_ADMIN'))
    }

    req.courseMembership = membership

    next()
}

export const isCourseModerator = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ course: req.params.courseId, user: req.user._id })

    if (!membership) {
        return next(new AppError('NOT_COURSE_MEMBER'))
    }

    if (membership.status == 'banned') {
        return next(new AppError('COURSE_BANNED'))
    }

    if (membership.role == 'member') {
        return next(new AppError('NOT_COURSE_MODERATOR'))
    }

    req.courseMembership = membership

    next()
}

