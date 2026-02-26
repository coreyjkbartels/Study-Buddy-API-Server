import Router from 'express'
import User from '../models/user.js'
import auth from '../middleware/auth.js'
import { sendValidationError } from '../assets/error.js'

const router = new Router()

/**
 * Create User
 * 
 * @openapi
 * /users:
 *   post:
 *     summary: Create User
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       200:
 *         description: User Object
 *         content:
 *          application/json:
 *              schema:
 *                  type: object
 *                  properties:
 *                      user:
 *                          $ref: '#/components/schemas/UserPrivate'
 *                      token: 
 *                          type: string
 *                          
 *       409:
 *         description: Duplicate Account
 *       400:
 *         description: Validation Errors
*/
router.post('/users', async (req, res) => {
    try {
        const { body: data } = req

        data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const user = new User(data)

        await user.save()
        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
    } catch (error) {
        console.log(error)
        if (error.name == 'ValidationError') {
            sendValidationError(res, error)
            return
        }

        if (error.code === 11000) {
            return res.status(409).send('Duplicate Account')
        }

        res.status(500).send({ name: error.name, message: error.message })
    }
})

/**
 * Get User
 * 
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get current user
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/UserPrivate'
 *                  
*/
router.get('/users/me', auth, async (req, res) => {
    const user = req.user
    res.status(200).send(user)
})

/**
 * Get Users
 * 
 * @openapi
 * /users:
 *   get:
 *     summary: Get users
 *     tags: [User]
 *     parameters:
 *      - in: query
 *        name: offset
 *        schema:
 *          type: integer
 *        description: The number of users to skip before starting to collect the result
 *          
 *     responses:
 *       200:
 *         description: User objects
 *         content:
 *          application/json:
 *              schema:
 *                  type: array
 *                  items:
 *                      $ref: '#/components/schemas/UserPublic'
 *                  
*/
router.get('/users', auth, async (req, res) => {
    const { query } = req

    const filter = {}

    if (query.q) {
        filter.username = { $regex: query.q, $options: 'i' }
    }

    const users = await User.find(filter, User.publicUserProjection())
        .skip(parseInt(query.offset))
        .limit(parseInt(query.limit))

    res.status(200).send(users)
})

/**
 * Get User by Id
 * 
 * @openapi
 * /users/{userId}:
 *   get:
 *     summary: Get 'User By Id'
 *     tags: [User]
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: string
 *        description: Id of User you want details of
 *        required: true
 *     responses:
 *       200:
 *         description: User object
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/UserPublic'
 *                  
*/
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(
            { _id: req.params.userId },
            User.publicUserProjection()
        )

        if (!user) {
            res.status(400).send({ Error: 'Invalid user id' })
            return
        }

        res.status(200).send({ user })
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})

/**
 * Sign In
 * 
 * @openapi
 * /user/sign-in:
 *   post:
 *     summary: Sign In and receive JWT
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: demo@studybuddy.com
 *               password:
 *                 type: string
 *                 example: DemoPassword123!
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *          application/json:
 *              schema:
 *                  type: object
 *                  properties:
 *                      user:
 *                          $ref: '#/components/schemas/UserPrivate'
 *                      token:
 *                          type: string
 *       400:
 *          description: Bad Request
 */
router.post('/user/sign-in', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()

        res.status(200).send({ user, token })
    } catch (error) {
        console.log(error)
        res.status(400).send({ Error: 'Bad Request' })
    }
})


/**
 * Sign Out
 * 
 * @openapi
 * /user/sign-out:
 *   post:
 *     summary: Sign Out and delete JWT
 *     tags: [User]
 *  
 *     responses:
 *       200:
 *         description: Signed Out Successfully
*/
router.post('/user/sign-out', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.status(200).send('Signed Out Successfully')
    } catch (error) {
        console.log(error)
        res.status(500).send({ Error: 'Internal Server Error' })
    }
})

/**
 * Update User
 * 
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update User
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: demo2
 *               timezone:
 *                 type: string
 *                 example: Pacific/Tahiti
 *               email:
 *                 type: string
 *                 example: demo@studybuddy.com
 *               password:
 *                 type: string
 *                 example: DemoPassword123!
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *          application/json:
 *              schema:
 *                  $ref: '#/components/schemas/UserPrivate'
 *       400:
 *          description: Bad Request
 */
router.patch('/users/me', auth, async (req, res) => {
    const mods = req.body

    if (mods.length === 0) {
        res.status(400).send({ Error: 'Missing updates' })
    }

    const props = Object.keys(mods)
    const modifiable = ['username', 'password', 'email', 'timezone']

    const isValid = props.every((prop) => modifiable.includes(prop))

    if (!isValid) {
        return res.status(400).send({ error: 'Invalid updates.' })
    }

    try {
        const user = req.user
        props.forEach((prop) => user[prop] = mods[prop])
        await user.save()

        res.status(200).send(user)
    } catch (error) {
        console.log(error)

        if (error.name == 'ValidationError') {
            sendValidationError(res, error)
            return
        }
        res.status(400).send({ Error: 'Bad Request' })
    }
})


/**
 * Delete Account
 * 
 * @openapi
 * /users/me:
 *   delete:
 *     summary: Delete Account
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Account Deleted
 */
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.deleteOne()

        res.status(200).send('Account Deleted')
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})



export default router
