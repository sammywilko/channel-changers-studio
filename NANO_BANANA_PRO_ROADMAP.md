# Nano Banana Pro Integration Roadmap

## ✅ COMPLETED

### Phase 1: Foundation
- [x] Model upgrades to Gemini 3 Pro + Gemini 3 Pro Image Preview
- [x] Template system refactoring (CHARACTER_LIBRARY + PROJECT_TEMPLATES)
- [x] Project service template support
- [x] Master character profiles (MasterCharacterProfile interface)
- [x] Series memory tracking (SeriesMemory interface)
- [x] Concept lab (Concept interface)
- [x] Script approval checkpoint (SCRIPT_APPROVAL step)
- [x] Timing system (duration, totalRuntime)
- [x] Sequential context (previousShotContext)
- [x] Template ID tracking (templateId in Project)

---

## 🔥 PRIORITY 1: HIGH IMPACT, LOW COMPLEXITY (DO NEXT)

### 1. Upgrade to 14 Reference Images
**File**: `services/geminiService.ts` - `generateImage()` function
**Current**: Limited reference image usage
**Target**: Leverage Nano Banana Pro's 14 reference image capacity

```typescript
// Update generateImage() reference aggregation
const allReferenceImages = [
  ...characterRefs.flatMap(char => char.referenceImages || []),
  ...locationRefs.flatMap(loc => loc.referenceImages || []),
  ...(references?.products?.flatMap(p => p.referenceImages || []) || []),
  ...(references?.styles?.map(s => s.imageUrl) || [])
].filter(img => img).slice(0, 14); // Max 14, remove nulls
```

**Impact**:
- Sam with 10 reference images = consistent character across all shots
- Product shots with multiple angles = better consistency
- Location shot bank = environment consistency

**Complexity**: LOW - Just modify reference aggregation logic

---

### 2. Expose 4K Resolution Parameter
**File**: `services/geminiService.ts` - `generateImage()` function
**Current**: Resolution type exists but not passed to API
**Target**: Pass resolution directly to Nano Banana Pro

```typescript
// Already have Resolution type: '1080p' | '2k' | '4k'
// Just pass to API:
const result = await model.generateContent({
  prompt: enhancedPrompt,
  referenceImages: allReferenceImages,
  resolution: resolution, // ADD THIS
  aspectRatio: aspectRatio
});
```

**Impact**: Broadcast-quality 4K output for professional use
**Complexity**: TRIVIAL - One parameter addition

---

### 3. Character Upload UI (10+ Images Per Character)
**Files**:
- New component: `components/CharacterUploader.tsx`
- Update: `components/WorldBibleTab.tsx` or character management UI

**Current**: Characters have `referenceImages: []` but no upload UI
**Target**: Allow users to upload 10+ reference images per character

**Features**:
- Upload multiple images (drag-and-drop + file picker)
- Preview thumbnails
- Reorder images (priority order for AI)
- Character profile editor (use MasterCharacterProfile)

**Impact**: Essential for 14 reference image system to work
**Complexity**: MEDIUM - New UI component + file handling

---

## ⏳ PRIORITY 2: MEDIUM IMPACT, MEDIUM COMPLEXITY (PHASE 2)

### 4. Aspect Ratio Adaptation
**File**: `services/geminiService.ts` - Add new function
**Current**: Generate once per aspect ratio
**Target**: Generate once, adapt to all platforms

```typescript
export const adaptAspectRatio = async (
  originalImage: string,
  targetRatio: AspectRatio,
  lockSubject: boolean = true
): Promise<string> => {
  // Nano Banana Pro keeps character locked, extends/crops background
  const result = await model.generateContent({
    prompt: `Change aspect ratio to ${targetRatio}`,
    baseImage: originalImage,
    lockSubject: lockSubject
  });
  return result.response.text();
};
```

**Impact**:
- Generate for YouTube (16:9)
- Adapt to Stories (9:16)
- Adapt to Instagram (1:1)
- Adapt to billboard (2.39:1)

**Complexity**: MEDIUM - New API pattern + UI

---

### 5. Camera Control UI
**File**: New component or enhance existing shot card
**Current**: Basic shot generation
**Target**: Professional camera controls

```typescript
interface ShotOptions {
  shotType?: 'wide' | 'medium' | 'close-up' | 'panoramic';
  focusOn?: string; // "Sam's face", "product", "background"
  depthOfField?: 'shallow' | 'deep';
  lighting?: 'day' | 'night' | 'golden-hour' | 'chiaroscuro';
  resolution?: '1K' | '2K' | '4K';
}
```

**Impact**: Professional cinematography controls
**Complexity**: MEDIUM - UI design + parameter passing

---

## 🔮 PRIORITY 3: HIGH IMPACT, HIGH COMPLEXITY (DEFER)

### 6. Multi-Step Editing Workflow
**File**: New service + UI component
**Current**: Regenerate entire image for edits
**Target**: Conversational editing (like Photoshop via chat)

```typescript
const refineImage = async (
  existingImage: string,
  editPrompt: string // "Make it nighttime", "Zoom in", "Add bokeh"
): Promise<string> => {
  // Iterative refinement without full regeneration
};
```

**Blockers**:
- Need conversation state management
- Need editing history per image
- Need cost control (prevent regeneration explosion)

**When**: After character consistency proven working

---

## 🎨 OPPORTUNISTIC FEATURES (CLIENT-DRIVEN)

### 7. Text Rendering Features
**Use Cases**:
- "DAIE" text on jackets
- Channel Changers neon sign
- Product labels

**When**: Client specifically requests text-heavy shots

---

### 8. Multilingual Localization
**Use Cases**:
- International campaigns (EY, Darwinium)
- Multi-market variants

**When**: International client demand confirmed

---

## 📋 IMMEDIATE NEXT STEPS

1. **Character Upload UI** (Blocks everything else)
   - Users can't upload 10+ reference images yet
   - This is the foundation for 14 reference image system

2. **14 Reference Image Aggregation** (Low complexity, high impact)
   - Modify `generateImage()` to collect all references
   - Test with Sam's profile

3. **4K Resolution Pass-Through** (Trivial, immediate value)
   - Add resolution parameter to API call

4. **Test & Validate** (Critical)
   - Generate Sam with 10 reference images
   - Verify consistency across shots
   - Validate 4K output quality

---

## 🚨 REMINDER TRIGGERS

**When to revisit this document**:
- [ ] Before next major feature sprint
- [ ] When client requests character consistency
- [ ] When preparing for professional client pitch
- [ ] After template system UI is complete
- [ ] Weekly review: Are we making progress on Priority 1?

**Success Metrics**:
- Sam appears consistent across 10+ shots (same outfit, face, pose style)
- 4K exports work without quality loss
- Users can upload 10+ reference images per character
- Shot generation time remains under 30 seconds

---

## 📝 NOTES

- **Do not over-engineer**: Focus on proving character consistency first
- **Client validation**: Test with real Channel Changers episode before building complex editing workflows
- **Cost monitoring**: 14 references + 4K = higher API costs, track usage
- **Documentation**: Update user guides when reference upload UI is live

---

**Last Updated**: Nov 24, 2025
**Next Review**: After character upload UI complete
