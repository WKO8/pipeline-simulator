"use client";
import { usePipelineContext } from "@/contexts/PipelineContext";
import type { Instruction } from "@/contexts/PipelineContext";

export const SimulationControls = () => {
    const { 
        threadingMode, 
        setThreadingMode, 
        clockCycle,
        addThread,
        clearInstructions,
        clearMetrics
    } = usePipelineContext();

    const handleAddTestThreads = () => {
        const thread1Instructions: Instruction[] = [
            {
                value: 'ADD',
                color: '#FF0000',
                stage: 'IF' as const,
                sourceReg1: { number: 1, value: 10 },
                sourceReg2: { number: 2, value: 20 },
                destReg: { number: 3, value: 0 },
                latency: 1,
                remainingLatency: 1
            },
            {
                value: 'MUL',
                color: '#FF0000',
                stage: 'IF' as const,
                sourceReg1: { number: 3, value: 0 },
                sourceReg2: { number: 4, value: 5 },
                destReg: { number: 5, value: 0 },
                latency: 4,
                remainingLatency: 4
            }
        ];

        const thread2Instructions: Instruction[] = [
            {
                value: 'SUB',
                color: '#00FF00',
                stage: 'IF' as const,
                sourceReg1: { number: 6, value: 15 },
                sourceReg2: { number: 7, value: 8 },
                destReg: { number: 8, value: 0 },
                latency: 1,
                remainingLatency: 1
            },
            {
                value: 'DIV',
                color: '#00FF00',
                stage: 'IF' as const,
                sourceReg1: { number: 8, value: 0 },
                sourceReg2: { number: 9, value: 2 },
                destReg: { number: 10, value: 0 },
                latency: 4,
                remainingLatency: 4
            }
        ];

        addThread(thread1Instructions);
        addThread(thread2Instructions);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button 
                    onClick={() => setThreadingMode('IMT')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                    Enable IMT
                </button>
                <button 
                    onClick={clockCycle}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded"
                >
                    Step
                </button>
                <button 
                    onClick={handleAddTestThreads}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded"
                >
                    Add Test Threads
                </button>
                <button 
                    onClick={() => {
                        clearInstructions();
                        clearMetrics();
                    }}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded"
                >
                    Reset
                </button>
            </div>
            
            <div className="text-sm text-muted-foreground">
                Current Mode: {threadingMode}
            </div>
        </div>
    );
};
