import Router from 'express'
import auth from '../middleware/auth.js'
import Assignment from '../models/assignment.js'
import { isCourse, isCourseMember, isCourseModerator } from '../middleware/courseAccess.js'
import { isAssignment } from '../middleware/assignmentAccess.js'
import AssignmentUserState from '../models/assignmentUserState.js'

const router = new Router()

/**
 * Create Assignment
 * 
 * @openapi
 * /courses/{courseId}/assignments:
 *   post:
 *     summary: Create Assignment
 *     tags: [Assignments]
 *     parameters:    
 *      - in: path
 *        required: true
 *        name: courseId
 *        schema:
 *          type: string
 *        description: Id of course
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignmentCreateRequest'
 *     responses:
 *       201:
 *         description: Assignment Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Validation Errors
*/
router.post('/courses/:courseId/assignments',
    auth, isCourse, isCourseMember,
    async (req, res) => {
        const { body, user, course, courseMembership } = req

        const data = {
            createdBy: user._id,
            course: course._id,
            title: body.title,
            source: courseMembership.role == 'member' ? 'community' : 'moderator',
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

/**
 * Get Assignments
 * 
 * @openapi
 * /courses/{courseId}/assignments:
 *   get:
 *     summary: Get Assignments
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        name: courseId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: query
 *        name: status
 *        schema:
 *          type: string
 *          enum:
 *           - active
 *           - archived
 *           - all 
 *        description: Filter between active and archived assignments
 *      - in: query
 *        name: source
 *        schema:
 *          type: string
 *          enum:
 *           - community
 *           - moderator
 *        description: Filter between community-made and moderator-made assignments
 *     responses:
 *       200:
 *         description: Array of Assignment Objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                      $ref: '#/components/schemas/Assignment'
*/
router.get('/courses/:courseId/assignments',
    auth, isCourse, isCourseMember,
    async (req, res) => {
        const { course, query } = req

        const filter = {
            course: course._id,
            status: 'active'
        }

        if (query?.source) {
            filter.source = query.source
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

/**
 * Get Assignment from Id
 * 
 * @openapi
 * /courses/{courseId}/assignments/{assignmentId}:
 *   get:
 *     summary: Get Assignment from Id
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: path
 *        required: true
 *        name: assignmentId
 *        schema:
 *          type: string
 *        description: Id of assignment
 *     responses:
 *       200:
 *         description: Assignment Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Assignment'
*/
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

/**
 * Update Assignment
 * 
 * @openapi
 * /courses/{courseId}/assignments/{assignmentId}:
 *   patch:
 *     summary:  Update Assignment
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: path
 *        required: true
 *        name: assignmentId
 *        schema:
 *          type: string
 *        description: Id of assignment
 *     requestBody:
 *      required: true
 *      content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/AssignmentPatchRequest'
 *                  
 *     responses:
 *       200:
 *         description: Assignment Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Validation Errors
*/
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

/**
 * Moderator Stamp
 * 
 * @openapi
 * /courses/{courseId}/assignments/{assignmentId}/stamp:
 *   post:
 *     summary:  Verify assignment
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: path
 *        required: true
 *        name: assignmentId
 *        schema:
 *          type: string
 *        description: Id of assignment
 *     responses:
 *       200:
 *         description: Assignment Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Assignment'
*/
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

/**
* Archive Assignment
* 
* @openapi
* /courses/{courseId}/assignments/{assignmentId}:
*   delete:
*     summary:  Archive assignment
*     tags: [Assignments]
*     parameters:
*      - in: path
*        required: true
*        name: courseId
*        schema:
*          type: string
*        description: Id of course
*      - in: path
*        required: true
*        name: assignmentId
*        schema:
*          type: string
*        description: Id of assignment
*     responses:
*       200:
*         description: Assignment Archived Successfully
*/
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

            res.status(200).send('Assignment Archived Successfully')
        } catch (error) {
            console.log(error)

            res.status(400).send(error)
        }
    })

/**
 * Get Assignments with user states
 * 
 * @openapi
 * /courses/{courseId}/my/assignments:
 *   get:
 *     summary: Get Assignments
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        name: courseId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: query
 *        name: status
 *        schema:
 *          type: string
 *          enum:
 *           - active
 *           - archived
 *           - all 
 *        description: Filter between active and archived assignments
 *      - in: query
 *        name: source
 *        schema:
 *          type: string
 *          enum:
 *           - community
 *           - moderator
 *        description: Filter between community-made and moderator-made assignments
 *     responses:
 *       200:
 *         description: Array of Assignment Objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                      type: object
 *                      properties:
 *                          assignment:
 *                              $ref: '#/components/schemas/Assignment'
 *                          userState:
 *                              $ref: '#/components/schemas/AssignmentUserState'
*/
router.get('/courses/:courseId/my/assignments',
    auth, isCourse, isCourseMember,
    async (req, res) => {
        const { course, user, query } = req

        const filter = {
            course: course._id,
            status: 'active'
        }

        if (query?.source) {
            filter.source = query.source
        }

        if (query?.status) {
            filter.status = query.status
        }

        if (query?.status == 'all') {
            delete filter.status
        }

        try {
            const assignments = await Assignment.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: 'assignmentuserstates',
                        localField: '_id',
                        foreignField: 'assignment',
                        as: 'userState'
                    }
                },
                {
                    $unwind: {
                        path: '$userState',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        __v: 0,
                        updatedAt: 0,
                        'userState.assignment': 0,
                        'userState.course': 0,
                        'userState.user': 0,
                        'userState.createdAt': 0,
                        'userState.updatedAt': 0,
                        'userState.__v': 0
                    }
                }

            ])


            res.status(200).send(assignments)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    })

