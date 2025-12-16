import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import Assignment from '../models/assignment.js'
import { isValidObjectId } from 'mongoose'

const router = new Router()

//Create assignment
router.post('/assignment', auth, async (req, res) => {
    try {
        const data = req.body
        data.user = req.user._id
        const assignment = new Assignment(data)
        await assignment.save()

        await User.updateOne({ _id: req.user._id },
            { $push: { 'assignments.assignments': assignment._id } }
        )

        req.user.assignments.counts.notStarted += 1
        await req.user.save()

        res.status(200).send(assignment)
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }


})

//Update assignment
router.patch('/assignment/:assignmentId', auth, async (req, res) => {
    const mods = req.body

    if (mods.length === 0) {
        res.status(400).send({ Error: 'Missing updates' })
    }

    const props = Object.keys(mods)
    const modifiable = ['title', 'course', 'description', 'isComplete', 'dueDate', 'dateAssigned']

    const isValid = props.every((prop) => modifiable.includes(prop))

    if (!isValid) {
        return res.status(400).send({ error: 'Invalid updates.' })
    }

    try {
        const assignment = await Assignment.findById(req.params.assignmentId)

        if (!assignment) {
            res.status(400).send({ Error: 'Bad Request' })
            return
        }

        props.forEach((prop) => assignment[prop] = mods[prop])
        await assignment.save()

        res.status(200).send(assignment)
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }

})

//Get assignments
router.get('/assignments', auth, async (req, res) => {
    const { user } = req
    await user.populate('assignments.assignments')

    res.status(200).send(user.assignments)
})

//Get Assignment
router.get('/assignments/:assignmentId', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId)

        if (!assignment) {
            res.status(400).send('Invalid Assignment Id')
        }

        res.status(200).send(assignment)
    } catch (error) {
        console.log(error)
    }

})

//Delete assignment
router.delete('/assignments/:assignmentId', auth, async (req, res) => {
    try {
        const { user } = req
        const { assignmentId } = req.params
        const { assignments, counts } = user.assignments

        if (!isValidObjectId(assignmentId)) {
            res.status(400).send('Invalid AssignmentId')
            return
        }

        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) {
            res.status(400).send('Assignment Does Not Exist')
            return
        }

        await Assignment.deleteOne({ _id: assignmentId })

        assignments.pull(assignmentId)

        switch (assignment.status) {
            case 'Complete':
                counts.complete -= 1
                break

            case 'In Progress':
                counts.inProgress -= 1
                break

            case 'Not Started':
                counts.notStarted -= 1
                break

        }

        await user.save()
        res.status(200).send('Assignment Deleted Successfully')
    } catch (error) {
        console.log(error)

        res.status(400).send(error)
    }
})


//Update status
router.patch('/assignment/:assignmentId/:status', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId)

        if (!assignment) {
            res.status(400).send({ Error: 'Assignment Does Not Exist', })
        }

        const { status: newStatus } = req.params
        const { status: oldStatus } = assignment

        const options = ['Not Started', 'In Progress', 'Complete']

        if (!options.includes(newStatus)) {
            res.status(400).send({ Error: 'Invalid Status', })
        }

        if (newStatus == oldStatus) {
            res.status(400).send({ Error: 'New status can\'t be the same as old status' })
        }

        assignment.status = newStatus
        await assignment.save()

        const { counts } = req.user.assignments

        switch (oldStatus) {
            case 'Complete':
                counts.complete -= 1
                break

            case 'In Progress':
                counts.inProgress -= 1
                break

            case 'Not Started':
                counts.notStarted -= 1
                break

        }

        switch (newStatus) {
            case 'Complete':
                counts.complete += 1
                break

            case 'In Progress':
                counts.inProgress += 1
                break

            case 'Not Started':
                counts.notStarted += 1
                break

        }

        await req.user.save()

        res.status(200).send(counts)
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }

})

export default router