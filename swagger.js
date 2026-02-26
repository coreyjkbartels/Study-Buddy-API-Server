import swaggerJSDoc from 'swagger-jsdoc'

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Study Buddy API',
            version: '1.0.0',
        },
        components: {
            schemas: {
                UserPublic: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        timezone: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                UserPrivate: {
                    allOf: [
                        { $ref: '#/components/schemas/UserPublic' },
                        {
                            type: 'object',
                            properties: {
                                email: { type: 'string', format: 'email' },
                                password: { type: 'string', format: 'password' },
                                updatedAt: { type: 'string', format: 'date-time' },
                            }
                        }
                    ]
                },
                UserCreateRequest: {
                    type: 'object',
                    required: [
                        'username',
                        'email',
                        'password'
                    ],
                    properties: {
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' },
                    },
                }
            },
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routers/**/*.js'],
}

const swaggerSpec = swaggerJSDoc(options)
export default swaggerSpec