/**
 * Edit personal assignment metadata
 * 
 * @openapi
 * /courses/{courseId}/assignments/{assignmentId}/my-state:
 *   patch:
 *     summary: Edit personal assignment metadata
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        name: courseId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: path
 *        name: assignmentId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of assignment
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *              type: object
 *              properties:
 *                  state:
 *                      type: string
 *                  personalNotes:
 *                      type: string
 *                  personalDueAt:
 *                      type: string
 *                  completedAt:
 *                      type: string
 *     responses:
 *       200:
 *         description: Array of Assignment Objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                     $ref: '#/components/schemas/AssignmentUserState'
*/
router.patch('/courses/:courseId/assignments/:assignmentId/my-state',
    auth, isCourse, isCourseMember, isAssignment,
    async (req, res) => {
        const { body: mods, course, user, assignment } = req

        let userState = await AssignmentUserState.findOne({ assignment: assignment._id, user: user._id })

        if (!userState) {
            userState = await AssignmentUserState.create({
                assignment: assignment._id,
                user: user._id,
                course: course._id,
                personalDueAt: assignment.dueAt
            })
        }

        if (!mods) {
            return res.status(200).send(userState)
        }

        const props = Object.keys(mods)
        const modifiable = ['state', 'personalNotes', 'personalDueAt', 'completedAt']

        const isValid = props.every((prop) => modifiable.includes(prop))

        if (!isValid) {
            return res.status(400).send('Invalid updates.')
        }

        props.forEach((prop) => userState[prop] = mods[prop])

        try {
            await userState.save()
            return res.status(200).send(userState)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    })

/**
 * Get all assignments with user states
 * 
 * @openapi
 * /assignments:
 *   get:
 *     summary: Get all assignments with user states
 *     tags: [Assignments]
 *     parameters:
 *      - in: path
 *        name: courseId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of course
 *      - in: path
 *        name: assignmentId
 *        required: true
 *        schema:
 *          type: string
 *        description: Id of assignment
 *     responses:
 *       200:
 *         description: Array of Assignment Objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                     $ref: '#/components/schemas/AssignmentUserState'
*/
router.get('/assignments', auth, async (req, res) => {
    const { user, query } = req

    const filter = {
        user: user._id,
    }

    if (query?.state) {
        filter.state = query.state
    }

    if (query?.dueIn) {
        const date = new Date()
        date.setDate(date.getDate() + Number(query.dueIn))
        filter.personalDueAt = { $lte: date }
    }

    try {
        let assignments = await AssignmentUserState.find(filter)
            .populate('assignment')
            .populate('course')
            .sort({ personalDueAt: 1 })

        if (query?.status) {
            assignments = assignments.filter((assignment) => {
                assignment.assignment.status == query.status
            })
        }

        res.status(200).send(assignments)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
}
)
export default router