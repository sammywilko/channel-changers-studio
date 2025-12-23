
import React, { useEffect, useRef, useState } from 'react';
import { BrandAsset, Overlay } from '../types';
import { Move, Trash2, RotateCw, Check, X } from 'lucide-react';

interface OverlayCanvasProps {
  baseImage: string;
  overlays: Overlay[];
  brandAssets: BrandAsset[];
  onUpdateOverlays: (newOverlays: Overlay[]) => void;
  onCompositeAndSave: (finalImage: string) => void;
  onClose: () => void;
}

const OverlayCanvas: React.FC<OverlayCanvasProps> = ({ baseImage, overlays, brandAssets, onUpdateOverlays, onCompositeAndSave, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [activeOverlays, setActiveOverlays] = useState<Overlay[]>(overlays);

  useEffect(() => {
    setActiveOverlays(overlays);
  }, [overlays]);

  // Drag Logic
  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedOverlayId(id);
    const startX = e.clientX;
    const startY = e.clientY;
    
    const target = activeOverlays.find(o => o.id === id);
    if(!target) return;
    
    const startOverlayX = target.x;
    const startOverlayY = target.y;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      
      // Get container dims to normalize %
      if(containerRef.current) {
         const rect = containerRef.current.getBoundingClientRect();
         const newX = startOverlayX + (dx / rect.width) * 100;
         const newY = startOverlayY + (dy / rect.height) * 100;
         
         setActiveOverlays(prev => prev.map(o => o.id === id ? { ...o, x: newX, y: newY } : o));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onUpdateOverlays(activeOverlays); // Sync back
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleAddOverlay = (asset: BrandAsset) => {
     const newOverlay: Overlay = {
        id: `ov_${Date.now()}`,
        assetId: asset.id,
        url: asset.url,
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
        opacity: 1
     };
     const updated = [...activeOverlays, newOverlay];
     setActiveOverlays(updated);
     onUpdateOverlays(updated);
  };

  const handleUpdateSelected = (updates: Partial<Overlay>) => {
     if(!selectedOverlayId) return;
     const updated = activeOverlays.map(o => o.id === selectedOverlayId ? { ...o, ...updates } : o);
     setActiveOverlays(updated);
     onUpdateOverlays(updated);
  };

  const handleDeleteSelected = () => {
     if(!selectedOverlayId) return;
     const updated = activeOverlays.filter(o => o.id !== selectedOverlayId);
     setActiveOverlays(updated);
     onUpdateOverlays(updated);
     setSelectedOverlayId(null);
  };

  const handleComposite = () => {
     // Physical Burn
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     const img = new Image();
     img.src = baseImage;
     img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Draw Overlays
        let loaded = 0;
        if(activeOverlays.length === 0) {
           onCompositeAndSave(canvas.toDataURL('image/png'));
           return;
        }

        activeOverlays.forEach(ov => {
           const ovImg = new Image();
           ovImg.src = ov.url;
           ovImg.onload = () => {
              if(ctx) {
                 ctx.save();
                 const x = (ov.x / 100) * canvas.width;
                 const y = (ov.y / 100) * canvas.height;
                 const w = (ovImg.width * ov.scale * 0.2); // Baseline scale factor
                 const h = (ovImg.height * ov.scale * 0.2);
                 
                 ctx.translate(x, y);
                 ctx.rotate((ov.rotation * Math.PI) / 180);
                 ctx.globalAlpha = ov.opacity;
                 ctx.drawImage(ovImg, -w/2, -h/2, w, h);
                 ctx.restore();
              }
              loaded++;
              if(loaded === activeOverlays.length) {
                 onCompositeAndSave(canvas.toDataURL('image/png'));
              }
           };
        });
     };
  };

  const selected = activeOverlays.find(o => o.id === selectedOverlayId);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur p-8">
      <div className="w-full max-w-6xl h-[85vh] bg-nano-900 border border-gray-700 rounded-lg flex shadow-2xl overflow-hidden">
         {/* Canvas Area */}
         <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center p-10" ref={containerRef}>
            <img src={baseImage} className="max-w-full max-h-full pointer-events-none" />
            
            {/* Overlay Layers */}
            {/* Note: We need to match the img display size precisely or use % positioning on a wrapper. 
                For simplicity, we assume the overlay x/y are % of the container which matches img size roughly in this layout or we restrict container to img aspect ratio.
                Better: absolute overlay container on top of image.
            */}
            <div className="absolute inset-0 pointer-events-none">
               {/* This is tricky without precise dimension matching. Simplified approach: 
                   We assume the container IS the boundary. Users place visually relative to container. 
               */}
               {activeOverlays.map(ov => (
                  <div 
                    key={ov.id}
                    className={`absolute pointer-events-auto cursor-move transform -translate-x-1/2 -translate-y-1/2 ${selectedOverlayId === ov.id ? 'ring-2 ring-nano-accent' : ''}`}
                    style={{ 
                       left: `${ov.x}%`, 
                       top: `${ov.y}%`,
                       transform: `translate(-50%, -50%) rotate(${ov.rotation}deg) scale(${ov.scale})`,
                       opacity: ov.opacity
                    }}
                    onMouseDown={(e) => handleDragStart(e, ov.id)}
                  >
                     <img src={ov.url} className="h-20 object-contain pointer-events-none" />
                  </div>
               ))}
            </div>
         </div>

         {/* Sidebar */}
         <div className="w-80 bg-nano-800 border-l border-gray-700 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-white font-bold">Compositor</h3>
               <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
               <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Brand Assets</h4>
               <div className="grid grid-cols-3 gap-2 mb-6">
                  {brandAssets.map(asset => (
                     <button key={asset.id} onClick={() => handleAddOverlay(asset)} className="bg-black/40 p-2 rounded border border-gray-700 hover:border-nano-accent transition-colors">
                        <img src={asset.url} className="w-full h-8 object-contain" />
                     </button>
                  ))}
               </div>

               {selected && (
                  <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">Selected Layer</span>
                        <button onClick={handleDeleteSelected} className="text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
                     </div>
                     
                     <div>
                        <label className="text-[9px] text-gray-400 block mb-1">Scale ({selected.scale.toFixed(1)})</label>
                        <input type="range" min="0.1" max="5" step="0.1" value={selected.scale} onChange={(e) => handleUpdateSelected({ scale: parseFloat(e.target.value) })} className="w-full accent-nano-accent" />
                     </div>

                     <div>
                        <label className="text-[9px] text-gray-400 block mb-1 flex items-center gap-1"><RotateCw size={8}/> Rotation ({selected.rotation}°)</label>
                        <input type="range" min="0" max="360" value={selected.rotation} onChange={(e) => handleUpdateSelected({ rotation: parseInt(e.target.value) })} className="w-full accent-nano-accent" />
                     </div>
                     
                     <div>
                        <label className="text-[9px] text-gray-400 block mb-1">Opacity</label>
                        <input type="range" min="0" max="1" step="0.1" value={selected.opacity} onChange={(e) => handleUpdateSelected({ opacity: parseFloat(e.target.value) })} className="w-full accent-nano-accent" />
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
               <button onClick={handleComposite} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                  <Check size={18} /> BURN & SAVE
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default OverlayCanvas;
