import crypto from 'crypto'
import { Router } from 'express'
import auth from '../middleware/auth.js'
import Course from '../models/course.js'
import CourseMembership from '../models/courseMembership.js'
import { isCourseAdmin, isCourse, isCourseMember } from '../middleware/courseAccess.js'

const router = new Router()

/**
 * Create Course
 * 
 * @openapi
 * /courses:
 *   post:
 *     summary: Create Course
 *     tags: [Course]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/CourseCreateRequest'
 *     responses:
 *       201:
 *         description: User Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Course'        
*/
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
                course: course._id,
                user: user._id,
                role: 'admin',
                status: 'active'
            })
            await courseMembership.save()

            return res.status(201).send(course)
        } catch (err) {
            if (err?.code === 11000 && err?.keyPattern?.joinCode) continue
            console.log(err)
            return res.status(400).json(err)
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

/**
 * Get Course Details from Id
 * 
 * @openapi
 * /courses/{courseId}:
 *   get:
 *     summary: Get Course Details from Id
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        type: string
 *        description: Id of course in question
 *     responses:
 *       200:
 *         description: Course Object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Course'        
*/
router.get('/courses/:courseId', auth, isCourse, async (req, res) => {
    const { course } = req
    delete course.joinCode

    res.status(200).send(course)
})


/**
 * Get Courses
 * 
 * @openapi
 * /courses:
 *   get:
 *     summary: Get Courses
 *     tags: [Course]
 *     responses:
 *       200:
 *         description: Course Objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                      $ref: '#/components/schemas/Course'        
*/
router.get('/courses', auth, async (req, res) => {  //Add more functionality later
    const courses = await Course.find()

    res.status(200).send(courses)
})

/**
 * Delete Course
 * 
 * @openapi
 * /courses/{courseId}:
 *    delete:
 *     summary: Delete Course
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        type: string
 *        description: Id of course in question
 *     responses:
 *       200:
 *         description: Success
*/
router.delete('/courses/:courseId', auth, isCourse, isCourseAdmin, async (req, res) => {
    try {
        await req.course.deleteOne()
        await CourseMembership.deleteMany({ courseId: req.params.courseId })

        res.status(200).send('Success')
    } catch (error) {
        res.status(500).send(error)
        console.log(error)
    }
})

/**
 * Update Course
 * 
 * @openapi
 * /courses/{courseId}:
 *    patch:
 *     summary: Update Course
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        type: string
 *        description: Id of course in question
 *     requestBody:
 *      required: true
 *      content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                  title:
 *                      type: string
 *                  courseName:
 *                      type: string
 *                  courseCode:
 *                      type: string
 *                  school:
 *                      type: string
 *                  isPublic:
 *                      type: boolean          
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Course'
*/
router.patch('/courses/:courseId', auth, isCourse, isCourseAdmin, async (req, res) => {
    const { body: updates, course } = req

    const modifiable = ['title', 'courseName', 'courseCode', 'school', 'isPublic']
    const isValid = Object.keys(updates).every((key) => {
        return modifiable.includes(key)
    })

    if (!isValid) {
        res.status(400).send('Invalid Updates')
        return
    }

    if ((updates.courseName || updates.courseCode) && !updates.title) {
        updates.title = `${updates.courseCode} - ${updates.courseName}`
    }

    try {
        await course.findOneAndUpdate(updates)

        Object.keys(updates).forEach((key) => {
            course[key] = updates[key]
        })

        res.status(200).send(course)
    } catch (err) {
        res.status(500).send(err)
        console.log(err)
    }
})

/**
 * Join with joinCode
 * 
 * @openapi
 * /courses/join/{joinCode}:
 *    patch:
 *     summary: Join course with code
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: joinCode
 *        type: string
 *        description: joinCode of Course
 *     responses:
 *       200:
 *         description: User has joined successfullyt
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/Course'
*/
router.post('/courses/join/:joinCode', auth, async (req, res) => {
    const course = await Course.findOne({ joinCode: req.params.joinCode })
    const { user } = req

    if (!course) {
        res.status(404).send('No Course Found For Code')
        return
    }

    const data = {
        course: course._id,
        user: user._id,
        role: 'member',
        status: 'active'
    }

    try {
        const membership = new CourseMembership(data)
        await membership.save()
        res.status(201).send('User has joined successfully')

    } catch (err) {
        if (err?.code === 11000) {
            const membership = await CourseMembership.findOne({ course: course._id, user: user._id })
            if (membership.status == 'banned') {
                res.status(403).send('User is banned from course')
            } else {
                res.status(400).send('User is already a member')
            }
            return
        }
        console.log(err)
    }
})

/**
 * Rotate joinCode
 * 
 * @openapi
 * /courses/:courseId/joinCode:
 *    patch:
 *     summary: Rotate join code
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        type: string
 *        description: id of course
 *     responses:
 *       200:
 *         description: join code rotated
 *         content:
 *          application/json:
 *              schema:
 *                  type: String
 * 
 *       500:
 *          description: Failed to generate unique join code
*/
router.patch('/courses/:courseId/joinCode', auth, isCourse, isCourseAdmin, async (req, res) => {
    const { course } = req

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const joinCode = generateJoinCode(8)
            course.joinCode = joinCode

            await course.save()
            return res.status(201).send(joinCode)
        } catch (err) {
            if (err?.code === 11000 && err?.keyPattern?.joinCode) continue
            console.log(err)
        }
    }

    return res.status(500).json({ error: 'Failed to generate unique join code' })
})

