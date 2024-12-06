import { Instruction } from '../types/PipelineTypes';

export function detectDependencies(newInst: Instruction, activeInstructions: Instruction[]): string[] {
    const dependencies: string[] = [];
    
    activeInstructions.forEach(activeInst => {
        if (newInst.sourceReg1?.number === activeInst.destReg?.number ||
            newInst.sourceReg2?.number === activeInst.destReg?.number) {
            dependencies.push(activeInst.value);
        }
        
        if (newInst.destReg?.number === activeInst.destReg?.number) {
            dependencies.push(activeInst.value);
        }
        
        if (newInst.destReg?.number === activeInst.sourceReg1?.number ||
            newInst.destReg?.number === activeInst.sourceReg2?.number) {
            dependencies.push(activeInst.value);
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
