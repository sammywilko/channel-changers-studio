/**
 * META-ORCHESTRATOR SERVICE
 *
 * Intelligent production coordinator that analyzes project context and makes
 * adaptive workflow decisions. Acts as a conversational producer who understands
 * project scale, constraints, and creative goals.
 */

import { Project, GemType, Beat, Scene } from '../types';
import { GoogleGenAI } from '@google/genai';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Orchestrator conversation context
export interface OrchestratorContext {
  project: Project;
  conversationHistory: OrchestratorMessage[];
  workflowState: WorkflowState;
  insights: ProjectInsights;
}

export interface OrchestratorMessage {
  role: 'producer' | 'user';
  content: string;
  timestamp: number;
  actionTaken?: WorkflowAction;
}

export interface ProjectInsights {
  scale: 'micro' | 'short' | 'medium' | 'feature'; // Duration/complexity
  budget: 'experimental' | 'standard' | 'premium'; // Resource allocation
  style: 'rough_cut' | 'polished' | 'cinematic'; // Quality target
  urgency: 'exploratory' | 'normal' | 'deadline'; // Time pressure
  purpose: string; // Client pitch, social media, broadcast, etc.
  constraints: string[]; // User-specified limitations
  priorities: string[]; // What matters most to the user
}

export interface WorkflowState {
  currentPhase: 'discovery' | 'development' | 'production' | 'refinement' | 'complete';
  activeAgents: GemType[];
  completedSteps: string[];
  nextActions: string[];
  blockers: string[];
  recommendations: string[];
}

export interface WorkflowAction {
  type: 'run_agent' | 'skip_agent' | 'iterate' | 'approve' | 'revise' | 'question';
  target?: GemType;
  reason: string;
  depth?: 'quick_pass' | 'standard' | 'deep_dive';
}

export interface WorkflowPlan {
  phases: {
    name: string;
    agents: Array<{
      type: GemType;
      depth: 'quick_pass' | 'standard' | 'deep_dive';
      reason: string;
      optional: boolean;
    }>;
    checkpoints: string[];
  }[];
  estimatedComplexity: string;
  recommendations: string[];
}

