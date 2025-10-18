import { connect, Schema } from 'mongoose'

console.log('Setting global SchemaType options.')
Schema.Types.String.set('validate', {
    validator: (value) => value == null || value.length > 0,
    message: 'String must be null or non-empty.'
})
Schema.Types.String.set('trim', true)

console.log('Connecting to Atlas')

connect(process.env.MONGODB_URL)
    .then(() => {
        console.log('Connection to database successful.')
    })
    .catch((e) => {
        console.log('Error: ' + e)
    })




