const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db-connection');
const storyRoutes = require('./routes/story-routes');
const profileRoutes = require('./routes/profile-routes');
const characterRoutes = require('./routes/character-routes');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/story', storyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/characters', characterRoutes);

// PostgreSQL connection is now imported from db-connection.js

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ status: 'healthy', timestamp: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Username is optional, but if provided, validate it
    if (username && (username.length < 3 || username.length > 20)) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if account already exists
    const existingAccount = await pool.query('SELECT Id FROM Account WHERE Email = $1', [email]);
    if (existingAccount.rows.length > 0) {
      return res.status(409).json({ error: 'Account with this email already exists' });
    }
    
    // Check if username is already taken (if provided)
    if (username) {
      const existingUsername = await pool.query('SELECT Id FROM Account WHERE Username = $1', [username]);
      if (existingUsername.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Use the provided username or default to null
    const usernameValue = username || null;
    
    const result = await pool.query(
      'INSERT INTO Account (Email, PasswordHash, Username) VALUES ($1, $2, $3) RETURNING Id, Email, Username, CreatedAt',
      [email, passwordHash, usernameValue]
    );
    
    const account = result.rows[0];
    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully',
      account 
    });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find account
    const result = await pool.query('SELECT * FROM Account WHERE Email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const account = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, account.passwordhash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Return account info (without password hash)
    res.json({
      success: true,
      message: 'Login successful',
      account: {
        id: account.id,
        email: account.email,
        username: account.username || 'Player' + account.id, // Use username if available, otherwise fallback
        createdAt: account.createdat
      }
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Account endpoints
app.post('/api/accounts', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Use the provided username or default to null
    const usernameValue = username || null;
    
    const result = await pool.query(
      'INSERT INTO Account (Email, PasswordHash, Username) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, usernameValue]
    );
    
    const account = result.rows[0];
    delete account.passwordhash; // Don't send password hash back
    res.json(account);
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT Id, Email, Username, CreatedAt FROM Account WHERE Id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching account:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update account endpoint
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username && !email && !password) {
      return res.status(400).json({ error: 'At least one field (username, email, or password) must be provided' });
    }
    
    // Check if account exists
    const accountCheck = await pool.query('SELECT * FROM Account WHERE Id = $1', [id]);
    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check email uniqueness if email is being updated
    if (email) {
      const emailCheck = await pool.query('SELECT Id FROM Account WHERE Email = $1 AND Id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email is already in use' });
      }
    }
    
    // Check username uniqueness if username is being updated
    if (username) {
      const usernameCheck = await pool.query('SELECT Id FROM Account WHERE Username = $1 AND Id != $2', [username, id]);
      if (usernameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already in use' });
      }
    }
    
    // Build the update query dynamically based on provided fields
    let updateQuery = 'UPDATE Account SET ';
    const updateValues = [];
    const updateFields = [];
    let paramIndex = 1;
    
    if (username) {
      updateFields.push(`Username = $${paramIndex}`);
      updateValues.push(username);
      paramIndex++;
    }
    
    if (email) {
      updateFields.push(`Email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateFields.push(`PasswordHash = $${paramIndex}`);
      updateValues.push(passwordHash);
      paramIndex++;
    }
    
    updateQuery += updateFields.join(', ');
    updateQuery += ` WHERE Id = $${paramIndex} RETURNING Id, Email, Username, CreatedAt`;
    updateValues.push(id);
    
    const result = await pool.query(updateQuery, updateValues);
    
    res.json({
      success: true,
      message: 'Account updated successfully',
      account: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Character endpoints now handled by character-routes.js

app.get('/api/characters/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cs.*, s.Name as StatName, s.Description as StatDescription 
      FROM CharacterStat cs 
      JOIN Stat s ON cs.StatId = s.Id 
      WHERE cs.CharacterId = $1
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching character stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/characters/:id/skills', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cs.*, s.Name as SkillName, s.Description as SkillDescription, sc.Name as CategoryName
      FROM CharacterSkill cs 
      JOIN Skill s ON cs.SkillId = s.Id 
      JOIN SkillCategory sc ON s.SkillCategoryId = sc.Id
      WHERE cs.CharacterId = $1
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching character skills:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/characters/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ci.*, i.Name as ItemName, i.Description as ItemDescription, 
             i.Value, i.Rarity, it.Name as ItemTypeName
      FROM CharacterInventory ci 
      JOIN Item i ON ci.ItemId = i.Id 
      JOIN ItemType it ON i.ItemTypeId = it.Id
      WHERE ci.CharacterId = $1
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching character inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts/:accountId/characters', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await pool.query('SELECT * FROM Character WHERE AccountId = $1', [accountId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching account characters:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stats endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Stat ORDER BY Id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Skills endpoints
app.get('/api/skills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sc.Name as CategoryName 
      FROM Skill s 
      JOIN SkillCategory sc ON s.SkillCategoryId = sc.Id 
      ORDER BY sc.Id, s.Id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching skills:', err);
    res.status(500).json({ error: err.message });
  }
});

// Items endpoints
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, it.Name as ItemTypeName 
      FROM Item i 
      JOIN ItemType it ON i.ItemTypeId = it.Id 
      ORDER BY i.Id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.*, it.Name as ItemTypeName 
      FROM Item i 
      JOIN ItemType it ON i.ItemTypeId = it.Id 
      WHERE i.Id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Spells endpoints
app.get('/api/spells', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sc.Name as CategoryName 
      FROM Spell s 
      JOIN SpellCategory sc ON s.SpellCategoryId = sc.Id 
      ORDER BY sc.Id, s.Id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spells:', err);
    res.status(500).json({ error: err.message });
  }
});

// Game mechanics endpoints
app.post('/api/characters/:id/level-up', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get character
    const characterResult = await pool.query('SELECT * FROM Character WHERE Id = $1', [id]);
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    const experienceRequired = character.level * 100;
    
    if (character.experience >= experienceRequired) {
      const newLevel = character.level + 1;
      const remainingExperience = character.experience - experienceRequired;
      
      await pool.query(
        'UPDATE Character SET Level = $1, Experience = $2 WHERE Id = $3',
        [newLevel, remainingExperience, id]
      );
      
      res.json({ 
        success: true, 
        newLevel, 
        remainingExperience,
        message: `Character leveled up to level ${newLevel}!` 
      });
    } else {
      res.json({ 
        success: false, 
        message: `Need ${experienceRequired - character.experience} more experience to level up` 
      });
    }
  } catch (err) {
    console.error('Error leveling up character:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters/:id/add-experience', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    const result = await pool.query(
      'UPDATE Character SET Experience = Experience + $1 WHERE Id = $2 RETURNING *',
      [amount, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding experience:', err);
    res.status(500).json({ error: err.message });
  }
});

// Demo data endpoint
app.get('/api/demo/character', async (req, res) => {
  try {
    // Get the demo character with all related data
    const characterResult = await pool.query('SELECT * FROM Character WHERE Id = 1');
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demo character not found' });
    }
    
    const character = characterResult.rows[0];
    
    // Get character stats
    const statsResult = await pool.query(`
      SELECT cs.*, s.Name as StatName 
      FROM CharacterStat cs 
      JOIN Stat s ON cs.StatId = s.Id 
      WHERE cs.CharacterId = 1
    `);
    
    // Get character skills
    const skillsResult = await pool.query(`
      SELECT cs.*, s.Name as SkillName 
      FROM CharacterSkill cs 
      JOIN Skill s ON cs.SkillId = s.Id 
      WHERE cs.CharacterId = 1
    `);
    
    // Get character inventory
    const inventoryResult = await pool.query(`
      SELECT ci.*, i.Name as ItemName, i.Rarity 
      FROM CharacterInventory ci 
      JOIN Item i ON ci.ItemId = i.Id 
      WHERE ci.CharacterId = 1
    `);
    
    res.json({
      character,
      stats: statsResult.rows,
      skills: skillsResult.rows,
      inventory: inventoryResult.rows
    });
  } catch (err) {
    console.error('Error fetching demo character:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`RPG Game backend server running at http://localhost:${port}`);
});

module.exports = app;
