/**
 * DIRECTOR - In-Paint Editing Service
 * 
 * Allows selective editing of generated images.
 * Uses Gemini's image editing capabilities.
 */

import { GoogleGenAI } from "@google/genai";
import { MODELS, getApiKey, PRODUCTION_NEGATIVE_PROMPT } from './modelConfig';

// ============================================
// TYPES
// ============================================

export interface InPaintRequest {
  image: string;                  // Base64 image to edit
  instruction: string;            // What to change
  mask?: string;                  // Optional: Base64 mask (white = edit area)
  preserveStyle?: boolean;        // Try to maintain original style
  strength?: 'subtle' | 'moderate' | 'strong';  // How much to change
}

export interface InPaintResult {
  success: boolean;
  image?: string;
  error?: string;
}

export interface EditSuggestion {
  category: 'composition' | 'lighting' | 'character' | 'background' | 'color' | 'detail';
  suggestion: string;
  prompt: string;
}

// ============================================
// ANALYZE IMAGE FOR EDIT SUGGESTIONS
// ============================================

export const analyzeForEdits = async (
  imageBase64: string,
  context?: string
): Promise<EditSuggestion[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key available');
  
  const ai = new GoogleGenAI({ apiKey });
  const cleanData = imageBase64.split(',')[1] || imageBase64;
  
  const response = await ai.models.generateContent({
    model: MODELS.vision,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: cleanData } },
        { text: `Analyze this AI-generated image for potential improvements.

${context ? `CONTEXT: ${context}` : ''}

Suggest 5-6 specific edits that could enhance this image. For each, provide:
1. Category (composition, lighting, character, background, color, detail)
2. What could be improved
3. A specific edit instruction to fix it

Format as JSON array:
[
  {
    "category": "lighting",
    "suggestion": "Shadows are too harsh on the face",
    "prompt": "Soften the shadows on the character's face, add subtle fill light"
  }
]

Only return the JSON array.` }
      ]
    }
  });
  
  try {
    const text = response.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse edit suggestions:', e);
  }
  
  return [];
};

// ============================================
// EDIT IMAGE (Description-based)
// ============================================

export const editImage = async (
  request: InPaintRequest
): Promise<InPaintResult> => {
  const {
    image,
    instruction,
    preserveStyle = true,
    strength = 'moderate',
  } = request;
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No API key available');
    
    const ai = new GoogleGenAI({ apiKey });
    const cleanData = image.split(',')[1] || image;
    
    // Build edit prompt
    const strengthModifiers = {
      subtle: 'Make a subtle, minimal change:',
      moderate: 'Edit the image:',
      strong: 'Significantly modify:',
    };
    
    let editPrompt = `${strengthModifiers[strength]} ${instruction}

${preserveStyle ? 'CRITICAL: Maintain the exact same visual style, lighting, and color palette as the original image.' : ''}
${PRODUCTION_NEGATIVE_PROMPT}`;
    
    console.log('🖌️ Editing image:', instruction);
    
    const response = await ai.models.generateContent({
      model: MODELS.image,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanData } },
          { text: editPrompt }
        ]
      },
      config: { 
        imageConfig: { 
          aspectRatio: '16:9' as any,
          imageSize: '2K' 
        } 
      }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log('✅ Image edit complete');
          return {
            success: true,
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          };
        }
      }
    }
    
    return {
      success: false,
      error: 'No edited image returned',
    };
    
  } catch (error: any) {
    console.error('Image edit failed:', error);
    return {
      success: false,
      error: error.message || 'Edit failed',
    };
  }
};

// ============================================
// QUICK EDIT PRESETS
// ============================================

export const EDIT_PRESETS = {
  // Lighting adjustments
  brighten: 'Increase overall brightness, make the image lighter and more vibrant',
  darken: 'Decrease brightness, add more shadows for a moodier look',
  warmUp: 'Add warm orange/golden tones, like golden hour lighting',
  coolDown: 'Add cool blue tones, like overcast or twilight',
  addRimLight: 'Add a subtle rim light / edge light on the subject',
  softenShadows: 'Soften harsh shadows, add more fill light',
  
  // Composition adjustments
  addDepth: 'Add more depth of field blur to the background',
  sharpenFocus: 'Sharpen the main subject, increase clarity',
  addVignette: 'Add a subtle vignette around the edges',
  
  // Style adjustments
  moreCinematic: 'Make more cinematic with film-like color grading',
  addGrain: 'Add subtle film grain for a more organic look',
  increaseContrast: 'Increase contrast for more punch',
  
  // Character adjustments
  improveExpression: 'Improve the facial expression to be more natural',
  adjustPose: 'Make the pose more dynamic and natural',
  fixEyes: 'Fix any issues with the eyes, make them more natural',
  
  // Environment adjustments
  enhanceBackground: 'Add more detail and interest to the background',
  addAtmosphere: 'Add atmospheric haze or fog for depth',
  cleanBackground: 'Simplify and clean up the background',
};

