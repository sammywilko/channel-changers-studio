
import React from 'react';
import { StyleReference } from '../types';
import { X, CheckCircle, Loader2, Info } from 'lucide-react';
import clsx from 'clsx';

interface StyleRefCardProps {
  reference: StyleReference;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}

const StyleRefCard: React.FC<StyleRefCardProps> = ({ reference, onSetDefault, onRemove }) => {
  return (
    <div className={clsx("relative group rounded-lg border overflow-hidden transition-all", 
       reference.isDefault ? "border-nano-accent ring-1 ring-nano-accent" : "border-gray-700 hover:border-gray-500"
    )}>
      {/* Status Banner */}
      {reference.isDefault && (
         <div className="absolute top-0 left-0 right-0 bg-nano-accent text-black text-[9px] font-bold text-center py-0.5 z-10">
            PROJECT DEFAULT
         </div>
      )}

      {/* Image */}
      <div className="aspect-square relative bg-black">
         <img src={reference.imageUrl} className={clsx("w-full h-full object-cover transition-opacity", reference.isAnalyzing ? "opacity-50" : "opacity-100")} />
         
         {reference.isAnalyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <Loader2 className="text-nano-accent animate-spin" size={20} />
               <span className="text-[8px] text-nano-accent font-mono mt-1">ANALYZING...</span>
            </div>
         )}

         {/* AI Analysis Overlay (Hover) */}
         {reference.analysis && (
            <div className="absolute inset-0 bg-black/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col overflow-y-auto custom-scrollbar">
               <div className="text-[9px] font-bold text-nano-accent mb-1 flex items-center gap-1"><Info size={8}/> STYLE DNA</div>
               <div className="space-y-1 text-[8px] text-gray-300">
                  <p><span className="text-gray-500">LIGHT:</span> {reference.analysis.lighting.slice(0, 50)}...</p>
                  <p><span className="text-gray-500">CAM:</span> {reference.analysis.camera}</p>
                  <p><span className="text-gray-500">MOOD:</span> {reference.analysis.mood}</p>
                  <p><span className="text-gray-500">GRADE:</span> {reference.analysis.colorGrading}</p>
               </div>
            </div>
         )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-2 flex justify-between items-center">
         <button 
            onClick={() => onSetDefault(reference.id)}
            disabled={reference.isAnalyzing}
            className={clsx("text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors",
               reference.isDefault ? "bg-nano-accent/20 text-nano-accent cursor-default" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
         >
            <CheckCircle size={10} /> {reference.isDefault ? 'Active' : 'Set Default'}
         </button>
         <button onClick={() => onRemove(reference.id)} className="text-gray-600 hover:text-red-500 p-1 rounded transition-colors">
            <X size={12} />
         </button>
      </div>
    </div>
  );
};

export default StyleRefCard;
