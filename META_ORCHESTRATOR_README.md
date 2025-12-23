# META-ORCHESTRATOR System

## Overview

The META-ORCHESTRATOR is an intelligent production coordination layer that transforms Channel Changers Studio from a **rigid pipeline** into an **adaptive creative partner**. Instead of forcing every project through the same workflow, it analyzes project context and makes smart routing decisions—like chatting with a real producer.

---

## The Problem We Solved

### Before: Rigid Pipeline ❌
```
Every project forced through:
Script Writer → World Builder → Director → Cinematographer
     ↓              ↓              ↓              ↓
  (locked)      (locked)       (locked)      (locked)
```

**Issues:**
- 15-second TikTok gets same treatment as feature film
- No adaptation to project goals or constraints
- Wasted time on unnecessary steps
- No intelligent decision-making
- Mechanical, not collaborative

### After: Adaptive Orchestrator ✅
```
            META-ORCHESTRATOR
                   ↓
    [Analyzes: scale, budget, style, urgency]
                   ↓
    [Routes intelligently to needed agents]
                   ↓
    [Adapts depth: quick_pass | standard | deep_dive]
                   ↓
    [Conversational producer interface]
```

**Benefits:**
- Context-aware workflow planning
- Efficient routing (skip unnecessary steps)
- Variable depth analysis
- Conversational collaboration
- Producer-style decision making

---

## Architecture

### Core Files

#### 1. [orchestratorService.ts](services/orchestratorService.ts)
**Purpose**: AI-powered workflow analysis and planning

**Key Functions:**
- `analyzeProjectContext()` - Analyzes project and generates workflow plan
- `getNextStepRecommendation()` - Decides what to do next during execution
- `shouldUseOrchestrator()` - Detects if user input needs orchestration

**Core Types:**
```typescript
interface ProjectInsights {
  scale: 'micro' | 'short' | 'medium' | 'feature';
  budget: 'experimental' | 'standard' | 'premium';
  style: 'rough_cut' | 'polished' | 'cinematic';
  urgency: 'exploratory' | 'normal' | 'deadline';
  purpose: string;
  constraints: string[];
  priorities: string[];
}

interface WorkflowPlan {
  phases: Array<{
    name: string;
    agents: Array<{
      type: GemType;
      depth: 'quick_pass' | 'standard' | 'deep_dive';
      reason: string;
      optional: boolean;
    }>;
    checkpoints: string[];
  }>;
  estimatedComplexity: string;
  recommendations: string[];
}
```

#### 2. [workflowEngine.ts](services/workflowEngine.ts)
**Purpose**: Executes workflow plans dynamically

**Key Functions:**
- `executeWorkflowPlan()` - Runs agents according to orchestrator's plan
- `executeAgent()` - Executes single agent with specified depth
- `applyAgentResultToProject()` - Updates project with agent outputs

**Features:**
- Dynamic agent execution (not hardcoded pipeline)
- Depth-aware processing (quick_pass/standard/deep_dive)
- Checkpoint system for user approval
- Error handling and recovery

#### 3. [ProducerChat.tsx](components/ProducerChat.tsx)
**Purpose**: Conversational UI for interacting with orchestrator

**Features:**
- Chat-like producer interaction
- Asks clarifying questions about project
- Shows workflow plan before execution
- Markdown rendering for rich responses
- Floating toggle button
- Real-time status updates

---

## How It Works

### 1. User Opens Project
When a new project starts (no structure yet), a floating purple "Chat with Producer" button appears in bottom-right corner.

### 2. Conversational Discovery
User clicks button and chats with the producer:

**Producer asks:**
```
"Hey! I'm your production coordinator. I see you're working on New Project (narrative mode).

Before we dive into execution, let me understand your goals:
- What's the target length and scope?
- Is this a draft/test or a polished deliverable?
- Any time constraints or priorities?
```

**User responds:**
```
"Quick 30-second character test for Sam. Just want to see
how he looks in different poses. Nothing polished."
```

### 3. Intelligent Analysis
Orchestrator analyzes input and generates:
- **Insights**: Scale (micro), budget (experimental), style (rough_cut), urgency (exploratory)
- **Workflow Plan**: Skip scriptwriter, quick_pass world_builder, standard director, skip QC
- **Reasoning**: "For a character test, we don't need story—just visual exploration"

### 4. Plan Presentation
Producer shows the plan:
```
## Project Profile:
- Scale: micro
- Style: rough_cut
- Budget: experimental
- Urgency: exploratory

## Workflow Plan:

Phase 1: Character Setup
  - world_builder (quick_pass) - Generate simple backdrop options
  - director (standard) - Plan pose variations

Phase 2: Execution
  - cinematographer (standard) - Generate test shots

Estimated Complexity: Low

Recommendations:
- Focus on pose variety over polish
- Use simple backgrounds to emphasize character
- Generate multiple quick iterations

Ready to execute this plan? Type "let's go" to start!
```

### 5. Execution
User approves → orchestrator executes plan → agents run at specified depths → results flow back to project.

**Different Project = Different Workflow:**

**Example: "3-minute client pitch video"**
→ Scale: short, Budget: premium, Style: polished
→ Workflow: standard scriptwriter, deep_dive director, deep_dive quality_control

