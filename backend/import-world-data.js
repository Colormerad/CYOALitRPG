const pool = require('./db-connection');

// World data for Virelia
const worldData = {
  name: "Virelia",
  dimensions: { x: 10000, y: 10000 },
  description: "A sprawling, magic-scarred continent where players can forge any path—adventurer, merchant, explorer, or loreseeker. Every coordinate has meaning, history, and danger."
};

// Region data for Virelia
const regionData = [
  {
    name: "Tundra",
    x_range: [0, 2000],
    y_range: [0, 3000],
    features: ["frozen ruins", "icebound temples", "scarce wildlife"],
    travel_modifier: 2,
    encounter_rate: 0.4,
    magic_level: "low",
    faction_bias: ["Forgotten Seers"]
  },
  {
    name: "Mountains",
    x_range: [2000, 4000],
    y_range: [0, 3000],
    features: ["dragon lairs", "deep mines", "mountain passes"],
    travel_modifier: 3,
    encounter_rate: 0.5,
    magic_level: "medium",
    faction_bias: ["Stoneclad Brotherhood"]
  },
  {
    name: "Hills",
    x_range: [4000, 6000],
    y_range: [0, 2000],
    features: ["villages", "caves", "outposts"],
    travel_modifier: 1.2,
    encounter_rate: 0.3,
    magic_level: "low",
    faction_bias: ["Guild of the Many Hands"]
  },
  {
    name: "Urban/Plains",
    x_range: [4000, 6000],
    y_range: [2000, 3000],
    features: ["city walls", "farming estates", "trade routes"],
    travel_modifier: 1,
    encounter_rate: 0.2,
    magic_level: "low",
    faction_bias: ["High Council of Regence"]
  },
  {
    name: "Wasteland",
    x_range: [3000, 5000],
    y_range: [3000, 4000],
    features: ["arcane storms", "floating debris", "twisted monsters"],
    travel_modifier: 2.5,
    encounter_rate: 0.6,
    magic_level: "very high",
    faction_bias: ["Crimson Pact", "Lantern Archive"]
  },
  {
    name: "Forest/Jungle",
    x_range: [0, 4000],
    y_range: [4000, 7000],
    features: ["ancient groves", "overgrown ruins", "forest spirits"],
    travel_modifier: 2,
    encounter_rate: 0.5,
    magic_level: "high",
    faction_bias: ["Wyrdshaman Circle"]
  },
  {
    name: "Plains",
    x_range: [6000, 8000],
    y_range: [3000, 5000],
    features: ["rivers", "fields", "small towns"],
    travel_modifier: 1,
    encounter_rate: 0.2,
    magic_level: "low",
    faction_bias: ["Merchant Accord"]
  },
  {
    name: "Swamp/Coastal",
    x_range: [6000, 8000],
    y_range: [5000, 8000],
    features: ["tidal flats", "hidden bays", "salt marshes"],
    travel_modifier: 1.5,
    encounter_rate: 0.4,
    magic_level: "medium",
    faction_bias: ["Black Fleet"]
  },
  {
    name: "Desert",
    x_range: [8000, 10000],
    y_range: [0, 5000],
    features: ["sandstorms", "lost cities", "crystalline monoliths"],
    travel_modifier: 2.5,
    encounter_rate: 0.3,
    magic_level: "medium",
    faction_bias: ["Ash Dervishes"]
  },
  {
    name: "Jungle",
    x_range: [8000, 10000],
    y_range: [5000, 10000],
    features: ["bioluminescent flora", "forgotten temples", "prehistoric beasts"],
    travel_modifier: 3,
    encounter_rate: 0.6,
    magic_level: "very high",
    faction_bias: ["Emerald Court"]
  }
];

