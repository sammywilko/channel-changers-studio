
import React, { useState, useEffect } from 'react';
import { Beat, AspectRatio, User, BeatStatus, Comment, PromptVersion } from '../types';
import { Camera, Zap, Image, Loader2, Sparkles, Download, Maximize2, RotateCcw, ChevronLeft, ChevronRight, Eye, Mic, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, AlertCircle, Send, History, Clock, Wand2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface BeatCardProps {
  beat: Beat;
  currentUser: User;
  onGenerateImage: (beatId: string, prompt: string) => void;
  onPromptChange: (beatId: string, newPrompt: string) => void;
  onOpenLightbox: (imageUrl: string) => void;
  onSelectImage: (beatId: string, index: number) => void;
  onLikeFeedback: (beatId: string, notes: string) => void;
  onDislikeFeedback: (beatId: string, notes: string) => void;
  onUpdateStatus: (beatId: string, status: BeatStatus) => void;
  onAddComment: (beatId: string, text: string) => void;
  onRestorePrompt: (beatId: string, version: PromptVersion) => void;
  onGenerateSuggestions: (beatId: string) => void;
  aspectRatio: AspectRatio;
}

const BeatCard: React.FC<BeatCardProps> = ({ 
  beat, 
  currentUser,
  onGenerateImage, 
  onPromptChange, 
  onOpenLightbox, 
  onSelectImage,
  onLikeFeedback,
  onDislikeFeedback,
  onUpdateStatus,
  onAddComment,
  onRestorePrompt,
  onGenerateSuggestions,
  aspectRatio
}) => {
  const [localPrompt, setLocalPrompt] = useState(beat.prompt_seed);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  useEffect(() => {
    setLocalPrompt(beat.prompt_seed);
  }, [beat.prompt_seed]);

  const handlePromptBlur = () => {
    if (localPrompt !== beat.prompt_seed) {
      onPromptChange(beat.beat_id, localPrompt);
    }
  };

  const handleDownload = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${beat.beat_id}_render_${beat.selectedImageIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (beat.selectedImageIndex > 0) {
      onSelectImage(beat.beat_id, beat.selectedImageIndex - 1);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (beat.generatedImages && beat.selectedImageIndex < beat.generatedImages.length - 1) {
      onSelectImage(beat.beat_id, beat.selectedImageIndex + 1);
    }
  };

  const handleSubmitDislike = () => {
    onDislikeFeedback(beat.beat_id, feedbackReason);
    setShowFeedbackInput(false);
    onUpdateStatus(beat.beat_id, 'Changes Requested');
  };

  const handleAddComment = () => {
     if(!newComment.trim()) return;
     onAddComment(beat.beat_id, newComment);
     setNewComment('');
  };

  const handleWandClick = () => {
    if (!showSuggestions && (!beat.smartSuggestions || beat.smartSuggestions.length === 0)) {
       onGenerateSuggestions(beat.beat_id);
    }
    setShowSuggestions(!showSuggestions);
  };

  const applySuggestion = (suggestion: string) => {
     setLocalPrompt(suggestion);
     onPromptChange(beat.beat_id, suggestion);
     setShowSuggestions(false);
  };

  const currentImage = beat.generatedImages && beat.selectedImageIndex >= 0 
    ? beat.generatedImages[beat.selectedImageIndex] 
    : null;
    
  const imageCount = beat.generatedImages ? beat.generatedImages.length : 0;

  const getAspectRatioStyle = () => {
    switch(aspectRatio) {
      case '16:9': return '16 / 9';
      case '9:16': return '9 / 16';
      case '1:1': return '1 / 1';
      case '4:3': return '4 / 3';
      case '3:4': return '3 / 4';
      case '2.39:1': return '2.39 / 1';
      default: return '16 / 9';
    }
  };

  // Workflow Status styling
  const getStatusColor = () => {
     switch(beat.status) {
        case 'Approved': return 'border-green-500 bg-green-900/20';
        case 'Changes Requested': return 'border-red-500 bg-red-900/10';
        case 'In Review': return 'border-yellow-500 bg-yellow-900/10';
        default: return 'border-gray-700 bg-nano-700';
     }
  };

  return (
    <div className={clsx("border rounded-lg p-4 transition-all duration-300 relative overflow-hidden group flex flex-col", getStatusColor())}>
      
      {/* Continuity Warning */}
      {beat.continuityError && (
         <div className="mb-2 bg-red-900/50 border border-red-500/50 rounded p-2 flex items-start gap-2 animate-in slide-in-from-top-1">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-200 leading-tight font-medium">
               Continuity Alert: {beat.continuityError}
            </p>
         </div>
      )}

      {/* Header: ID & Status */}
      <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
              {beat.beat_id}
            </span>
            {/* Workflow Dropdown */}
            <div className="relative group/status">
               <button className={clsx("text-[9px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1", 
                  beat.status === 'Approved' ? 'bg-green-500 text-black' : 
                  beat.status === 'In Review' ? 'bg-yellow-500 text-black' : 
                  beat.status === 'Changes Requested' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
               )}>
                  {beat.status === 'Approved' && <CheckCircle size={10} />}
                  {beat.status === 'Changes Requested' && <AlertCircle size={10} />}
                  {beat.status}
               </button>
               <div className="absolute top-full left-0 w-32 bg-nano-800 border border-gray-600 rounded shadow-xl z-50 hidden group-hover/status:block">
                  <div className="flex flex-col p-1">
                     <button onClick={() => onUpdateStatus(beat.beat_id, 'Draft')} className="text-[10px] text-left px-2 py-1 hover:bg-gray-700 text-gray-300">Draft</button>
                     <button onClick={() => onUpdateStatus(beat.beat_id, 'In Review')} className="text-[10px] text-left px-2 py-1 hover:bg-gray-700 text-yellow-400">Ready for Review</button>
                     {currentUser.role === 'Director' && (
                        <>
                           <button onClick={() => onUpdateStatus(beat.beat_id, 'Changes Requested')} className="text-[10px] text-left px-2 py-1 hover:bg-gray-700 text-red-400">Changes Requested</button>
                           <button onClick={() => onUpdateStatus(beat.beat_id, 'Approved')} className="text-[10px] text-left px-2 py-1 hover:bg-gray-700 text-green-400">Approve</button>
                        </>
                     )}
                  </div>
               </div>
            </div>
          </div>
          
          <div className="flex -space-x-1">
             {beat.characters.map((char, i) => (
               <div key={i} className="w-5 h-5 rounded-full bg-gray-600 border border-nano-700 flex items-center justify-center text-[8px] text-white" title={char}>
                 {char.charAt(1)}
               </div>
             ))}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        <p className="text-sm text-gray-200 mb-4 leading-relaxed font-medium">
          {beat.action}
        </p>
        
        {beat.dialogue && (
           <div className="mb-4 bg-black/30 p-2 rounded border-l-2 border-yellow-500">
              <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold uppercase mb-1">
                 <Mic size={10} /> Sync
              </div>
              <p className="text-xs text-gray-300 italic font-serif">"{beat.dialogue}"</p>
           </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-gray-800/50 p-2 rounded flex items-center space-x-2 text-gray-400">
            <Camera size={12} className="text-nano-accent" />
            <span>{beat.camera}</span>
          </div>
          <div className="bg-gray-800/50 p-2 rounded flex items-center space-x-2 text-gray-400">
            <Zap size={12} className="text-yellow-500" />
            <span>{beat.lighting}</span>
          </div>
        </div>

        {/* Image Area */}
        <div className="mt-auto space-y-3">
          {currentImage ? (
            <div 
               className="relative rounded-lg overflow-hidden border border-gray-600 group/image cursor-pointer hover:ring-2 ring-nano-accent transition-all bg-black"
               style={{ aspectRatio: getAspectRatioStyle() }}
            >
              <img 
                src={currentImage} 
                alt={beat.action}
                className="w-full h-full object-contain transition-transform duration-500 group-hover/image:scale-105"
                onClick={() => onOpenLightbox(currentImage)}
              />

              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                   <div className="bg-black/70 px-2 py-1 rounded text-[8px] text-white font-mono pointer-events-auto">
                    GEMINI 3 PRO
                   </div>
                   <div className="bg-black/70 px-2 py-1 rounded text-[8px] text-white font-mono pointer-events-auto">
                    v{beat.selectedImageIndex + 1}/{imageCount}
                   </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none">
                   <Maximize2 className="text-white drop-shadow-md" size={24} />
                </div>

                <div className="flex justify-between items-end pointer-events-auto opacity-0 group-hover/image:opacity-100 transition-opacity">
                  <div className="flex bg-black/70 rounded overflow-hidden">
                    <button 
                      onClick={handlePrevImage}
                      disabled={beat.selectedImageIndex <= 0}
                      className="p-1.5 hover:bg-nano-accent/50 text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={handleNextImage}
                      disabled={beat.selectedImageIndex >= imageCount - 1}
                      className="p-1.5 hover:bg-nano-accent/50 text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex space-x-1">
                    {/* Feedback Buttons */}
                    <button 
                       onClick={(e) => { e.stopPropagation(); onLikeFeedback(beat.beat_id, "Good visual match"); onUpdateStatus(beat.beat_id, 'Approved'); }}
                       className={beat.feedback?.liked === true ? "bg-green-500 text-white p-1.5 rounded" : "bg-black/70 hover:bg-green-500/50 text-white p-1.5 rounded"}
                    >
                       <ThumbsUp size={12} />
                    </button>
                    <button 
                       onClick={(e) => { e.stopPropagation(); setShowFeedbackInput(true); }}
                       className={beat.feedback?.liked === false ? "bg-red-500 text-white p-1.5 rounded" : "bg-black/70 hover:bg-red-500/50 text-white p-1.5 rounded"}
                    >
                       <ThumbsDown size={12} />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onGenerateImage(beat.beat_id, localPrompt); }}
                      disabled={beat.isGeneratingImage}
                      className="bg-black/70 hover:bg-nano-accent hover:text-black p-1.5 rounded text-white transition-colors"
                      title="Regenerate"
                    >
                       {beat.isGeneratingImage ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    </button>
                    <button 
                      onClick={(e) => handleDownload(e, currentImage)}
                      className="bg-black/70 hover:bg-nano-accent hover:text-black p-1.5 rounded text-white transition-colors"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dislike Feedback Overlay */}
              {showFeedbackInput && (
                 <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center z-30 animate-in fade-in">
                    <p className="text-white text-xs mb-2 font-bold">Why didn't this work?</p>
                    <input 
                      type="text" 
                      value={feedbackReason}
                      onChange={(e) => setFeedbackReason(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white mb-2 focus:outline-none focus:border-red-500"
                      placeholder="e.g. Wrong character color..."
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2 w-full">
                       <button onClick={(e) => { e.stopPropagation(); setShowFeedbackInput(false); }} className="flex-1 bg-gray-700 text-white text-xs py-1 rounded hover:bg-gray-600">Cancel</button>
                       <button onClick={(e) => { e.stopPropagation(); handleSubmitDislike(); }} className="flex-1 bg-red-600 text-white text-xs py-1 rounded hover:bg-red-500 font-bold">Submit Feedback</button>
                    </div>
                 </div>
              )}
            </div>
          ) : (
             <button 
              onClick={() => onGenerateImage(beat.beat_id, localPrompt)}
              disabled={beat.isGeneratingImage}
              className="w-full bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-nano-accent hover:border-nano-accent hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-wait group-hover:border-gray-600"
              style={{ aspectRatio: getAspectRatioStyle() }}
             >
                {beat.isGeneratingImage ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-nano-accent" />
                    <span className="text-xs font-mono">RENDERING...</span>
                  </>
                ) : (
                  <>
                    <Image size={24} />
                    <span className="text-xs font-bold">GENERATE SHOT</span>
                  </>
                )}
             </button>
          )}

          {/* Prompt Area */}
          <div className="relative group/prompt">
            <div className="bg-gray-900 rounded p-2 border border-gray-800 group-hover/prompt:border-nano-accent/50 transition-colors cursor-text">
              <div className="flex items-center justify-between mb-1 text-nano-accent text-[10px] uppercase font-bold tracking-wider">
                <div className="flex items-center space-x-2">
                  <Sparkles size={10} />
                  <span>Prompt Seed</span>
                </div>
                <div className="flex items-center gap-2">
                   {/* Magic Wand */}
                   <button onClick={handleWandClick} className="hover:text-pink-500 transition-colors" title="Smart Suggestions">
                      <Wand2 size={10} />
                   </button>
                   {/* History Toggle */}
                   <button onClick={() => setShowHistory(!showHistory)} className="hover:text-white transition-colors" title="Version History">
                      <Clock size={10} />
                   </button>
                </div>
              </div>
              
              {!showHistory && !showSuggestions ? (
                 <textarea 
                   value={localPrompt}
                   onChange={(e) => setLocalPrompt(e.target.value)}
                   onBlur={handlePromptBlur}
                   className="w-full bg-transparent text-[10px] text-gray-400 font-mono leading-tight focus:text-gray-100 focus:outline-none h-8 resize-none overflow-hidden"
                 />
              ) : showHistory ? (
                 <div className="h-20 overflow-y-auto custom-scrollbar space-y-1">
                    <div className="text-[9px] text-gray-500 font-bold mb-1">HISTORY</div>
                    {beat.promptHistory?.length ? (
                        beat.promptHistory.map((ver, i) => (
                           <div key={i} className="flex items-center justify-between bg-black/40 p-1 rounded text-[9px] group/ver">
                              <span className="text-gray-400 truncate w-32">{ver.prompt}</span>
                              <button onClick={() => { onRestorePrompt(beat.beat_id, ver); setShowHistory(false); }} className="text-nano-accent hover:underline">Restore</button>
                           </div>
                        ))
                    ) : (
                       <div className="text-[9px] text-gray-600">No history yet.</div>
                    )}
                    <button onClick={() => setShowHistory(false)} className="text-[9px] text-gray-500 underline mt-1 w-full text-center">Close</button>
                 </div>
              ) : (
                 // Suggestions UI
                 <div className="h-24 overflow-y-auto custom-scrollbar space-y-1">
                    <div className="text-[9px] text-pink-500 font-bold mb-1 flex items-center gap-1"><Wand2 size={8} /> AI SUGGESTIONS</div>
                    {!beat.smartSuggestions ? (
                       <div className="text-[9px] text-gray-500 italic">Generating ideas...</div>
                    ) : (
                       beat.smartSuggestions.map((sugg, i) => (
                          <button key={i} onClick={() => applySuggestion(sugg)} className="w-full text-left bg-gray-800 hover:bg-gray-700 p-1.5 rounded text-[9px] text-gray-300 leading-tight border border-gray-700 hover:border-pink-500">
                             {sugg}
                          </button>
                       ))
                    )}
                    <button onClick={() => setShowSuggestions(false)} className="text-[9px] text-gray-500 underline mt-1 w-full text-center">Cancel</button>
                 </div>
              )}
            </div>
            
            {!showHistory && !showSuggestions && (
              <div className="absolute bottom-full left-0 w-[150%] bg-nano-800 border border-gray-600 rounded-lg shadow-2xl p-4 mb-2 opacity-0 pointer-events-none group-hover/prompt:opacity-100 group-hover/prompt:pointer-events-auto transition-all z-20 translate-y-2 group-hover/prompt:translate-y-0">
                 <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                   <Sparkles size={12} className="text-nano-pink" />
                   FULL PROMPT DETAIL
                 </div>
                 <textarea 
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    onBlur={handlePromptBlur}
                    className="w-full bg-black/50 text-xs font-mono text-gray-300 h-48 rounded p-2 border border-gray-700 focus:border-nano-pink focus:outline-none"
                 />
              </div>
            )}
          </div>
          
          {/* Comments Toggle */}
          <button 
             onClick={() => setShowComments(!showComments)}
             className={clsx("w-full flex items-center justify-center py-1.5 rounded text-[10px] font-bold gap-2 transition-colors", 
               beat.comments?.length ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-transparent text-gray-600 hover:text-gray-400"
             )}
          >
             <MessageSquare size={12} />
             {beat.comments?.length || 0} Comments
          </button>
          
          {/* Comments Section */}
          {showComments && (
             <div className="bg-black/40 border-t border-gray-800 p-3 -mx-4 -mb-4 mt-2 animate-in slide-in-from-top-2">
                <div className="space-y-3 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                   {beat.comments?.length > 0 ? (
                      beat.comments.map(c => (
                         <div key={c.id} className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-white shrink-0 font-bold">
                               {c.userName.charAt(0)}
                            </div>
                            <div className="flex-1">
                               <div className="flex justify-between items-baseline">
                                  <span className="text-[10px] font-bold text-gray-300">{c.userName}</span>
                                  <span className="text-[8px] text-gray-600">{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </div>
                               <p className="text-[10px] text-gray-400 leading-tight">{c.text}</p>
                            </div>
                         </div>
                      ))
                   ) : (
                      <div className="text-[10px] text-gray-600 text-center py-2">No comments yet.</div>
                   )}
                </div>
                <div className="flex gap-2">
                   <input 
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-nano-accent"
                      placeholder="Add a note..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                   />
                   <button onClick={handleAddComment} className="bg-nano-accent text-black p-1.5 rounded hover:bg-cyan-400">
                      <Send size={10} />
                   </button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BeatCard;
