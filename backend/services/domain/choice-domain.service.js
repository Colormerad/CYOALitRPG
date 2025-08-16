class ChoiceDomainService {
  /**
   * Compute outcome for a choice without performing any I/O.
   * Returns the new choiceHistory, metadataDelta (from choice impact),
   * whether we should refresh (stay on same node), and the initial nextNodeId.
   * Also resolves a classId if outfit selection choice implies one.
   */
  resolveOutcome({ progress, choice, node, inputValue, fallbackClassId = null }) {
    if (!progress) throw new Error('progress required');
    if (!choice) throw new Error('choice required');

    // Build choice history entry
    let choiceHistory = Array.isArray(progress.choicehistory)
      ? [...progress.choicehistory]
      : [];
    choiceHistory.push({
      choiceId: choice.id,
      timestamp: new Date().toISOString(),
      inputValue: inputValue
    });

    // Metadata delta from choice impact (do not merge into progress yet)
    let metadataDelta = choice.metadataimpact || {};
    if (typeof metadataDelta === 'string') {
      try {
        metadataDelta = JSON.parse(metadataDelta);
      } catch (e) {
        // leave as empty object if parsing fails
        metadataDelta = {};
      }
    }

    // Determine if this is outfit refresh
    let refreshOnly = false;
    if (node && node.nodetype === 'outfit_selection' && choice.choicetext && choice.choicetext.includes('more options')) {
      refreshOnly = true; // next node should remain current
    }

    // Initial nextNodeId from choice
    let nextNodeId = choice.nextnodeid || null;
    if (refreshOnly) {
      nextNodeId = progress.currentnodeid;
    }

    // Resolve class id if this is outfit selection (not a refresh)
    let resolvedClassId = null;
    if (node && node.nodetype === 'outfit_selection' && !refreshOnly) {
      const classIdFromRequest = choice.classid;
      const metadataImpactObj = typeof choice.metadataimpact === 'string' ? (() => { try { return JSON.parse(choice.metadataimpact); } catch { return {}; } })() : (choice.metadataimpact || {});
      const classIdFromMetadata = metadataImpactObj && metadataImpactObj.classId;
      resolvedClassId = classIdFromRequest || classIdFromMetadata || fallbackClassId || null;
    }

    return { choiceHistory, metadataDelta, refreshOnly, nextNodeId, resolvedClassId };
  }

  /**
   * Inspect the concrete next node to determine if it is a death node.
   */
  analyzeNextNode(nextNode) {
    if (!nextNode) return { isDeathNode: false };
    const title = (nextNode.title || '').toLowerCase();
    return { isDeathNode: title.startsWith('the end') };
  }
}

module.exports = new ChoiceDomainService();
