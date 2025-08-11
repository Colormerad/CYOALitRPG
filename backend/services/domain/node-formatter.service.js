const storyNodeRepo = require('../../repositories/story-node.repository');

class NodeFormatterService {
  /**
   * Process node content by replacing placeholders using choice history.
   * Currently supports {{prompt2answer}} based on choices [5,6,7,8].
   */
  async processContentPlaceholders(content, choiceHistory) {
    let processed = content || '';
    if (!processed || !Array.isArray(choiceHistory) || choiceHistory.length === 0) {
      return processed;
    }

    // Handle {{prompt2answer}}
    if (processed.includes('{{prompt2answer}}')) {
      const prompt2Choices = [5, 6, 7, 8];
      const prompt2Choice = choiceHistory.find(c => prompt2Choices.includes(c.choiceId));
      if (prompt2Choice) {
        const choiceText = await storyNodeRepo.getChoiceTextById(prompt2Choice.choiceId);
        const replacement = (choiceText || 'adventurer').trim();
        processed = processed.replace(/\{\{prompt2answer\}\}/g, replacement);
      } else {
        processed = processed.replace(/\{\{prompt2answer\}\}/g, 'adventurer');
      }
    }

    return processed;
  }

  /**
   * Format node response for outfit_selection nodes.
   * Combines random outfits with existing choices to preserve IDs/nextNode/metadataImpact.
   */
  formatOutfitSelectionNode(node, choicesRows, outfits) {
    return {
      id: node.id,
      title: node.title,
      content: node.content,
      nodeType: node.nodetype,
      requiresInput: node.requiresinput,
      inputType: node.inputtype,
      choices: outfits.map((outfit, index) => ({
        id: choicesRows[index]?.id || 0,
        text: `${outfit.classname}: ${outfit.outfitdescription}`,
        nextNodeId: choicesRows[index]?.nextnodeid || null,
        metadataImpact: choicesRows[index]?.metadataimpact || {},
        classId: outfit.classid,
        outfitId: outfit.outfitid
      })).concat([
        ...choicesRows
          .filter(choice => choice.choicetext.includes('more options'))
          .map(choice => ({
            id: choice.id,
            text: choice.choicetext,
            nextNodeId: choice.nextnodeid,
            metadataImpact: choice.metadataimpact
          }))
      ])
    };
  }

  /**
   * Format a standard node response.
   */
  formatStandardNode(node, processedContent, choicesRows) {
    return {
      id: node.id,
      title: node.title,
      content: processedContent,
      nodeType: node.nodetype,
      requiresInput: node.requiresinput,
      inputType: node.inputtype,
      choices: choicesRows.map(choice => ({
        id: choice.id,
        text: choice.choicetext,
        nextNodeId: choice.nextnodeid,
        metadataImpact: choice.metadataimpact
      }))
    };
  }
}

module.exports = new NodeFormatterService();