const META_ORCHESTRATOR_PROMPT = `You are the META-ORCHESTRATOR, an intelligent production coordinator and creative producer.

## YOUR ROLE

You are NOT a rigid pipeline executor. You are an adaptive, context-aware producer who:

1. **Understands Project Context**
   - Analyzes project scale (30-second TikTok vs 10-minute short vs feature film)
   - Recognizes budget/resource constraints (experimental test vs client deliverable)
   - Identifies quality targets (rough animatic vs polished final)
   - Respects time pressure (exploratory vs deadline-driven)

2. **Makes Intelligent Workflow Decisions**
   - Decides which agents to use and when
   - Determines depth of analysis for each step (quick pass vs deep dive)
   - Routes around unnecessary steps for simple projects
   - Adds rigorous validation for complex/critical projects
   - Adapts to user feedback in real-time

3. **Communicates Like a Producer**
   - Asks clarifying questions about project goals
   - Explains workflow decisions in plain language
   - Suggests alternatives when constraints conflict
   - Provides progress updates and next-step recommendations
   - Collaborates conversationally rather than mechanically executing

## AVAILABLE AGENTS

You coordinate these specialist agents:

- **scriptwriter**: Story structure, narrative development, dialogue
- **world_builder**: Location scouting, environment design, asset creation
- **director**: Shot planning, cinematography, scene blocking
- **cinematographer**: Prompt engineering, visual execution, image generation
- **quality_control**: Continuity checking, refinement suggestions
- **creative_director**: Overall creative vision (narrative mode)
- **photographer**: Product photography direction (product mode)
- **stylist**: Product styling and presentation (product mode)

## DECISION FRAMEWORK

### Project Scale Assessment:
- **MICRO** (15-30 sec, 1-3 shots): Skip scriptwriter, minimal world building, focus on hero shots
- **SHORT** (1-3 min, 10-20 shots): Standard workflow, can skip quality_control for drafts
- **MEDIUM** (5-10 min, 30-50 shots): Full workflow, multiple review checkpoints
- **FEATURE** (20+ min, 100+ shots): Deep analysis at every step, rigorous QC

### Depth Levels:
- **QUICK_PASS**: Fast iteration, minimal analysis (for tests, drafts, experiments)
- **STANDARD**: Normal depth (for most projects)
- **DEEP_DIVE**: Exhaustive analysis (for client deliverables, complex scenes)

### Adaptive Routing Examples:

**Scenario: "Quick 15-second product reveal"**
→ Skip scriptwriter (already know the shot)
→ Quick photographer pass
→ Standard cinematographer execution
→ Skip quality_control (simple, single shot)

**Scenario: "3-minute narrative short for film festival"**
→ Standard scriptwriter analysis
→ Standard world_builder (establish key locations)
→ Deep director breakdown (cinematography matters)
→ Standard cinematographer
→ Deep quality_control (festival-quality polish)

**Scenario: "Testing a new character design"**
→ Skip scriptwriter (not testing story)
→ Quick world_builder (simple backdrop)
→ Quick director (just test poses)
→ Standard cinematographer (quality still matters)
→ Skip quality_control (it's a test)

## CONVERSATIONAL PROTOCOL

When user starts a project:

1. **Discovery Questions** (Don't assume, ask):
   - "What's the target duration and shot count?"
   - "Is this a draft/test or a final deliverable?"
   - "What's your timeline - exploring ideas or working to a deadline?"
   - "What matters most - speed, polish, or experimentation?"
   - "Any specific constraints (budget, style, technical limitations)?"

2. **Workflow Proposal**:
   - Suggest a tailored workflow plan
   - Explain WHY you're routing this way
   - Offer alternatives if user has different priorities
   - Get user approval before executing

3. **Real-Time Adaptation**:
   - Monitor agent outputs
   - Ask if user wants to iterate or move forward
   - Suggest pivots if direction isn't working
   - Provide progress updates

4. **Checkpoint Conversations**:
   - After each major phase, check in with user
   - "The script is ready - want to review before building the world?"
   - "I see 12 locations - should we simplify or is this the right scope?"
   - "Shot 8 has continuity issues - iterate or approve with notes?"

## OUTPUT FORMAT

When analyzing a project, respond in this JSON structure:

{
  "message": "Your conversational message to the user",
  "insights": {
    "scale": "micro|short|medium|feature",
    "budget": "experimental|standard|premium",
    "style": "rough_cut|polished|cinematic",
    "urgency": "exploratory|normal|deadline",
    "purpose": "Brief description",
    "constraints": ["constraint1", "constraint2"],
    "priorities": ["priority1", "priority2"]
  },
  "workflowPlan": {
    "phases": [
      {
        "name": "Phase name",
        "agents": [
          {
            "type": "scriptwriter",
            "depth": "quick_pass|standard|deep_dive",
            "reason": "Why this depth?",
            "optional": false
          }
        ],
        "checkpoints": ["User approval needed here"]
      }
    ],
    "estimatedComplexity": "Low/Medium/High",
    "recommendations": ["Suggestion 1", "Suggestion 2"]
  },
  "nextQuestion": "What I need to know before proceeding" // or null if ready
}

## CRITICAL PRINCIPLES

1. **NO RIGID PIPELINES**: Every project gets a custom workflow
2. **USER COLLABORATION**: Have a conversation, don't just execute
3. **CONTEXT AWARENESS**: 15-second TikTok ≠ Feature film
4. **EXPLAIN DECISIONS**: Always say WHY you're routing this way
5. **ADAPTIVE**: Change course based on user feedback and results
6. **EFFICIENCY**: Don't waste time on unnecessary steps
7. **QUALITY WHERE IT MATTERS**: Deep dive when stakes are high, quick pass when testing

You are a producer, not a robot. Act accordingly.`;

/**
 * Analyze project and generate intelligent workflow plan
 */
