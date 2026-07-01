import { ERROR_CODES } from './errorCodes.js'

// Operational error thrown by routes/middleware. Carries a stable `code`, the
// HTTP `status`, a user-safe `message`, and optional `details`. Status and the
// default message come from ERROR_CODES, so call sites stay terse:
//   throw new AppError('COURSE_NOT_FOUND')
//   throw new AppError('INVALID_UPDATES', { message: 'Cannot update password here' })
//   throw new AppError('VALIDATION_ERROR', { details })
export default class AppError extends Error {
    constructor(code, { message, details, status } = {}) {
        const def = ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR
        super(message ?? def.message)
        this.name = 'AppError'
        this.code = ERROR_CODES[code] ? code : 'INTERNAL_ERROR'
        this.status = status ?? def.status
        if (details) this.details = details
        this.isOperational = true
        Error.captureStackTrace?.(this, AppError)
    }
}
