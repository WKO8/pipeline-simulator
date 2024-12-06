"use client";
import { usePipelineContext } from "@/contexts/PipelineContext";
import { type Instruction } from "@/types/PipelineTypes";

const TestIMT = () => {
    const { addThread, setThreadingMode, clockCycle } = usePipelineContext();

    const runTest = () => {
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
            }
        ];

        const thread2Instructions: Instruction[] = [
            {
                value: 'MUL',
                color: '#00FF00',
                stage: 'IF' as const,
                sourceReg1: { number: 4, value: 5 },
                sourceReg2: { number: 5, value: 6 },
                destReg: { number: 6, value: 0 },
                latency: 4,
                remainingLatency: 4
            }
        ];

        addThread(thread1Instructions);
        addThread(thread2Instructions);
        setThreadingMode('IMT');
        setInterval(clockCycle, 1000);
    };

    return (
        <button onClick={runTest} className="px-4 py-2 bg-primary text-primary-foreground rounded">
            Run IMT Test
        </button>
    );
};

export default TestIMT;
