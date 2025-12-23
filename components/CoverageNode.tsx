
import React from 'react';
import { Beat, Shot } from '../types';
import { Loader2, Image as ImageIcon, CheckCircle, Camera, Video, Aperture, User, Layout, Move } from 'lucide-react';
import clsx from 'clsx';

interface CoverageNodeProps {
  beat: Beat;
  onGenerateVariations: () => void;
  onGenerateVariationImage: (index: number, prompt: string) => void;
  onSelectVariation: (index: number) => void;
  onClose: () => void;
}

const CoverageNode: React.FC<CoverageNodeProps> = ({ beat, onGenerateVariations, onGenerateVariationImage, onSelectVariation, onClose }) => {
  
  const variations = beat.variations || [];
  const isGeneratingVars = beat.isGeneratingImage && variations.length === 0;

  const getIcon = (type: string) => {
     switch(type) {
        case 'Wide': return <Layout size={14} />;
        case 'Medium': return <User size={14} />;
        case 'Close-Up': return <Camera size={14} />;
        case 'OTS': return <Video size={14} />;
        case 'Insert': return <Aperture size={14} />;
        default: return <Camera size={14} />;
     }
  };

  return (
    <div className="w-[800px] bg-nano-900/90 backdrop-blur-xl border border-nano-accent rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
      
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-full bg-nano-accent/10 flex items-center justify-center text-nano-accent">
            <Aperture size={20} />
         </div>
         <div>
            <h3 className="text-lg font-bold text-white">Technical Shot Coverage</h3>
            <p className="text-xs text-gray-400">Cinematic breakdown with lens and movement specs.</p>
         </div>
      </div>

      {variations.length === 0 ? (
         <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg bg-black/20">
            {isGeneratingVars ? (
               <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-nano-accent" size={24} />
                  <span className="text-xs text-gray-400 font-mono">ANALYZING SCENE GEOMETRY...</span>
               </div>
            ) : (
               <button 
                  onClick={onGenerateVariations}
                  className="bg-nano-accent hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
               >
                  <Camera size={16} /> GENERATE SHOT LIST
               </button>
            )}
         </div>
      ) : (
         <div className="grid grid-cols-5 gap-3">
            {variations.map((v, idx) => (
               <div key={idx} className="flex flex-col gap-2 group">
                  <div className="aspect-[9/16] bg-black rounded-lg border border-gray-700 overflow-hidden relative">
                     {v.image ? (
                        <>
                           <img src={v.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={v.type} />
                           <button 
                              onClick={() => onSelectVariation(idx)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <div className="bg-green-500 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                 <CheckCircle size={10} /> SELECT
                              </div>
                           </button>
                        </>
                     ) : (
                        <button 
                           onClick={() => onGenerateVariationImage(idx, v.prompt)}
                           disabled={v.isGenerating}
                           className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-800 transition-colors text-gray-500 hover:text-white p-2 text-center"
                        >
                           {v.isGenerating ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                           <span className="text-[8px] uppercase leading-tight">Render<br/>{v.type}</span>
                        </button>
                     )}
                     
                     {/* Technical Tags Overlay */}
                     <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 flex flex-col gap-0.5">
                        <div className="flex justify-between text-[8px] text-nano-accent font-mono">
                           <span>{v.lens}</span>
                           <span>{v.movement}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="text-center">
                     <div className="flex items-center justify-center gap-1 text-white text-[9px] font-bold uppercase mb-1">
                        {getIcon(v.type)} {v.type}
                     </div>
                     <p className="text-[8px] text-gray-500 line-clamp-2 leading-tight px-1 h-6">{v.prompt}</p>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
};

export default CoverageNode;
