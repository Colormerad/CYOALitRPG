const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

// Story prompts data
const storyPrompts = [
  {
    title: "Welcome to MYTHOS",
    content: "Yawning from the long drive, you step out of the car and stretch your legs, groaning softly as your back pops. The air smells faintly of hay and funnel cake—strangely comforting. In the distance, the sweeping span of the Renaissance Faire stretches wide and colorful, a jarring contrast to the asphalt parking lot and roaring highway you just pulled off from.\n\tA weathered plywood sign greets you with uneven, hand-painted letters:\n\t\"Welcome to MYTHOS. May you have ye olde time you deserve.\"\n\tFrowning, you scratch your head.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "\"What a weird sign,\" you mutter, glancing around.\n\tYou were supposed to meet someone here, but you don't see them or— anyone out here. You check your phone. No signal. Of course. And you're already fifteen minutes late.\n\tMaybe they're inside.",
        metadataImpact: { personality: "cautious", curiosity: -1 }
      },
      {
        choiceText: "You tug your hoodie tighter against a sudden breeze and take a hesitant step toward the fairgrounds. The gates yawn open, unmanned. There's no ticket booth, no staff, just… music. Faint flute and drumbeats drift on the wind. \"Maybe they're already inside,\" you murmur, trying not to feel like you're walking into a trap.",
        metadataImpact: { personality: "adventurous", anxiety: 1 }
      },
      {
        choiceText: "You circle the sign, half-expecting a prank camera crew or a bored medieval LARPer to jump out yelling \"Gotcha!\" But there's nothing—just that odd silence you only notice when it's unnatural. Your shoes crunch gravel as you walk a little further in. You pass through the gates before you can talk yourself out of it.",
        metadataImpact: { personality: "skeptical", curiosity: 1 }
      },
      {
        choiceText: "You reach out and touch the sign. The wood feels oddly warm. As you pull your hand back, a shimmer runs down the painted letters like rippling water. You blink. The fairgrounds seem… closer than they were before. Larger. Brighter. You take one cautious step forward, nervous but glad you decided to do this on your own.",
        metadataImpact: { personality: "mystical", magic_affinity: 1 }
      }
    ]
  },
  {
    title: "The Ticket Booth",
    content: "You make your way up the gravel path toward the ticket booth.\n\tA portly older gentleman leans over the counter to greet you. His handmade tunic of rumpled linen in various faded hues of grey looks like it's seen a few seasons, and his braided belt jingles faintly with little metal charms.\n\t\"Ah! Welcome, welcome, my dear friend,\" he says with a bright smile and a curious tilt of his head. \"How would you prefer to be addressed today?\"",
    nodeType: "standard",
    choices: [
      {
        choiceText: "My good sir",
        metadataImpact: { gender_preference: "masculine", formality: 1 }
      },
      {
        choiceText: "Dearest madam",
        metadataImpact: { gender_preference: "feminine", formality: 1 }
      },
      {
        choiceText: "Friend is fine, thank you.",
        metadataImpact: { gender_preference: "neutral", formality: 0 }
      },
      {
        choiceText: "...",
        metadataImpact: { personality: "reserved", social: -1 }
      }
    ]
  },
  {
    title: "Your Experience",
    content: "He nods as you respond, eyes twinkling. \"Perfect, {{prompt2answer}} And here at MYTHOS, you may be anything you want to be.\" He gestures behind him at the towering gates with an almost conspiratorial grin. \"As your journey begins, how experienced do you feel?\"",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Young",
        metadataImpact: { age_preference: "young", experience: -1 }
      },
      {
        choiceText: "Wisened",
        metadataImpact: { age_preference: "old", experience: 1, wisdom: 1 }
      },
      {
        choiceText: "Somewhere in between",
        metadataImpact: { age_preference: "middle", experience: 0 }
      },
      {
        choiceText: "...",
        metadataImpact: { personality: "mysterious", social: -1 }
      }
    ]
  },
  {
    title: "Dress Code",
    content: "\"Ah, wonderful. We get all sorts here—fresh squires, seasoned bards, and even a wayward noble or two.\" He leans in slightly, lowering his voice. \"But before you enter through our gates, you'll need to meet our dress code. Dragons, you see, are not particularly fond of machine-crafted garb. Or perhaps...\"He muses a finger lightly brushing his unshaved face. \"-They are too fond of machine-crafted garb. It's really all perspective you see.\"\n\tHe winks. \"Thankfully, your admission includes wardrobe selection. Come along, and choose what suits you best.\"",
    nodeType: "outfit_selection",
    requiresInput: false,
    inputType: null,
    choices: [
      {
        choiceText: "Random Outfit 1 Placeholder",
        metadataImpact: { outfit_style: "random1" }
      },
      {
        choiceText: "Random Outfit 2 Placeholder",
        metadataImpact: { outfit_style: "random2" }
      },
      {
        choiceText: "Random Outfit 3 Placeholder",
        metadataImpact: { outfit_style: "random3" }
      },
      {
        choiceText: "Random Outfit 4 Placeholder",
        metadataImpact: { outfit_style: "random4" }
      },
      {
        choiceText: "Show me more options",
        metadataImpact: { outfit_style: "refresh" }
      }
    ]
  },
  {
    title: "Your Possessions",
    content: "The outfit fits as if it were hand stitched just for you. You bend and twist surprisingly comfortable in the unfamiliar fabric. A set of lockers sits open along with a sign. Leave ye material possessions at the door. After all, there is no need for them where you are headed. Phones are not permitted inside. You shove your clothes into a locker and begin to tuck your phone into your pocket out of habit when you realize this outfit has no pockets. Uncomfortable you turn to ask the ticketmaster what you should do- but when you turn he has disappeared from view. He must have gone off to help another customer you reassure yourself.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Tuck your phone along with your clothes into the locker and set your password.",
        metadataImpact: { rule_following: 1, security: 1 },
        requiresInput: true,
        inputType: "numeric",
        inputPrompt: "What is your password",
        inputDescription: "4 digit numeric code"
      },
      {
        choiceText: "Grab your clothes back out of the locker and redress- this is silly. I'm wearing my own clothes and turn to head into the faire wearing your street clothes.",
        metadataImpact: { rule_following: -1, stubbornness: 1, modern: 1 }
      },
      {
        choiceText: "Close the locker and set the password. Glance around and tuck your phone into the waist of your outfit. Hopefully it doesn't fall out.",
        metadataImpact: { rule_following: -1, resourcefulness: 1, anxiety: 1 },
        requiresInput: true,
        inputType: "numeric",
        inputPrompt: "What is your password",
        inputDescription: "4 digit numeric code"
      }
    ]
  }
];

