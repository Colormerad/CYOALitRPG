module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'CYOA LitRPG API',
    version: '1.0.0',
    description: 'API documentation for the CYOA LitRPG backend',
  },
  servers: [
    { url: 'https://api.mythosgame.app/api', description: 'Cloudflare Tunnel' },
    { url: 'http://localhost:3000/api', description: 'Local' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy' },
          '500': { description: 'Service is unhealthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  username: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account created' },
          '409': { description: 'Account exists' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/characters': {
      post: {
        summary: 'Create character',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accountId: { type: 'integer' },
                  name: { type: 'string' },
                },
                required: ['accountId', 'name'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Character created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/characters/{id}': {
      get: {
        summary: 'Get character by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Character' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/story/start': {
      get: {
        summary: 'Get first story node',
        responses: { '200': { description: 'Node' } },
      },
    },
    '/story/nodes/{id}': {
      get: {
        summary: 'Get story node by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Node' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/story/progress/{characterId}': {
      get: {
        summary: 'Get player progress',
        parameters: [
          { in: 'path', name: 'characterId', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Progress' } },
      },
    },
    '/story/choice': {
      post: {
        summary: 'Make a choice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  characterId: { type: 'integer' },
                  choiceId: { type: 'integer' },
                  inputValue: { type: 'string' },
                  classId: { type: 'integer' },
                },
                required: ['characterId', 'choiceId'],
              },
            },
          },
        },
        responses: { '200': { description: 'Progress updated' } },
      },
    },
    '/story/progress/{characterId}/advance': {
      post: {
        summary: 'Advance progress explicitly',
        parameters: [
          { in: 'path', name: 'characterId', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nextNodeId: { type: 'integer' },
                  experienceGain: { type: 'integer' },
                  choiceId: { type: 'integer' },
                },
                required: ['nextNodeId'],
              },
            },
          },
        },
        responses: { '200': { description: 'Progress updated' } },
      },
    },
    '/story/choices': {
      get: {
        summary: 'Get all choices and their options',
        description: 'Returns all story choices organized by their parent story nodes',
        responses: { 
          '200': { 
            description: 'List of all choices grouped by story node',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nodeId: { type: 'integer', description: 'ID of the story node' },
                      nodeTitle: { type: 'string', description: 'Title of the story node' },
                      choices: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', description: 'Choice ID' },
                            choicetext: { type: 'string', description: 'Text of the choice' },
                            targetnodeid: { type: 'integer', description: 'Target node ID this choice leads to' },
                            storynodeid: { type: 'integer', description: 'Parent story node ID' },
                            requirespassword: { type: 'boolean', description: 'Whether this choice requires a password' },
                            requiresinput: { type: 'boolean', description: 'Whether this choice requires input' },
                            requiresclass: { type: 'boolean', description: 'Whether this choice requires a class selection' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '500': { description: 'Server error' }
        },
      },
    },
  },
};
