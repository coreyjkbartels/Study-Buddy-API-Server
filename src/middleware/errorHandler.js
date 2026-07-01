import AppError from '../assets/AppError.js'

// 404 catch-all. Mounted after every route, before errorHandler, so unmatched
// paths produce the same envelope as everything else instead of Express's
// default HTML page.
export function notFoundHandler(req, res, next) {
    next(new AppError('NOT_FOUND', { message: `Cannot ${req.method} ${req.path}` }))
}

// Build a clean { field: message } map from a Mongoose ValidationError without
// leaking Mongoose internals (paths, kinds, cast metadata).
function validationDetails(error) {
    const details = {}
    for (const field in error.errors) {
        details[field] = error.errors[field].message
    }
    return details
}

// Central error-handling middleware (4-arg). Mounted LAST in app.js. Translates
// any thrown/rejected error into the one envelope: { error: { code, message, details? } }.
// Express 5 forwards rejected promises from async handlers/middleware here
// automatically, so routes just `throw` (or `next(err)`) instead of shaping
// responses themselves.
export function errorHandler(err, req, res, next) {
    // If the response has already started streaming, hand off to Express's
    // default handler — we can't change the status/body now.
    if (res.headersSent) return next(err)

    let appError

    if (err instanceof AppError) {
        appError = err
    } else if (err?.name === 'ValidationError' && err.errors) {
        // Mongoose schema validation
        appError = new AppError('VALIDATION_ERROR', { details: validationDetails(err) })
    } else if (err?.name === 'CastError') {
        // e.g. a malformed ObjectId reaching a query
        appError = new AppError('BAD_REQUEST', { message: `Invalid value for '${err.path}'` })
    } else if (err?.code === 11000) {
        // Mongoose duplicate-key violation
        const field = Object.keys(err.keyValue ?? {})[0]
        appError = field === 'email'
            ? new AppError('DUPLICATE_ACCOUNT')
            : new AppError('CONFLICT', { message: field ? `'${field}' already exists` : undefined })
    } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
        appError = new AppError('UNAUTHORIZED')
    } else if (err?.type === 'entity.parse.failed') {
        // express.json() received malformed JSON
        appError = new AppError('BAD_REQUEST', { message: 'Malformed JSON in request body' })
    } else {
        appError = new AppError('INTERNAL_ERROR')
    }

    // Log unexpected (5xx) errors server-side with context; never leak internals
    // (message/stack) to the client.
    if (appError.status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl} ->`, err)
    }

    const body = { error: { code: appError.code, message: appError.message } }
    if (appError.details) body.error.details = appError.details

    res.status(appError.status).json(body)
}
