import './db/mongoose.js'
import express from 'express'
import cors from 'cors'
import userRouter from './routers/user.js'
import assignmentRouter from './routers/assignments.js'
import sessionRouter from './routers/session.js'
import courseRouter from './routers/course.js'

const app = express()

app.use(express.json())
app.use(cors())
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    next()
})

app.use(userRouter)
app.use(assignmentRouter)
app.use(sessionRouter)
app.use(courseRouter)

const port = process.env.PORT
app.listen(port, () => {
    console.log('Listening on port ' + port)
})