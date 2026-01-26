import CourseMembership from '../models/courseMembership.js'

export const isAdmin = async (req, res, next) => {
    const membership = await CourseMembership.findOne({ courseId: req.params.courseId, userId: req.user._id })

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