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
    const res = await client.query('SELECT id FROM itemtype WHERE name = $1', [typeName]);
    if (res.rows.length) return res.rows[0].id;
    const ins = await client.query(
      'INSERT INTO itemtype (name, description) VALUES ($1, $2) RETURNING id',
      [typeName, `${typeName} items`]
    );
    return ins.rows[0].id;
  },

  async getOrCreateItemByName(client, name, typeName) {
    const res = await client.query('SELECT id FROM item WHERE name = $1', [name]);
    if (res.rows.length) return res.rows[0].id;
    const itemTypeId = await this.getOrCreateItemType(client, typeName);
    const ins = await client.query(
      `INSERT INTO item (name, description, itemtypeid, requiredlevel, value, isconsumable, usedescription, rarity)
       VALUES ($1, $2, $3, 1, 0, FALSE, $4, 'Common') RETURNING id`,
      [name, name, itemTypeId, '']
    );
    return ins.rows[0].id;
  },

  async addItemToInventory(client, characterId, itemId, quantity = 1) {
    await client.query(
      `INSERT INTO characterinventory (characterid, itemid, quantity, isequipped)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (characterid, itemid) DO UPDATE SET quantity = characterinventory.quantity + EXCLUDED.quantity`,
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
  },

  async addNamedItemToInventory(characterId, name, quantity = 1, explicitTypeName = null) {
    if (!name || typeof name !== 'string') return null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const typeName = explicitTypeName || inferItemType(name);
      const itemId = await this.getOrCreateItemByName(client, name, typeName);
      await this.addItemToInventory(client, characterId, itemId, quantity);
      await client.query('COMMIT');
      return { itemId, name, typeName, quantity };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async decrementItemQuantity(characterId, itemId, amount = 1) {
    if (!characterId || !itemId || amount <= 0) throw new Error('Invalid parameters for decrementItemQuantity');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        'SELECT quantity FROM characterinventory WHERE characterid = $1 AND itemid = $2 FOR UPDATE',
        [characterId, itemId]
      );
      if (!res.rows.length) {
        await client.query('ROLLBACK');
        return { quantity: 0, removed: false };
      }
      const current = Number(res.rows[0].quantity || 0);
      const nextQty = Math.max(0, current - amount);
      if (nextQty === 0) {
        await client.query(
          'DELETE FROM characterinventory WHERE characterid = $1 AND itemid = $2',
          [characterId, itemId]
        );
        await client.query('COMMIT');
        return { quantity: 0, removed: true };
      } else {
        await client.query(
          'UPDATE characterinventory SET quantity = $3 WHERE characterid = $1 AND itemid = $2',
          [characterId, itemId, nextQty]
        );
        await client.query('COMMIT');
        return { quantity: nextQty, removed: false };
      }
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
