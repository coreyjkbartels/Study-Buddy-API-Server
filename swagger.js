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
                },

                Course: {
                    type: 'object',

                    properties: {
                        title: { type: 'string' },
                        courseName: { type: 'string' },
                        courseCode: { type: 'string' },
                        school: { type: 'string' },
                        createdBy: { type: 'string' },
                        joinCode: { type: 'string' },
                        isPublic: { type: 'boolean' },
                    }
                },

                CourseCreateRequest: {
                    type: 'object',

                    required: [
                        'courseName',
                        'courseCode'
                    ],

                    properties: {
                        title: { type: 'string' },
                        courseName: { type: 'string' },
                        courseCode: { type: 'string' },
                        school: { type: 'string' },
                        isPublic: { type: 'boolean' },
                    }
                },

                AssignmentCreateRequest: {
                    type: 'object',

                    required: [
                        'title',
                        'dueAt'
                    ],

                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'archived'] },
                        dueAt: { type: 'string' },
                    }

                },

                Assignment: {
                    allOf: [
                        { $ref: '#/components/schemas/AssignmentCreateRequest' },
                        {
                            type: 'object',
                            properties: {
                                createdBy: { type: 'string' },
                                course: { type: 'string' },
                                source: { type: 'string' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' },
                            }
                        }
                    ]
                },

                AssignmentPatchRequest: {
                    type: 'object',

                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        dueAt: { type: 'string' },
                    }
                },

                AssignmentUserState: {
                    type: 'object',

                    required: [
                        'assignment',
                        'course',
                        'user'
                    ],

                    properties: {
                        assignment: { type: 'string' },
                        course: { type: 'string' },
                        user: { type: 'string' },
                        state: { type: 'string' },
                        personalNotes: { type: 'string' },
                        personalDueAt: { type: 'string' },
                        completedAt: { type: 'string' },
                    }

                },

                AssignmentUserStateExpanded: {
                    type: 'object',

                    properties: {
                        assignment: {
                            $ref: '#/components/schemas/Assignment'
                        },
                        course: {
                            $ref: '#/components/schemas/Course'
                        },
                        user: { type: 'string' },
                        state: { type: 'string' },
                        personalNotes: { type: 'string' },
                        personalDueAt: { type: 'string' },
                        completedAt: { type: 'string' },
                    }

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