// Function to import story prompts
async function importStoryPrompts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting story prompts import...');
    
    // Track node IDs for linking choices
    const nodeIds = {};
    
    // First pass: Create all story nodes
    for (let i = 0; i < storyPrompts.length; i++) {
      const prompt = storyPrompts[i];
      
      const nodeResult = await client.query(
        `INSERT INTO StoryNode (Title, Content, NodeType, RequiresInput, InputType)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING Id`,
        [
          prompt.title,
          prompt.content,
          prompt.nodeType || 'standard',
          prompt.requiresInput || false,
          prompt.inputType || null
        ]
      );
      
      const nodeId = nodeResult.rows[0].id;
      nodeIds[i] = nodeId;
      
      console.log(`Created story node: "${prompt.title}" with ID: ${nodeId}`);
    }
    
    // Second pass: Create choices and link them to the next nodes
    for (let i = 0; i < storyPrompts.length; i++) {
      const prompt = storyPrompts[i];
      const nodeId = nodeIds[i];
      
      // Default next node is the next sequential node, unless it's the last one
      const defaultNextNodeId = i < storyPrompts.length - 1 ? nodeIds[i + 1] : null;
      
      for (const choice of prompt.choices) {
        // Use the specified next node ID or default to the next sequential node
        const nextNodeId = choice.nextNodeId !== undefined ? nodeIds[choice.nextNodeId] : defaultNextNodeId;
        
        await client.query(
          `INSERT INTO StoryChoice (StoryNodeId, ChoiceText, NextNodeId, MetadataImpact)
           VALUES ($1, $2, $3, $4)`,
          [
            nodeId,
            choice.choiceText,
            nextNodeId,
            choice.metadataImpact ? JSON.stringify(choice.metadataImpact) : null
          ]
        );
        
        console.log(`Added choice for node ${nodeId}: "${choice.choiceText.substring(0, 30)}..."`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Story prompts import completed successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during import:', err);
  } finally {
    client.release();
  }
}

// Run the import
importStoryPrompts().then(() => {
  console.log('Import process finished.');
  process.exit(0);
}).catch(err => {
  console.error('Import process failed:', err);
  process.exit(1);
});
