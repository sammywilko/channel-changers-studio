/**
 * DIRECTOR - Sketch-to-Image Service
 * 
 * Transforms rough sketches into polished, cinematic images.
 * Uses Gemini's native image understanding + generation.
 */

import { GoogleGenAI } from "@google/genai";
import { MODELS, getApiKey, PRODUCTION_NEGATIVE_PROMPT } from './modelConfig';

// ============================================
// TYPES
// ============================================

export interface SketchTransformOptions {
  style?: string;                    // e.g., "Pixar 3D animation", "photorealistic"
  worldLook?: string;               // Global style from project
  characters?: string[];            // @handles to inject character refs
  preserveComposition?: boolean;    // Try to maintain sketch layout
  detailLevel?: 'rough' | 'medium' | 'detailed';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
}

export interface SketchTransformResult {
  success: boolean;
  image?: string;
  prompt?: string;
  error?: string;
}

// ============================================
// SKETCH ANALYSIS
// First understand what the sketch depicts
// ============================================

export const analyzeSketch = async (
  sketchBase64: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key available');
  
  const ai = new GoogleGenAI({ apiKey });
  const cleanData = sketchBase64.split(',')[1] || sketchBase64;
  
  const response = await ai.models.generateContent({
    model: MODELS.vision,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: cleanData } },
        { text: `Analyze this sketch/rough drawing. Describe:
1. Main subjects (people, objects, creatures)
2. Composition and layout
3. Action or pose
4. Environment/background elements
5. Apparent mood or emotion
6. Camera angle implied

Be specific and detailed. This description will be used to generate a polished version.` }
      ]
    }
  });
  
  return response.text || 'Unable to analyze sketch';
};

// ============================================
// TRANSFORM SKETCH TO IMAGE
// ============================================

export const transformSketchToImage = async (
  sketchBase64: string,
  options: SketchTransformOptions = {},
  referenceImages: string[] = []
): Promise<SketchTransformResult> => {
  const {
    style = 'cinematic, professional quality',
    worldLook = '',
    characters = [],
    preserveComposition = true,
    detailLevel = 'detailed',
    aspectRatio = '16:9',
  } = options;
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No API key available');
    
    const ai = new GoogleGenAI({ apiKey });
    const cleanSketch = sketchBase64.split(',')[1] || sketchBase64;
    
    // First, analyze the sketch to understand it
    console.log('🎨 Analyzing sketch...');
    const analysis = await analyzeSketch(sketchBase64);
    console.log('📝 Sketch analysis:', analysis);
    
    // Build transformation prompt
    const parts: any[] = [];
    
    // Add the original sketch as primary reference
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanSketch } });
    
    // Add any character/style reference images
    referenceImages.slice(0, 10).forEach(ref => {
      const cleanRef = ref.split(',')[1] || ref;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanRef } });
    });
    
    // Build the transformation prompt
    let prompt = `SKETCH TO IMAGE TRANSFORMATION

SKETCH ANALYSIS:
${analysis}

TASK: Transform this rough sketch into a polished, ${style} image.

REQUIREMENTS:
- ${preserveComposition ? 'MAINTAIN the exact composition, poses, and layout from the sketch' : 'Improve composition while keeping the core concept'}
- Style: ${worldLook || style}
- Detail level: ${detailLevel}
- Professional production quality
- ${characters.length > 0 ? `Characters present: ${characters.join(', ')} - match their established appearances` : ''}

CRITICAL:
- This is the sketch to transform (first image)
${referenceImages.length > 0 ? '- Use the additional reference images for style/character consistency' : ''}
- Output should be a fully rendered, polished image
- NOT a sketch or line drawing
- Full color, lighting, and detail

${PRODUCTION_NEGATIVE_PROMPT}`;

    parts.push({ text: prompt });
    
    console.log('🖼️ Generating polished image...');
    
    const response = await ai.models.generateContent({
      model: MODELS.image,
      contents: { parts },
      config: { 
        imageConfig: { 
          aspectRatio: aspectRatio as any, 
          imageSize: '2K' 
        } 
      }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log('✅ Sketch transformation complete');
          return {
            success: true,
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            prompt: analysis,
          };
        }
      }
    }
    
    return {
      success: false,
      error: 'No image generated',
    };
    
  } catch (error: any) {
    console.error('Sketch transformation failed:', error);
    return {
      success: false,
      error: error.message || 'Transformation failed',
    };
  }
};

// ============================================
// SKETCH ENHANCEMENT MODES
// Different transformation styles
// ============================================

export const SKETCH_MODES = {
  // For storyboarding - maintain composition
  storyboard: {
    style: 'cinematic storyboard frame, professional movie pre-visualization',
    preserveComposition: true,
    detailLevel: 'medium' as const,
  },
  
  // For concept art - enhance creativity
  concept: {
    style: 'concept art, painterly, atmospheric',
    preserveComposition: false,
    detailLevel: 'detailed' as const,
  },
  
  // For animation - match Pixar/3D style
  animation: {
    style: 'Pixar-quality 3D animation, vibrant colors, stylized',
    preserveComposition: true,
    detailLevel: 'detailed' as const,
  },
  
  // For live action - photorealistic
  liveAction: {
    style: 'photorealistic, cinematic photography, film grain',
    preserveComposition: true,
    detailLevel: 'detailed' as const,
  },
  
  // For product shots
  product: {
    style: 'professional product photography, studio lighting, premium quality',
    preserveComposition: true,
    detailLevel: 'detailed' as const,
  },
};

// ============================================
// QUICK TRANSFORM (Single function)
// ============================================

export const quickSketchTransform = async (
  sketchBase64: string,
  mode: keyof typeof SKETCH_MODES = 'storyboard',
  worldLook?: string,
  referenceImages: string[] = []
): Promise<string | null> => {
  const modeOptions = SKETCH_MODES[mode];
  
  const result = await transformSketchToImage(sketchBase64, {
    ...modeOptions,
    worldLook,
  }, referenceImages);
  
  return result.success ? result.image! : null;
};

// ============================================
// UI COMPONENT HELPER
// ============================================

export const SketchUploadHandler = {
  /**
   * Handle file input for sketch upload
   */
  handleFileSelect: async (
    event: React.ChangeEvent<HTMLInputElement>,
    onSketchLoaded: (base64: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onSketchLoaded(base64);
    };
    reader.readAsDataURL(file);
  },
  
  /**
   * Handle paste event for sketch
   */
  handlePaste: async (
    event: ClipboardEvent,
    onSketchLoaded: (base64: string) => void
  ) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            onSketchLoaded(base64);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  },
  
  /**
   * Handle canvas drawing export
   */
  handleCanvasExport: (
    canvas: HTMLCanvasElement,
    onSketchLoaded: (base64: string) => void
  ) => {
    const base64 = canvas.toDataURL('image/png');
    onSketchLoaded(base64);
  },
};
