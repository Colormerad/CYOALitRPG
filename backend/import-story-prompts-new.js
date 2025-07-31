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
        nextNodeId: 19, // Points to the new Password Entry node
        metadataImpact: { rule_following: 1, security: 1 }
      },
      {
        choiceText: "Grab your clothes back out of the locker and redress- this is silly. I'm wearing my own clothes and turn to head into the faire wearing your street clothes.",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { rule_following: -1, stubbornness: 1, modern: 1 }
      },
      {
        choiceText: "Close the locker and set the password. Glance around and tuck your phone into the waist of your outfit. Hopefully it doesn't fall out.",
        nextNodeId: 19, // Points to the new Password Entry node
        metadataImpact: { rule_following: -1, resourcefulness: 1, anxiety: 1 }
      }
    ]
  },
  {
    title: "The Crossroads",
    content: "As you step deeper into the faire, the sounds of laughter and music grow distant. The path splits before you, and a strange mist curls around your ankles. To your left, a flickering lantern hangs from a twisted branch. To your right, you hear the faint sound of wheels on gravel.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Follow the flickering lantern to the left.",
        nextNodeId: 6, // The Masked Path
        metadataImpact: { curiosity: 1, caution: -1 }
      },
      {
        choiceText: "Investigate the lantern, but keep your distance.",
        nextNodeId: 6, // The Masked Path
        metadataImpact: { curiosity: 1, caution: 1 }
      },
      {
        choiceText: "Head toward the sound of wheels on the right.",
        nextNodeId: 7, // The Stagecoach
        metadataImpact: { boldness: 1, caution: -1 }
      },
      {
        choiceText: "Wait and listen for more clues before deciding.",
        nextNodeId: 7, // The Stagecoach
        metadataImpact: { patience: 1, caution: 1 }
      }
    ]
  },
  {
    title: "The Masked Path",
    content: "You follow a flickering lantern through a hedge archway. The path ahead twists, lined with wooden masks nailed to trees. One of them turns to look at you.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Talk to the moving mask.",
        nextNodeId: 8, // The Whispering Mask
        metadataImpact: { courage: 1, curiosity: 1 }
      },
      {
        choiceText: "Ignore it and walk faster.",
        nextNodeId: 9, // The Clock Tent
        metadataImpact: { fear: 1, caution: 1 }
      },
      {
        choiceText: "Take one of the masks from a tree.",
        nextNodeId: 10, // The Unnatural Garden
        metadataImpact: { boldness: 1, theft: 1 }
      }
    ]
  },
  {
    title: "The Stagecoach",
    content: "A stagecoach painted in shifting colors creaks to a halt beside you. The driver gestures wordlessly toward the open door, where a single violin plays itself.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Step inside the coach.",
        nextNodeId: 9, // The Clock Tent
        metadataImpact: { trust: 1, curiosity: 1 }
      },
      {
        choiceText: "Climb up to talk to the driver.",
        nextNodeId: 11, // The Doppelgänger Driver
        metadataImpact: { boldness: 1, leadership: 1 }
      },
      {
        choiceText: "Back away slowly and hide.",
        nextNodeId: 12, // The Puppet Stall
        metadataImpact: { caution: 1, fear: 1 }
      }
    ]
  },
  {
    title: "The Whispering Mask",
    content: "The mask whispers your name and asks, 'Do you know what you left behind?' Images flash across its surface: a house, a mirror, a scar.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Say 'yes' and name one of them.",
        nextNodeId: 13, // The Puppet Stall
        metadataImpact: { honesty: 1, courage: 1 }
      },
      {
        choiceText: "Say 'no' and ask for more time.",
        nextNodeId: 10, // The Unnatural Garden
        metadataImpact: { caution: 1, patience: 1 }
      },
      {
        choiceText: "Rip the mask from the tree.",
        nextNodeId: 17, // DEATH
        metadataImpact: { aggression: 1, impulsiveness: 1 }
      }
    ]
  },
  {
    title: "The Clock Tent",
    content: "You stumble into a tent filled with clocks, each ticking out of sync. A sign reads: 'Pick your pace or be lost in time.'",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Pick the fastest-ticking watch.",
        nextNodeId: 11, // The Doppelgänger Driver
        metadataImpact: { haste: 1, impatience: 1 }
      },
      {
        choiceText: "Pick the slowest one.",
        nextNodeId: 12, // The Puppet Stall
        metadataImpact: { patience: 1, thoughtfulness: 1 }
      },
      {
        choiceText: "Break them all.",
        nextNodeId: 14, // The Portrait Hall
        metadataImpact: { chaos: 1, rebellion: 1 }
      }
    ]
  },
  {
    title: "The Unnatural Garden",
    content: "A garden blooms in unnatural colors. Each plant seems to sway toward you. A woman in a mask kneels in the center, tending to a blue rose that pulses like a heartbeat.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Ask her what she's growing.",
        nextNodeId: 13, // The Puppet Stall
        metadataImpact: { curiosity: 1, caution: 1 }
      },
      {
        choiceText: "Try to pick the rose.",
        nextNodeId: 17, // DEATH
        metadataImpact: { greed: 1, impulsiveness: 1 }
      },
      {
        choiceText: "Offer to help her tend the garden.",
        nextNodeId: 14, // The Portrait Hall
        metadataImpact: { helpfulness: 1, patience: 1 }
      }
    ]
  },
  {
    title: "The Doppelgänger Driver",
    content: "The driver turns to reveal your own face beneath the hood. 'We're nearly out of time,' it says. The horses begin to scream like people.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Jump from the moving coach.",
        nextNodeId: 13, // The Puppet Stall
        metadataImpact: { fear: 1, impulsiveness: 1 }
      },
      {
        choiceText: "Try to stop the horses.",
        nextNodeId: 15, // The Memory Jars
        metadataImpact: { bravery: 1, leadership: 1 }
      },
      {
        choiceText: "Attack your doppelgänger.",
        nextNodeId: 14, // The Portrait Hall
        metadataImpact: { aggression: 1, fear: 1 }
      }
    ]
  },
  {
    title: "The Puppet Stall",
    content: "You hide beneath a puppet stall, watching legs pass by. One pair stops. A marionette drops beside you and speaks with your voice: 'Why did you run?'",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Explain your fear.",
        nextNodeId: 13, // The Puppet Stall (loop)
        metadataImpact: { honesty: 1, vulnerability: 1 }
      },
      {
        choiceText: "Grab the puppet and crush it.",
        nextNodeId: 14, // The Portrait Hall
        metadataImpact: { aggression: 1, fear: 1 }
      },
      {
        choiceText: "Apologize and follow it.",
        nextNodeId: 15, // The Memory Jars
        metadataImpact: { remorse: 1, curiosity: 1 }
      }
    ]
  },
  {
    title: "The Portrait Hall",
    content: "You reach a hallway of portraits—each depicting you, but different: older, wounded, crowned. One frame is empty and warm to the touch.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Step into the empty frame.",
        nextNodeId: 15, // The Memory Jars
        metadataImpact: { courage: 1, curiosity: 1 }
      },
      {
        choiceText: "Smash all the frames.",
        nextNodeId: 14, // The Portrait Hall (loop)
        metadataImpact: { aggression: 1, rebellion: 1 }
      }
    ]
  },
  {
    title: "The Memory Jars",
    content: "The air thickens. Whispers echo with things you've never told anyone. You see a child holding your memories in jars.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Take a jar labeled 'Guilt'.",
        nextNodeId: 15, // The Memory Jars (loop)
        metadataImpact: { introspection: 1, remorse: 1 }
      },
      {
        choiceText: "Take a jar labeled 'Hope'.",
        nextNodeId: 15, // The Memory Jars (loop)
        metadataImpact: { optimism: 1, courage: 1 }
      },
      {
        choiceText: "Refuse to take any.",
        nextNodeId: 17, // DEATH
        metadataImpact: { stubbornness: 1, independence: 1 }
      }
    ]
  },
  {
    title: "The Shimmering Gate",
    content: "At last, a shimmering gate pulses before you. The path splits: three shadows wait. One wears your smile. One wears your regret. One wears nothing at all.",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Approach the smiling shadow.",
        nextNodeId: 16, // Portal Entered
        metadataImpact: { optimism: 1, trust: 1 }
      },
      {
        choiceText: "Approach the one wearing regret.",
        nextNodeId: 16, // Portal Entered
        metadataImpact: { introspection: 1, remorse: 1 }
      },
      {
        choiceText: "Walk through the portal alone.",
        nextNodeId: 16, // Portal Entered
        metadataImpact: { independence: 1, courage: 1 }
      },
      {
        choiceText: "Turn back the way you came.",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { caution: 1, fear: 1 }
      }
    ]
  },
  {
    title: "Portal Entered",
    content: "As you step through the shimmering gate, the world around you dissolves into a kaleidoscope of colors and sensations. You feel yourself being pulled forward, transformed, becoming something new yet familiar. The journey has only just begun...",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Continue your adventure...",
        metadataImpact: { completion: 1, new_beginning: 1 }
      }
    ]
  },
  {
    title: "The End",
    content: "Darkness envelops you as your choices lead to an unfortunate end. But in this realm of stories, death is merely another beginning...",
    nodeType: "standard",
    choices: [
      {
        choiceText: "Try again from the beginning",
        nextNodeId: 0,
        metadataImpact: { resilience: 1, learning: 1 }
      }
    ]
  },
  // New node for password selection
  {
    title: "Locker Password",
    content: "You set a password for your locker. What 4-digit code do you choose?",
    nodeType: "standard",
    choices: [
      {
        choiceText: "1234 - A simple, easy to remember code",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { security: -1, simplicity: 1 }
      },
      {
        choiceText: "2222 - Your lucky number repeated",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { security: -1, superstition: 1 }
      },
      {
        choiceText: "Your birthday - A date you'll never forget",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { security: -1, sentimentality: 1 }
      },
      {
        choiceText: "A random number - Maximum security",
        nextNodeId: 6, // The Crossroads
        metadataImpact: { security: 1, caution: 1 }
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
          false, // No more requiresInput
          null   // No more inputType
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
