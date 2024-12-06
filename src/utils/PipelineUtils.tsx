import { Instruction } from '../types/PipelineTypes';

export function detectDependencies(newInst: Instruction, activeInstructions: Instruction[], forwardingEnabled: boolean): string[] {
    const dependencies: string[] = [];
    
    activeInstructions.forEach(activeInst => {
        if (!activeInst.destReg) return;

        const hasSourceReg1Dependency = newInst.sourceReg1 && 
            newInst.sourceReg1.number === activeInst.destReg.number;
        const hasSourceReg2Dependency = newInst.sourceReg2 && 
            newInst.sourceReg2.number === activeInst.destReg.number;

        // Only add as dependency if not forwardable
        if (hasSourceReg1Dependency || hasSourceReg2Dependency) {
            if (!forwardingEnabled || 
                (activeInst.stage !== 'EX' && activeInst.stage !== 'MEM')) {
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
                resourceUnit: Math.random() < 0.5 ? 'ALU1' : 'ALU2',
                latency: 4,
                remainingLatency: 4 
            };
        case 'LW':
        case 'SW':
            return { 
                ...instruction, 
                resourceUnit: 'LSU',
                latency: 3,
                remainingLatency: 3 
            };
        case 'BEQ':
        case 'BNE':
        case 'BLT':
        case 'BGE':
        case 'JAL':
            return {
                ...instruction,
                resourceUnit: 'BRU',
                latency: 2,
                remainingLatency: 2
            };
        default:
            return { 
                ...instruction, 
                resourceUnit: Math.random() < 0.5 ? 'ALU1' : 'ALU2',
                latency: 1,
                remainingLatency: 1 
            };
    }
}