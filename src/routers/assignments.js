import Router from 'express'
import auth from '../middleware/auth.js'
import Assignment from '../models/assignment.js'
import { isCourse, isCourseMember, isCourseModerator } from '../middleware/courseAccess.js'
import { isAssignment } from '../middleware/assignmentAccess.js'


const router = new Router()

//Create assignment
router.post('/courses/:courseId/assignments',
    auth, isCourse, isCourseMember,
    async (req, res) => {
        const { body, user, course, courseMembership } = req

        const data = {
            createdBy: user._id,
            course: course._id,
            title: body.title,
            source: courseMembership.role == 'member' ? 'manuel' : 'moderator',
            dueAt: body.dueAt
        }

        if (body.description) {
            data.description
        }

        try {
            const assignment = await Assignment.create(data)
            res.status(200).send(assignment)
        } catch (error) {
            res.status(400).json(error)
        }
    })

//Get assignments
router.get('/courses/:courseId/assignments',
    auth, isCourse, isCourseMember,
    async (req, res) => {
        const { course, query } = req

        const filter = {
            course: course._id,
            status: 'active'
        }

        if (query?.status) {
            filter.status = query.status
        }

        if (query?.status == 'all') {
            delete filter.status
        }

        try {
            const assignments = await Assignment.find(filter, { course: 0 })
            res.status(200).send(assignments)
        } catch (error) {
            res.status(500).json(error)
        }
    })

//Get Assignment Details
router.get('/courses/:courseId/assignments/:assignmentId',
    auth, isCourse, isCourseMember, isAssignment,
    async (req, res) => {
        let { assignment } = req

        try {
            await assignment.populate('createdBy', 'username')
            await assignment.populate('course', 'title')

            if (!assignment) {
                res.status(400).send('Invalid Assignment Id')
            }

            res.status(200).send(assignment)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    })

//Update assignment
router.patch('/courses/:courseId/assignments/:assignmentId',
    auth, isCourse, isCourseMember, isAssignment,
    async (req, res) => {
        const { body: mods, courseMembership, user, assignment } = req

        if (mods.length === 0) {
            res.status(400).send({ Error: 'Missing updates' })
        }

        const props = Object.keys(mods)
        const modifiable = ['title', 'description', 'dueAt']

        const isValid = props.every((prop) => modifiable.includes(prop))

        if (!isValid) {
            return res.status(400).send({ error: 'Invalid updates.' })
        }

        if (!user._id.equals(assignment.createdBy) && courseMembership.role == 'member') {
            res.status(403).json('Insufficient Authorization')
            return
        }

        if (courseMembership.role != 'member') {
            assignment.source = 'moderator'
        }

        props.forEach((prop) => assignment[prop] = mods[prop])

        try {
            await assignment.save()
            res.status(200).send(assignment)
        } catch (error) {
            res.status(500).json(error)
        }

    })

//Moderator Stamp
router.post('/courses/:courseId/assignments/:assignmentId/stamp',
    auth, isCourse, isCourseModerator, isAssignment,
    async (req, res) => {
        const { assignment } = req

        assignment.source = 'moderator'
        try {
            await assignment.save()
            res.status(200).send(assignment)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    })

//Archive assignment
router.delete('/courses/:courseId/assignments/:assignmentId',
    auth, isCourse, isCourseMember, isAssignment,
    async (req, res) => {
        const { courseMembership, assignment, user } = req

        try {

            if (!user._id.equals(assignment.createdBy) && courseMembership.role == 'member') {
                res.status(403).json('Insufficient Authorization')
                return
            }

            if (!assignment) {
                res.status(404).send('Assignment Does Not Exist')
                return
            }

            if (assignment.status == 'archived') {
                res.status(400).send('Assignment Already Deleted')
                return
            }

            assignment.status = 'archived'
            await assignment.save()

            res.status(200).send('Assignment Deleted Successfully')
        } catch (error) {
            console.log(error)

            res.status(400).send(error)
        }
    })
export default router