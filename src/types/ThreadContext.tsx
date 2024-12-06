import type { Instruction } from '../contexts/PipelineContext';

export interface ThreadContext {
    id: number;
    state: 'READY' | 'RUNNING' | 'BLOCKED' | 'COMPLETED';
    priority: number;
    registers: {
        [key: number]: number;  // RISC-V register file
    };
    pc: number;                 // Program Counter
    instructions: Instruction[];
    metrics: {
        cyclesExecuted: number;
        instructionsCompleted: number;
        stallCycles: number;
        bubbleCycles: number;
    };
}