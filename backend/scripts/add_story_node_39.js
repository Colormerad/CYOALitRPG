const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const startId = 1; // per latest JSON
    const startCheck = await client.query('SELECT id FROM StoryNode WHERE id = $1', [startId]);
    if (startCheck.rowCount === 0) {
      console.warn(`[add_story_node_39] Warning: Start node id=${startId} not found.`);
    }

    const node = {
      id: 39,
      title: 'The End',
      content: 'Darkness envelops you as your choices lead to an unfortunate end. But in this realm of stories, death is merely another beginning...',
      nodeType: 'standard',
      requiresInput: false,
      inputType: null,
      createdAt: '2025-08-13T19:28:44.296Z',
      updatedAt: '2025-08-13T19:28:44.296Z'
    };

    await client.query(
      `INSERT INTO StoryNode (Id, Title, Content, NodeType, RequiresInput, InputType, CreatedAt, UpdatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (Id) DO UPDATE SET
         Title = EXCLUDED.Title,
         Content = EXCLUDED.Content,
         NodeType = EXCLUDED.NodeType,
         RequiresInput = EXCLUDED.RequiresInput,
         InputType = EXCLUDED.InputType,
         UpdatedAt = EXCLUDED.UpdatedAt`,
      [node.id, node.title, node.content, node.nodeType, node.requiresInput, node.inputType, node.createdAt, node.updatedAt]
    );

    const choice = {
      id: 121,
      storyNodeId: 39,
      choiceText: 'Try again from the beginning',
      nextNodeId: startId,
      metadataImpact: { learning: 1, resilience: 1 },
      effects: {},
      createdAt: '2025-08-13T19:28:44.296Z',
      updatedAt: '2025-08-13T19:28:44.296Z'
    };

    // Check if Effects column exists
    let hasEffects = true;
    try {
      await client.query('SELECT Effects FROM StoryChoice LIMIT 1');
    } catch (e) {
      hasEffects = false;
    }

    if (hasEffects) {
      await client.query(
        `INSERT INTO StoryChoice (Id, StoryNodeId, ChoiceText, NextNodeId, MetadataImpact, Effects, CreatedAt, UpdatedAt)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)
         ON CONFLICT (Id) DO UPDATE SET
           StoryNodeId = EXCLUDED.StoryNodeId,
           ChoiceText = EXCLUDED.ChoiceText,
           NextNodeId = EXCLUDED.NextNodeId,
           MetadataImpact = EXCLUDED.MetadataImpact,
           Effects = EXCLUDED.Effects,
           UpdatedAt = EXCLUDED.UpdatedAt`,
        [choice.id, choice.storyNodeId, choice.choiceText, choice.nextNodeId, JSON.stringify(choice.metadataImpact), JSON.stringify(choice.effects), choice.createdAt, choice.updatedAt]
      );
    } else {
      await client.query(
        `INSERT INTO StoryChoice (Id, StoryNodeId, ChoiceText, NextNodeId, MetadataImpact, CreatedAt, UpdatedAt)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
         ON CONFLICT (Id) DO UPDATE SET
           StoryNodeId = EXCLUDED.StoryNodeId,
           ChoiceText = EXCLUDED.ChoiceText,
           NextNodeId = EXCLUDED.NextNodeId,
           MetadataImpact = EXCLUDED.MetadataImpact,
           UpdatedAt = EXCLUDED.UpdatedAt`,
        [choice.id, choice.storyNodeId, choice.choiceText, choice.nextNodeId, JSON.stringify(choice.metadataImpact), choice.createdAt, choice.updatedAt]
      );
    }

    await client.query('COMMIT');
    console.log('[add_story_node_39] Upsert complete for StoryNode id=39 and StoryChoice id=121');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[add_story_node_39] Error:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
