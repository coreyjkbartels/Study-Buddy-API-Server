import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import Assignment from '../models/assignment.js'

const router = new Router()

//Create assignment
router.post('/assignment', auth, async (req, res) => {
    try {
        const data = req.body
        data.user = req.user._id
        const assignment = new Assignment(data)
        await assignment.save()

        await User.updateOne({ _id: req.user._id },
            { $push: { assignments: assignment._id } }
        )

        req.user.notStartedAssignmentsCount += 1
        await req.user.save()

        res.status(200).send(assignment)
    } catch (error) {
        res.status(400).send({ error })
    }


})

//Update assignment
router.patch('/assignment/:assignmentId', auth, async (req, res) => {
    const mods = req.body

    if (mods.length === 0) {
        res.status(400).send({ Error: 'Missing updates' })
    }

    const props = Object.keys(mods)
    const modifiable = ['title', 'course', 'description', 'isComplete', 'dueDate', 'dateAssigned', 'status']

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

        res.status(200).send({ assignment })
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }

})

//Get assignments
router.get('/assignments', auth, async (req, res) => {
    const assignments = await Assignment.find({ user: req.user._id })
    res.status(200).send(assignments)
})

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
router.delete('/assignment/:assignmentId', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId)

        if (!assignment) {
            res.status(400).send({ Error: 'Bad Request' })
            return
        }

        await User.updateOne(
            { _id: req.user._id },
            { $pull: { assignments: req.params.assignmentId } }
        )

        await Assignment.deleteOne({ _id: req.params.assignmentId })

        res.status(200).send()
    } catch (error) {
        res.status(400).send({ Error: 'Bad Request', error })
    }
})


//Update status
router.patch('/assignment/:assignmentId/status', auth, async (req, res) => {
    try {
        await Assignment.updateOne({ _id: req.params.assignmentId }, { status: req.body.newStatus })

        const user = req.user

        switch (req.body.oldStatus) {
            case 'Complete':
                user.completeAssignmentsCount -= 1
                break

            case 'In Progress':
                user.inProgressAssignmentsCount -= 1
                break

            case 'Not Started':
                user.notStartedAssignmentsCount -= 1
                break

        }

        switch (req.body.newStatus) {
            case 'Complete':
                user.completeAssignmentsCount += 1
                break

            case 'In Progress':
                user.inProgressAssignmentsCount += 1
                break

            case 'Not Started':
                user.notStartedAssignmentsCount += 1
                break

        }

        await user.save()

        res.status(200).send('Success')
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }

})
export default router