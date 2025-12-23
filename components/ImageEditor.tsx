
import React, { useState } from 'react';
import { Beat } from '../types';
import { X, Sparkles, Wand2, Loader2, Download } from 'lucide-react';

interface ImageEditorProps {
  beat: Beat;
  image: string;
  onClose: () => void;
  onApplyEdit: (newImage: string) => void;
  onGenerateEdit: (instruction: string) => Promise<string | null>;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ beat, image, onClose, onApplyEdit, onGenerateEdit }) => {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!instruction.trim()) return;
    setIsProcessing(true);
    try {
      const result = await onGenerateEdit(instruction);
      if (result) {
        setPreviewImage(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (previewImage) {
      onApplyEdit(previewImage);
      onClose();
    }
  };

  const handleDownload = () => {
    const url = previewImage || image;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${beat.beat_id}_edited.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-nano-900 border border-gray-700 rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <Wand2 size={20} className="text-nano-pink" />
            <h2 className="text-white font-bold">Nano Banana Canvas</h2>
            <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded font-mono">{beat.beat_id}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-800 bg-nano-800 p-6 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Current Action</h3>
              <p className="text-sm text-gray-200 bg-gray-900 p-3 rounded border border-gray-700">
                {beat.action}
              </p>
            </div>

            <div className="flex-1">
              <label className="text-xs font-bold text-nano-accent uppercase mb-2 block flex items-center gap-2">
                <Sparkles size={12} />
                Edit Instruction
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Add a red hat to Sam, Make the lighting darker, Add rain effects..."
                className="w-full h-32 bg-black/30 border border-gray-600 rounded-lg p-3 text-sm text-white focus:border-nano-pink focus:outline-none resize-none mb-4"
              />
              <button
                onClick={handleEdit}
                disabled={isProcessing || !instruction.trim()}
                className="w-full bg-gradient-to-r from-nano-pink to-purple-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                Render Edit
              </button>
            </div>

            <div className="pt-4 border-t border-gray-700 space-y-2">
               {previewImage && (
                 <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-xs">
                   SAVE CHANGES TO BEAT
                 </button>
               )}
               <button onClick={handleDownload} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2">
                  <Download size={14} /> DOWNLOAD
               </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative p-8">
            <img 
              src={previewImage || image} 
              alt="Editing Canvas" 
              className="max-w-full max-h-full object-contain shadow-2xl border border-gray-800"
            />
            {!previewImage && (
              <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
                ORIGINAL
              </div>
            )}
            {previewImage && (
              <div className="absolute top-4 left-4 bg-nano-pink text-white text-xs px-2 py-1 rounded font-bold">
                PREVIEW
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
