import { Instruction } from '../types/PipelineTypes';
import { SUPERSCALAR_LIMITS } from '../constants/PipelineConstants';

export function countSuperscalarStallsAndBubbles(instructions: Instruction[], forwardingEnabled: boolean) {
    let currentStalls = 0;
    let currentBubbles = 0;

    const deStage = instructions.filter(inst => inst.stage === 'DE');
    const exStage = instructions.filter(inst => inst.stage === 'EX');
    const ifStage = instructions.filter(inst => inst.stage === 'IF');

    deStage.forEach(inst => {
        let isStalled = false;

        if (!forwardingEnabled && inst.dependencies && inst.dependencies?.length > 0) {
            currentStalls++;
            isStalled = true;
        }

        if (exStage.length >= SUPERSCALAR_LIMITS.EX) {
            currentStalls++;
            isStalled = true;
        }

        if (inst.resourceUnit) {
            const resourceUsage = exStage.filter(ex => ex.resourceUnit === inst.resourceUnit).length;
            const resourceLimit = inst.resourceUnit.includes('ALU') ? 2 : 1;
            if (resourceUsage >= resourceLimit) {
                currentStalls++;
                isStalled = true;
            }
        }

        if (isStalled) {
            currentBubbles += ifStage.length;
        }
    });

    return { currentStalls, currentBubbles };
}
