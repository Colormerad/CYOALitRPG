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
  components: {
    schemas: {
      StoryNode: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Story node ID' },
          title: { type: 'string', description: 'Title of the story node' },
          content: { type: 'string', description: 'Content/text of the story node' },
          imageurl: { type: 'string', description: 'URL to the image for this node' },
          backgroundurl: { type: 'string', description: 'URL to the background image for this node' }
        }
      },
      Choice: {
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
  },
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
      put: {
        summary: 'Update story node by ID',
        description: 'Updates an existing story node',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Story node ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Title of the story node' },
                  content: { type: 'string', description: 'Content/text of the story node' },
                  imageurl: { type: 'string', description: 'URL to the image for this node' },
                  backgroundurl: { type: 'string', description: 'URL to the background image for this node' }
                },
                required: ['title', 'content']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Story node updated successfully' },
          '400': { description: 'Invalid request data' },
          '404': { description: 'Story node not found' },
          '500': { description: 'Server error' }
        }
      }
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
      post: {
        summary: 'Create new option',
        description: 'Creates a new choice/option',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  choicetext: { type: 'string', description: 'Text of the choice' },
                  targetnodeid: { type: 'integer', description: 'Target node ID this choice leads to' },
                  storynodeid: { type: 'integer', description: 'Parent story node ID' },
                  requirespassword: { type: 'boolean', description: 'Whether this choice requires a password' },
                  requiresinput: { type: 'boolean', description: 'Whether this choice requires input' },
                  requiresclass: { type: 'boolean', description: 'Whether this choice requires a class selection' }
                },
                required: ['choicetext', 'targetnodeid', 'storynodeid']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Choice created successfully' },
          '400': { description: 'Invalid request data' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/story/choices/{id}': {
      get: {
        summary: 'Get option by ID',
        description: 'Returns a specific choice/option by its ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Choice ID'
          }
        ],
        responses: {
          '200': {
            description: 'Choice details',
            content: {
              'application/json': {
                schema: {
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
          },
          '404': { description: 'Choice not found' },
          '500': { description: 'Server error' }
        }
      },
      put: {
        summary: 'Update option by ID',
        description: 'Updates an existing choice/option',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Choice ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  choicetext: { type: 'string', description: 'Text of the choice' },
                  targetnodeid: { type: 'integer', description: 'Target node ID this choice leads to' },
                  storynodeid: { type: 'integer', description: 'Parent story node ID' },
                  requirespassword: { type: 'boolean', description: 'Whether this choice requires a password' },
                  requiresinput: { type: 'boolean', description: 'Whether this choice requires input' },
                  requiresclass: { type: 'boolean', description: 'Whether this choice requires a class selection' }
                },
                required: ['choicetext', 'targetnodeid', 'storynodeid']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Choice updated successfully' },
          '400': { description: 'Invalid request data' },
          '404': { description: 'Choice not found' },
          '500': { description: 'Server error' }
        }
      }
    },

    '/story/nodes': {
      post: {
        summary: 'Create new story node',
        description: 'Creates a new story node',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Title of the story node' },
                  content: { type: 'string', description: 'Content/text of the story node' },
                  imageurl: { type: 'string', description: 'URL to the image for this node' },
                  backgroundurl: { type: 'string', description: 'URL to the background image for this node' }
                },
                required: ['title', 'content']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Story node created successfully' },
          '400': { description: 'Invalid request data' },
          '500': { description: 'Server error' }
        }
      }
    },

  },
};
