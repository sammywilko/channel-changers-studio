
import React, { useState, useRef } from 'react';
import { EpisodeStructure, Beat } from '../types';
import { Clock, Maximize2, GripVertical, Plus, Aperture, Mic } from 'lucide-react';
import CoverageNode from './CoverageNode';
import clsx from 'clsx';

interface StoryCanvasProps {
  structure: EpisodeStructure;
  onSelectBeat: (beatId: string) => void;
  onMoveBeat: (sourceId: string, targetId: string) => void;
  onAddBeat: (sceneNumber: number, afterBeatId: string) => void;
  // Coverage Props
  onGenerateCoverage: (beatId: string) => void;
  onGenerateVariationImage: (beatId: string, index: number, prompt: string) => void;
  onSelectVariation: (beatId: string, index: number) => void;
}

const StoryCanvas: React.FC<StoryCanvasProps> = ({ 
  structure, 
  onSelectBeat, 
  onMoveBeat, 
  onAddBeat,
  onGenerateCoverage,
  onGenerateVariationImage,
  onSelectVariation
}) => {
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null);
  const [draggingBeatId, setDraggingBeatId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, beatId: string) => {
    setDraggingBeatId(beatId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetBeatId: string) => {
    e.preventDefault();
    if (draggingBeatId && draggingBeatId !== targetBeatId) {
      onMoveBeat(draggingBeatId, targetBeatId);
    }
    setDraggingBeatId(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-nano-800 p-4 border-b border-gray-700 flex justify-between items-center shadow-md z-10">
         <h3 className="text-white font-bold flex items-center gap-2">
           <Clock size={18} className="text-nano-accent" />
           TIMELINE SEQUENCE
         </h3>
         <div className="text-xs text-gray-500">
           Drag to Reorder • Click Shot to Edit • Green Dot = Approved
         </div>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-nano-900/80 p-10 flex items-center space-x-8 custom-scrollbar relative">
        {/* Background Grid Lines for "Film Strip" feel */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px)] bg-[size:100px_100px] opacity-20"></div>

        {structure.acts.map((act) => (
          <div key={act.act_number} className="flex items-center space-x-4 shrink-0">
             {/* Act Marker */}
             <div className="h-64 w-12 rounded-full border-2 border-gray-700 flex items-center justify-center bg-gray-800 shadow-xl z-0">
                <span className="-rotate-90 text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap text-xs">Act {act.act_number}</span>
             </div>

             {act.scenes.map((scene) => (
                <div key={scene.scene_number} className="flex items-center space-x-2">
                   
                   <div className="flex flex-col items-center space-y-4">
                      <div className="text-[9px] text-gray-500 font-mono uppercase bg-gray-900 px-2 py-1 rounded border border-gray-800">Scene {scene.scene_number}</div>
                      
                      <div className="flex items-center">
                         {scene.beats.map((beat, bIdx) => {
                            const hasImage = beat.generatedImages && beat.generatedImages.length > 0;
                            const imgUrl = hasImage ? beat.generatedImages![beat.selectedImageIndex] : null;
                            const isExpanded = expandedBeatId === beat.beat_id;

                            return (
                              <div key={beat.beat_id} className="flex items-center">
                                {/* The Beat Node */}
                                <div className="relative flex flex-col items-center group/beat">
                                  
                                  {isExpanded ? (
                                    <div className="z-20 relative -mt-24">
                                       <CoverageNode 
                                          beat={beat}
                                          onGenerateVariations={() => onGenerateCoverage(beat.beat_id)}
                                          onGenerateVariationImage={(idx, prompt) => onGenerateVariationImage(beat.beat_id, idx, prompt)}
                                          onSelectVariation={(idx) => { onSelectVariation(beat.beat_id, idx); setExpandedBeatId(null); }}
                                          onClose={() => setExpandedBeatId(null)}
                                       />
                                    </div>
                                  ) : (
                                    <div 
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, beat.beat_id)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, beat.beat_id)}
                                      className={clsx("relative w-48 h-28 rounded-lg bg-gray-800 border transition-all overflow-hidden cursor-pointer shrink-0 shadow-lg group-hover/beat:scale-105 z-10",
                                         beat.status === 'Approved' ? "border-green-500 shadow-green-900/20" : 
                                         beat.status === 'Changes Requested' ? "border-red-500" : 
                                         beat.status === 'In Review' ? "border-yellow-500" : "border-gray-700 hover:border-nano-accent"
                                      )}
                                      onClick={() => hasImage && onSelectBeat(beat.beat_id)}
                                    >
                                       {/* Status Dot */}
                                       <div className={clsx("absolute top-2 left-2 w-2 h-2 rounded-full z-20",
                                          beat.status === 'Approved' ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" :
                                          beat.status === 'In Review' ? "bg-yellow-500" :
                                          beat.status === 'Changes Requested' ? "bg-red-500" : "bg-gray-600"
                                       )}></div>

                                       <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/beat:opacity-100 transition-opacity">
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); setExpandedBeatId(beat.beat_id); }}
                                             className="bg-black/70 text-white p-1.5 rounded hover:bg-nano-accent hover:text-black transition-colors"
                                             title="Explode Coverage"
                                          >
                                             <Aperture size={12} />
                                          </button>
                                       </div>

                                       {imgUrl ? (
                                          <img src={imgUrl} className="w-full h-full object-cover" alt="beat" />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-mono p-4 text-center bg-gray-900">
                                            {beat.action.slice(0, 50)}...
                                          </div>
                                       )}
                                       
                                       {/* Drag Handle */}
                                       <div className="absolute top-2 left-2 text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover/beat:opacity-100 pl-3">
                                          <GripVertical size={14} />
                                       </div>

                                       <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[8px] text-white font-mono truncate flex justify-between px-2">
                                          <span>{beat.beat_id}</span>
                                          <span className="text-nano-accent">{beat.camera}</span>
                                       </div>
                                    </div>
                                  )}
                                  
                                  {/* Sync (Dialogue) */}
                                  <div className="mt-4 w-48 px-2 min-h-[40px] flex flex-col items-center text-center">
                                     {beat.dialogue && (
                                        <>
                                          <div className="h-4 w-px bg-gray-700 mb-1"></div>
                                          <div className="bg-black/40 rounded px-2 py-1 border border-gray-800 max-w-full">
                                             <p className="text-[9px] text-yellow-500 italic line-clamp-2 leading-tight">"{beat.dialogue}"</p>
                                          </div>
                                        </>
                                     )}
                                  </div>

                                </div>

                                {/* Add Button Connector */}
                                <div className="w-8 h-[2px] bg-gray-700 relative group/add flex items-center justify-center">
                                   <button 
                                      onClick={() => onAddBeat(scene.scene_number, beat.beat_id)}
                                      className="w-5 h-5 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-500 hover:text-white hover:bg-nano-accent hover:border-nano-accent transition-all scale-0 group-hover/add:scale-100 z-10"
                                      title="Add Shot"
                                   >
                                      <Plus size={10} />
                                   </button>
                                </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                   
                   {/* Scene Separator */}
                   <div className="w-px h-40 bg-gray-800 mx-4 border-r border-dashed border-gray-700"></div>
                </div>
             ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryCanvas;
