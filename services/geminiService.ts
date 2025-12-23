/**
 * MODEL CONFIGURATION (Updated Nov 24, 2025)
 * - Text/Reasoning: gemini-3-pro-preview (latest, released Nov 18, 2025)
 * - Image Generation: gemini-3-pro-image-preview (Nano Banana Pro)
 *
 * Gemini 3 Pro provides:
 * - State-of-the-art reasoning and creative understanding
 * - Better context understanding and "reads the room" for intent
 * - Enhanced multimodal performance
 * - Superior creative decisions for premium AI video production
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EpisodeStructure, Character, Resolution, Location, DirectorLog, Beat, AspectRatio, Shot, Model, Product, StyleReference, StyleAnalysis, BatchStyleAnalysis } from '../types';
import { getGemPrompt } from './gemPrompts';

// Reusing schemas for Product Mode by mapping concepts
// Beat -> Shot
// Scene -> Shoot
// Act -> Collection

// LOCKED negative prompt to prevent visible production equipment
export const PRODUCTION_NEGATIVE_PROMPT = `
NO visible lighting equipment, NO studio lights visible in frame, NO softboxes,
NO reflectors, NO light stands, NO C-stands, NO production gear,
NO behind-the-scenes equipment, NO tripods visible, NO crew visible,
NO cables, NO sandbags, NO apple boxes, NO set equipment,
clean professional final image only
`.trim();

const beatSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    beat_id: { type: Type.STRING },
    characters: { type: Type.ARRAY, items: { type: Type.STRING } }, // Products
    emotion: { type: Type.STRING }, // Mood
    action: { type: Type.STRING }, // Composition
    shotType: { type: Type.STRING }, // Hero, Detail, etc.
    dialogue: { type: Type.STRING }, // Caption
    camera: { type: Type.STRING },
    lighting: { type: Type.STRING },
    location: { type: Type.STRING },
    visual_notes: { type: Type.STRING },
    prompt_seed: { type: Type.STRING },
    directorNote: { type: Type.STRING },
  },
  required: ["beat_id", "characters", "action", "camera", "lighting", "location", "prompt_seed"]
};

const sceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scene_number: { type: Type.INTEGER },
    summary: { type: Type.STRING }, // Shoot Name
    beats: { type: Type.ARRAY, items: beatSchema },
  },
  required: ["scene_number", "summary", "beats"]
};

const actSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    act_number: { type: Type.INTEGER },
    scenes: { type: Type.ARRAY, items: sceneSchema },
  },
  required: ["act_number", "scenes"]
};

const episodeStructureSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    acts: { type: Type.ARRAY, items: actSchema },
  },
  required: ["acts"]
};

const worldAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          visuals: { type: Type.STRING }
        },
        required: ["name", "visuals"]
      }
    },
    newCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          handle: { type: Type.STRING },
          role: { type: Type.STRING },
          traits: { type: Type.ARRAY, items: { type: Type.STRING } },
          visuals: { type: Type.STRING }
        },
        required: ["name", "handle", "role", "traits", "visuals"]
      }
    }
  },
  required: ["locations", "newCharacters"]
};

const coverageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    variations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['Wide', 'Medium', 'Close-Up', 'OTS', 'Insert'] },
          lens: { type: Type.STRING, description: "e.g. 24mm, 35mm, 50mm, 85mm, Macro" },
          movement: { type: Type.STRING, enum: ['Static', 'Pan', 'Tilt', 'Dolly', 'Handheld', 'Crane'] },
          prompt: { type: Type.STRING }
        },
        required: ["type", "lens", "movement", "prompt"]
      }
    }
  },
  required: ["variations"]
};

const suggestionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

const styleAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lighting: { type: Type.STRING },
    composition: { type: Type.STRING },
    camera: { type: Type.STRING },
    background: { type: Type.STRING },
    colorGrading: { type: Type.STRING },
    mood: { type: Type.STRING },
    technicalDetails: { type: Type.STRING },
    replicationPrompt: { type: Type.STRING }
  },
  required: ["lighting", "composition", "camera", "background", "colorGrading", "replicationPrompt"]
};


// Helper to instantiate client with current key
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateScript = async (storyIdea: string, systemInstruction: string): Promise<string> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview"; // Fast, public, stable model
    const response = await ai.models.generateContent({
      model,
      contents: `Write a short animated episode script based on this idea: "${storyIdea}". Use the characters @Sam and @Oliver (and others if needed). Format it as a standard screenplay with clear scene headers (e.g. INT. LOCATION - DAY).`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text || "Failed to generate script.";
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

export const generateProductShotList = async (brief: string, systemInstruction: string): Promise<EpisodeStructure> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: `
      CAMPAIGN BRIEF: ${brief}

      Based on the brief, generate a structured Shot List (Collections > Shoots > Shots).
      Map 'Act' to Collection, 'Scene' to Shoot, 'Beat' to Product Shot.

      CRITICAL REQUIREMENT: Every shot's prompt_seed MUST include product @handles.

      For each shot:
      - 'action': Describe the composition and product placement.
      - 'characters': List the Product SKUs/Handles involved (e.g., ["@polo", "@jacket"])
      - 'location': Describe the Environment.
      - 'prompt_seed': A detailed photographic prompt that MUST include the product @handle from the brief.

        Example good prompt_seed formats:
        - "Medium shot of @polo worn by male model, studio lighting, white background"
        - "Close-up detail of @polo collar, 50mm lens, soft natural light"
        - "@polo on golf course, lifestyle shot, golden hour lighting"
        - "Front hero shot of @jacket, centered composition, professional studio"

      IMPORTANT: Extract product @handles from the brief and USE them in every prompt_seed.
      `,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: episodeStructureSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const data = JSON.parse(text) as EpisodeStructure;
    // Initialize state
    data.acts.forEach(act => act.scenes.forEach(scene => scene.beats.forEach(beat => {
       beat.generatedImages = [];
       beat.selectedImageIndex = -1;
       beat.status = 'Draft';
    })));

    return data;
  } catch (error) {
    console.error("Error generating shot list:", error);
    throw error;
  }
};

export const extractWorldData = async (script: string, systemInstruction: string): Promise<{ locations: Location[], newCharacters: Character[] }> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this text and extract the locations/environments and new characters/products.\n\nTEXT:\n${script}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: worldAnalysisSchema
      }
    });

    const text = response.text;
    if (!text) return { locations: [], newCharacters: [] };
    
    const data = JSON.parse(text);
    
    const locations: Location[] = data.locations.map((l: any, i: number) => ({
      id: `loc_${Date.now()}_${i}`,
      name: l.name,
      visuals: l.visuals,
      referenceImages: [],
      shotBank: { isGenerating: false }
    }));

    const newCharacters: Character[] = data.newCharacters.map((c: any, i: number) => ({
      id: `char_${Date.now()}_${i}`,
      name: c.name,
      handle: c.handle || `@${c.name.replace(/\s/g, '')}`,
      role: c.role,
      traits: c.traits,
      visuals: c.visuals,
      referenceImages: []
    }));

    return { locations, newCharacters };
  } catch (error) {
    console.error("Error extracting world data", error);
    return { locations: [], newCharacters: [] };
  }
};

export const generateDirectorBreakdown = async (script: string, systemInstruction: string): Promise<string> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this script and provide a shot-by-shot visual breakdown. Focus on camera angles, lighting, and emotion.\n\nSCRIPT:\n${script}`,
      config: { systemInstruction }
    });
    return response.text || "";
  } catch (error) {
    return ""; 
  }
};

export const parseScriptToStructure = async (script: string, directorNotes: string): Promise<EpisodeStructure> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `
      DIRECTOR'S NOTES: ${directorNotes}
      SCRIPT: ${script}

      IMPORTANT: Generate as many beats as needed to fully tell the story. Do NOT limit yourself to a small number.
      - Short scripts (1-2 pages): 8-15 beats
      - Medium scripts (3-5 pages): 20-40 beats
      - Long scripts (6+ pages): 50-100+ beats

      Each significant action, dialogue exchange, or camera change should be its own beat.
      `,
      config: {
        systemInstruction: `You are a Technical Producer AI. Convert scripts into structured JSON beats. Extract dialogue.

CRITICAL INSTRUCTIONS:
1. Generate comprehensive beat breakdowns with as many shots as needed. DO NOT artificially limit the number of beats.
2. For EACH beat, you MUST identify which characters are present by including their @handles in the "characters" array.
3. Extract @handles from dialogue tags, character names, and action descriptions.
4. If a beat says "Sam walks into the room" or has dialogue from "SAM:", include "@sam" in the characters array.

Example beat:
{
  "action": "Sam enters the coffee shop, looking nervous",
  "characters": ["@sam"],
  ...
}`,
        responseMimeType: "application/json",
        responseSchema: episodeStructureSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No JSON response");
    const data = JSON.parse(text) as EpisodeStructure;
    
    data.acts.forEach(act => act.scenes.forEach(scene => scene.beats.forEach(beat => {
          beat.generatedImages = [];
          beat.selectedImageIndex = -1;
    })));

    return data;
  } catch (error) {
    console.error("Error parsing structure:", error);
    throw error;
  }
};

export const generateShotVariations = async (beat: Beat, systemInstruction: string): Promise<Shot[]> => {
  try {
     const ai = getAi();
     const model = "gemini-3-pro-preview";
     const response = await ai.models.generateContent({
       model,
       contents: `BEAT ACTION: ${beat.action} PROMPT: ${beat.prompt_seed}`,
       config: {
         systemInstruction,
         responseMimeType: "application/json",
         responseSchema: coverageSchema
       }
     });
     const text = response.text;
     if(!text) return [];
     const data = JSON.parse(text);
     return data.variations as Shot[];
  } catch (error) {
    return [];
  }
};

export const refinePrompt = async (
  basePrompt: string,
  actionSummary: string,
  worldLook: string,
  characters: Character[],
  activeCharacterHandles: string[],
  locationContext: Location | undefined,
  promptGuidelines: string,
  directorLog: DirectorLog,
  models: Model[] = [],
  systemInstruction: string
): Promise<string> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";

    const involvedChars = characters.filter(c => activeCharacterHandles.includes(c.handle) || activeCharacterHandles.includes(c.name));
    
    const charContext = involvedChars.map(c => {
       let desc = `${c.name}: ${c.visuals} ${'sku' in c ? `(SKU: ${(c as any).sku})` : ''}`;
       if ('techSpecs' in c && (c as Product).techSpecs) {
          desc += `\n   TECHNICAL SPECS: ${(c as Product).techSpecs}`;
       }
       return desc;
    }).join("\n");
    
    const locContext = locationContext 
      ? `LOCATION SETTING (${locationContext.name}): ${locationContext.visuals}` 
      : "LOCATION: Generic studio/environment.";

    const modelContext = models.length > 0 ? `AVAILABLE MODELS: ${models.map(m => `${m.name} (${m.visuals})`).join(', ')}. If prompt implies a human model, use one of these descriptions.` : "";

    const fullInstruction = `
    ${systemInstruction}
    WORLD LOOK: ${worldLook}
    ${locContext}
    CHARACTER/PRODUCT VISUALS:
    ${charContext}
    ${modelContext}
    ACTION / CONTEXT: ${actionSummary}
    USER'S PROMPT BIBLE:
    ${promptGuidelines}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Original Prompt Seed: ${basePrompt}`,
      config: { systemInstruction: fullInstruction }
    });

    return response.text || basePrompt;
  } catch (error) {
    return basePrompt;
  }
};

export const generatePromptSuggestions = async (currentPrompt: string, worldLook: string): Promise<string[]> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `Generate 3 distinct variations: CINEMATIC, INTENSE, ATMOSPHERIC. Style: ${worldLook} Prompt: "${currentPrompt}"`,
      config: { responseMimeType: "application/json", responseSchema: suggestionsSchema }
    });
    return response.text ? JSON.parse(response.text).suggestions : [];
  } catch (error) { return []; }
};

export const checkVisualContinuity = async (prevBeat: Beat, currBeat: Beat): Promise<string | null> => {
  try {
    const ai = getAi();
    const model = "gemini-3-pro-preview";
    const response = await ai.models.generateContent({
       model,
       contents: `Check for visual continuity errors: \nPREV: ${prevBeat.prompt_seed}\nCURR: ${currBeat.prompt_seed}. Return "OK" or error description.`
    });
    const result = response.text?.trim();
    return (result && result !== "OK" && !result.includes("No major")) ? result : null;
  } catch (error) { return null; }
};

// Analyze a style reference image to reverse-engineer lighting/camera
export const analyzeStyleReference = async (base64Image: string): Promise<StyleAnalysis | null> => {
  try {
     const ai = getAi();
     const model = "gemini-3-pro-preview"; // Vision capable
     
     const cleanData = base64Image.split(',')[1] || base64Image;
     
     const response = await ai.models.generateContent({
        model,
        contents: {
           parts: [
              { inlineData: { mimeType: 'image/png', data: cleanData } },
              { text: "Analyze this product photography style. Extract technical details for replication." }
           ]
        },
        config: {
           responseMimeType: "application/json",
           responseSchema: styleAnalysisSchema
        }
     });
     
     if (response.text) {
        return JSON.parse(response.text) as StyleAnalysis;
     }
     return null;
  } catch (error) {
     console.error("Style analysis failed:", error);
     return null;
  }
};

// 🎬 NARRATIVE: Analyze generated shot for next shot's context
export const analyzeGeneratedShot = async (imageUrl: string, prompt: string): Promise<string> => {
  const ai = getAi();
  const model = 'gemini-3-pro-preview';

  const analysisPrompt = `You are a DIRECTOR analyzing a shot for continuity.

SHOT DESCRIPTION: ${prompt}

Extract these details for the NEXT shot:
1. Character positions/poses
2. Lighting direction/quality
3. Key visual elements
4. Emotional tone
5. Props/background details

OUTPUT: Concise continuity notes (3-5 sentences) for maintaining visual flow.`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: analysisPrompt
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to analyze shot.';
  } catch (error) {
    console.error('Shot analysis failed:', error);
    return 'Unable to analyze shot.';
  }
};

export const generateImage = async (
  prompt: string,
  referenceImages: (string | StyleReference)[] = [],
  resolution: Resolution = '1080p',
  aspectRatio: AspectRatio = '16:9',
  worldLook?: string,
  promptGuidelines?: string,
  references?: {
    characters?: Character[];
    products?: Product[];
    models?: Model[];
    locations?: Location[];
    styles?: StyleReference[];
  },
  styleAnalysis?: BatchStyleAnalysis
): Promise<string | null> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-image-preview';

    const parts: any[] = [];

    // Extract @handles from prompt
    const handleRegex = /@(\w+)/g;
    const handles = Array.from(prompt.matchAll(handleRegex)).map(m => m[1]);

    console.log('🔍 Found @handles in prompt:', handles);

    // Collect reference images from @handles
    let referenceCount = 0;
    const MAX_REFERENCES = 14; // Nano Banana Pro limit
    let enhancedPromptAdditions = '';

    // Add character reference images (NARRATIVE MODE - HIGHEST PRIORITY)
    if (references?.characters) {
      references.characters.forEach(character => {
        const charHandle = character.handle?.replace('@', '');
        if (charHandle && handles.includes(charHandle) && referenceCount < MAX_REFERENCES) {
          const imageCount = character.referenceImages?.length || 0;
          console.log(`👤 Adding ${Math.min(imageCount, MAX_REFERENCES - referenceCount)} reference images for @${charHandle}`);

          // Add reference images (limited by MAX_REFERENCES)
          character.referenceImages?.forEach(imgUrl => {
            if (imgUrl && referenceCount < MAX_REFERENCES) {
              const cleanData = imgUrl.split(',')[1] || imgUrl;
              parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
              referenceCount++;
            }
          });

          // Add profile data to enhance prompt (if exists)
          if (character.profile) {
            enhancedPromptAdditions += `\n\n${character.handle} CHARACTER PROFILE:`;
            if (character.profile.physicalDescription) {
              enhancedPromptAdditions += `\nPhysical: ${character.profile.physicalDescription}`;
            }
            if (character.profile.style) {
              enhancedPromptAdditions += `\nStyle: ${character.profile.style}`;
            }
            // Note: Expressions and poses are EXAMPLES, not constraints
            if (character.profile.expressions && character.profile.expressions.length > 0) {
              enhancedPromptAdditions += `\nExample expressions: ${character.profile.expressions.join(', ')}`;
            }
            if (character.profile.poses && character.profile.poses.length > 0) {
              enhancedPromptAdditions += `\nTypical posture: ${character.profile.poses.join(', ')} (examples only - use script direction for actual pose)`;
            }
          }
        }
      });
    }

    // Add product reference images
    if (references?.products && referenceCount < MAX_REFERENCES) {
      references.products.forEach(product => {
        const productHandle = product.handle?.replace('@', '');
        if (productHandle && handles.includes(productHandle) && referenceCount < MAX_REFERENCES) {
          const imageCount = product.referenceImages?.length || 0;
          console.log(`📦 Adding ${Math.min(imageCount, MAX_REFERENCES - referenceCount)} reference images for @${productHandle}`);
          product.referenceImages?.forEach(imgUrl => {
            if (imgUrl && referenceCount < MAX_REFERENCES) {
              const cleanData = imgUrl.split(',')[1] || imgUrl;
              parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
              referenceCount++;
            }
          });
        }
      });
    }

    // Add model reference images
    if (references?.models && referenceCount < MAX_REFERENCES) {
      references.models.forEach(model => {
        const modelHandle = model.handle?.replace('@', '');
        if (modelHandle && handles.includes(modelHandle) && referenceCount < MAX_REFERENCES) {
          const imageCount = model.referenceImages?.length || 0;
          console.log(`👤 Adding ${Math.min(imageCount, MAX_REFERENCES - referenceCount)} reference images for @${modelHandle}`);
          model.referenceImages?.forEach(imgUrl => {
            if (imgUrl && referenceCount < MAX_REFERENCES) {
              const cleanData = imgUrl.split(',')[1] || imgUrl;
              parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
              referenceCount++;
            }
          });
        }
      });
    }

    // Add location reference images
    if (references?.locations && referenceCount < MAX_REFERENCES) {
      references.locations.forEach(location => {
        const locHandle = location.handle?.replace('@', '');
        if (locHandle && handles.includes(locHandle) && referenceCount < MAX_REFERENCES) {
          const imageCount = location.referenceImages?.length || 0;
          console.log(`📍 Adding ${Math.min(imageCount, MAX_REFERENCES - referenceCount)} reference images for @${locHandle}`);
          location.referenceImages?.forEach(imgUrl => {
            if (imgUrl && referenceCount < MAX_REFERENCES) {
              const cleanData = imgUrl.split(',')[1] || imgUrl;
              parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
              referenceCount++;
            }
          });
        }
      });
    }

    // Add style reference images
    if (references?.styles && referenceCount < MAX_REFERENCES) {
      references.styles.forEach(style => {
        if (style.imageUrl && referenceCount < MAX_REFERENCES) {
          const cleanData = style.imageUrl.split(',')[1] || style.imageUrl;
          parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
          referenceCount++;
        }
      });
    }

    // Also handle legacy referenceImages array
    referenceImages.forEach(ref => {
      const base64 = typeof ref === 'string' ? ref : ref.imageUrl;
      if (!base64) return;
      const cleanData = base64.split(',')[1] || base64;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
      referenceCount++;
    });

    console.log(`✅ Total reference images: ${referenceCount} / ${MAX_REFERENCES}`);

    let finalPrompt = prompt;

    // Add character profile data (if any)
    if (enhancedPromptAdditions) {
      finalPrompt += enhancedPromptAdditions;
      console.log('📝 Added character profile data to prompt');
    }

    // Add world look and guidelines
    if (worldLook) {
      finalPrompt += `\n\nVisual Style: ${worldLook}`;
    }
    if (promptGuidelines) {
      finalPrompt += `\n\nGuidelines: ${promptGuidelines}`;
    }

    // 🔒 PRIORITY 1: Global Locked Style Analysis (from batch reference analysis)
    if (styleAnalysis) {
      finalPrompt += `\n\n🔒 LOCKED GLOBAL STYLE (MANDATORY):`;
      finalPrompt += `\nVisual Style: ${styleAnalysis.commonStyle}`;
      finalPrompt += `\nLighting: ${styleAnalysis.lighting}`;
      finalPrompt += `\nColor Palette: ${styleAnalysis.colors}`;
      finalPrompt += `\nMaterials/Textures: ${styleAnalysis.materials}`;
      finalPrompt += `\nComposition: ${styleAnalysis.composition}`;
      finalPrompt += `\n\nStyle Summary: ${styleAnalysis.summary}`;
      console.log('🔒 Applied locked global style analysis to prompt');
      console.log('   Style details:', JSON.stringify(styleAnalysis, null, 2));
    }
    // Fallback: Handle individual Style References (Text Conditioning from Analysis)
    else {
      console.warn('⚠️ NO GLOBAL STYLE ANALYSIS - using individual style references instead');
      const styleRefs = referenceImages.filter(r => typeof r !== 'string') as StyleReference[];
      const activeStyle = styleRefs.find(s => s.isDefault) || styleRefs[0];

      if (activeStyle && activeStyle.analysis) {
        finalPrompt += `\n\nSTYLE REPLICATION INSTRUCTIONS:
         LIGHTING: ${activeStyle.analysis.lighting}
         COMPOSITION: ${activeStyle.analysis.composition}
         CAMERA: ${activeStyle.analysis.camera}
         COLOR GRADING: ${activeStyle.analysis.colorGrading}
         ${activeStyle.analysis.replicationPrompt}`;
        console.log('📝 Applied individual style reference analysis');
      }
    }

    let apiAspectRatio = aspectRatio;
    if (aspectRatio === '2.39:1') {
      apiAspectRatio = '16:9';
      finalPrompt += " (Cinematic Anamorphic 2.39:1 Widescreen)";
    }

    // Add production negative prompt to prevent visible equipment
    finalPrompt += `\n\nNEGATIVE PROMPT:\n${PRODUCTION_NEGATIVE_PROMPT}`;

    parts.push({ text: finalPrompt });

    let size = "1K";
    if (resolution === '2k') size = "2K";
    if (resolution === '4k') size = "4K";

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: apiAspectRatio as any, imageSize: size } }
    });

    console.log('📥 Image generation response received');
    console.log('Response structure:', JSON.stringify({
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length,
      firstCandidate: response.candidates?.[0] ? 'exists' : 'missing',
      hasContent: !!response.candidates?.[0]?.content,
      hasParts: !!response.candidates?.[0]?.content?.parts,
      partsLength: response.candidates?.[0]?.content?.parts?.length
    }));

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        console.log('Part type:', Object.keys(part));
        if (part.inlineData) {
          console.log('✅ Image data found, size:', part.inlineData.data?.length || 0);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    console.warn('⚠️ No image data found in response. Full response:', JSON.stringify(response, null, 2).substring(0, 1000));
    return null;
  } catch (error: any) {
    console.error("❌ Error generating image:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Check for specific API error types
    if (error?.status) {
      console.error("🚨 API Status Code:", error.status);
      if (error.status === 429) {
        console.error("🚨 RATE LIMIT EXCEEDED - Too many requests. Wait 60 seconds.");
      }
      if (error.status === 403) {
        console.error("🚨 QUOTA EXCEEDED - Daily/hourly API quota reached.");
      }
    }
    if (error?.message) {
      if (error.message.includes('quota')) {
        console.error("🚨 QUOTA ERROR - API quota exceeded");
      }
      if (error.message.includes('rate')) {
        console.error("🚨 RATE LIMIT ERROR - Slow down requests");
      }
      if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
        console.error("🚨 SAFETY FILTER - Content blocked by safety filters");
      }
    }

    console.error("Full error object:", JSON.stringify(error, null, 2).substring(0, 1000));
    return null;
  }
};

export const generateModelPortfolio = async (modelName: string, visuals: string, worldLook: string): Promise<string[]> => {
    const angles = [
        "Close-Up Portrait", "3/4 Portrait", "Full Body Front", 
        "Side Profile", "Action Pose", "Candid Lifestyle"
    ];
    const results: string[] = [];
    
    const promises = angles.map(async (angle) => {
        const prompt = `Model Sheet Reference: ${angle} of ${modelName}. ${visuals}. Style: ${worldLook}. Neutral background.`;
        return generateImage(prompt, [], '1080p', '4:3');
    });
    
    const images = await Promise.all(promises);
    images.forEach(img => { if(img) results.push(img); });
    return results;
};

export const generateLocationSet = async (location: Location, worldLook: string, styleReferences: StyleReference[] = []): Promise<{ wide?: string, medium?: string, closeup?: string }> => {
    const results: { wide?: string, medium?: string, closeup?: string } = {};
    const basePrompt = `Asset: ${location.name}. ${location.visuals}. Style: ${worldLook}.`;
    const tasks = [
        { type: 'wide', prompt: `ESTABLISHING SHOT / WIDE: ${basePrompt}` },
        { type: 'medium', prompt: `MEDIUM BACKGROUND: ${basePrompt}` },
        { type: 'closeup', prompt: `CLOSE-UP TEXTURE: ${basePrompt}` }
    ];
    for (const task of tasks) {
        const img = await generateImage(task.prompt, styleReferences, '1080p', '16:9');
        if (img && task.type === 'wide') results.wide = img;
        if (img && task.type === 'medium') results.medium = img;
        if (img && task.type === 'closeup') results.closeup = img;
    }
    return results;
};

export const editGeneratedImage = async (image: string, editInstruction: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-image-preview';
    const cleanData = image.split(',')[1] || image;
    const parts = [{ inlineData: { mimeType: 'image/png', data: cleanData } }, { text: editInstruction }];
    const response = await ai.models.generateContent({ model, contents: { parts } });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) { return null; }
};

export const generateProductShotVariations = async (shot: Beat, systemInstruction: string): Promise<Shot[]> => {
    const angles = ["Front Hero", "Side Profile", "Detail Macro", "Context/Lifestyle"];
    const results: Shot[] = [];
    // Mock generation for speed - typically would call LLM to prompt these out
    angles.forEach(angle => {
        results.push({
            type: 'Medium', // simplified
            lens: '50mm',
            movement: 'Static',
            prompt: `${angle} of ${shot.characters.join(', ')}. ${shot.action}.`,
            isGenerating: false
        });
    });
    return results;
};

export const generateShotListCSV = (structure: EpisodeStructure): string => {
    const headers = "Collection,Shoot,Shot ID,Products,Action,Caption,Camera,Lighting,Location\n";
    const rows: string[] = [];
    structure.acts.forEach(act => {
        act.scenes.forEach(scene => {
            scene.beats.forEach(beat => {
                const row = [
                    `Act/Col ${act.act_number}`,
                    `Scene/Shoot ${scene.scene_number}`,
                    beat.beat_id,
                    `"${beat.characters.join(', ')}"`,
                    `"${beat.action.replace(/"/g, '""')}"`,
                    `"${(beat.dialogue || '').replace(/"/g, '""')}"`,
                    beat.camera,
                    beat.lighting,
                    `"${beat.location}"`
                ].join(',');
                rows.push(row);
            });
        });
    });
    return headers + rows.join('\n');
};

// Generate product images from different angles using a reference image
export async function generateImageWithAngles(
  prompt: string,
  referenceImage: string,
  aspectRatio: AspectRatio = '1:1'
): Promise<string> {
  const ai = getAi();

  try {
    const model = 'gemini-3-pro-image-preview';

    // Convert base64 to proper format for Gemini
    const cleanData = referenceImage.split(',')[1] || referenceImage;

    const parts: any[] = [];

    // Add reference image first
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });

    // Add prompt with instructions to maintain product consistency
    const enhancedPrompt = `${prompt}. Maintain exact same product appearance, color, material, and branding as shown in the reference image. Professional product photography quality.`;
    parts.push({ text: enhancedPrompt });

    let size = "1K";

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: size } }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated');
  } catch (error) {
    console.error('Error generating angle:', error);
    throw error;
  }
}

// Enhance a raw brief into a professional, structured brief
export async function enhanceBrief(rawBrief: string, projectType: 'narrative' | 'product'): Promise<string> {
  const ai = getAi();
  const model = 'gemini-3-pro-preview';

  const systemPrompt = projectType === 'product' ? `You are a Creative Director for premium sport-fashion campaigns.

Given a rough campaign brief, enhance it into a professional, detailed brief that includes:

STRUCTURE:
1. CAMPAIGN TITLE & CONCEPT (1-2 sentences)
2. PRODUCTS section - List all products with detailed descriptions
3. ENVIRONMENTS section - List all locations with atmospheric descriptions
4. TARGET AESTHETIC - Visual style, mood, photography approach
5. HERO MOMENTS - Key shots and compositions
6. TECHNICAL NOTES - Materials, features, colors to highlight

ENHANCEMENT RULES:
- Expand vague descriptions into specific, vivid details
- Add professional photography terminology
- Include lighting, composition, and mood notes
- Maintain premium, editorial tone
- Be specific about materials, textures, colors
- Add cinematic environment descriptions
- Include 3-5 hero moment descriptions

OUTPUT: Enhanced brief in structured markdown format` :
`You are a Narrative Creative Director.

Enhance the brief into a professional narrative structure with clear story beats, character descriptions, and key visual moments.`;

  const result = await ai.models.generateContent({
    model,
    contents: `${systemPrompt}

RAW BRIEF:
${rawBrief}

ENHANCED BRIEF:`
  });

  return result.candidates?.[0]?.content?.parts?.[0]?.text || rawBrief;
}

// Diagnostic test to verify image generation capabilities
export async function testImageGenerationModels() {
  const ai = getAi();

  const modelsToTest = [
    'gemini-3-pro-image-preview',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-3-pro-preview',
    'imagen-3.0-generate-001'
  ];

  console.log('🧪 TESTING IMAGE GENERATION MODELS');
  console.log('===================================');

  for (const modelName of modelsToTest) {
    console.log(`\n📡 Testing: ${modelName}`);

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: 'Generate a simple image of a red apple on white background' }]
        },
        config: modelName.includes('image-preview') ? {
          imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
        } : undefined
      });

      // Check if response contains image data
      let hasImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            hasImage = true;
            console.log('✅ SUCCESS: Model CAN generate images!');
            console.log(`   Image type: ${part.inlineData.mimeType}`);
            break;
          }
        }
      }

      if (!hasImage) {
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('❌ FAILED: Model returned text, not image');
        console.log(`   Response: ${text.slice(0, 100)}...`);
      }

    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.message.includes('not found')) {
        console.log('   → Model not available with your API key');
      } else if (error.message.includes('quota')) {
        console.log('   → Quota exceeded or billing issue');
      }
    }
  }

  console.log('\n===================================');
  console.log('Test complete. Check results above.');
}

// Quick inline test for current model
export async function quickImageTest(): Promise<boolean> {
  const ai = getAi();

  try {
    console.log('🔬 Quick test: gemini-3-pro-image-preview');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: 'Professional product photo of a navy blue polo shirt, studio lighting, white background' }]
      },
      config: { imageConfig: { aspectRatio: '1:1', imageSize: '1K' } }
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      console.log('✅ gemini-3-pro-image-preview is WORKING!');
      return true;
    } else {
      console.log('❌ gemini-3-pro-image-preview not generating images');
      console.log('Response:', JSON.stringify(response, null, 2));
      return false;
    }
  } catch (error: any) {
    console.error('❌ Quick test failed:', error.message);
    return false;
  }
}

// Comprehensive image generation test with detailed logging
export async function testImageGeneration(): Promise<boolean> {
  const ai = getAi();

  console.log('');
  console.log('🧪 TESTING GEMINI IMAGE GENERATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('API Key:', process.env.API_KEY ? `${process.env.API_KEY.slice(0, 10)}...` : 'NOT SET');
  console.log('');

  // Test 1: gemini-3-pro-image-preview (Imagen 3)
  try {
    console.log('📡 Test 1: gemini-3-pro-image-preview (Imagen 3)');
    console.log('   Prompt: "Red apple on white background"');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: 'Generate a photorealistic image of a single red apple on a clean white background' }]
      },
      config: { imageConfig: { aspectRatio: '1:1', imageSize: '1K' } }
    });

    let hasImage = false;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          hasImage = true;
          console.log('   ✅ SUCCESS: Image generated!');
          console.log(`   📊 Type: ${part.inlineData.mimeType}`);
          console.log(`   📊 Size: ${part.inlineData.data?.length || 0} chars`);
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎉 RESULT: Your setup is CORRECT!');
          console.log('   Model: gemini-3-pro-image-preview works');
          console.log('   API Key: Valid and has image generation access');
          console.log('');
          console.log('💡 Next Steps:');
          console.log('   1. Create a product campaign brief');
          console.log('   2. Add product reference images with @handles');
          console.log('   3. Generate shots - @handles should inject references');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          return true;
        }
      }
    }

    if (!hasImage) {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('   ❌ FAILED: Returned text instead of image');
      console.log(`   Response: ${text.slice(0, 100)}...`);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  PROBLEM: Model not generating images');
      console.log('');
      console.log('Possible causes:');
      console.log('   1. API key lacks Imagen 3 access');
      console.log('   2. Model name changed or deprecated');
      console.log('   3. Billing/quota issue');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Check Google AI Studio for model availability');
      console.log('   2. Verify billing is enabled');
      console.log('   3. Try alternative: Vertex AI or external API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      return false;
    }

  } catch (error: any) {
    console.log('   ❌ ERROR:', error.message);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ TEST FAILED');
    console.log('');

    if (error.message.includes('not found') || error.message.includes('404')) {
      console.log('⚠️  Model not available with your API key');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Verify API key has Imagen 3 access');
      console.log('   2. Check if model name is correct');
      console.log('   3. Enable required APIs in Google Cloud Console');
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('⚠️  Quota exceeded or billing issue');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Check billing is enabled');
      console.log('   2. Verify quota limits');
      console.log('   3. Wait and retry');
    } else if (error.message.includes('API key')) {
      console.log('⚠️  API key issue');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Check .env.local file has GEMINI_API_KEY');
      console.log('   2. Verify API key is valid');
      console.log('   3. Restart dev server after changing .env.local');
    } else {
      console.log('⚠️  Unexpected error');
      console.log('');
      console.log('Full error:', error);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    return false;
  }

  return false;
}

// 🎨 AI REFERENCE AUGMENTATION (Internal Team Tool)
// Analyze existing character references to identify missing angles/views
export interface CoverageAnalysis {
  existingViews: string[];
  missingViews: string[];
  confidence: 'low' | 'medium' | 'high';
  recommendation: string;
}

export const analyzeImageCoverage = async (
  referenceImages: string[],
  characterName: string,
  characterVisuals: string
): Promise<CoverageAnalysis> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Vision capable

    // Build multimodal prompt with all existing reference images
    const parts: any[] = [];

    referenceImages.forEach(imgUrl => {
      const cleanData = imgUrl.split(',')[1] || imgUrl;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
    });

    parts.push({
      text: `You are a CHARACTER REFERENCE ANALYST.

CHARACTER: ${characterName}
DESCRIPTION: ${characterVisuals}

TASK: Analyze the provided reference images and identify:
1. What angles/views are ALREADY covered (front, side, back, 3/4, close-up face, full body, etc.)
2. What angles/views are MISSING that would help AI consistency
3. Overall coverage quality (low/medium/high)
4. Recommendation for what to generate next

CRITICAL ANGLES FOR CHARACTER CONSISTENCY:
- Front view (full body)
- Side profile (left and right)
- 3/4 view (angled)
- Back view
- Close-up face (front)
- Close-up face (3/4)
- Action poses (if character is dynamic)
- Key outfit details (jacket, shoes, accessories)

OUTPUT FORMAT (JSON):
{
  "existingViews": ["front full body", "close-up face", ...],
  "missingViews": ["side profile", "back view", ...],
  "confidence": "low" | "medium" | "high",
  "recommendation": "Suggest top 3 most important missing angles to generate"
}`
    });

    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    const text = response.text;
    if (!text) throw new Error('No analysis returned');

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('📊 Coverage Analysis:', analysis);
      return analysis;
    }

    // Fallback if JSON parsing fails
    return {
      existingViews: ['unknown'],
      missingViews: ['front view', 'side profile', '3/4 view'],
      confidence: 'low',
      recommendation: 'Could not parse analysis. Consider adding standard character turnaround views.'
    };

  } catch (error) {
    console.error('Coverage analysis failed:', error);
    return {
      existingViews: [],
      missingViews: ['front view', 'side profile', 'back view', '3/4 view', 'close-up face'],
      confidence: 'low',
      recommendation: 'Analysis failed. Start with basic turnaround: front, side, back, 3/4.'
    };
  }
};

// Generate missing reference angles using Nano Banana Pro
export const generateMissingReferences = async (
  existingReferences: string[],
  characterName: string,
  characterVisuals: string,
  missingView: string,
  worldLook: string
): Promise<string | null> => {
  console.log('🎬 generateMissingReferences called');
  console.log('   - Character:', characterName);
  console.log('   - Missing view:', missingView);
  console.log('   - Existing references:', existingReferences.length);

  try {
    const ai = getAi();
    const model = 'gemini-3-pro-image-preview'; // Nano Banana Pro
    console.log('   - Model:', model);

    // Build multimodal prompt with existing references
    const parts: any[] = [];

    // Add all existing references (up to 14)
    const refsToUse = existingReferences.slice(0, 14);
    console.log(`   - Adding ${refsToUse.length} reference images to prompt`);

    refsToUse.forEach((imgUrl, idx) => {
      const cleanData = imgUrl.split(',')[1] || imgUrl;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
      console.log(`     [${idx + 1}/${refsToUse.length}] Reference image added (${cleanData.length} chars)`);
    });

    // Create prompt for missing view
    const prompt = `CHARACTER REFERENCE SHEET: ${missingView}

Character: ${characterName}
Description: ${characterVisuals}

TASK: Generate a clean reference image showing the ${missingView}.

REQUIREMENTS:
- Match the character's appearance from the reference images EXACTLY
- Same outfit, same proportions, same facial features
- Clean, neutral pose suitable for reference
- ${worldLook}
- Plain background (bright pink or neutral)
- Professional character turnaround quality
- NO scene, NO environment, JUST the character reference

CRITICAL: This is a REFERENCE IMAGE for consistency, not a scene shot.`;

    parts.push({ text: prompt });
    console.log('   - Prompt added to parts array');
    console.log('   - Total parts:', parts.length);

    console.log('📡 Calling Gemini API...');
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: '1:1', imageSize: '2K' } }
    });

    console.log('📥 API response received');
    console.log('   - Response candidates:', response.candidates?.length || 0);

    if (response.candidates?.[0]?.content?.parts) {
      console.log('   - Response parts:', response.candidates[0].content.parts.length);

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated missing reference: ${missingView}`);
          console.log(`   - MIME type: ${part.inlineData.mimeType}`);
          console.log(`   - Data length: ${part.inlineData.data?.length} chars`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          console.warn('⚠️  API returned text instead of image:', part.text.substring(0, 200));
        }
      }
    }

    console.warn('⚠️  No image data found in response');
    return null;
  } catch (error) {
    console.error('❌ Reference generation failed:', error);
    if (error instanceof Error) {
      console.error('   - Error message:', error.message);
      console.error('   - Error stack:', error.stack);
    }
    return null;
  }
};

// 🏢 AI LOCATION SETUP (Script Analysis → Multi-Angle Generation)
// Extract locations from script with AI analysis
export interface ExtractedLocation {
  name: string;
  handle: string;
  description: string;
  keyAreas: string[];
  suggestedAngles: string[];
}

export const extractLocationsFromScript = async (
  script: string
): Promise<ExtractedLocation[]> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Text analysis model

    const prompt = `You are an expert Location Scout and Production Designer.

Analyze this script and extract all unique locations/environments mentioned:

${script}

For EACH unique location, provide:
1. Location name (clear, memorable - e.g., "The Hub", "Ivan's Kitchen")
2. Suggested @handle (lowercase, no spaces - e.g., "@TheHub", "@IvansKitchen")
3. Detailed visual description (combine all mentions from script)
4. Key areas/zones within the location
5. Recommended camera angles for production (8 angles that cover all important views)

CRITICAL CAMERA ANGLES FOR ENVIRONMENT CONSISTENCY:
- Wide establishing shot (shows entire space)
- Medium shot (character perspective)
- Close-up details (key props, equipment)
- Reverse angle (opposite view)
- Different lighting variations (day/night if applicable)
- Overhead/layout view (spatial understanding)
- Key area specific shots

OUTPUT FORMAT (JSON only, no commentary):
{
  "locations": [
    {
      "name": "The Hub",
      "handle": "@TheHub",
      "description": "Mix of high-tech lab and cozy living space. Left side: sleek kitchen island with stainless steel appliances. Right side: massive curved computer terminal with holographic displays. Central area: open workspace with comfortable seating.",
      "keyAreas": ["Kitchen island (left)", "Computer terminal (right)", "Central open workspace", "Entrance"],
      "suggestedAngles": [
        "Wide establishing shot showing entire Hub",
        "Medium shot from kitchen looking toward terminal",
        "Medium shot from terminal looking toward kitchen",
        "Close-up: Computer terminal and holographic displays",
        "Close-up: Kitchen island equipment",
        "Central area from entrance perspective",
        "Reverse angle: View from back wall toward entrance",
        "Overhead layout view showing spatial relationships"
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text;
    if (!text) throw new Error('No analysis returned');

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('🏢 Extracted locations:', parsed.locations);
      return parsed.locations || [];
    }

    return [];

  } catch (error) {
    console.error('Location extraction failed:', error);
    throw error;
  }
};

// Generate multiple angle variations for a location
export interface GeneratedLocationAngle {
  angle: string;
  imageUrl: string;
  prompt: string;
}

export const generateLocationAngles = async (
  locationName: string,
  description: string,
  worldLook: string,
  anglesToGenerate: string[],
  referenceImage?: string // Optional: for consistency
): Promise<GeneratedLocationAngle[]> => {
  console.log('🏢 generateLocationAngles called');
  console.log('   - Location:', locationName);
  console.log('   - Angles to generate:', anglesToGenerate.length);
  console.log('   - Has reference image:', !!referenceImage);

  const generatedAngles: GeneratedLocationAngle[] = [];

  try {
    const ai = getAi();
    const model = 'gemini-3-pro-image-preview'; // Nano Banana Pro

    for (const angle of anglesToGenerate) {
      console.log(`📸 Generating: ${angle}`);

      const parts: any[] = [];

      // Add reference image if provided
      if (referenceImage) {
        const cleanData = referenceImage.split(',')[1] || referenceImage;
        parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
        console.log('   - Reference image added for consistency');
      }

      // Create prompt for this specific angle
      const promptText = `ENVIRONMENT REFERENCE SHEET: ${angle}

Location: ${locationName}
Description: ${description}

TASK: Generate a clean environment reference image showing the ${angle}.

REQUIREMENTS:
- Match the location description EXACTLY
${referenceImage ? '- Match the style and design of the provided reference image for consistency' : ''}
- ${worldLook}
- Professional environment reference quality
- NO characters or people (environment only)
- Clean, production-ready shot
- 2K resolution for reference clarity
- Pixar/Fortnite cinematic style

VIEW SPECIFIC TO THIS ANGLE: ${angle}

CRITICAL: This is a LOCATION REFERENCE for consistent AI generation, not a scene shot.`;

      parts.push({ text: promptText });

      console.log('📡 Calling Gemini API for angle:', angle);
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { imageConfig: { aspectRatio: '16:9', imageSize: '2K' } }
      });

      console.log('📥 API response received');
      console.log('Response structure:', JSON.stringify({
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length,
        firstCandidate: response.candidates?.[0] ? 'exists' : 'missing',
        hasContent: !!response.candidates?.[0]?.content,
        hasParts: !!response.candidates?.[0]?.content?.parts,
        partsLength: response.candidates?.[0]?.content?.parts?.length
      }));

      if (response.candidates?.[0]?.content?.parts) {
        console.log('Parts found:', response.candidates[0].content.parts.length);
        for (const part of response.candidates[0].content.parts) {
          console.log('Part type:', Object.keys(part));
          if (part.inlineData) {
            const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            generatedAngles.push({
              angle,
              imageUrl,
              prompt: promptText
            });
            console.log(`✅ Generated: ${angle}`);
            break;
          }
        }
      } else {
        console.warn('⚠️ No parts found in response. Full response:', JSON.stringify(response, null, 2).substring(0, 500));
      }
    }

    console.log(`✅ All angles generated: ${generatedAngles.length}/${anglesToGenerate.length}`);
    return generatedAngles;

  } catch (error) {
    console.error('❌ Location angle generation failed:', error);
    throw error;
  }
};

// 🎨 GLOBAL STYLE ANALYSIS (Batch Multi-Image Analysis)
// Analyze multiple style reference images together to identify common patterns
export const analyzeBatchStyleReferences = async (
  images: string[]
): Promise<BatchStyleAnalysis> => {
  console.log('🎨 analyzeBatchStyleReferences called');
  console.log('   - Number of images:', images.length);
  console.log('   - API Key available:', !!process.env.API_KEY, process.env.API_KEY?.substring(0, 10) + '...');

  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Same model as single style analysis

    const parts: any[] = [];

    // Add all style reference images
    images.forEach((imgUrl, idx) => {
      const cleanData = imgUrl.split(',')[1] || imgUrl;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
      console.log(`   - Added style reference ${idx + 1}/${images.length}`);
    });

    // Add analysis prompt
    const prompt = `You are a VISUAL STYLE ANALYST for high-end animation production.

Analyze these ${images.length} style reference images TOGETHER to identify the COMMON visual characteristics that define the unified aesthetic.

TASK: Identify shared patterns across ALL images:
1. **Visual Style** (e.g., "Pixar/Fortnite 3D CGI", "Anime 2D", "Photorealistic")
2. **Lighting Approach** (e.g., "Soft studio lighting with neon rim lights", "Dramatic chiaroscuro")
3. **Color Palette** (e.g., "Bright pink backgrounds with vibrant saturated colors", "Muted earth tones")
4. **Materials/Textures** (e.g., "Clay-like smooth surfaces with geometric shapes", "Realistic skin with subsurface scattering")
5. **Composition Patterns** (e.g., "Centered subjects with shallow depth of field", "Rule of thirds with dynamic poses")

Create a comprehensive style guide that can be used to ensure all future AI-generated images match this exact aesthetic.

OUTPUT FORMAT (JSON only, no commentary):
{
  "commonStyle": "Brief description of overall visual style",
  "lighting": "Lighting characteristics",
  "colors": "Color palette description",
  "materials": "Material and texture style",
  "composition": "Composition and framing patterns",
  "summary": "2-3 sentence comprehensive style guide that captures the essence of this aesthetic"
}`;

    parts.push({ text: prompt });

    console.log('📡 Calling Gemini API for batch style analysis...');
    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    const text = response.text;
    if (!text) throw new Error('No analysis returned');

    console.log('📥 API response received');

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('✅ Style analysis complete:', analysis);
      return analysis;
    }

    // Fallback if JSON parsing fails
    return {
      commonStyle: 'Unable to analyze',
      lighting: 'Unable to analyze',
      colors: 'Unable to analyze',
      materials: 'Unable to analyze',
      composition: 'Unable to analyze',
      summary: 'Could not parse style analysis. Please try uploading more style references.'
    };

  } catch (error) {
    console.error('❌ Batch style analysis failed:', error);
    throw error;
  }
};

// Make test functions available globally in browser console
if (typeof window !== 'undefined') {
  (window as any).testImageGeneration = testImageGeneration;
  (window as any).testImageGenerationModels = testImageGenerationModels;
  (window as any).quickImageTest = quickImageTest;
  console.log('🔧 Image generation test functions available:');
  console.log('   - testImageGeneration()');
  console.log('   - testImageGenerationModels()');
  console.log('   - quickImageTest()');
}
