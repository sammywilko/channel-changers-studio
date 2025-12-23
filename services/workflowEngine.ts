/**
 * ADAPTIVE WORKFLOW ENGINE
 *
 * Executes workflows dynamically based on META-ORCHESTRATOR decisions.
 * Routes through agents intelligently rather than following a rigid pipeline.
 */

import { Project, GemType, GenerationStep } from '../types';
import {
  generateScript,
  extractWorldData,
  generateDirectorBreakdown,
  generateProductShotList,
  enhanceBrief
} from './geminiService';
import { WorkflowPlan, ProjectInsights, WorkflowAction } from './orchestratorService';

export interface WorkflowExecutionState {
  currentPhaseIndex: number;
  currentAgentIndex: number;
  completedAgents: GemType[];
  results: Map<GemType, any>;
  checkpointsPassed: string[];
  requiresUserApproval: boolean;
  error: string | null;
}

export interface WorkflowStepResult {
  agent: GemType;
  success: boolean;
  output: any;
  error?: string;
  requiresApproval?: boolean;
  message?: string;
}

/**
 * Execute a single agent with specified depth
 */
const executeAgent = async (
  agent: GemType,
  depth: 'quick_pass' | 'standard' | 'deep_dive',
  project: Project,
  previousResults: Map<GemType, any>
): Promise<WorkflowStepResult> => {
  try {
    console.log(`🎬 Executing ${agent} at ${depth} depth...`);

    // Modify prompts or parameters based on depth
    const depthModifier = getDepthModifier(depth);

    let output: any;

    switch (agent) {
      case 'scriptwriter':
        const scriptGem = project.gems.find(g => g.type === 'scriptwriter');
        if (!scriptGem) throw new Error('Scriptwriter gem not found');

        output = await generateScript(
          project.idea,
          scriptGem.systemInstruction + '\n\n' + depthModifier
        );
        return {
          agent: 'scriptwriter',
          success: true,
          output,
          requiresApproval: depth === 'deep_dive', // Deep dive needs review
          message: `Script generated (${depth})`
        };

      case 'world_builder':
        const script = previousResults.get('scriptwriter') || project.script;
        if (!script) {
          throw new Error('World builder requires script');
        }
        const worldGem = project.gems.find(g => g.type === 'world_builder');
        if (!worldGem) throw new Error('World builder gem not found');

        output = await extractWorldData(
          script,
          worldGem.systemInstruction + '\n\n' + depthModifier
        );
        return {
          agent: 'world_builder',
          success: true,
          output,
          message: `World analysis complete (${depth})`
        };

      case 'director':
        const worldData = previousResults.get('world_builder');
        const scriptToUse = previousResults.get('scriptwriter') || project.script;
        if (!scriptToUse) {
          throw new Error('Director requires script');
        }
        const directorGem = project.gems.find(g => g.type === 'director');
        if (!directorGem) throw new Error('Director gem not found');

        output = await generateDirectorBreakdown(
          scriptToUse,
          directorGem.systemInstruction + '\n\n' + depthModifier
        );
        return {
          agent: 'director',
          success: true,
          output,
          requiresApproval: depth !== 'quick_pass', // Quick pass auto-approves
          message: `Shot breakdown complete (${depth})`
        };

      case 'photographer':
        if (project.type !== 'product') {
          return {
            agent: 'photographer',
            success: true,
            output: null,
            message: 'Photographer skipped (narrative mode)'
          };
        }
        const photographerGem = project.gems.find(g => g.type === 'photographer' || g.type === 'creative_director');
        if (!photographerGem) throw new Error('Photographer gem not found');

        output = await generateProductShotList(
          project.productBrief || '',
          photographerGem.systemInstruction + '\n\n' + depthModifier
        );
        return {
          agent: 'photographer',
          success: true,
          output,
          message: `Shot list created (${depth})`
        };

      case 'cinematographer':
        // Cinematographer is handled per-shot, not at workflow level
        return {
          agent: 'cinematographer',
          success: true,
          output: null,
          message: 'Ready for shot generation'
        };

      case 'quality_control':
        // QC is handled after shots are generated
        return {
          agent: 'quality_control',
          success: true,
          output: null,
          message: 'QC checkpoint established'
        };

      case 'creative_director':
        // Creative director provides high-level guidance
        if (depth === 'quick_pass') {
          return {
            agent: 'creative_director',
            success: true,
            output: null,
            message: 'Creative direction: Quick iteration mode'
          };
        }
        // Could add creative direction logic here
        return {
          agent: 'creative_director',
          success: true,
          output: null,
          message: 'Creative direction established'
        };

      case 'stylist':
        if (project.type !== 'product') {
          return {
            agent: 'stylist',
            success: true,
            output: null,
            message: 'Stylist skipped (narrative mode)'
          };
        }
        return {
          agent: 'stylist',
          success: true,
          output: null,
          message: 'Styling notes applied'
        };

      default:
        throw new Error(`Unknown agent: ${agent}`);
    }

  } catch (error) {
    console.error(`❌ Agent ${agent} failed:`, error);
    return {
      agent,
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get depth modifier for AI prompts
 */
const getDepthModifier = (depth: 'quick_pass' | 'standard' | 'deep_dive'): string => {
  switch (depth) {
    case 'quick_pass':
      return 'Focus on speed and essential elements only. Keep analysis brief and actionable.';
    case 'standard':
      return 'Provide balanced analysis with good detail and creative insight.';
    case 'deep_dive':
      return 'Provide exhaustive analysis with maximum detail, multiple options, and comprehensive creative exploration.';
  }
};

/**
 * Execute workflow plan step by step
 */
export const executeWorkflowPlan = async (
  plan: WorkflowPlan,
  insights: ProjectInsights,
  project: Project,
  onStepComplete: (step: WorkflowStepResult) => void,
  onPhaseComplete: (phaseIndex: number) => void,
  onCheckpoint: (checkpoint: string) => Promise<boolean> // Returns true to continue
): Promise<{
  success: boolean;
  finalProject: Project;
  results: Map<GemType, any>;
  error?: string;
}> => {
  const results = new Map<GemType, any>();
  const completedAgents: GemType[] = [];
  let updatedProject = { ...project };

  try {
    // Execute each phase
    for (let phaseIndex = 0; phaseIndex < plan.phases.length; phaseIndex++) {
      const phase = plan.phases[phaseIndex];
      console.log(`\n📋 Starting Phase ${phaseIndex + 1}: ${phase.name}`);

      // Execute each agent in the phase
      for (const agentConfig of phase.agents) {
        // Skip optional agents if quick mode
        if (agentConfig.optional && insights.urgency === 'deadline') {
          console.log(`⏭️  Skipping optional agent: ${agentConfig.type} (deadline mode)`);
          continue;
        }

        // Execute agent
        const stepResult = await executeAgent(
          agentConfig.type,
          agentConfig.depth,
          updatedProject,
          results
        );

        // Store result
        if (stepResult.success && stepResult.output) {
          results.set(agentConfig.type, stepResult.output);
          completedAgents.push(agentConfig.type);

          // Update project with results
          updatedProject = applyAgentResultToProject(
            updatedProject,
            agentConfig.type,
            stepResult.output
          );
        }

        // Notify step completion
        onStepComplete(stepResult);

        // Check if user approval needed
        if (stepResult.requiresApproval) {
          const checkpoint = `${agentConfig.type} completed - review before proceeding`;
          const shouldContinue = await onCheckpoint(checkpoint);
          if (!shouldContinue) {
            return {
              success: false,
              finalProject: updatedProject,
              results,
              error: 'User stopped workflow at checkpoint'
            };
          }
        }

        // Handle errors
        if (!stepResult.success) {
          throw new Error(`Agent ${agentConfig.type} failed: ${stepResult.error}`);
        }
      }

      // Phase checkpoint
      if (phase.checkpoints.length > 0) {
        for (const checkpoint of phase.checkpoints) {
          const shouldContinue = await onCheckpoint(checkpoint);
          if (!shouldContinue) {
            return {
              success: false,
              finalProject: updatedProject,
              results,
              error: `User stopped workflow at checkpoint: ${checkpoint}`
            };
          }
        }
      }

      onPhaseComplete(phaseIndex);
    }

    console.log('✅ Workflow execution complete!');
    return {
      success: true,
      finalProject: updatedProject,
      results
    };

  } catch (error) {
    console.error('❌ Workflow execution failed:', error);
    return {
      success: false,
      finalProject: updatedProject,
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Apply agent result to project
 */
const applyAgentResultToProject = (
  project: Project,
  agent: GemType,
  output: any
): Project => {
  const updated = { ...project };

  switch (agent) {
    case 'scriptwriter':
      updated.script = output;
      break;

    case 'world_builder':
      // World data typically includes updated locations/characters
      if (output.locations) updated.locations = output.locations;
      if (output.characters) updated.characters = output.characters;
      break;

    case 'director':
    case 'photographer':
      // These create the episode structure
      updated.structure = output;
      break;
  }

  return updated;
};

/**
 * Generate execution summary
 */
export const generateExecutionSummary = (
  insights: ProjectInsights,
  results: Map<GemType, any>,
  completedAgents: GemType[]
): string => {
  return `
## Workflow Execution Summary

**Project Profile**:
- Scale: ${insights.scale}
- Style: ${insights.style}
- Budget: ${insights.budget}

**Completed Steps**:
${completedAgents.map(agent => `- ✅ ${agent}`).join('\n')}

**Results**:
${Array.from(results.entries())
  .map(([agent, result]) => `- ${agent}: ${typeof result === 'string' ? result.substring(0, 100) + '...' : 'Output generated'}`)
  .join('\n')}
`;
};
