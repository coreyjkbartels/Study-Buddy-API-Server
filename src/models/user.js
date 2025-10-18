import { model, Schema } from 'mongoose'
import validator from 'validator'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const { sign } = jwt

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minLength: 4
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: 8
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: 'Invalid Email address'
        }
    },

    tokens: [{
        token: {
            type: String,
            required: false
        }
    }],
})


userSchema.methods.toJSON = function () {
    const user = this

    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this

    const token = sign({ _id: user._id.toString() }, process.env.JSON_WEB_TOKEN_SECRET)

    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })

    if (!user) {
        throw new Error('Unable to sign in')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    console.log(user.password)
    console.log(password)
    console.log(isMatch)


    if (!isMatch) {
        throw new Error('Unable to sign in')
    }

    return user
}

userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next() // run the save() method
})


const User = model('User', userSchema)

export default User