import './db/mongoose.js'
import app from './app.js'

const port = process.env.PORT
app.listen(port, () => {
    console.log('Listening on port ' + port)
})
