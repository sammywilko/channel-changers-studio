
import React, { useState } from 'react';
import { Beat, AspectRatio, BrandAsset, Overlay } from '../types';
import { Camera, Zap, Image, Tag, ShoppingBag, Download, Layers, Sticker } from 'lucide-react';
import OverlayCanvas from './OverlayCanvas';
import clsx from 'clsx';

interface ProductShotCardProps {
  shot: Beat;
  onGenerateImage: (id: string, prompt: string) => void;
  onOpenLightbox: (url: string) => void;
  onUpdateShot: (id: string, updates: Partial<Beat>) => void; // To save overlays/images
  aspectRatio: AspectRatio;
  brandAssets: BrandAsset[];
}

const ProductShotCard: React.FC<ProductShotCardProps> = ({ shot, onGenerateImage, onOpenLightbox, onUpdateShot, aspectRatio, brandAssets }) => {
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const hasImage = shot.generatedImages && shot.generatedImages.length > 0;
  const imageUrl = hasImage ? shot.generatedImages[shot.selectedImageIndex] : null;

  const getAspectRatioStyle = () => {
    switch(aspectRatio) {
      case '16:9': return '16 / 9';
      case '9:16': return '9 / 16';
      case '1:1': return '1 / 1';
      case '4:3': return '4 / 3';
      case '3:4': return '3 / 4';
      default: return '16 / 9';
    }
  };

  const handleSaveComposite = (newImage: string) => {
     onUpdateShot(shot.beat_id, {
        generatedImages: [...shot.generatedImages, newImage],
        selectedImageIndex: shot.generatedImages.length
     });
     setShowOverlayEditor(false);
  };

  return (
    <>
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col relative">
      <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-start">
         <div>
            <span className="text-[10px] text-gray-500 font-mono uppercase">{shot.beat_id}</span>
            <h4 className="text-sm font-bold text-white leading-tight mt-1">{shot.action.slice(0, 40)}...</h4>
         </div>
         <div className="flex gap-1">
            {shot.characters.map((sku, i) => (
               <span key={i} className="text-[9px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Tag size={8} /> {sku}
               </span>
            ))}
         </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3">
         {/* Specs */}
         <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-700/50 p-1.5 rounded flex items-center gap-2 text-[10px] text-gray-300">
               <Camera size={10} className="text-nano-accent" /> {shot.camera}
            </div>
            <div className="bg-gray-700/50 p-1.5 rounded flex items-center gap-2 text-[10px] text-gray-300">
               <Zap size={10} className="text-yellow-500" /> {shot.lighting}
            </div>
         </div>

         {/* Image Area */}
         <div 
            className="relative w-full bg-black rounded border border-gray-600 group overflow-hidden"
            style={{ aspectRatio: getAspectRatioStyle() }}
         >
            {imageUrl ? (
               <>
                  <img src={imageUrl} className="w-full h-full object-cover" alt="shot" onClick={() => onOpenLightbox(imageUrl)} />
                  
                  {/* Overlays Indicator */}
                  {shot.overlays && shot.overlays.length > 0 && (
                     <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white flex items-center gap-1">
                        <Layers size={8} /> {shot.overlays.length}
                     </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <button onClick={() => onGenerateImage(shot.beat_id, shot.prompt_seed)} className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform" title="Regenerate">
                        <Image size={16} />
                     </button>
                     <button onClick={() => setShowOverlayEditor(true)} className="bg-pink-500 text-white p-2 rounded-full hover:scale-110 transition-transform" title="Add Logo/Overlay">
                        <Sticker size={16} />
                     </button>
                     <button onClick={() => onOpenLightbox(imageUrl)} className="bg-nano-accent text-black p-2 rounded-full hover:scale-110 transition-transform" title="Download">
                        <Download size={16} />
                     </button>
                  </div>
               </>
            ) : (
               <button 
                  onClick={() => onGenerateImage(shot.beat_id, shot.prompt_seed)}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
               >
                  {shot.isGeneratingImage ? <span className="text-xs animate-pulse">Rendering...</span> : <><ShoppingBag size={24} /><span className="text-xs font-bold">GENERATE SHOT</span></>}
               </button>
            )}
         </div>
      </div>
      
      {/* Editable Prompt */}
      <div className="p-2 bg-gray-950 border-t border-gray-800">
         <input
            type="text"
            value={shot.prompt_seed}
            onChange={(e) => onUpdateShot(shot.beat_id, { prompt_seed: e.target.value })}
            className="w-full bg-transparent text-[9px] text-gray-400 font-mono border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 rounded px-1 py-0.5 outline-none"
            placeholder="Edit prompt before generating... (use @handles)"
         />
      </div>
    </div>

    {showOverlayEditor && imageUrl && (
       <OverlayCanvas 
          baseImage={imageUrl}
          overlays={shot.overlays || []}
          brandAssets={brandAssets}
          onUpdateOverlays={(newOvs) => onUpdateShot(shot.beat_id, { overlays: newOvs })}
          onCompositeAndSave={handleSaveComposite}
          onClose={() => setShowOverlayEditor(false)}
       />
    )}
    </>
  );
};

export default ProductShotCard;
