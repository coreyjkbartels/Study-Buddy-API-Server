import { isValidObjectId } from 'mongoose'
import Assignment from '../models/assignment.js'

export const isAssignment = async (req, res, next) => {
    const { params } = req

    if (!isValidObjectId(params.assignmentId)) {
        res.status(400).send('Invalid ObjectId for Assignment')
        return
    }

    const assignment = await Assignment.findById(params.assignmentId)

    if (!assignment) {
        res.status(404).send('Assignment does not exist')
        return
    }

    req.assignment = assignment

    next()
}