import { isValidObjectId } from 'mongoose'
import Assignment from '../models/assignment.js'
import AppError from '../assets/AppError.js'

export const isAssignment = async (req, res, next) => {
    const { params } = req

    if (!isValidObjectId(params.assignmentId)) {
        return next(new AppError('BAD_REQUEST', { message: 'Invalid assignment id' }))
    }

    const assignment = await Assignment.findOne({ _id: params.assignmentId, course: req.course._id })

    if (!assignment) {
        return next(new AppError('ASSIGNMENT_NOT_FOUND'))
    }

    req.assignment = assignment

    next()
}