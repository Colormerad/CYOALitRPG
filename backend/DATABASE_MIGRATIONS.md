# Database Migrations Guide

This guide explains how to create, run, and verify database migrations for the CYOALitRPG project.

## Database Connection

The project uses PostgreSQL with connection details in `backend/.env`:
```
DATABASE_URL=postgresql://mythosAdmin:c00lTr1ck$@localhost:5432/mythosDB
```

**Note**: Some legacy scripts use hardcoded credentials:
- User: `cyoa_user`
- Database: `cyoa_litrpg` 
- Password: `cyoa_password`

## Migration Workflow

### 1. Create a Migration File

Create SQL migration files in `backend/migrations/` with this naming pattern:
```
YYYY-MM-DD_description.sql
```

Example: `2025-08-27_add_icon_key_to_character.sql`

**Always make migrations idempotent** (safe to run multiple times):

```sql
-- Check if column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'character' AND column_name = 'icon_key'
    ) THEN
        ALTER TABLE "character" ADD COLUMN icon_key TEXT;
    END IF;
END $$;
```

### 2. Create a Migration Script (Optional)

For complex migrations, create a Node.js script in `backend/scripts/`:

```javascript
// backend/scripts/add_icon_key_column.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

async function ensureIconKeyColumn() {
  const client = await pool.connect();
  try {
    console.log('[migration] Checking for icon_key column...');
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'character' AND column_name = 'icon_key'
       LIMIT 1`
    );

    if (check.rowCount > 0) {
      console.log('[migration] Column already exists. No changes made.');
      return;
    }

    console.log('[migration] Adding icon_key column...');
    await client.query('ALTER TABLE "character" ADD COLUMN icon_key TEXT');
    console.log('[migration] Column added successfully.');
  } catch (err) {
    console.error('[migration] Failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

ensureIconKeyColumn();
```

### 3. Run Migrations

#### Option A: Using the Migration Runner
```bash
# Run a specific SQL migration file
node backend/scripts/run_migration.js backend/migrations/2025-08-27_add_icon_key_to_character.sql
```

#### Option B: Using Custom Script
```bash
# Run the custom migration script
node backend/scripts/add_icon_key_column.js
```

#### Option C: Direct SQL (if you have psql access)
```bash
psql -h localhost -U cyoa_user -d cyoa_litrpg -f backend/migrations/2025-08-27_add_icon_key_to_character.sql
```

## Verification Commands

### Check if a Column Exists
```bash
node -e "
const {Pool}=require('pg');
const pool=new Pool({user:'cyoa_user',host:'localhost',database:'cyoa_litrpg',password:'cyoa_password',port:5432});
(async()=>{
  try{
    const r=await pool.query(\`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='character' AND column_name='icon_key'\`);
    console.log('Column check result:', r.rows);
    await pool.end();
  }catch(e){
    console.error('Error:', e.message);
  }
})();
"
```

### View All Columns in a Table
```bash
node -e "
const {Pool}=require('pg');
const pool=new Pool({user:'cyoa_user',host:'localhost',database:'cyoa_litrpg',password:'cyoa_password',port:5432});
(async()=>{
  try{
    const r=await pool.query(\`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='character' ORDER BY ordinal_position\`);
    console.log('Character table columns:');
    r.rows.forEach(row=>console.log(\`- \${row.column_name} (\${row.data_type})\`));
    await pool.end();
  }catch(e){
    console.error('Error:', e.message);
  }
})();
"
```

### Check Table Schema
```bash
node -e "
const {Pool}=require('pg');
const pool=new Pool({user:'cyoa_user',host:'localhost',database:'cyoa_litrpg',password:'cyoa_password',port:5432});
(async()=>{
  try{
    const r=await pool.query(\`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name\`);
    console.log('Available tables:');
    r.rows.forEach(row=>console.log(\`- \${row.table_name}\`));
    await pool.end();
  }catch(e){
    console.error('Error:', e.message);
  }
})();
"
```

## Best Practices

### 1. Always Use Idempotent Migrations
- Check if changes already exist before applying
- Use `IF NOT EXISTS` clauses
- Handle both success and already-applied cases

### 2. Test Migrations Locally First
```bash
# Test the migration
node backend/scripts/your_migration.js

# Verify it worked
node -e "/* verification command */"

# Test running it again (should be safe)
node backend/scripts/your_migration.js
```

### 3. Quote Table Names
PostgreSQL is case-sensitive. Always quote table names:
```sql
ALTER TABLE "character" ADD COLUMN new_field TEXT;
-- NOT: ALTER TABLE character ADD COLUMN new_field TEXT;
```

### 4. Backup Before Major Changes
```bash
# Create a backup before running migrations
pg_dump -h localhost -U cyoa_user cyoa_litrpg > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Connection Issues
- Verify credentials in `backend/.env` or use hardcoded values in scripts
- Check if PostgreSQL is running: `brew services list | grep postgres`
- Test connection: `psql -h localhost -U cyoa_user -d cyoa_litrpg`

### Migration Failures
- Check PostgreSQL logs for detailed error messages
- Verify table and column names (case-sensitive)
- Ensure the migration is idempotent
- Test with a minimal example first

### Production Deployment

### 1. Run Migration on Database
```bash
# Run migration script
node backend/scripts/your_migration.js

# Or run SQL migration via runner
node backend/scripts/run_migration.js backend/migrations/file.sql
```

### 2. Deploy Backend Code Changes
Push your code changes to the repository (git push).

### 3. Restart Production Server
**Method A: Using Docker Compose (Recommended)**
```bash
cd deploy
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose build --no-cache backend && docker compose up -d backend
```

**Method B: Using Deployment Script**
```bash
cd deploy
./deploy-backend.sh
```

### 4. Verify Deployment
```bash
# Check Swagger documentation is updated
curl -s https://api.mythosgame.app/api/docs.json | wc -c

# Test API endpoints directly
curl -s https://api.mythosgame.app/api/characters/52

# Verify new endpoints appear in Swagger UI
# Visit: https://api.mythosgame.app/api/docs
```

**Important**: Always use `--no-cache` flag when rebuilding to ensure code changes are picked up.

## Quick Reference

| Task | Command |
|------|---------|
| Run SQL migration | `node backend/scripts/run_migration.js backend/migrations/file.sql` |
| Run custom script | `node backend/scripts/script_name.js` |
| Check column exists | See "Verification Commands" above |
| View table schema | See "Verification Commands" above |
| Backup database | `pg_dump -h localhost -U cyoa_user cyoa_litrpg > backup.sql` |

## File Structure
```
backend/
├── migrations/           # SQL migration files
│   └── 2025-08-27_add_icon_key_to_character.sql
├── scripts/             # Migration runner scripts
│   ├── run_migration.js # Generic SQL runner
│   └── add_icon_key_column.js # Custom migration
└── .env                 # Database connection config
```
