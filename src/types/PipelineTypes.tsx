export interface Register {
    number: number;
    value: number;
}

export type ThreadingMode = 'NONE' | 'IMT' | 'SMT' | 'BMT';

export interface ForwardingPath {
    sourceStage: 'EX' | 'MEM' | 'WB';
    register: number;
    value: number;
}

export interface Instruction {
    value: string;
    color: string;
    type: string;
    stage: 'IF' | 'DE' | 'EXE' | 'MEM' | 'WB';
    resourceUnit?: 'ALU1' | 'ALU2' | 'LSU' | 'BRU';
    sourceReg1?: Register;
    sourceReg2?: Register;
    destReg?: Register;
    dependencies?: string[];
    latency: number;
    remainingLatency: number;
}

export interface PipelineMetrics {
    totalCycles: number;
    completedInstructions: number;
    stallCycles: number;
    bubbleCycles: number;
    resourceUtilization: {
        IF: number;
        DE: number;
        EXE: number;
        MEM: number;
        WB: number;
    };
}
