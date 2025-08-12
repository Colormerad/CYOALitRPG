const { pool } = require('./db');

function inferItemType(description) {
  const d = (description || '').toLowerCase();
  if (/(sword|knife|dagger|hammer|mace|axe|bow|staff|wand|spear)/.test(d)) return 'Weapon';
  if (/(armor|apron|robe|helmet|helm|shield|gauntlet|boots|gloves|cloak)/.test(d)) return 'Armor';
  if (/(potion|elixir|tonic|scroll)/.test(d)) return 'Consumable';
  if (/(ring|amulet|necklace|trinket)/.test(d)) return 'Accessory';
  return 'Material';
}

module.exports = {
  async getOrCreateItemType(client, name) {
    const typeName = name;
    const res = await client.query('SELECT Id FROM ItemType WHERE Name = $1', [typeName]);
    if (res.rows.length) return res.rows[0].id;
    const ins = await client.query(
      'INSERT INTO ItemType (Name, Description) VALUES ($1, $2) RETURNING Id',
      [typeName, `${typeName} items`]
    );
    return ins.rows[0].id;
  },

  async getOrCreateItemByName(client, name, typeName) {
    const res = await client.query('SELECT Id FROM Item WHERE Name = $1', [name]);
    if (res.rows.length) return res.rows[0].id;
    const itemTypeId = await this.getOrCreateItemType(client, typeName);
    const ins = await client.query(
      `INSERT INTO Item (Name, Description, ItemTypeId, RequiredLevel, Value, IsConsumable, UseDescription, Rarity)
       VALUES ($1, $2, $3, 1, 0, FALSE, $4, 'Common') RETURNING Id`,
      [name, name, itemTypeId, '']
    );
    return ins.rows[0].id;
  },

  async addItemToInventory(client, characterId, itemId, quantity = 1) {
    await client.query(
      `INSERT INTO CharacterInventory (CharacterId, ItemId, Quantity, IsEquipped)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (CharacterId, ItemId) DO UPDATE SET Quantity = CharacterInventory.Quantity + EXCLUDED.Quantity`,
      [characterId, itemId, quantity]
    );
  },

  async addDescriptionsAsItemsToInventory(characterId, equipmentRows) {
    if (!equipmentRows || equipmentRows.length === 0) return [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const added = [];
      for (const row of equipmentRows) {
        const desc = row.description || row.Description;
        if (!desc) continue;
        const typeName = inferItemType(desc);
        const itemId = await this.getOrCreateItemByName(client, desc, typeName);
        await this.addItemToInventory(client, characterId, itemId, 1);
        added.push({ itemId, name: desc, typeName });
      }
      await client.query('COMMIT');
      return added;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