export type EditPreset = keyof typeof EDIT_PRESETS;

export const applyPreset = async (
  imageBase64: string,
  preset: EditPreset
): Promise<InPaintResult> => {
  return editImage({
    image: imageBase64,
    instruction: EDIT_PRESETS[preset],
    preserveStyle: true,
    strength: 'moderate',
  });
};

// ============================================
// BATCH EDIT (Apply multiple edits)
// ============================================

export const batchEdit = async (
  imageBase64: string,
  instructions: string[]
): Promise<InPaintResult> => {
  const combinedInstruction = instructions.join('. Also, ');
  
  return editImage({
    image: imageBase64,
    instruction: combinedInstruction,
    preserveStyle: true,
    strength: 'moderate',
  });
};

// ============================================
// ITERATIVE REFINEMENT
// ============================================

export const iterativeEdit = async (
  imageBase64: string,
  instructions: string[],
  onProgress?: (step: number, total: number, image: string) => void
): Promise<InPaintResult> => {
  let currentImage = imageBase64;
  
  for (let i = 0; i < instructions.length; i++) {
    console.log(`🔄 Edit step ${i + 1}/${instructions.length}`);
    
    const result = await editImage({
      image: currentImage,
      instruction: instructions[i],
      preserveStyle: true,
      strength: 'subtle',
    });
    
    if (!result.success) {
      return {
        success: false,
        error: `Failed at step ${i + 1}: ${result.error}`,
        image: currentImage,
      };
    }
    
    currentImage = result.image!;
    
    if (onProgress) {
      onProgress(i + 1, instructions.length, currentImage);
    }
    
    if (i < instructions.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return {
    success: true,
    image: currentImage,
  };
};

// ============================================
// OBJECT REMOVAL
// ============================================

export const removeObject = async (
  imageBase64: string,
  objectDescription: string
): Promise<InPaintResult> => {
  return editImage({
    image: imageBase64,
    instruction: `Remove the ${objectDescription} from the image. Fill the area naturally with the surrounding background.`,
    preserveStyle: true,
    strength: 'moderate',
  });
};

// ============================================
// OBJECT REPLACEMENT
// ============================================

export const replaceObject = async (
  imageBase64: string,
  originalObject: string,
  newObject: string
): Promise<InPaintResult> => {
  return editImage({
    image: imageBase64,
    instruction: `Replace the ${originalObject} with a ${newObject}. Make it fit naturally with the scene.`,
    preserveStyle: true,
    strength: 'strong',
  });
};

// ============================================
// STYLE TRANSFER
// ============================================

export const transferStyle = async (
  imageBase64: string,
  newStyle: string
): Promise<InPaintResult> => {
  return editImage({
    image: imageBase64,
    instruction: `Transform this image to ${newStyle} style while maintaining the exact same composition, poses, and content.`,
    preserveStyle: false,
    strength: 'strong',
  });
};

// ============================================
// UI COMPONENT EXPORTS
// ============================================

export const InPaintUI = {
  presets: EDIT_PRESETS,
  
  categories: {
    lighting: ['brighten', 'darken', 'warmUp', 'coolDown', 'addRimLight', 'softenShadows'],
    composition: ['addDepth', 'sharpenFocus', 'addVignette'],
    style: ['moreCinematic', 'addGrain', 'increaseContrast'],
    character: ['improveExpression', 'adjustPose', 'fixEyes'],
    environment: ['enhanceBackground', 'addAtmosphere', 'cleanBackground'],
  } as Record<string, EditPreset[]>,
  
  getPresetLabel: (preset: EditPreset): string => {
    const labels: Record<EditPreset, string> = {
      brighten: '☀️ Brighten',
      darken: '🌙 Darken',
      warmUp: '🔥 Warm Up',
      coolDown: '❄️ Cool Down',
      addRimLight: '✨ Add Rim Light',
      softenShadows: '🌫️ Soften Shadows',
      addDepth: '🎯 Add Depth',
      sharpenFocus: '🔍 Sharpen',
      addVignette: '⭕ Vignette',
      moreCinematic: '🎬 Cinematic',
      addGrain: '📽️ Film Grain',
      increaseContrast: '⚡ Contrast',
      improveExpression: '😊 Fix Expression',
      adjustPose: '🧍 Adjust Pose',
      fixEyes: '👁️ Fix Eyes',
      enhanceBackground: '🏞️ Enhance BG',
      addAtmosphere: '🌫️ Add Atmosphere',
      cleanBackground: '🧹 Clean BG',
    };
    return labels[preset] || preset;
  },
};