**Example: "Quick social media test"**
→ Scale: micro, Budget: experimental, Style: rough_cut
→ Workflow: skip scriptwriter, quick_pass photographer, standard cinematographer

---

## Depth Levels

The orchestrator assigns **depth levels** to each agent based on project needs:

### Quick Pass
- **Use**: Tests, drafts, rapid iteration
- **Modifier**: "Focus on speed and essential elements only. Keep analysis brief."
- **Example**: Character reference test

### Standard
- **Use**: Most projects, balanced quality/speed
- **Modifier**: "Provide balanced analysis with good detail and creative insight."
- **Example**: Standard episode production

### Deep Dive
- **Use**: Client deliverables, critical work, complex projects
- **Modifier**: "Provide exhaustive analysis with maximum detail, multiple options, comprehensive exploration."
- **Example**: Festival submission, client pitch

---

## Integration Points

### App.tsx
```typescript
// State
const [isProducerChatOpen, setIsProducerChatOpen] = useState(false);
const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

// Handler
const handleWorkflowPlanGenerated = async (plan: WorkflowPlan, insights: ProjectInsights) => {
  // Save orchestrator context to project
  updateProject({ orchestratorContext: { insights, workflowPlan: plan, ... }});

  // Execute workflow
  const result = await executeWorkflowPlan(plan, insights, currentProject, ...);

  // Update project with results
  if (result.success) {
    updateProject(result.finalProject);
    setActiveTab('board');
  }
};

// Render
{currentProject && !currentProject.structure && step === GenerationStep.IDLE && (
  <ProducerChat
    project={currentProject}
    onWorkflowPlanGenerated={handleWorkflowPlanGenerated}
    isOpen={isProducerChatOpen}
    onToggle={() => setIsProducerChatOpen(!isProducerChatOpen)}
  />
)}
```

### types.ts
Added `OrchestratorProjectContext` interface to `Project` type for persisting:
- Insights (project analysis)
- Workflow plan (agent routing)
- Conversation history (producer chat)
- Execution state (current progress)

---

## Future Enhancements

### Phase 2 Features (Not Yet Implemented)
1. **Interactive Checkpoints**: Modal UI for manual approval at checkpoints
2. **Real-time Workflow Editing**: User can modify plan mid-execution
3. **Learning from Feedback**: Remember user preferences for similar projects
4. **Team Collaboration**: Multi-user orchestrator conversations
5. **Template Workflows**: Save successful workflows as reusable templates

### Potential Improvements
- **Cost Estimation**: "This workflow will use ~X API calls"
- **Time Estimation**: "Estimated completion: 2-3 minutes"
- **Alternative Plans**: "Here are 3 workflow options—pick one"
- **Rollback**: "Something went wrong at step 3—should I retry or skip?"

---

## Developer Guide

### Adding a New Agent to Workflow Engine

1. **Add agent type** to `GemType` in [types.ts:248](types.ts#L248)
2. **Implement execution** in [workflowEngine.ts:54](services/workflowEngine.ts#L54)
3. **Update orchestrator prompt** in [orchestratorService.ts:29](services/orchestratorService.ts#L29) (list of available agents)
4. **Test with ProducerChat**: Orchestrator will automatically consider new agent

### Testing a Workflow Plan Manually

```typescript
import { executeWorkflowPlan } from './services/workflowEngine';

const testPlan: WorkflowPlan = {
  phases: [{
    name: 'Quick Test',
    agents: [
      { type: 'director', depth: 'quick_pass', reason: 'Testing shots', optional: false }
    ],
    checkpoints: []
  }],
  estimatedComplexity: 'Low',
  recommendations: []
};

const result = await executeWorkflowPlan(
  testPlan,
  insights,
  project,
  (step) => console.log('Step:', step),
  (phase) => console.log('Phase done:', phase),
  async (checkpoint) => true // Auto-approve
);
```

---

## Troubleshooting

### Producer chat not appearing
- **Check**: Is `currentProject.structure` null? (Chat only shows for new projects)
- **Check**: Is `step === GenerationStep.IDLE`? (Chat hides during generation)

### Workflow execution fails
- **Check**: Do all required gems exist in `project.gems`?
- **Check**: Are API keys configured? (`process.env.API_KEY`)
- **Check**: Console logs for agent-specific errors

### Orchestrator gives irrelevant plan
- **Solution**: Refine the `META_ORCHESTRATOR_PROMPT` in [orchestratorService.ts:29](services/orchestratorService.ts#L29)
- **Debug**: Log `analyzeProjectContext()` response to see AI reasoning

---

## Success Metrics

**Before META-ORCHESTRATOR:**
- Every project took same path
- Users couldn't influence workflow
- No adaptation to context

**After META-ORCHESTRATOR:**
- ✅ Context-aware routing
- ✅ Conversational collaboration
- ✅ Variable depth processing
- ✅ Efficient workflows (skip unnecessary steps)
- ✅ Producer-style decision making

---

## Credits

**Design Pattern**: Producer-as-AI-Orchestrator
**Model**: Gemini 2.0 Flash Experimental
**Architecture**: Adaptive workflow routing with conversational interface

---

**Last Updated**: November 24, 2025
**Status**: ✅ Production-ready (Phase 1 complete)
