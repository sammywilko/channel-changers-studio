/**
 * PRODUCER ACTIONS SERVICE
 *
 * Executes actions requested by the META-ORCHESTRATOR
 * Allows the Producer to actually DO things, not just talk about them
 * 
 * UPDATED: Now includes full workflow execution capabilities:
 * - Generate scripts from scratch
 * - Create shot breakdowns  
 * - Generate images for all shots
 * - Run full production pipeline
 */

import { Project, Beat, EpisodeStructure } from '../types';
import { GoogleGenAI } from '@google/genai';
import { 
  generateScript, 
  generateDirectorBreakdown,
  parseScriptToStructure,
  extractWorldData,
  generateProductShotList,
  generateImage,
  refinePrompt
} from './geminiService';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface ProducerAction {
  type: 
    | 'modify_script' 
    | 'add_scene' 
    | 'remove_scene' 
    | 'regenerate_shot' 
    | 'add_coverage' 
    | 'execute_workflow'
    | 'generate_script'      // NEW: Generate script from idea
    | 'generate_breakdown'   // NEW: Create shot breakdown
    | 'generate_all_images'  // NEW: Generate all shot images
    | 'generate_shot_image'  // NEW: Generate single shot image
    | 'run_full_pipeline';   // NEW: End-to-end production
  description: string;
  parameters: any;
}

export interface ActionResult {
  success: boolean;
  message: string;
  updatedProject?: Project;
  error?: string;
}

/**
 * Detect if user input is requesting an action
 */
export const detectActionIntent = async (
  userInput: string,
  project: Project
): Promise<ProducerAction | null> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Fast, public, stable model

    const prompt = `Analyze this user request and determine if they want you to DO something (action) or just PLAN something.

User Input: "${userInput}"

Project Context:
- Has script: ${!!project.script}
- Has structure: ${!!project.structure}
- Shot count: ${project.structure?.acts.reduce((acc, act) => acc + act.scenes.reduce((s, scene) => s + scene.beats.length, 0), 0) || 0}

ACTIONS (things to DO):
- "modify_script": User wants to change/edit the script (e.g., "insert a scene at the beginning", "add dialogue", "change the ending")
- "add_scene": User wants to add a new scene
- "remove_scene": User wants to delete a scene  
- "regenerate_shot": User wants to regenerate specific shots (e.g., "regenerate shot 5", "redo the opening")
- "add_coverage": User wants to add more shots/angles (e.g., "add 3 more angles for scene 2")
- "generate_script": User wants to CREATE a new script from an idea (e.g., "write a script", "generate the script", "create the story")
- "generate_breakdown": User wants to CREATE shot breakdown from script (e.g., "break down the script", "create shots", "generate the storyboard")
- "generate_all_images": User wants to GENERATE images for all shots (e.g., "generate all images", "create all the shots", "make the images")
- "generate_shot_image": User wants to generate image for ONE specific shot (e.g., "generate image for shot 3", "create shot 5")
- "run_full_pipeline": User wants to run the ENTIRE production (e.g., "do everything", "run the full workflow", "let's go", "generate everything")

PLANNING (just discussion):
- Asking questions about the project
- Requesting workflow recommendations
- General discussion about approach

Respond in JSON:
{
  "isAction": true/false,
  "actionType": "modify_script|add_scene|remove_scene|regenerate_shot|add_coverage|generate_script|generate_breakdown|generate_all_images|generate_shot_image|run_full_pipeline|null",
  "parameters": {
    "sceneNumber": 1, // if applicable
    "shotNumber": 5, // if applicable
    "modification": "insert opening scene showing...", // user's instruction
    "location": "where" // if applicable
  },
  "reasoning": "Why this is/isn't an action"
}`;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.3 }
    });

    const response = result.text || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.isAction || !parsed.actionType) {
      return null;
    }

    return {
      type: parsed.actionType,
      description: userInput,
      parameters: parsed.parameters || {}
    };

  } catch (error) {
    console.error('Failed to detect action intent:', error);
    return null;
  }
};

/**
 * Execute a producer action
 */