/**
 * Get Members
 * 
 * @openapi
 * /courses/:courseId/members:
 *    get:
 *     summary: Get course members
 *     tags: [Course]
 *     parameters:
 *      - in: path
 *        required: true
 *        name: courseId
 *        type: string
 *        description: id of course
 *     responses:
 *       200:
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                      type: object
 *                      properties:
 *                          id: 
 *                              type: string
 *                          course:
 *                              type: string
 *                          user:
 *                              type: object
 *                              properties:
 *                                  id:
 *                                      type: string
 *                                  username:
 *                                      type: string
 *                          role:
 *                              type: string
 *                          joinedAt:
 *                              type: string
*/
router.get('/courses/:courseId/members', auth, isCourse, isCourseMember, async (req, res) => {
    const { course } = req

    try {
        const members = await CourseMembership.find(
            { course: course._id, status: 'active' },
            { status: 0, courseId: 0, updatedAt: 0, __v: 0 })
            .populate('user', 'username')

        res.status(200).send(members)
    } catch (err) {
        console.log(err)
        res.status(500).send('Summ happened🤷‍♂️')
    }
})

/**
* Get Member
* 
* @openapi
* /courses/:courseId/members/:userId:
*    get:
*     summary: Get member details
*     tags: [Course]
*     parameters:
*      - in: path
*        required: true
*        name: courseId
*        type: string
*        description: id of course
*      - in: path
*        required: true
*        name: userId
*        type: string
*        description: id of member
*     responses:
*       200:
*         content:
*          application/json:
*              schema:
*               type: object
*               properties:
*                   id: 
*                       type: string
*                   user:
*                       type: object
*                       properties:
*                           id:
*                               type: string
*                           username:
*                               type: string
*                   role:
*                       type: string
*                   status:
*                       type: string
*                   joinedAt:
*                       type: string
*                   updatedAt:
*                       type: string
*/
router.get('/courses/:courseId/members/:userId', auth, isCourse, isCourseMember, async (req, res) => {
    const { params } = req
    const membership = await CourseMembership.findOne({ course: params.courseId, user: params.userId }, { course: 0, __v: 0 }).populate('user', 'username')

    if (!membership) {
        res.status(400).send('User specified is not a member of course')
        return
    }

    res.status(200).send(membership)
})

//Change role/status
router.patch('/courses/:courseId/members/:userId', auth, isCourse, isCourseAdmin, async (req, res) => {
    const { body: updates, course, params } = req

    const modifiable = ['role', 'status']
    try {


        if (!updates) {
            res.status(400).send('No updates sent')
            return
        }

        const isValid = Object.keys(updates).every((key) => {
            return modifiable.includes(key)
        })

        if (!isValid) {
            res.status(400).send('Invalid Updates')
            return
        }


        const membership = await CourseMembership.findOneAndUpdate(
            { course: course._id, user: params.userId },
            updates,
            { runValidators: true })

        if (!membership) {
            res.status(400).send('User specified is not a member of course')
            return
        }

        Object.keys(updates).forEach((key) => {
            membership[key] = updates[key]
        })

        res.status(200).send(membership)
    } catch (err) {
        res.status(400).json(err)
        console.log(err)
    }
})

//Remove Member
router.delete('/courses/:courseId/members/:userId', auth, isCourse, isCourseAdmin, async (req, res) => {
    const { course, params } = req

    try {
        const membership = await CourseMembership.deleteOne({ course: course._id, user: params.userId })
        res.status(200).send(membership)
    } catch (err) {
        res.status(400).json(err)
        console.log(err)
    }
})

//Leave Course
router.delete('/courses/:courseId/members/me', auth, isCourse, isCourseMember, async (req, res) => {
    const { course, user } = req

    try {
        const membership = await CourseMembership.deleteOne({ course: course._id, user: user._id })
        res.status(200).send(membership)
    } catch (err) {
        res.status(400).json(err)
        console.log(err)
    }
})

export default router