# Director & Script Engine - New Features Implementation

## 🎯 What's Been Added

### Director (channel-changers-studio)

| Feature | File | Status |
|---------|------|--------|
| **Model Config** | `services/modelConfig.ts` | ✅ Ready |
| **PDF Export** | `services/pdfExportService.ts` | ✅ Ready |
| **Sketch to Image** | `services/sketchToImageService.ts` | ✅ Ready |
| **In-Paint Editing** | `services/inPaintService.ts` | ✅ Ready |
| **Integration** | `services/ccIntegrationService.ts` | ✅ Ready |
| **UI Components** | `src/components/NewFeaturesPanel.tsx` | ✅ Ready |

### Script Engine (channel-changers-script-engine)

| Feature | File | Status |
|---------|------|--------|
| **Fixed API** | `api/gemini.ts` | ✅ Ready |
| **Script Import** | `services/scriptImportService.ts` | ✅ Ready |
| **Integration** | `services/ccIntegrationService.ts` | ✅ Ready |
| **UI Component** | `components/ScriptImportModal.tsx` | ✅ Ready |

---

## 🚀 Quick Start

### 1. Pull Changes
```bash
# Director
cd ~/PROJECTS/channel-changers-studio
git pull origin main
npm install

# Script Engine
cd ~/PROJECTS/channel-changers-script-engine
git pull origin main
npm install
```

### 2. Set Environment Variables

**Local Development (.env.local):**
```
VITE_GEMINI_API_KEY=your_api_key_here
```

**Vercel (Production):**
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add: `GEMINI_API_KEY` = your_api_key

---

## 🔌 Wiring Up the UI

### Director - Add to App.tsx

Add these imports at the top:
```typescript
import { 
  PDFExportModal, 
  SketchToImagePanel, 
  InPaintPanel, 
  ImportFromScriptEngineModal 
} from './components/NewFeaturesPanel';
```

Add state variables:
```typescript
const [isPDFExportOpen, setIsPDFExportOpen] = useState(false);
const [isSketchPanelOpen, setIsSketchPanelOpen] = useState(false);
const [isInPaintOpen, setIsInPaintOpen] = useState(false);
const [isImportOpen, setIsImportOpen] = useState(false);
const [editingImage, setEditingImage] = useState<string | null>(null);
```

Add to the Export dropdown in header:
```tsx
<button onClick={() => setIsPDFExportOpen(true)} className="...">
  📄 Export PDF Storyboard
</button>
```

Add buttons for new features:
```tsx
<button onClick={() => setIsSketchPanelOpen(true)} className="...">
  ✏️ Sketch to Image
</button>

<button onClick={() => setIsImportOpen(true)} className="...">
  📥 Import from Script Engine
</button>
```

Add modals at the bottom of the return statement:
```tsx
{isPDFExportOpen && (
  <PDFExportModal 
    project={currentProject} 
    isOpen={isPDFExportOpen} 
    onClose={() => setIsPDFExportOpen(false)} 
  />
)}

{isSketchPanelOpen && (
  <SketchToImagePanel
    worldLook={currentProject.worldLook}
    referenceImages={currentProject.styleReferences.map(s => s.imageUrl)}
    onImageGenerated={(img) => {
      // Add to current beat or show in lightbox
      setLightboxImage(img);
    }}
    isOpen={isSketchPanelOpen}
    onClose={() => setIsSketchPanelOpen(false)}
  />
)}

{isInPaintOpen && editingImage && (
  <InPaintPanel
    image={editingImage}
    onImageEdited={(newImg) => {
      // Update the beat's image
      if (editingBeatId) {
        handleUpdateBeatImage(editingBeatId, newImg);
      }
    }}
    isOpen={isInPaintOpen}
    onClose={() => {
      setIsInPaintOpen(false);
      setEditingImage(null);
    }}
  />
)}

{isImportOpen && (
  <ImportFromScriptEngineModal
    isOpen={isImportOpen}
    onClose={() => setIsImportOpen(false)}
    onImport={(project) => {
      setCurrentProject(project);
      setIsImportOpen(false);
    }}
  />
)}
```

### Script Engine - Add to App.tsx

Add import:
```typescript
import ScriptImportModal from './components/ScriptImportModal';
```

Add state:
```typescript
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
```

Add button in header:
```tsx
<button onClick={() => setIsImportModalOpen(true)} className="...">
  📥 Import/Export
</button>
```

Add modal:
```tsx
<ScriptImportModal
  isOpen={isImportModalOpen}
  onClose={() => setIsImportModalOpen(false)}
  currentProject={currentProject}
  onImport={(script, characters, locations, beats) => {
    setScript(script);
    setCharacters(characters);
    setLocations(locations);
    setBeats(beats);
  }}
/>
```

---

## 📱 Feature Usage

### PDF Export
```typescript
import { downloadPDF, downloadCSV } from './services/pdfExportService';

// Export with options
await downloadPDF(project, {
  shotsPerPage: 4,
  clientName: 'EY',
  version: '1.0',
  includeDialogue: true,
  includeCameraInfo: true
});

// Quick CSV export
downloadCSV(project);
```

### Sketch to Image
```typescript
import { quickSketchTransform, SKETCH_MODES } from './services/sketchToImageService';

// Transform a sketch
const image = await quickSketchTransform(
  sketchBase64,
  'storyboard', // or 'concept', 'animation', 'liveAction', 'product'
  worldLook,
  referenceImages
);
```

### In-Paint Editing
```typescript
import { applyPreset, editImage, EDIT_PRESETS } from './services/inPaintService';

// Quick preset
const result = await applyPreset(imageBase64, 'warmUp');

// Custom edit
const result = await editImage({
  image: imageBase64,
  instruction: 'Make the background more dramatic',
  preserveStyle: true,
  strength: 'moderate'
});
```

### Script Import
```typescript
import { importScript, exportToDirector } from './services/scriptImportService';

// Import PDF/FDX/Fountain
const parsed = await importScript(file);

// Export for Director
const directorData = exportToDirector(parsed);
```

### Cross-App Integration
```typescript
// Script Engine → Director
import { exportToDirector, downloadExport } from './services/ccIntegrationService';
const ccExport = exportToDirector(project);
downloadExport(ccExport); // Downloads .json file

// Director ← Script Engine
import { loadCCExport, importToDirector } from './services/ccIntegrationService';
const ccExport = await loadCCExport(file);
const directorProject = importToDirector(ccExport);
```

---

## ✅ Testing Checklist

### Director
- [ ] PDF exports with cover page and shot cards
- [ ] CSV shot list downloads
- [ ] Sketch upload transforms to polished image
- [ ] In-paint presets work (warmUp, cinematic, etc.)
- [ ] Custom edit instructions work
- [ ] Import from Script Engine loads project

### Script Engine
- [ ] API route returns images in production
- [ ] PDF script import parses correctly
- [ ] FDX (Final Draft) import works
- [ ] Fountain format import works
- [ ] Export to Director creates valid JSON
- [ ] Concept art generation works (uses new API route)

---

## 🔧 Troubleshooting

### "API key not configured"
- Check `.env.local` has `VITE_GEMINI_API_KEY=...`
- Check Vercel has `GEMINI_API_KEY` in environment

### "No image generated"
- Check console for specific error
- Verify API key has image generation access
- Try a different prompt (safety filters may block)

### PDF export fails
- Make sure `jspdf` is installed: `npm install jspdf`
- Check project has generated images

### Script import fails
- Ensure file is valid PDF/FDX/Fountain
- Check console for parsing errors

---

**Version:** December 2025
**Apps:** Director v10.1.0, Script Engine
