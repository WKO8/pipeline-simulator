"use client";
import { createContext, useContext, useRef, useState } from "react";
import { 
    Instruction, 
    PipelineMetrics
} from '../types/PipelineTypes';
import { assignResourceUnit, detectDependencies } from '../utils/PipelineUtils';
import { useForwarding } from './ForwardingContext';
import { ThreadContext } from "@/types/ThreadContext";

interface PipelineContextType {
    instructions: Instruction[];
    readyQueue: Instruction[];
    addInstruction: (instruction: Instruction) => void;
    clearInstructions: () => void;
    clockCycle: () => void;
    pipelineType: 'escalar' | 'superescalar';
    setPipelineType: (type: 'escalar' | 'superescalar') => void;
    setMultiThreadingType: (type: 'none' | 'IMT' | 'BMT' | 'SMT') => void;
    metrics: PipelineMetrics;
    clearMetrics: () => void;
    forwardingEnabled: boolean;
    setForwardingEnabled: (enabled: boolean) => void;
    threads: ThreadContext[];
    addThread: (instructions: Instruction[]) => void;
}

export const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const usePipelineContext = () => {
    const context = useContext(PipelineContext);
    if (!context) throw new Error('usePipelineContext must be used within PipelineProvider');
    return context;
}

export const PipelineProvider = ({ children }: { children: React.ReactNode }) => {
    const [scalarInstructions, setScalarInstructions] = useState<Instruction[]>([]);
    const [superscalarInstructions, setSuperscalarInstructions] = useState<Instruction[]>([]);
    const [scalarReadyQueue, setScalarReadyQueue] = useState<Instruction[]>([]);
    const [superscalarReadyQueue, setSuperscalarReadyQueue] = useState<Instruction[]>([]);
    const [pipelineType, setPipelineType] = useState<'escalar' | 'superescalar'>('escalar');
    const [multiThreadingType, setMultiThreadingType] = useState<'none' | 'IMT' | 'BMT' | 'SMT'>('none');
    const { forwardingEnabled, setForwardingEnabled } = useForwarding();
    const [totalInstructions, setTotalInstructions] = useState(0);
    const [threads, setThreads] = useState<ThreadContext[]>([]);
    const [totalBubbleCycles, setTotalBubbleCycles] = useState(0);


    const cycleCount = useRef(0);

    const [metrics, setMetrics] = useState<PipelineMetrics>({
        totalCycles: 0,
        completedInstructions: 0,
        bubbleCycles: 0,
        resourceUtilization: {
            IF: 0,
            DE: 0,
            EXE: 0,
            MEM: 0,
            WB: 0
        }
    });

    const clearMetrics = () => {
        setMetrics({
            totalCycles: 0,
            completedInstructions: 0,
            bubbleCycles: 0,
            resourceUtilization: {
                IF: 0,
                DE: 0,
                EXE: 0,
                MEM: 0,
                WB: 0
            }
        });
        setTotalBubbleCycles(0);
        cycleCount.current = 0;
    };

    const addInstruction = (newInstruction: Instruction) => {
        if (pipelineType === 'escalar') {
            const instWithResource = assignResourceUnit(newInstruction);
            setScalarReadyQueue(prev => [...prev, instWithResource]);
        } else {
            setSuperscalarReadyQueue(prev => [...prev, newInstruction]);
        }
        setTotalInstructions(prev => prev + 1);
    };

    const addThread = (instructions: Instruction[]) => {
        const newThread: ThreadContext = {
            id: threads.length + 1,
            state: 'READY',
            priority: 1,
            registers: {},
            pc: 0,
            instructions,
            metrics: {
                cyclesExecuted: 0,
                instructionsCompleted: 0,
                stallCycles: 0,
                bubbleCycles: 0,
            },
        };
        setThreads(prev => [...prev, newThread]);
    };

    const clockCycle = () => {
        const isPipelineComplete = () => {
            const hasActiveInstructions = pipelineType === 'escalar' ? 
                scalarInstructions.length > 0 || scalarReadyQueue.length > 0 :
                superscalarInstructions.length > 0 || superscalarReadyQueue.length > 0;
            return !hasActiveInstructions;
        };
    
        if (isPipelineComplete()) {
            return;
        }
    
        cycleCount.current++;
    
        if (pipelineType === 'escalar') {
            setScalarInstructions(prev => {
                const completedInstructions = prev.filter(inst => inst.stage === 'WB');
                const withoutCompletedInstructions = prev.filter(inst => inst.stage !== 'WB');

                // Track stage occupancy
                const stageOccupancy = {
                    IF: withoutCompletedInstructions.filter(i => i.stage === 'IF').length,
                    DE: withoutCompletedInstructions.filter(i => i.stage === 'DE').length,
                    EXE: withoutCompletedInstructions.filter(i => i.stage === 'EXE').length,
                    MEM: withoutCompletedInstructions.filter(i => i.stage === 'MEM').length,
                    WB: withoutCompletedInstructions.filter(i => i.stage === 'WB').length
                };

                const stagePriority: { [key in Instruction['stage']]: number } = { 'WB': 0, 'MEM': 1, 'EXE': 2, 'DE': 3, 'IF': 4 };
                const processedInstructions: Instruction[] = [];

                const updatedInstructions = [...withoutCompletedInstructions]
                .sort((a, b) => stagePriority[a.stage] - stagePriority[b.stage])
                .map(inst => {
                    const currentStages = processedInstructions.map(i => i.stage);

                    // Handle WB stage
                    if (inst.stage === 'WB') {
                        return inst;
                    }

                    // Handle MEM stage
                    if (inst.stage === 'MEM') {
                        return {
                            ...inst,
                            stage: 'WB' as const
                        };
                    }

                    // Handle EXE stage
                    if (inst.stage === 'EXE') {
                        const memInst = withoutCompletedInstructions.find(i => i.stage === 'MEM');
                        const wbInst = withoutCompletedInstructions.filter(i => i.stage === 'WB');
                        const nextStage = ['LW', 'SW', 'DIV', 'MUL'].includes(inst.value) ? 'MEM' : 'WB';
                        const canAdvance = nextStage === 'MEM' 
                            ? true 
                            : !wbInst.length && !memInst;

                        if (!currentStages.includes(nextStage) && canAdvance) {
                            return {
                                ...inst,
                                stage: nextStage as Instruction['stage'],
                                remainingLatency: 0
                            };
                        }
                    }

                    // Handle DE stage
                    if (inst.stage === 'DE') {
                        const memInst = withoutCompletedInstructions.find(i => i.stage === 'MEM');
                        const deps = detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled);
                        const exInst = withoutCompletedInstructions.find(i => i.stage === 'EXE');

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.stage === 'WB';
                        });

                        const canForward = forwardingEnabled &&
                            (exInst &&
                            deps.includes(exInst.value) &&
                            ["ADD", "SUB"].includes(exInst.value))
                            || forwardingEnabled && 
                            (memInst && 
                            deps.includes(memInst.value) &&
                            ["LW"].includes(memInst.value));

                        const canMove = (dependenciesResolved || canForward) &&
                            !currentStages.includes('EXE') &&
                            (!exInst || exInst?.remainingLatency === 1);

                        if (canMove) {
                            return {
                                ...inst,
                                stage: 'EXE' as const,
                                remainingLatency: inst.latency,
                                dependencies: []
                            };
                        }
                        return { ...inst, dependencies: deps };
                    }

                    // Handle IF stage
                    if (inst.stage === 'IF') {
                        const deStageInsts = withoutCompletedInstructions.filter(i => i.stage === 'DE');

                        const canAdvance = !deStageInsts.length || deStageInsts.every(i => i.dependencies?.length === 0);

                        if (canAdvance) {
                            return {
                                ...inst,
                                stage: 'DE' as const,
                                dependencies: detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled)
                            };
                        }
                    }

                    // Check if any instruction in DE can move to EXE
                    const deInsts = withoutCompletedInstructions.filter(i => i.stage === 'DE');
                    let ifInstToAdvance: Instruction | undefined = undefined;

                    ifInstToAdvance = withoutCompletedInstructions.find(i => i.stage === 'IF');

                    deInsts.forEach(deInst => {
                        const memInst = withoutCompletedInstructions.find(i => i.stage === 'MEM');
                        const deps = detectDependencies(deInst, withoutCompletedInstructions, forwardingEnabled);
                        const exInst = withoutCompletedInstructions.find(i => i.stage === 'EXE');

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.stage === 'WB';
                        });

                        const canForward = forwardingEnabled &&
                            (exInst &&
                            deps.includes(exInst.value) &&
                            ["ADD", "SUB"].includes(exInst.value))
                            || forwardingEnabled && 
                            (memInst && 
                            deps.includes(memInst.value) &&
                            ["LW"].includes(memInst.value));

                        const canMove = (
                            dependenciesResolved || canForward) &&
                            !currentStages.includes('EXE') &&
                            (!exInst || exInst?.remainingLatency === 1);

                        if (canMove) {
                            // Move the instruction in IF to DE immediately
                            ifInstToAdvance = withoutCompletedInstructions.find(i => i.stage === 'IF');
                        } else {
                            ifInstToAdvance = undefined;
                        }
                    });

                    // If we found an IF instruction to advance, return it
                    // Check if we found an IF instruction to advance
                    if (ifInstToAdvance) {
                        return {
                            ...ifInstToAdvance,
                            stage: 'DE' as const,
                            dependencies: detectDependencies(ifInstToAdvance, withoutCompletedInstructions, forwardingEnabled)
                        };
                    }

                    processedInstructions.push(inst);
                    return inst;
                });

                // Update metrics
                setMetrics(prev => ({
                    totalCycles: cycleCount.current,
                    completedInstructions: prev.completedInstructions + completedInstructions.length,
                    bubbleCycles: totalBubbleCycles,
                    resourceUtilization: {
                        IF: prev.resourceUtilization.IF + (stageOccupancy.IF > 0 ? 1 : 0),
                        DE: prev.resourceUtilization.DE + (stageOccupancy.DE > 0 ? 1 : 0),
                        EXE: prev.resourceUtilization.EXE + (stageOccupancy.EXE > 0 ? 1 : 0),
                        MEM: prev.resourceUtilization.MEM + (stageOccupancy.MEM > 0 ? 1 : 0),
                        WB: prev.resourceUtilization.WB + (completedInstructions.length > 0 ? 1 : 0)
                    }
                }));

                // Fetch new instruction if possible
                const hasInstructionInIF = updatedInstructions.some(inst => inst.stage === 'IF');
                if (!hasInstructionInIF && scalarReadyQueue.length > 0) {
                    const [nextInst, ...remainingQueue] = scalarReadyQueue;
                    const instWithResource = assignResourceUnit(nextInst);
                    const newInst: Instruction = {
                        ...instWithResource,
                        color: multiThreadingType === "IMT" ? scalarReadyQueue.length % 2 === 0 ? '#000000' : '#ffffff' : instWithResource.color,
                        stage: 'IF'
                    };
                    setScalarReadyQueue(remainingQueue);
                    return [...updatedInstructions, newInst];
                }

                return updatedInstructions;
            });
        } else {
            console.log(multiThreadingType);
            switch (multiThreadingType) {
                case "none":
                    superScalarWithoutMultithreading();
                case "IMT":
                    superScalarWithIMT();
                case "SMT":
                    superScalarWithSMT();
                case "BMT":
                    superScalarWithBMT();
                default:
                    break;
            }
           
        }
    };

    const superScalarWithoutMultithreading = () => {
         // Lógica para o pipeline superscalar
         let currentInstructions: Instruction[] = [];
            
         // Definindo as instruções e seus estados para cada ciclo
         const instructionsCycle1 = [
             {
                 value: "1",
                 type: "RR",
                 color: "#302a2a",
                 cycle: 0,
                 resourceUnit: "Ciclo" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 0, value: 0 },
                 sourceReg2: { number: 0, value: 0 },
                 destReg: { number: 0, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "ADD",
                 type: "RR",
                 color: "#4f793b",
                 cycle: 0,
                 resourceUnit: "ALU1" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 2, value: 0 },
                 sourceReg2: { number: 3, value: 0 },
                 destReg: { number: 1, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "ADD",
                 type: "RR",
                 color: "#616ea5",
                 cycle: 0,
                 resourceUnit: "ALU2" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 4, value: 0 },
                 sourceReg2: { number: 6, value: 0 },
                 destReg: { number: 11, value: 0 },
                 remainingLatency: 1
             },
             {
               value: "MUL",
               type: "RI",
               color: "#286aa8",
               cycle: 0,
               resourceUnit: "MUL" as const,
               latency: 1,
               stage: "EXE" as const,
               sourceReg1: { number: 4, value: 0 },
               sourceReg2: { number: 8, value: 0 },
               destReg: { number: 7, value: 0 },
               remainingLatency: 1
             },
             {
               value: "LW",
               type: "RM",
               color: "#44536e",
               cycle: 0,
               resourceUnit: "LSU" as const,
               latency: 1,
               stage: "EXE" as const,
               sourceReg1: { number: 20, value: 0 },
               sourceReg2: { number: 5, value: 0 },
               destReg: { number: 10, value: 0 },
               remainingLatency: 1
             }
         ];

         const instructionsCycle2 = [
             {
                 value: "2",
                 type: "RR",
                 color: "#302a2a",
                 cycle: 0,
                 resourceUnit: "Ciclo" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 0, value: 0 },
                 sourceReg2: { number: 0, value: 0 },
                 destReg: { number: 0, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "ADD",
                 type: "RR",
                 color: "#af6533",
                 cycle: 0,
                 resourceUnit: "ALU1" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 1, value: 0 },
                 sourceReg2: { number: 6, value: 0 },
                 destReg: { number: 5, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "MUL",
                 type: "RI",
                 color: "#286aa8",
                 cycle: 0,
                 resourceUnit: "MUL" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 4, value: 0 },
                 sourceReg2: { number: 8, value: 0 },
                 destReg: { number: 7, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "LW",
                 type: "RM",
                 color: "#44536e",
                 cycle: 0,
                 resourceUnit: "LSU" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 12, value: 0 },
                 sourceReg2: { number: 5, value: 0 },
                 destReg: { number: 10, value: 0 },
                 remainingLatency: 1
             }
         ];

         const instructionsCycle3 = [
             {
                 value: "3",
                 type: "RR",
                 color: "#302a2a",
                 cycle: 0,
                 resourceUnit: "Ciclo" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 0, value: 0 },
                 sourceReg2: { number: 0, value: 0 },
                 destReg: { number: 0, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "ADD",
                 type: "RR",
                 color: "#972a8e",
                 cycle: 0,
                 resourceUnit: "ALU1" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 4, value: 0 },
                 sourceReg2: { number: 10, value: 0 },
                 destReg: { number: 9, value: 0 },
                 remainingLatency: 1
             },
             {
                 value: "ADD",
                 type: "RR",
                 color: "#503b2d",
                 cycle: 0,
                 resourceUnit: "ALU2" as const,
                 latency: 1,
                 stage: "EXE" as const,
                 sourceReg1: { number: 7, value: 0 },
                 sourceReg2: { number: 3, value: 0 },
                 destReg: { number: 2, value: 0 },
                 remainingLatency: 1
             }
         ];

         // Seleciona as instruções com base no ciclo atual
         switch (cycleCount.current) {
             case 1:
                 currentInstructions = instructionsCycle1;
                 break;
             case 2:
                 currentInstructions = instructionsCycle2;
                 break;
             case 3:
                 currentInstructions = instructionsCycle3;
                 break;
             case 4:
                 currentInstructions = instructionsCycle3;
                 break;
             default:
                 return;
         }

         setSuperscalarReadyQueue(
             superscalarReadyQueue.filter(
                 inst => !currentInstructions.some(curr => curr.value === inst.value)
             )
         );
         // Atualiza o estado das instruções no contexto
         setSuperscalarInstructions(currentInstructions);

         setTotalInstructions(7);

         // Atualiza as métricas
         if (cycleCount.current !== 4) {
             setMetrics(prevMetrics => ({
                 ...prevMetrics,
                 totalCycles: prevMetrics.totalCycles + 1,
                 completedInstructions: totalInstructions,
                 bubbleCycles: 0 // Incrementa bubbles se não for o primeiro ciclo
             }));
         }
         // Limpa o layout após o terceiro ciclo
         if (cycleCount.current === 4) {
             clearInstructions(); // Limpa as instruções do layout
             cycleCount.current = 0; // Reseta o contador de ciclos
             return; // Para a contagem de ciclos
         }
    }

    const superScalarWithIMT = () => {
        // Lógica para o pipeline superscalar
        let currentInstructions: Instruction[] = [];
            
        // Definindo as instruções e seus estados para cada ciclo
        const instructionsCycle1 = [
            {
                value: "1",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 2, value: 0 },
                sourceReg2: { number: 3, value: 0 },
                destReg: { number: 1, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 11, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle2 = [
            {
                value: "2",
                type: "RR",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "MUL",
                type: "RI",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 8, value: 0 },
                destReg: { number: 7, value: 0 },
                remainingLatency: 1
            },
            {
                value: "LW",
                type: "RM",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 12, value: 0 },
                sourceReg2: { number: 5, value: 0 },
                destReg: { number: 10, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle3 = [
            {
                value: "3",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 1, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 5, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle4 = [
            {
                value: "4",
                type: "RR",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "MUL",
                type: "RI",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 8, value: 0 },
                destReg: { number: 7, value: 0 },
                remainingLatency: 1
            },
            {
                value: "LW",
                type: "RM",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 12, value: 0 },
                sourceReg2: { number: 5, value: 0 },
                destReg: { number: 10, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle5 = [
            {
                value: "5",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#880d0d",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 7, value: 0 },
                sourceReg2: { number: 3, value: 0 },
                destReg: { number: 2, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle6 = [
            {
                value: "6",
                type: "RR",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#11114e",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 10, value: 0 },
                destReg: { number: 9, value: 0 },
                remainingLatency: 1
            }
        ]

        // Seleciona as instruções com base no ciclo atual
        switch (cycleCount.current) {
            case 1:
                currentInstructions = instructionsCycle1;
                break;
            case 2:
                currentInstructions = instructionsCycle2;
                break;
            case 3:
                currentInstructions = instructionsCycle3;
                break;
            case 4:
                currentInstructions = instructionsCycle4;
                break;
            case 5:
                currentInstructions = instructionsCycle5;
                break;
            case 6:
                currentInstructions = instructionsCycle6;
                break;
            default:
                return;
        }

        setSuperscalarReadyQueue(
            superscalarReadyQueue.filter(
                inst => !currentInstructions.some(curr => curr.value === inst.value)
            )
        );
        // Atualiza o estado das instruções no contexto
        setSuperscalarInstructions(currentInstructions);

        setTotalInstructions(7);

        // Atualiza as métricas
        if (cycleCount.current !== 6) {
            setMetrics(prevMetrics => ({
                ...prevMetrics,
                totalCycles: prevMetrics.totalCycles + 1,
                completedInstructions: totalInstructions,
                bubbleCycles: 0 // Incrementa bubbles se não for o primeiro ciclo
            }));
        }
        // Limpa o layout após o sexto ciclo
        if (cycleCount.current === 6) {
            clearInstructions(); // Limpa as instruções do layout
            cycleCount.current = 0; // Reseta o contador de ciclos
            return; // Para a contagem de ciclos
        }
    }

    const superScalarWithBMT = () => {
        
    }

    const superScalarWithSMT = () => {
        
    }

    const clearInstructions = () => {
        if (pipelineType === 'escalar') {
            setScalarInstructions([]);
            setScalarReadyQueue([]);
        } else {
            setSuperscalarInstructions([]);
            setSuperscalarReadyQueue([]);
        }
    }

    return (
        <PipelineContext.Provider value={{ 
            instructions: pipelineType === 'escalar' ? scalarInstructions : superscalarInstructions,
            readyQueue: pipelineType === 'escalar' ? scalarReadyQueue : superscalarReadyQueue,
            addInstruction, 
            clearInstructions,
            clockCycle,
            pipelineType,
            setPipelineType,
            setMultiThreadingType,
            metrics,
            clearMetrics,
            forwardingEnabled,
            setForwardingEnabled,
            threads,
            addThread,
        }}>
            {children}
        </PipelineContext.Provider>
    );
}
