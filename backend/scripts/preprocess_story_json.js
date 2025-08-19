const fs = require('fs');
const path = require('path');

// Usage:
//   node scripts/preprocess_story_json.js <input.json> <output.json>
//
// Accepts mixed/nested story JSON (nodes with choices/options, content/text, camelCase keys)
// and outputs a normalized flat JSON with:
// {
//   exported_at: ISOString,
//   story_nodes: [ { id, title, content, nodetype, requiresinput, inputtype, createdat, updatedat } ],
//   story_choices: [ { id, storynodeid, choicetext, nextnodeid, metadataimpact, effects, createdat, updatedat } ]
// }

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function toDate(v) {
  try {
    return v ? new Date(v) : new Date();
  } catch (_) {
    return new Date();
  }
}

function isNumericString(x) {
  return typeof x === 'string' && x.trim() !== '' && !isNaN(Number(x));
}

function deepNormalizeNumbers(obj) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(deepNormalizeNumbers);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v != null && typeof v === 'object') {
        out[k] = deepNormalizeNumbers(v);
      } else if (isNumericString(v)) {
        out[k] = Number(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

function normalize(input) {
  // Determine node list
  let nodesInput = [];
  if (Array.isArray(input)) {
    nodesInput = input;
  } else if (Array.isArray(input.nodes)) {
    nodesInput = input.nodes;
  } else if (Array.isArray(input.story_nodes)) {
    // Already flat, just pass through
    return {
      exported_at: new Date().toISOString(),
      story_nodes: input.story_nodes,
      story_choices: input.story_choices || [],
    };
  } else {
    throw new Error('Unrecognized input JSON shape. Expected an array of nodes or {nodes: [...]}');
  }

  const now = new Date();
  const story_nodes = [];
  const story_choices = [];

  // Pre-scan to get max choice id if present
  let maxChoiceId = 0;
  // Pre-scan to get max node id if present (consider id or promptId aliases)
  let maxNodeId = 0;
  for (const n of nodesInput) {
    if (typeof n.id === 'number') {
      maxNodeId = Math.max(maxNodeId, n.id);
    } else if (typeof n.promptId === 'number') {
      maxNodeId = Math.max(maxNodeId, n.promptId);
    } else if (isNumericString(n.promptId)) {
      maxNodeId = Math.max(maxNodeId, Number(n.promptId));
    }
    const arr = Array.isArray(n.choices)
      ? n.choices
      : Array.isArray(n.options)
      ? n.options
      : [];
    for (const c of arr) {
      if (typeof c.id === 'number') maxChoiceId = Math.max(maxChoiceId, c.id);
    }
  }
  let nextChoiceId = maxChoiceId + 1;

  for (const n of nodesInput) {
    // Assign a numeric node id if missing. Prefer promptId alias if present.
    let nodeId;
    if (typeof n.id === 'number') {
      nodeId = n.id;
    } else if (typeof n.promptId === 'number') {
      nodeId = n.promptId;
    } else if (isNumericString(n.promptId)) {
      nodeId = Number(n.promptId);
    } else {
      nodeId = (++maxNodeId);
    }
    // Derive a safe title if missing
    const rawTitle = n.title;
    const rawContent = (n.content != null ? n.content : n.text != null ? n.text : null) || '';
    let safeTitle = rawTitle ?? null;
    if (!safeTitle) {
      const firstLine = String(rawContent).split(/\r?\n/)[0] || '';
      const trimmed = firstLine.replace(/\s+/g, ' ').trim();
      safeTitle = trimmed ? trimmed.slice(0, 60) : `Untitled ${nodeId}`.trim();
    }

    const node = {
      id: nodeId,
      title: safeTitle,
      content: (n.content != null ? n.content : n.text != null ? n.text : null),
      nodetype: n.nodetype ?? n.nodeType ?? 'standard',
      requiresinput: n.requiresinput ?? n.requiresInput ?? false,
      inputtype: n.inputtype ?? n.inputType ?? null,
      createdat: toDate(n.createdat ?? n.createdAt ?? now),
      updatedat: toDate(n.updatedat ?? n.updatedAt ?? now),
    };
    story_nodes.push(node);

    const choiceArray = Array.isArray(n.choices)
      ? n.choices
      : Array.isArray(n.options)
      ? n.options
      : [];

    for (const c of choiceArray) {
      const metaRaw = (c.metadataimpact ?? c.metadataImpact ?? {});
      const effectsRaw = (c.effects ?? {});
      const metadataimpact = deepNormalizeNumbers(metaRaw) || {};
      const effects = deepNormalizeNumbers(effectsRaw) || {};

      // Resolve and coerce nextnodeid
      let rawNext = (c.nextnodeid ?? c.nextNodeId ?? c.nextPromptId ?? null);
      if (isNumericString(rawNext)) {
        rawNext = Number(rawNext);
      } else if (typeof rawNext === 'string') {
        const s = rawNext.trim().toUpperCase();
        if (s === 'END' || s === 'END_GAME' || s === 'NONE' || s === '') {
          rawNext = null;
        } else if (!/^[0-9]+$/.test(s)) {
          // Any other non-numeric token also becomes null
          rawNext = null;
        }
      }

      const choice = {
        id: typeof c.id === 'number' ? c.id : nextChoiceId++,
        storynodeid: nodeId,
        choicetext: c.choicetext ?? c.choiceText ?? null,
        nextnodeid: rawNext,
        metadataimpact,
        effects,
        createdat: toDate(c.createdat ?? c.createdAt ?? now),
        updatedat: toDate(c.updatedat ?? c.updatedAt ?? now),
      };
      story_choices.push(choice);
    }
  }

  return {
    exported_at: new Date().toISOString(),
    story_nodes,
    story_choices,
  };
}

(function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error('Usage: node scripts/preprocess_story_json.js <input.json> <output.json>');
    process.exit(1);
  }
  const absIn = path.resolve(inPath);
  const absOut = path.resolve(outPath);
  if (!fs.existsSync(absIn)) {
    console.error(`Input JSON not found: ${absIn}`);
    process.exit(1);
  }

  let input;
  try {
    input = readJson(absIn);
  } catch (e) {
    console.error('Failed to parse input JSON:', e.message);
    process.exit(1);
  }

  let normalized;
  try {
    normalized = normalize(input);
  } catch (e) {
    console.error('Normalization failed:', e.message);
    process.exit(1);
  }

  fs.writeFileSync(absOut, JSON.stringify(normalized, null, 2), 'utf8');
  console.log(`[preprocess] Wrote ${absOut} with ${normalized.story_nodes.length} nodes and ${normalized.story_choices.length} choices`);
})();