export const analyzeProjectContext = async (
  project: Project,
  userInput: string,
  conversationHistory: OrchestratorMessage[] = []
): Promise<{
  message: string;
  insights: ProjectInsights;
  workflowPlan: WorkflowPlan;
  nextQuestion: string | null;
}> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Fast, public, stable model

    // Build conversation context
    const contextPrompt = `
PROJECT ANALYSIS REQUEST

## Current Project:
Name: ${project.name}
Type: ${project.type}
Idea/Brief: ${project.idea || project.productBrief || 'Not specified'}
Template: ${project.templateId || 'Custom'}
Characters: ${project.characters.length}
Locations: ${project.locations.length}
Existing Script: ${project.script ? 'Yes (' + project.script.length + ' chars)' : 'No'}
Existing Structure: ${project.structure ? 'Yes (' + project.structure.acts.length + ' acts)' : 'No'}

## User Input:
${userInput}

## Conversation History:
${conversationHistory.map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`).join('\n')}

## Your Task:
Analyze this project context and user input. Determine:
1. What kind of project is this? (scale, budget, style, urgency)
2. What workflow would best serve this project?
3. What questions do you need answered before proceeding?

Respond in the specified JSON format.`;

    const result = await ai.models.generateContent({
      model,
      contents: contextPrompt,
      config: {
        systemInstruction: META_ORCHESTRATOR_PROMPT,
        temperature: 0.7
      }
    });
    const response = result.text || '';

    // Parse JSON response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Orchestrator response not in expected JSON format');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      message: parsed.message,
      insights: parsed.insights,
      workflowPlan: parsed.workflowPlan,
      nextQuestion: parsed.nextQuestion
    };

  } catch (error) {
    console.error('Orchestrator analysis failed:', error);
    throw error;
  }
};

/**
 * Get workflow recommendation for a specific step
 */
export const getNextStepRecommendation = async (
  context: OrchestratorContext,
  completedAgents: GemType[]
): Promise<{
  action: WorkflowAction;
  message: string;
}> => {
  try {
    const ai = getAi();
    const model = 'gemini-3-pro-preview'; // Fast, public, stable model

    const prompt = `
WORKFLOW DECISION POINT

## Project Context:
${JSON.stringify(context.insights, null, 2)}

## Completed Agents:
${completedAgents.join(', ')}

## Current Workflow State:
Current Phase: ${context.workflowState.currentPhase}
Completed Steps: ${context.workflowState.completedSteps.join(', ')}
Blockers: ${context.workflowState.blockers.join(', ') || 'None'}

## Question:
What should happen next? Should we:
- Run another agent (which one, at what depth)?
- Iterate on existing work?
- Get user approval before proceeding?
- Skip ahead?

Respond with:
{
  "action": {
    "type": "run_agent|skip_agent|iterate|approve|question",
    "target": "agent_type",
    "reason": "Why this action?",
    "depth": "quick_pass|standard|deep_dive"
  },
  "message": "Conversational explanation to user"
}`;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: META_ORCHESTRATOR_PROMPT,
        temperature: 0.7
      }
    });
    const response = result.text || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;

  } catch (error) {
    console.error('Next step recommendation failed:', error);
    throw error;
  }
};

/**
 * Validate if user input should trigger orchestrator or go direct to agent
 */
export const shouldUseOrchestrator = (userInput: string): boolean => {
  const orchestratorTriggers = [
    /\b(help me|guide me|what should|how do i|plan|workflow|producer|coordinate)\b/i,
    /\b(quick|fast|rough|draft|test|experiment)\b/i, // Suggests context-specific workflow
    /\b(polished|final|client|deliverable|professional)\b/i, // Quality context
    /\b(tight deadline|rush|asap|quick turnaround)\b/i, // Urgency context
  ];

  return orchestratorTriggers.some(pattern => pattern.test(userInput));
};

/**
 * Get default workflow for project type (fallback when orchestrator not needed)
 */
export const getDefaultWorkflow = (project: Project): GemType[] => {
  if (project.type === 'product') {
    return ['photographer', 'cinematographer'];
  }
  return ['scriptwriter', 'world_builder', 'director', 'cinematographer'];
};
