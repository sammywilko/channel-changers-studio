/**
 * PRODUCER CHAT INTERFACE
 *
 * Conversational interface for interacting with the META-ORCHESTRATOR.
 * Acts like chatting with a producer who understands your project and makes
 * intelligent workflow decisions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react';
import { Project } from '../types';
import {
  analyzeProjectContext,
  getNextStepRecommendation,
  OrchestratorMessage,
  OrchestratorContext,
  WorkflowPlan,
  ProjectInsights,
  WorkflowState
} from '../services/orchestratorService';
import { detectActionIntent, executeProducerAction, ProducerAction } from '../services/producerActions';
import clsx from 'clsx';

interface ProducerChatProps {
  project: Project;
  onWorkflowPlanGenerated: (plan: WorkflowPlan, insights: ProjectInsights) => void;
  onProjectUpdate: (project: Project) => void; // NEW: Allow Producer to update project
  isOpen: boolean;
  onToggle: () => void;
}

const ProducerChat: React.FC<ProducerChatProps> = ({
  project,
  onWorkflowPlanGenerated,
  onProjectUpdate,
  isOpen,
  onToggle
}) => {
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentInsights, setCurrentInsights] = useState<ProjectInsights | null>(null);
  const [currentPlan, setCurrentPlan] = useState<WorkflowPlan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Adapt greeting based on project state
      const hasStructure = !!project.structure;
      const hasScript = !!project.script;

      let greeting = '';

      if (hasStructure) {
        // Project is in progress - offer production assistance
        const shotCount = project.structure.acts.reduce((acc, act) =>
          acc + act.scenes.reduce((sceneAcc, scene) => sceneAcc + scene.beats.length, 0), 0);

        greeting = `Hey! I'm back. I see **${project.name}** is in production with **${shotCount} shots** ready.

What do you need help with?

- **Iterate**: "Regenerate shot 5 with different lighting"
- **Add coverage**: "Add 3 more angles for scene 2"
- **Quality review**: "Review all shots for continuity"
- **Workflow pivot**: "I want to change the style/approach"
- **Export prep**: "Help me prepare for final delivery"

Or just tell me what you're thinking!`;
      } else if (hasScript) {
        // Has script but no structure yet
        greeting = `Hey! I see you've got a script for **${project.name}** ready.

What's the next move?

- **Continue production**: "Break down the script and start generating shots"
- **Revise script**: "I want to change the story first"
- **Quick test**: "Just generate 3-5 key shots to test the vibe"
- **Custom workflow**: Describe what you want to do

How can I help?`;
      } else {
        // Brand new project
        greeting = `Hey! I'm your production coordinator. I see you're working on **${project.name}** (${project.type} mode).

Before we dive into execution, let me understand your goals:

- What's the target length and scope? (e.g., "15-second product reveal" or "5-minute narrative short")
- Is this a rough draft/test or a polished deliverable?
- Any time constraints or priorities?

Or just tell me what you're trying to create, and I'll ask follow-up questions!`;
      }

      setMessages([{
        role: 'producer',
        content: greeting,
        timestamp: Date.now()
      }]);
    }
  }, [isOpen, project, messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking) return;

    const userMessage: OrchestratorMessage = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsThinking(true);

    try {
      // 🎬 STEP 1: Check if this is an ACTION request (do something) or PLANNING (discuss)
      console.log('🔍 Detecting action intent...');
      const action = await detectActionIntent(currentInput, project);

      if (action) {
        // USER WANTS US TO DO SOMETHING!
        console.log('⚡ Action detected:', action.type);

        const executingMessage: OrchestratorMessage = {
          role: 'producer',
          content: `Got it! Let me ${action.type.replace('_', ' ')}... ⚡`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, executingMessage]);

        // Execute the action
        const result = await executeProducerAction(action, project);

        if (result.success && result.updatedProject) {
          // Update the project!
          onProjectUpdate(result.updatedProject);

          const successMessage: OrchestratorMessage = {
            role: 'producer',
            content: result.message,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, successMessage]);
        } else {
          const errorMessage: OrchestratorMessage = {
            role: 'producer',
            content: `⚠️ ${result.message}`,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, errorMessage]);
        }

      } else {
        // USER WANTS TO PLAN/DISCUSS
        console.log('💬 Planning conversation (no action)');

        // Get orchestrator response
        const response = await analyzeProjectContext(project, currentInput, messages);

        // Store insights and plan
        setCurrentInsights(response.insights);
        setCurrentPlan(response.workflowPlan);

        // Add producer response
        const producerMessage: OrchestratorMessage = {
          role: 'producer',
          content: response.message,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, producerMessage]);

        // If no more questions, show workflow plan
        if (!response.nextQuestion) {
          // Add workflow plan summary message
          const planSummary = generatePlanSummary(response.workflowPlan, response.insights);
          const planMessage: OrchestratorMessage = {
            role: 'producer',
            content: planSummary,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, planMessage]);

          // Notify parent component
          onWorkflowPlanGenerated(response.workflowPlan, response.insights);
        } else {
          // Ask follow-up question
          const questionMessage: OrchestratorMessage = {
            role: 'producer',
            content: response.nextQuestion,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, questionMessage]);
        }
      }

    } catch (error) {
      console.error('Producer chat error:', error);
      const errorMessage: OrchestratorMessage = {
        role: 'producer',
        content: "Hmm, I'm having trouble processing that. Can you rephrase or give me more details?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const generatePlanSummary = (plan: WorkflowPlan, insights: ProjectInsights): string => {
    const phasesList = plan.phases.map((phase, idx) => {
      const agentsList = phase.agents
        .map(agent => `  - **${agent.type}** (${agent.depth}) - ${agent.reason}${agent.optional ? ' *(optional)*' : ''}`)
        .join('\n');
      return `**Phase ${idx + 1}: ${phase.name}**\n${agentsList}`;
    }).join('\n\n');

    return `Perfect! Here's the workflow I'm proposing:

## Project Profile:
- **Scale**: ${insights.scale}
- **Style**: ${insights.style}
- **Budget**: ${insights.budget}
- **Urgency**: ${insights.urgency}

## Workflow Plan:

${phasesList}

**Estimated Complexity**: ${plan.estimatedComplexity}

**Recommendations**:
${plan.recommendations.map(r => `- ${r}`).join('\n')}

Ready to execute this plan? Type **"let's go"** to start, or ask me to adjust anything!`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full p-4 shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 z-50 flex items-center gap-2 group"
        >
          <Brain className="w-6 h-6" />
          <span className="hidden group-hover:inline-block text-sm font-medium pr-2">
            Chat with Producer
          </span>
        </button>
      )}

      {/* Chat Panel (when open) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-900 border border-purple-500/30 rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-white" />
              <div>
                <h3 className="text-white font-bold text-sm">Production Coordinator</h3>
                <p className="text-purple-200 text-xs">META-ORCHESTRATOR</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[80%] rounded-lg p-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100 border border-purple-500/20'
                  )}
                >
                  {msg.role === 'producer' && (
                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold text-xs">Producer</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap markdown-content">
                    {renderMarkdown(msg.content)}
                  </div>
                  <div className={clsx(
                    'text-xs mt-2 opacity-60',
                    msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  )}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-purple-500/20 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-sm text-gray-400">Producer is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-gray-900 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your project goals..."
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                disabled={isThinking}
              />
              <button
                onClick={handleSendMessage}
                disabled={isThinking || !inputValue.trim()}
                className={clsx(
                  'bg-purple-600 text-white rounded-lg px-4 py-2 transition-colors',
                  (isThinking || !inputValue.trim())
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-purple-700'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workflow Status (if plan exists) */}
          {currentPlan && currentInsights && (
            <div className="bg-purple-900/20 border-t border-purple-500/30 p-3">
              <div className="flex items-center gap-2 text-xs text-purple-300">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Workflow ready: {currentInsights.scale} • {currentInsights.style}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Simple markdown rendering for bold and lists
const renderMarkdown = (text: string) => {
  return text.split('\n').map((line, idx) => {
    // Bold text
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic text
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // List items
    if (line.trim().startsWith('-')) {
      return <li key={idx} dangerouslySetInnerHTML={{ __html: line.replace(/^- /, '') }} className="ml-4" />;
    }
    // Headings
    if (line.startsWith('## ')) {
      return <h3 key={idx} dangerouslySetInnerHTML={{ __html: line.replace('## ', '') }} className="font-bold text-purple-300 mt-2" />;
    }
    return <p key={idx} dangerouslySetInnerHTML={{ __html: line }} />;
  });
};

export default ProducerChat;
