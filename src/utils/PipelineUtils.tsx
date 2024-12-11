import { Instruction } from '../types/PipelineTypes';

export function detectDependencies(newInst: Instruction, activeInstructions: Instruction[], forwardingEnabled: boolean): string[] {
    if (["ADD, SUB"].includes(newInst.value)) newInst.type = "RR";
    else if (["MUL", "DIV"].includes(newInst.value)) newInst.type = "RI";
    else if (["LW", "SW"].includes(newInst.value)) newInst.type = "RM";
    else newInst.type = "B";

    const dependencies: string[] = [];
    
    activeInstructions.forEach(activeInst => {
        if (!activeInst.destReg) return;

        const hasSourceReg1Dependency = newInst.sourceReg1 && 
            newInst.sourceReg1.number === activeInst.destReg.number;
        const hasSourceReg2Dependency = newInst.sourceReg2 && 
            newInst.sourceReg2.number === activeInst.destReg.number;

        // Only add as dependency if not forwardable
         if (hasSourceReg1Dependency || hasSourceReg2Dependency) {
            // Only allow forwarding for RR instructions from EX stage
            const canForward = forwardingEnabled && 
                             activeInst.stage === 'EXE' && 
                             ["ADD", "SUB"].includes(activeInst.value);
                             
            // Always stall for LW dependencies
            const isLoadDependency = activeInst.value === "LW";

            if (isLoadDependency || !canForward) {
                dependencies.push(activeInst.value);
            }
        }
    });
    
    return dependencies;
}

export function assignResourceUnit(instruction: Instruction): Instruction {
    switch(instruction.value) {
        case 'MUL':
        case 'DIV':
            return { 
                ...instruction, 
                resourceUnit: 'MUL',
            };
        case 'LW':
        case 'SW':
            return { 
                ...instruction, 
                resourceUnit: 'LSU',
            };
        default:
            return { 
                ...instruction, 
                resourceUnit: 'ALU',
            };
    }
}