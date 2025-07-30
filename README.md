# CYOALitRPG - Choose Your Own Adventure LitRPG Game

A mobile-first Choose Your Own Adventure LitRPG game built with Ionic Angular and PostgreSQL.

## Features

- **Interactive Story**: Navigate through branching storylines with meaningful choices
- **Character Progression**: Level up your character with experience, stats, and abilities
- **Database Integration**: PostgreSQL backend for persistent game state
- **Modern UI**: Beautiful, responsive interface with animations and effects
- **Real-time Updates**: Live character stats and story progression

## Tech Stack

- **Frontend**: Ionic 8 + Angular 20
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## Prerequisites

Before running the application, make sure you have the following installed:

1. **Node.js** (v20 or higher)
2. **npm** (comes with Node.js)
3. **Docker** and **Docker Compose**
4. **Ionic CLI** (install with `npm install -g @ionic/cli`)

## Installation & Setup

### 1. Install Docker (if not already installed)

**macOS:**
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Or using Homebrew:
brew install --cask docker
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Clone and Setup the Project

```bash
# Navigate to the project directory
cd CYOALitRPG

# Install frontend dependencies (already done)
npm install

# Install backend dependencies (already done)
cd backend
npm install
cd ..
```

### 3. Start the Database

```bash
# Start PostgreSQL database with Docker
docker compose up -d

# Verify the database is running
docker compose ps
```

The database will be initialized with:
- Database: `cyoa_litrpg`
- Username: `cyoa_user`
- Password: `cyoa_password`
- Port: `5432`

### 4. Start the Backend Server

```bash
# In a new terminal, navigate to backend directory
cd backend

# Start the API server
npm start
```

The backend server will run on `http://localhost:3000`

### 5. Start the Ionic App

```bash
# In another terminal, from the project root
ionic serve
```

The Ionic app will run on `http://localhost:8100`

## Database Schema

The game uses the following main tables:

- **users**: Player accounts
- **characters**: Player characters with stats
- **story_nodes**: Story content and narrative
- **choices**: Available choices for each story node
- **user_progress**: Player progress tracking

## API Endpoints

### Health Check
- `GET /api/health` - Check database connection

### Users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details

### Characters
- `POST /api/characters` - Create new character
- `GET /api/characters/:id` - Get character details
- `PUT /api/characters/:id` - Update character stats
- `GET /api/users/:userId/characters` - Get user's characters

### Story
- `GET /api/story-nodes/:id` - Get story node content
- `GET /api/story-nodes/:nodeId/choices` - Get available choices

### Game Mechanics
- `POST /api/make-choice` - Make a story choice and apply consequences

## Development

### Project Structure

```
CYOALitRPG/
├── src/                    # Ionic Angular frontend
│   ├── app/
│   │   ├── services/       # Database service
│   │   └── home/          # Main game interface
├── backend/               # Node.js API server
│   ├── server.js         # Express server
│   └── package.json      # Backend dependencies
├── docker-compose.yml    # PostgreSQL container
├── init.sql             # Database initialization
└── README.md           # This file
```

### Adding New Story Content

1. Add new story nodes to the `story_nodes` table
2. Add corresponding choices to the `choices` table
3. Link choices to next story nodes via `next_node_id`
4. Define stat requirements and consequences in JSON format

### Customizing Character Stats

Edit the character creation in `backend/server.js` or modify the database schema in `init.sql` to add new stats or abilities.

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker ps`
- Check database logs: `docker compose logs postgres`
- Verify connection settings in `backend/server.js`

### Backend API Issues
- Check if backend is running on port 3000
- Verify database connection with `/api/health` endpoint
- Check backend logs for errors

### Frontend Issues
- Ensure HttpClientModule is imported in `app.module.ts`
- Check browser console for JavaScript errors
- Verify API calls in Network tab

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project as a starting point for your own games!

## Future Enhancements

- [ ] User authentication and registration
- [ ] Multiple character slots per user
- [ ] Inventory and item system
- [ ] Combat mechanics
- [ ] Achievement system
- [ ] Story branching based on character stats
- [ ] Multiplayer features
- [ ] Mobile app deployment (iOS/Android)
