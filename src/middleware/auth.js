import User from '../models/user.js'
import jwt from 'jsonwebtoken'

const auth = async (req, res, next) => {
    try {
        let token = req.header('Authorization')
        token = token.replace('Bearer ', '')

        const decoded = jwt.verify(token, process.env.JSON_WEB_TOKEN_SECRET)

        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!user) {
            res.status(400).send({ Error: 'User does not exist' })
            return
        }

        req.token = token
        req.user = user

        next()

    } catch (error) {
        res.status(401).send({ error: 'Unauthorized' })
    }
}

export default auth