// City/Location data for Virelia
const locationData = [
  {
    name: "Highspire",
    type: "Capital City",
    coordinates: [5200, 2200],
    region: "Averwyn",
    terrain: "Urban/Plains",
    factions_present: ["High Council of Regence", "Merchant Accord"],
    hooks: ["noble intrigue", "political quests", "guild espionage"]
  },
  {
    name: "Black Hollow",
    type: "Town",
    coordinates: [3800, 4800],
    region: "Vaskyr Wilds",
    terrain: "Forest",
    factions_present: ["Wyrdshaman Circle"],
    hooks: ["beast hunting", "ritual magic", "lost druid relics"]
  },
  {
    name: "Seaview",
    type: "Port City",
    coordinates: [6500, 6000],
    region: "Umbral Coast",
    terrain: "Coastal",
    factions_present: ["Black Fleet", "Merchant Accord"],
    hooks: ["naval trade", "pirate conflict", "sea god cults"]
  },
  {
    name: "Greyglass",
    type: "Floating Ruins",
    coordinates: [4500, 3500],
    region: "Shattered Reach",
    terrain: "Wasteland",
    factions_present: ["Lantern Archive", "Crimson Pact"],
    hooks: ["unstable magic", "forbidden knowledge", "artifact salvage"]
  }
];

// Faction data for Virelia
const factionData = [
  {
    name: "High Council of Regence",
    type: "Government",
    ideology: "Stability through shared rule",
    zones_of_influence: [[4000, 6000], [1000, 3000]]
  },
  {
    name: "Black Fleet",
    type: "Pirate Confederacy",
    ideology: "Freedom through domination of the seas",
    zones_of_influence: [[6000, 8000], [5000, 8000]]
  },
  {
    name: "Wyrdshaman Circle",
    type: "Druidic Order",
    ideology: "Balance and wild sovereignty",
    zones_of_influence: [[2000, 4000], [4000, 7000]]
  },
  {
    name: "Crimson Pact",
    type: "Occult Cabal",
    ideology: "Power through dark contracts",
    zones_of_influence: [[3000, 5000], [3000, 4000]]
  }
];

// Main import function
async function importWorldData() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Importing world data...');
    
    // Insert world data
    const worldResult = await client.query(
      `INSERT INTO World (Name, Description, DimensionsX, DimensionsY) 
       VALUES ($1, $2, $3, $4) 
       RETURNING Id`,
      [worldData.name, worldData.description, worldData.dimensions.x, worldData.dimensions.y]
    );
    
    const worldId = worldResult.rows[0].id;
    console.log(`Created world: ${worldData.name} with ID: ${worldId}`);
    
    // Insert region data
    console.log('Importing region data...');
    for (const region of regionData) {
      await client.query(
        `INSERT INTO Region 
         (WorldId, Name, XRangeStart, XRangeEnd, YRangeStart, YRangeEnd, 
          Features, TravelModifier, EncounterRate, MagicLevel, FactionBias) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          worldId,
          region.name,
          region.x_range[0],
          region.x_range[1],
          region.y_range[0],
          region.y_range[1],
          JSON.stringify(region.features),
          region.travel_modifier,
          region.encounter_rate,
          region.magic_level,
          JSON.stringify(region.faction_bias)
        ]
      );
      console.log(`Imported region: ${region.name}`);
    }
    
    // Insert location data
    console.log('Importing location data...');
    for (const location of locationData) {
      await client.query(
        `INSERT INTO Location 
         (WorldId, Name, Type, CoordinateX, CoordinateY, RegionName, 
          Terrain, FactionsPresent, Hooks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          worldId,
          location.name,
          location.type,
          location.coordinates[0],
          location.coordinates[1],
          location.region,
          location.terrain,
          JSON.stringify(location.factions_present),
          JSON.stringify(location.hooks)
        ]
      );
      console.log(`Imported location: ${location.name}`);
    }
    
    // Insert faction data
    console.log('Importing faction data...');
    for (const faction of factionData) {
      await client.query(
        `INSERT INTO Faction 
         (WorldId, Name, Type, Ideology, ZonesOfInfluence) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          worldId,
          faction.name,
          faction.type,
          faction.ideology,
          JSON.stringify(faction.zones_of_influence)
        ]
      );
      console.log(`Imported faction: ${faction.name}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('World data import completed successfully!');
    
  } catch (err) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error importing world data:', err);
    throw err;
  } finally {
    // Release client
    client.release();
  }
}

// Run the import
importWorldData()
  .then(() => {
    console.log('Import process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import process failed:', err);
    process.exit(1);
  });
