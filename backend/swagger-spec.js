module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'CYOA LitRPG API',
    version: '1.0.0',
    description: 'API documentation for the CYOA LitRPG backend'
  },
  servers: [
    { url: 'https://api.mythosgame.app/api', description: 'Cloudflare Tunnel' },
    { url: 'http://localhost:3000/api', description: 'Local' }
  ],
  components: {
    schemas: {
      StoryNode: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Story node ID' },
          title: { type: 'string', description: 'Title of the story node' },
          content: { type: 'string', description: 'Content/text of the story node' },
          nodetype: { type: 'string', description: 'Type of the story node', default: 'standard' },
          requiresinput: { type: 'boolean', description: 'Whether this node requires input', default: false },
          inputtype: { type: 'string', description: 'Type of input required (if any)' }
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
      },
      Character: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Character ID' },
          name: { type: 'string', description: 'Character name' },
          accountid: { type: 'integer', description: 'Account ID that owns this character' },
          level: { type: 'integer', description: 'Character level', default: 1 },
          experience: { type: 'integer', description: 'Character experience points', default: 0 },
          classid: { type: 'integer', description: 'Character class ID' },
          worldid: { type: 'integer', description: 'World ID where character exists', nullable: true },
          locationid: { type: 'integer', description: 'Location ID where character is located', nullable: true },
          coordinatex: { type: 'integer', description: 'X coordinate', nullable: true },
          coordinatey: { type: 'integer', description: 'Y coordinate', nullable: true },
          is_dead: { type: 'boolean', description: 'Whether character is dead', default: false },
          icon_key: { type: 'string', description: 'Character icon key', nullable: true },
          iconKey: { type: 'string', description: 'Character icon key (alias)', nullable: true },
          className: { type: 'string', description: 'Character class name' },
          createdat: { type: 'string', format: 'date-time', description: 'Creation timestamp' }
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
          '500': { description: 'Service is unhealthy' }
        }
      }
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
                  username: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Account created' },
          '409': { description: 'Account exists' },
          '400': { description: 'Validation error' }
        }
      }
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
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' }
        }
      }
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
                  name: { type: 'string' }
                },
                required: ['accountId', 'name']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Character created' },
          '400': { description: 'Validation error' }
        }
      }
    },
    '/characters/{id}': {
      get: {
        summary: 'Get character by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Character' },
          '404': { description: 'Not found' }
        }
      }
    },
    '/story/start': {
      get: {
        summary: 'Get first story node',
        responses: { '200': { description: 'Node' } }
      }
    },
    '/story/nodes/{id}': {
      get: {
        summary: 'Get story node by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Node' },
          '404': { description: 'Not found' }
        }
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
                  nodetype: { type: 'string', description: 'Type of the story node', default: 'standard' },
                  requiresinput: { type: 'boolean', description: 'Whether this node requires input', default: false },
          inputtype: { type: 'string', description: 'Type of input required (if any)' }
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
          { in: 'path', name: 'characterId', required: true, schema: { type: 'integer' } }
        ],
        responses: { '200': { description: 'Progress' } }
      }
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
                  classId: { type: 'integer' }
                },
                required: ['characterId', 'choiceId']
              }
            }
          }
        },
        responses: { '200': { description: 'Progress updated' } }
      }
    },
    '/story/progress/{characterId}/advance': {
      post: {
        summary: 'Advance progress explicitly',
        parameters: [
          { in: 'path', name: 'characterId', required: true, schema: { type: 'integer' } }
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
                  choiceId: { type: 'integer' }
                },
                required: ['nextNodeId']
              }
            }
          }
        },
        responses: { '200': { description: 'Progress updated' } }
      }
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
        }
      },
      post: {
        summary: 'Create new choice/option',
        description: 'Creates a new choice/option for a story node with metadata impacts and effects',
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
                    nextnodeid: { type: 'integer', description: 'Target node ID this choice leads to' },
                    storynodeid: { type: 'integer', description: 'Parent story node ID' },
                    metadataimpact: { 
                      type: 'object', 
                      description: 'JSONB object describing character metadata changes',
                      additionalProperties: true
                    },
                    effects: { 
                      type: 'object', 
                      description: 'JSONB object describing game effects',
                      additionalProperties: true
                    }
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
        description: 'Creates a new story node with optional choices, metadata impacts, and effects',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Title of the story node' },
                  content: { type: 'string', description: 'Content/text of the story node' },
                  nodetype: { type: 'string', description: 'Type of the story node', default: 'standard' },
                  requiresinput: { type: 'boolean', description: 'Whether this node requires input', default: false },
          inputtype: { type: 'string', description: 'Type of input required (if any)' }
                },
                required: ['title', 'content']
              }
            }
          }
        },
        responses: {
          '201': { 
            description: 'Story node created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', description: 'ID of the created story node' },
                    title: { type: 'string', description: 'Title of the story node' },
                    content: { type: 'string', description: 'Content of the story node' },
                    nodetype: { type: 'string', description: 'Type of the story node' },
                    requiresinput: { type: 'boolean', description: 'Whether this node requires input' },
                    inputtype: { type: 'string', description: 'Type of input required' },
                    createdat: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
                    updatedat: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
                    choices: {
                      type: 'array',
                      description: 'Array of choices created with this story node',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', description: 'Choice ID' },
                          choicetext: { type: 'string', description: 'Text of the choice' },
                          nextnodeid: { type: 'integer', description: 'ID of the next story node' },
                          metadataimpact: { type: 'object', description: 'Character metadata changes' },
                          effects: { type: 'object', description: 'Game effects' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid request data' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/characters/user/{userId}': {
      get: {
        summary: 'Get characters by user ID',
        description: 'Returns all characters belonging to a specific user/account',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'User/Account ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of characters',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Character' }
                }
              }
            }
          },
          '500': { description: 'Server error' }
        }
      }
    },
    '/characters/{id}': {
      get: {
        summary: 'Get character by ID',
        description: 'Returns a specific character by its ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Character ID'
          }
        ],
        responses: {
          '200': {
            description: 'Character details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Character' }
              }
            }
          },
          '404': { description: 'Character not found' },
          '500': { description: 'Server error' }
        }
      },
      put: {
        summary: 'Update character',
        description: 'Updates a character with new data including name, level, experience, and icon',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Character ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Character name' },
                  level: { type: 'integer', description: 'Character level' },
                  experience: { type: 'integer', description: 'Experience points' },
                  icon_key: { type: 'string', description: 'Character icon key', nullable: true },
                  iconKey: { type: 'string', description: 'Character icon key (alias)', nullable: true },
                  character_name: { type: 'string', description: 'Character name (compatibility)' },
                  account_id: { type: 'integer', description: 'Account ID (compatibility)' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Character updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Character' }
              }
            }
          },
          '400': { description: 'Invalid request data' },
          '404': { description: 'Character not found' },
          '500': { description: 'Server error' }
        }
      }
    }
  }
};
