/**
 * DIRECTOR - Model Configuration
 * Centralized model names and API configuration
 * 
 * When Google updates model names, change them HERE only.
 * Last Updated: December 24, 2025
 */

// ============================================
// MODEL CONFIGURATION
// ============================================

export const MODELS = {
  // Text/Reasoning - Gemini 3 Pro Preview
  text: "gemini-3-pro-preview",
  
  // Image Generation - Imagen 3 via Gemini
  image: "gemini-3-pro-image-preview",
  
  // Text-to-Speech (multi-speaker)
  tts: "gemini-2.5-flash-preview-tts",
  
  // Fast inference for simple tasks
  flash: "gemini-2.5-flash",
  
  // Vision capable (same as text for Gemini 3)
  vision: "gemini-3-pro-preview",
} as const;

// ============================================
// API KEY RETRIEVAL (Works in Vite + Node)
// ============================================

export const getApiKey = (): string => {
  // Vite environment (browser)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const viteKey = (import.meta as any).env.VITE_GEMINI_API_KEY || 
                    (import.meta as any).env.GEMINI_API_KEY;
    if (viteKey) return viteKey;
  }
  
  // Node environment (server/build)
  if (typeof process !== 'undefined' && process.env) {
    const nodeKey = process.env.VITE_GEMINI_API_KEY || 
                    process.env.GEMINI_API_KEY ||
                    process.env.API_KEY;
    if (nodeKey) return nodeKey;
  }
  
  console.error('❌ No Gemini API key found. Check:');
  console.error('   - .env.local has VITE_GEMINI_API_KEY=your_key');
  console.error('   - Vercel has GEMINI_API_KEY in environment variables');
  
  return '';
};

// ============================================
// IMAGE GENERATION CONFIG
// ============================================

export const IMAGE_CONFIG = {
  // Maximum reference images per request (Nano Banana Pro limit)
  maxReferences: 14,
  
  // Default resolutions
  resolutions: {
    '1080p': '1K',
    '2k': '2K',
    '4k': '4K',
  } as const,
  
  // Supported aspect ratios
  aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '2.39:1'] as const,
} as const;

// ============================================
// PRODUCTION NEGATIVE PROMPT
// Prevents visible equipment in generated images
// ============================================

export const PRODUCTION_NEGATIVE_PROMPT = `
NO visible lighting equipment, NO studio lights visible in frame, NO softboxes,
NO reflectors, NO light stands, NO C-stands, NO production gear,
NO behind-the-scenes equipment, NO tripods visible, NO crew visible,
NO cables, NO sandbags, NO apple boxes, NO set equipment,
clean professional final image only
`.trim();

// ============================================
// ERROR TYPES FOR SMART UI HANDLING
// ============================================

export type ImageGenerationErrorType = 
  | 'RATE_LIMIT'    // 429 - Wait and retry
  | 'SAFETY'        // Content blocked - Modify prompt
  | 'QUOTA'         // Billing issue
  | 'NETWORK'       // Retry possible
  | 'MODEL_ERROR'   // Model not available
  | 'UNKNOWN';

export interface ImageGenerationResult {
  success: boolean;
  image?: string;
  error?: {
    type: ImageGenerationErrorType;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  };
}

export const parseApiError = (error: any): ImageGenerationResult['error'] => {
  const message = error?.message || error?.toString() || 'Unknown error';
  const status = error?.status;
  
  if (status === 429 || message.includes('rate')) {
    return {
      type: 'RATE_LIMIT',
      message: 'Rate limit exceeded. Please wait before trying again.',
      retryable: true,
      retryAfterMs: 60000, // 60 seconds
    };
  }
  
  if (status === 403 || message.includes('quota')) {
    return {
      type: 'QUOTA',
      message: 'API quota exceeded. Check billing settings.',
      retryable: false,
    };
  }
  
  if (message.includes('SAFETY') || message.includes('blocked')) {
    return {
      type: 'SAFETY',
      message: 'Content blocked by safety filters. Try modifying the prompt.',
      retryable: false,
    };
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return {
      type: 'MODEL_ERROR',
      message: 'Model not available. Check API access.',
      retryable: false,
    };
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return {
      type: 'NETWORK',
      message: 'Network error. Please try again.',
      retryable: true,
      retryAfterMs: 5000,
    };
  }
  
  return {
    type: 'UNKNOWN',
    message,
    retryable: true,
    retryAfterMs: 10000,
  };
};
