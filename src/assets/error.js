export function sendValidationError(res, error) {
    for (let field in error.errors) {
        if (error.errors[field].name === 'CastError') {
            delete error.errors[field].reason
            delete error.errors[field].stringValue
            delete error.errors[field].valueType
        }
        if (error.errors[field].name === 'ValidatorError') {
            delete error.errors[field].properties
        }
    }

    return res.status(400).send({ name: error.name, errors: error.errors })
}