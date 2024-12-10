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
    threadId: number,
    value: string;
    color: string;
    type: string;
    stage: 'IF' | 'DE' | 'EXE' | 'MEM' | 'WB';
    resourceUnit?: 'Ciclo' | 'ALU1' | 'ALU2' | 'MUL' | 'LSU';
    cycle?: number;
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
    bubbleCycles: number;
    resourceUtilization: {
        IF: number;
        DE: number;
        EXE: number;
        MEM: number;
        WB: number;
    };
}