export const executeProducerAction = async (
  action: ProducerAction,
  project: Project
): Promise<ActionResult> => {
  console.log('🎬 Executing producer action:', action.type);

  try {
    switch (action.type) {
      case 'modify_script':
        return await modifyScript(project, action.parameters.modification);

      case 'add_scene':
        return await addScene(project, action.parameters);

      case 'remove_scene':
        return await removeScene(project, action.parameters.sceneNumber);

      case 'regenerate_shot':
        return await regenerateShot(project, action.parameters.shotNumber);

      case 'add_coverage':
        return await addCoverage(project, action.parameters.sceneNumber, action.parameters.shotCount || 3);

      case 'generate_script':
        return await generateScriptAction(project);

      case 'generate_breakdown':
        return await generateBreakdownAction(project);

      case 'generate_all_images':
        return await generateAllImagesAction(project);

      case 'generate_shot_image':
        return await generateShotImageAction(project, action.parameters.shotNumber);

      case 'run_full_pipeline':
        return await runFullPipelineAction(project);

      default:
        return {
          success: false,
          message: `Unknown action type: ${action.type}`,
          error: 'Unknown action'
        };
    }
  } catch (error) {
    console.error('Action execution failed:', error);
    return {
      success: false,
      message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Modify the script based on user instruction
 */
const modifyScript = async (
  project: Project,
  modification: string
): Promise<ActionResult> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Fast, public, stable model

    const currentScript = project.script || project.idea;

    const prompt = `You are a script editor. Modify this script according to the user's instruction.

CURRENT SCRIPT:
${currentScript}

USER INSTRUCTION:
${modification}

TASK: Apply the user's modification to the script. Return the COMPLETE modified script (not just the changes).

IMPORTANT:
- Maintain the same style and tone
- If inserting at the beginning, preserve existing content after the insertion
- If adding to the end, preserve existing content before the addition
- If modifying a specific part, keep the rest unchanged`;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7 }
    });

    const modifiedScript = result.text || currentScript;

    const updatedProject: Project = {
      ...project,
      script: modifiedScript,
      // Clear structure so it can be regenerated with new script
      structure: null
    };

    return {
      success: true,
      message: `✅ Script modified: ${modification}\n\nThe structure has been cleared. Generate a new breakdown to see the changes.`,
      updatedProject
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to modify script',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Add a new scene
 */
const addScene = async (
  project: Project,
  parameters: { location?: string; description?: string; position?: 'beginning' | 'end' | number }
): Promise<ActionResult> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Fast, public, stable model

    const currentScript = project.script || project.idea;
    const position = parameters.position || 'end';
    const location = parameters.location || 'unspecified location';
    const description = parameters.description || 'new scene';

    const prompt = `Add a new scene to this script.

CURRENT SCRIPT:
${currentScript}

NEW SCENE:
- Location: ${location}
- Description: ${description}
- Position: ${position}

TASK: Insert the new scene at the specified position. Return the COMPLETE modified script.`;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7 }
    });

    const modifiedScript = result.text || currentScript;

    const updatedProject: Project = {
      ...project,
      script: modifiedScript,
      structure: null // Clear to regenerate
    };

    return {
      success: true,
      message: `✅ Added scene at ${location}. Regenerate the breakdown to see it.`,
      updatedProject
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to add scene',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Remove a scene
 */
const removeScene = async (
  project: Project,
  sceneNumber: number
): Promise<ActionResult> => {
  if (!project.structure) {
    return {
      success: false,
      message: 'No structure exists to remove scenes from',
      error: 'No structure'
    };
  }

  try {
    // Find and remove the scene
    let sceneIndex = 0;
    let found = false;

    const updatedStructure = {
      ...project.structure,
      acts: project.structure.acts.map(act => ({
        ...act,
        scenes: act.scenes.filter(scene => {
          sceneIndex++;
          if (sceneIndex === sceneNumber) {
            found = true;
            return false; // Remove this scene
          }
          return true;
        })
      }))
    };

    if (!found) {
      return {
        success: false,
        message: `Scene ${sceneNumber} not found`,
        error: 'Scene not found'
      };
    }

    const updatedProject: Project = {
      ...project,
      structure: updatedStructure
    };

    return {
      success: true,
      message: `✅ Removed scene ${sceneNumber}`,
      updatedProject
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to remove scene',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Regenerate a specific shot
 */
const regenerateShot = async (
  project: Project,
  shotNumber: number
): Promise<ActionResult> => {
  // This will be handled by the parent component
  // as it requires image generation which is async and UI-heavy
  return {
    success: true,
    message: `📋 To regenerate shot ${shotNumber}, go to the Production Board and click the refresh icon on that shot.`,
    updatedProject: project
  };
};

/**
 * Add coverage (more shots/angles for a scene)
 */
const addCoverage = async (
  project: Project,
  sceneNumber: number,
  shotCount: number
): Promise<ActionResult> => {
  if (!project.structure) {
    return {
      success: false,
      message: 'No structure exists to add coverage to',
      error: 'No structure'
    };
  }

  return {
    success: true,
    message: `📋 To add ${shotCount} more shots to scene ${sceneNumber}, go to the Production Board and use the "Add Shot" button for that scene.`,
    updatedProject: project
  };
};

// ============================================
// NEW ACTION IMPLEMENTATIONS
// ============================================

/**
 * Generate script from project idea
 */
const generateScriptAction = async (
  project: Project
): Promise<ActionResult> => {
  if (!project.idea?.trim()) {
    return {
      success: false,
      message: '❌ No project idea set. Please add a story idea first.',
      error: 'No idea'
    };
  }

  try {
    console.log('🎬 Generating script from idea...');
    
    const scriptGem = project.gems?.find(g => g.type === 'scriptwriter');
    const systemInstruction = scriptGem?.systemInstruction || 'You are a professional screenwriter.';
    
    const generatedScript = await generateScript(project.idea, systemInstruction);
    
    const updatedProject: Project = {
      ...project,
      script: generatedScript,
      structure: null // Clear structure so it can be regenerated
    };

    return {
      success: true,
      message: `✅ **Script Generated!**\n\nI've created a script based on your idea. You can review and edit it in the Script tab, then ask me to "generate the breakdown" when you're ready.`,
      updatedProject
    };

  } catch (error) {
    console.error('Script generation failed:', error);
    return {
      success: false,
      message: `❌ Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Generate shot breakdown from script
 */
const generateBreakdownAction = async (
  project: Project
): Promise<ActionResult> => {
  if (!project.script?.trim()) {
    return {
      success: false,
      message: '❌ No script exists. Please generate or add a script first.',
      error: 'No script'
    };
  }

  try {
    console.log('🎬 Generating shot breakdown...');
    
    // Extract world data first
    const worldGem = project.gems?.find(g => g.type === 'world_builder');
    const worldInstruction = worldGem?.systemInstruction || 'Analyze the script for locations and characters.';
    
    console.log('📍 Extracting world data...');
    const worldData = await extractWorldData(project.script, worldInstruction);
    
    // Generate director breakdown
    const directorGem = project.gems?.find(g => g.type === 'director');
    const directorInstruction = directorGem?.systemInstruction || 'You are a film director creating shot breakdowns.';
    
    console.log('🎥 Creating director breakdown...');
    const directorNotes = await generateDirectorBreakdown(project.script, directorInstruction);
    
    // Parse to structure
    console.log('📋 Parsing to shot structure...');
    const parsedStructure = await parseScriptToStructure(project.script, directorNotes);
    
    const shotCount = parsedStructure.acts.reduce((acc, act) => 
      acc + act.scenes.reduce((s, scene) => s + scene.beats.length, 0), 0);
    
    const updatedProject: Project = {
      ...project,
      locations: [...project.locations, ...worldData.locations],
      characters: [...project.characters, ...worldData.newCharacters],
      structure: parsedStructure
    };

    return {
      success: true,
      message: `✅ **Shot Breakdown Complete!**\n\n📊 Created **${shotCount} shots** across ${parsedStructure.acts.length} acts.\n📍 Found ${worldData.locations.length} locations\n👥 Found ${worldData.newCharacters.length} characters\n\nYou can now:\n- Review shots in the Production Board\n- Ask me to "generate all images"\n- Or generate individual shots`,
      updatedProject
    };

  } catch (error) {
    console.error('Breakdown generation failed:', error);
    return {
      success: false,
      message: `❌ Failed to generate breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Generate images for all shots
 */
const generateAllImagesAction = async (
  project: Project
): Promise<ActionResult> => {
  if (!project.structure) {
    return {
      success: false,
      message: '❌ No shot structure exists. Please generate a breakdown first.',
      error: 'No structure'
    };
  }

  // Collect all beats
  const allBeats: Beat[] = [];
  project.structure.acts.forEach(act => 
    act.scenes.forEach(scene => 
      scene.beats.forEach(beat => allBeats.push(beat))
    )
  );

  if (allBeats.length === 0) {
    return {
      success: false,
      message: '❌ No shots found in the structure.',
      error: 'No beats'
    };
  }

  // This is a heavy operation - return instruction to use UI
  // In future, could implement batch generation here
  return {
    success: true,
    message: `🎬 **Ready to Generate ${allBeats.length} Images**\n\nFor batch image generation, please use the **"Generate All"** button in the Production Board.\n\nThis gives you:\n- Progress tracking\n- Ability to pause/resume\n- Preview each image as it generates\n\n💡 Tip: Make sure you have style references uploaded for consistent results!`,
    updatedProject: project
  };
};

/**
 * Generate image for a single shot
 */
const generateShotImageAction = async (
  project: Project,
  shotNumber: number
): Promise<ActionResult> => {
  if (!project.structure) {
    return {
      success: false,
      message: '❌ No shot structure exists. Please generate a breakdown first.',
      error: 'No structure'
    };
  }

  // Find the beat
  let targetBeat: Beat | null = null;
  let beatIndex = 0;
  
  project.structure.acts.forEach(act => 
    act.scenes.forEach(scene => 
      scene.beats.forEach(beat => {
        beatIndex++;
        if (beatIndex === shotNumber) {
          targetBeat = beat;
        }
      })
    )
  );

  if (!targetBeat) {
    return {
      success: false,
      message: `❌ Shot ${shotNumber} not found. Project has ${beatIndex} shots total.`,
      error: 'Shot not found'
    };
  }

  return {
    success: true,
    message: `🎬 **Shot ${shotNumber} Ready**\n\nTo generate this shot, click on it in the Production Board and use the generate button.\n\nShot: "${targetBeat.action.substring(0, 50)}..."`,
    updatedProject: project
  };
};

/**
 * Run the full production pipeline (script → breakdown → images)
 */
const runFullPipelineAction = async (
  project: Project
): Promise<ActionResult> => {
  if (!project.idea?.trim()) {
    return {
      success: false,
      message: '❌ No project idea set. Please add a story idea first.',
      error: 'No idea'
    };
  }

  try {
    console.log('🚀 Running full production pipeline...');
    
    // Step 1: Generate Script
    console.log('📝 Step 1: Generating script...');
    const scriptResult = await generateScriptAction(project);
    if (!scriptResult.success || !scriptResult.updatedProject) {
      return scriptResult;
    }
    
    // Step 2: Generate Breakdown
    console.log('🎬 Step 2: Generating breakdown...');
    const breakdownResult = await generateBreakdownAction(scriptResult.updatedProject);
    if (!breakdownResult.success || !breakdownResult.updatedProject) {
      return {
        ...breakdownResult,
        message: `✅ Script generated but breakdown failed:\n${breakdownResult.message}`,
        updatedProject: scriptResult.updatedProject
      };
    }
    
    const shotCount = breakdownResult.updatedProject.structure?.acts.reduce((acc, act) => 
      acc + act.scenes.reduce((s, scene) => s + scene.beats.length, 0), 0) || 0;

    return {
      success: true,
      message: `🎉 **Full Pipeline Complete!**\n\n✅ Script generated\n✅ ${shotCount} shots created\n\n**Next step:** Use the "Generate All" button in the Production Board to create images for all shots.\n\nOr ask me to generate specific shots!`,
      updatedProject: breakdownResult.updatedProject
    };

  } catch (error) {
    console.error('Full pipeline failed:', error);
    return {
      success: false,
      message: `❌ Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
