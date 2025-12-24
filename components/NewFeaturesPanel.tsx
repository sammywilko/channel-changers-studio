/**
 * DIRECTOR - New Features Panel
 * 
 * UI for:
 * - PDF Export
 * - Sketch to Image
 * - In-Paint Editing
 * - Script Import
 */

import React, { useState, useRef } from 'react';
import { 
  FileDown, 
  Pencil, 
  Image, 
  Upload, 
  Loader2, 
  X,
  Wand2,
  Download,
  RefreshCw,
  Check
} from 'lucide-react';
import { downloadPDF, downloadCSV, PDFExportOptions } from '../services/pdfExportService';
import { quickSketchTransform, SKETCH_MODES, SketchUploadHandler } from '../services/sketchToImageService';
import { applyPreset, EditPreset, InPaintUI, editImage } from '../services/inPaintService';
import { loadCCExport, importToDirector } from '../services/ccIntegrationService';
import { Project } from '../types';

// ============================================
// PDF EXPORT MODAL
// ============================================

interface PDFExportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({ project, isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PDFExportOptions>({
    shotsPerPage: 4,
    includeDialogue: true,
    includeCameraInfo: true,
    clientName: '',
    version: '1.0',
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadPDF(project, options);
      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileDown className="w-5 h-5 text-cyan-400" />
            Export PDF Storyboard
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">Client Name (Optional)</label>
            <input
              type="text"
              value={options.clientName}
              onChange={(e) => setOptions({ ...options, clientName: e.target.value })}
              placeholder="e.g., EY, Darwinium"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">Version</label>
            <input
              type="text"
              value={options.version}
              onChange={(e) => setOptions({ ...options, version: e.target.value })}
              placeholder="1.0"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">Shots Per Page</label>
            <select
              value={options.shotsPerPage}
              onChange={(e) => setOptions({ ...options, shotsPerPage: parseInt(e.target.value) as 2 | 4 | 6 })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value={2}>2 shots per page (Large)</option>
              <option value={4}>4 shots per page (Standard)</option>
              <option value={6}>6 shots per page (Compact)</option>
            </select>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={options.includeDialogue}
                onChange={(e) => setOptions({ ...options, includeDialogue: e.target.checked })}
                className="rounded"
              />
              Include Dialogue
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={options.includeCameraInfo}
                onChange={(e) => setOptions({ ...options, includeCameraInfo: e.target.checked })}
                className="rounded"
              />
              Include Camera Info
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={() => downloadCSV(project)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SKETCH TO IMAGE PANEL
// ============================================

interface SketchToImagePanelProps {
  worldLook: string;
  referenceImages: string[];
  onImageGenerated: (image: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SketchToImagePanel: React.FC<SketchToImagePanelProps> = ({
  worldLook,
  referenceImages,
  onImageGenerated,
  isOpen,
  onClose
}) => {
  const [sketch, setSketch] = useState<string | null>(null);
  const [mode, setMode] = useState<keyof typeof SKETCH_MODES>('storyboard');
  const [isTransforming, setIsTransforming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    SketchUploadHandler.handleFileSelect(e, setSketch);
  };

  const handleTransform = async () => {
    if (!sketch) return;
    setIsTransforming(true);
    try {
      const image = await quickSketchTransform(sketch, mode, worldLook, referenceImages);
      if (image) {
        setResult(image);
      } else {
        alert('Transformation failed. Try a different sketch or mode.');
      }
    } catch (error) {
      console.error('Sketch transform error:', error);
      alert('Failed to transform sketch.');
    } finally {
      setIsTransforming(false);
    }
  };

  const handleUseImage = () => {
    if (result) {
      onImageGenerated(result);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-purple-400" />
            Sketch to Image
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Left: Sketch Upload */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">Your Sketch</h3>
            
            {!sketch ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Click to upload or paste a sketch</p>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 10MB</p>
              </div>
            ) : (
              <div className="relative">
                <img src={sketch} alt="Sketch" className="w-full rounded-lg border border-gray-700" />
                <button
                  onClick={() => setSketch(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Transformation Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as keyof typeof SKETCH_MODES)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="storyboard">🎬 Storyboard Frame</option>
                <option value="concept">🎨 Concept Art</option>
                <option value="animation">✨ 3D Animation</option>
                <option value="liveAction">📷 Photorealistic</option>
                <option value="product">📦 Product Shot</option>
              </select>
            </div>

            <button
              onClick={handleTransform}
              disabled={!sketch || isTransforming}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              {isTransforming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transforming...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Transform Sketch
                </>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">Result</h3>
            
            {result ? (
              <div className="space-y-4">
                <img src={result} alt="Result" className="w-full rounded-lg border border-gray-700" />
                <div className="flex gap-2">
                  <button
                    onClick={handleTransform}
                    disabled={isTransforming}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleUseImage}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Use This Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
                <Image className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">Result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// IN-PAINT EDITING PANEL
// ============================================

interface InPaintPanelProps {
  image: string;
  onImageEdited: (newImage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const InPaintPanel: React.FC<InPaintPanelProps> = ({
  image,
  onImageEdited,
  isOpen,
  onClose
}) => {
  const [currentImage, setCurrentImage] = useState(image);
  const [isEditing, setIsEditing] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('lighting');

  const handlePresetClick = async (preset: EditPreset) => {
    setIsEditing(true);
    try {
      const result = await applyPreset(currentImage, preset);
      if (result.success && result.image) {
        setCurrentImage(result.image);
      } else {
        alert(result.error || 'Edit failed');
      }
    } catch (error) {
      console.error('Edit error:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleCustomEdit = async () => {
    if (!customInstruction.trim()) return;
    setIsEditing(true);
    try {
      const result = await editImage({
        image: currentImage,
        instruction: customInstruction,
        preserveStyle: true,
        strength: 'moderate',
      });
      if (result.success && result.image) {
        setCurrentImage(result.image);
        setCustomInstruction('');
      } else {
        alert(result.error || 'Edit failed');
      }
    } catch (error) {
      console.error('Custom edit error:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleApply = () => {
    onImageEdited(currentImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-orange-400" />
            Edit Image
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Left: Image */}
          <div className="col-span-2 relative">
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
            <img src={currentImage} alt="Edit" className="w-full rounded-lg border border-gray-700" />
          </div>

          {/* Right: Controls */}
          <div className="space-y-4 overflow-y-auto">
            <div className="flex gap-1 flex-wrap">
              {Object.keys(InPaintUI.categories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded text-xs font-bold capitalize ${
                    activeCategory === cat
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {InPaintUI.categories[activeCategory]?.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  disabled={isEditing}
                  className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white disabled:opacity-50"
                >
                  {InPaintUI.getPresetLabel(preset)}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-700">
              <label className="block text-xs font-bold text-gray-400 mb-2">Custom Edit</label>
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Describe what you want to change..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm h-20 resize-none"
              />
              <button
                onClick={handleCustomEdit}
                disabled={isEditing || !customInstruction.trim()}
                className="w-full mt-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white py-2 rounded font-bold text-sm"
              >
                Apply Custom Edit
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3 shrink-0">
          <button
            onClick={() => setCurrentImage(image)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold text-sm"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// IMPORT FROM SCRIPT ENGINE
// ============================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (project: any) => void;
}

export const ImportFromScriptEngineModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const ccExport = await loadCCExport(file);
      if (ccExport.type !== 'cc-script-export') {
        alert('This file is not a Script Engine export.');
        return;
      }
      const directorProject = importToDirector(ccExport as any);
      onImport(directorProject);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import file. Make sure it is a valid Script Engine export.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-400" />
            Import from Script Engine
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-400 text-sm">
            Import a project exported from Script Engine. This will create a new project with
            all characters, locations, and beats ready for visual generation.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
          >
            {isImporting ? (
              <Loader2 className="w-12 h-12 text-green-500 mx-auto animate-spin" />
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Click to select export file</p>
                <p className="text-xs text-gray-500 mt-2">*_director-export.json</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
