const fs = require('fs');
const { Pool } = require('pg');
const csv = require('csv-parser');
const path = require('path');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

// Path to CSV file
const csvFilePath = path.resolve(process.env.HOME, 'Desktop', 'LitRPG_Classes_Full.csv');

// Function to import classes from CSV
async function importClasses() {
  try {
    console.log('Starting class import process...');
    console.log(`Reading CSV file from: ${csvFilePath}`);

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`CSV file not found at ${csvFilePath}`);
      process.exit(1);
    }

    // Create a client from the pool
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Process CSV file
      const results = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log(`Found ${results.length} classes in CSV file`);
          
          // Process each class
          for (const classData of results) {
            try {
              // Insert class
              const classResult = await client.query(
                `INSERT INTO Class (Name, Description, StrengthBonus, DexterityBonus, ConstitutionBonus, 
                                   IntelligenceBonus, WisdomBonus, CharismaBonus)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING Id`,
                [
                  classData['Class Name'],
                  classData['Description'],
                  parseInt(classData['STR']),
                  parseInt(classData['DEX']),
                  parseInt(classData['CON']),
                  parseInt(classData['INT']),
                  parseInt(classData['WIS']),
                  parseInt(classData['CHA'])
                ]
              );
              
              const classId = classResult.rows[0].id;
              console.log(`Inserted class: ${classData['Class Name']} with ID: ${classId}`);
              
              // Insert outfit
              await client.query(
                `INSERT INTO ClassOutfit (ClassId, Description)
                 VALUES ($1, $2)`,
                [classId, classData['Outfit']]
              );
              console.log(`Inserted outfit for class: ${classData['Class Name']}`);
              
              // Parse and insert starting equipment
              const equipmentItems = parseEquipmentString(classData['Starting Equipment']);
              for (const item of equipmentItems) {
                await client.query(
                  `INSERT INTO ClassStartingEquipment (ClassId, Description)
                   VALUES ($1, $2)`,
                  [classId, item]
                );
              }
              console.log(`Inserted ${equipmentItems.length} equipment items for class: ${classData['Class Name']}`);
              
            } catch (err) {
              console.error(`Error processing class ${classData['Class Name']}:`, err);
              throw err;
            }
          }
          
          // Commit transaction
          await client.query('COMMIT');
          console.log('Class import completed successfully!');
          client.release();
          process.exit(0);
        });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during import, transaction rolled back:', err);
      client.release();
      process.exit(1);
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
}

// Helper function to parse equipment string into individual items
function parseEquipmentString(equipmentString) {
  if (!equipmentString) return [];
  
  // Split by commas, but handle special cases where commas are part of item description
  const items = [];
  let currentItem = '';
  let inParentheses = false;
  
  for (let i = 0; i < equipmentString.length; i++) {
    const char = equipmentString[i];
    
    if (char === '(') {
      inParentheses = true;
      currentItem += char;
    } else if (char === ')') {
      inParentheses = false;
      currentItem += char;
    } else if (char === ',' && !inParentheses) {
      // End of an item
      items.push(currentItem.trim());
      currentItem = '';
    } else {
      currentItem += char;
    }
  }
  
  // Add the last item if there is one
  if (currentItem.trim()) {
    items.push(currentItem.trim());
  }
  
  return items.filter(item => item.length > 0);
}

// Run the import
importClasses();
