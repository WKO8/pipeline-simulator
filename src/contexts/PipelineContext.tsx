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
    const [superscalarOrderQueue, setSuperscalarOrderQueue] = useState<Instruction[]>([]);
    const [pipelineType, setPipelineType] = useState<'escalar' | 'superescalar'>('escalar');
    const [multiThreadingType, setMultiThreadingType] = useState<'none' | 'IMT' | 'BMT' | 'SMT'>('none');
    const { forwardingEnabled, setForwardingEnabled } = useForwarding();
    const [totalInstructions, setTotalInstructions] = useState(0);
    const [threads, setThreads] = useState<ThreadContext[]>([]);


    const cycleCount = useRef(0);
    const functionalUnitCycles = useRef(0);
    const quantityCompletedInstructions = useRef(0);
    const hasCompletedFirstInstruction = useRef(false);

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
        cycleCount.current = 0;
        hasCompletedFirstInstruction.current = false;
    };

    const clearInstructions = () => {
        if (pipelineType === 'escalar') {
            setScalarInstructions([]);
            setScalarReadyQueue([]);
        } else {
            setSuperscalarInstructions([]);
            setSuperscalarReadyQueue([]);
        }
    }

    const intercalateThreadsIMT = (queue: Instruction[]) => {
        const result = [];
        let i = 0;
    
        // Intercala blocos de instruções das threads
        while (i < queue.length) {
            // Adiciona blocos de Thread 1 e define a cor como "red"
            const instruction1 = { ...queue[i++], color: '#a3091c' };
            result.push(instruction1);

            if (i < queue.length){
                // Adiciona blocos de Thread 2 e define a cor como "green"
                const instruction2 = { ...queue[i++], color: '#295e1e' };
                result.push(instruction2);
            }
        }
    
        return result;
    };

    const intercalateThreadsBMT = (queue1: Instruction[], queue2: Instruction[], blockSize: number) => {
        const result = [];
        let i = 0, j = 0;

        // Intercala blocos de instruções das threads
        while (i < queue1.length || j < queue2.length) {
            // Adiciona blocos de Thread 1 e define a cor como "red"
            for (let k = 0; k < blockSize && i < queue1.length; k++) {
                const instruction = { ...queue1[i++], color: '#a3091c' };
                result.push(instruction);
            }
            // Adiciona blocos de Thread 2 e define a cor como "green"
            for (let k = 0; k < blockSize && j < queue2.length; k++) {
                const instruction = { ...queue2[j++], color: '#295e1e' };
                result.push(instruction);
            }
        }
        return result;
    };

    const addInstruction = (newInstruction: Instruction) => {
        // Verifica se o multithreading é IMT, BMT ou SMT e desativa o forwarding
        if (pipelineType == 'superescalar' || multiThreadingType === 'IMT' || multiThreadingType === 'BMT' || multiThreadingType === 'SMT') {
            setForwardingEnabled(false);
        }
    
        if (pipelineType === 'escalar') {
            const instWithResource = assignResourceUnit(newInstruction);
            
            // Adiciona a nova instrução com o recurso atribuído
            setScalarReadyQueue(prev => {
                const updatedQueue = [...prev, instWithResource];
                
                // Se for IMT, intercala as instruções da fila única
                if (multiThreadingType === 'IMT') {
                    return intercalateThreadsIMT(updatedQueue); // Retorna a fila intercalada com cores ajustadas
                }

                // Se for BMT, divide as instruções por thread e intercala
                if (multiThreadingType === 'BMT') {
                    const thread1 = updatedQueue.filter(inst => inst.threadId === 1);
                    const thread2 = updatedQueue.filter(inst => inst.threadId === 2);
                    
                    const intercalatedQueue = intercalateThreadsBMT(thread1, thread2, 2); // O tamanho do bloco é 2
                    return intercalatedQueue; // Retorna a fila intercalada
                }
                
                return updatedQueue; // Caso não seja IMT ou BMT, retorna a fila com a nova instrução
            });
        } else if (pipelineType === 'superescalar') {
            // Adiciona a nova instrução com o recurso atribuído
            setSuperscalarReadyQueue(prev => {
                const updatedQueue = [...prev, newInstruction];
                
                // Se for IMT, intercala as instruções da fila única
                if (multiThreadingType === 'IMT') {
                    return intercalateThreadsIMT(updatedQueue); // Retorna a fila intercalada com cores ajustadas
                }
                
                return updatedQueue; // Caso não seja IMT, retorna a fila com a nova instrução
            });

            setSuperscalarOrderQueue(prev => [...prev, newInstruction]);
        }
    
        // Atualiza o contador de instruções
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

    const countBubbleCycle = (instructions: Instruction[], stageOccupancy: { [key: string]: number }): number => {
        // Only count bubbles after first instruction completes
        if (!hasCompletedFirstInstruction.current) {
            return 0;
        }

        const bubbleCount = stageOccupancy.WB === 0 ? 1 : 0;
    
        return bubbleCount;
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
                
                // Track stage occupancy
                const stageOccupancy = {
                    IF: prev.filter(i => i.stage === 'IF').length,
                    DE: prev.filter(i => i.stage === 'DE').length,
                    EXE: prev.filter(i => i.stage === 'EXE').length,
                    MEM: prev.filter(i => i.stage === 'MEM').length,
                    WB: prev.filter(i => i.stage === 'WB').length
                };
                
                const withoutCompletedInstructions = prev.filter(inst => inst.stage !== 'WB');

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
                        return {
                            ...inst,
                            stage: 'MEM' as Instruction['stage'],
                            remainingLatency: 0
                        };
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

                // Update first instruction completion status
                if (completedInstructions.length > 0) {
                    hasCompletedFirstInstruction.current = true;
                }

                let bubbles = countBubbleCycle(withoutCompletedInstructions, stageOccupancy);
                quantityCompletedInstructions.current += stageOccupancy.WB > 0 ? 1 : 0;

                // Update metrics
                setMetrics(prev => ({
                    totalCycles: cycleCount.current,
                    completedInstructions: prev.completedInstructions + quantityCompletedInstructions.current,
                    bubbleCycles: prev.bubbleCycles + bubbles,
                    resourceUtilization: {
                        IF: prev.resourceUtilization.IF + (stageOccupancy.IF > 0 ? 1 : 0),
                        DE: prev.resourceUtilization.DE + (stageOccupancy.DE > 0 ? 1 : 0),
                        EXE: prev.resourceUtilization.EXE + (stageOccupancy.EXE > 0 ? 1 : 0),
                        MEM: prev.resourceUtilization.MEM + (stageOccupancy.MEM > 0 ? 1 : 0),
                        WB: prev.resourceUtilization.WB + (completedInstructions.length > 0 ? 1 : 0)
                    }
                }));

                bubbles = 0;
                quantityCompletedInstructions.current = 0;

                // Fetch new instruction if possible
                const hasInstructionInIF = updatedInstructions.some(inst => inst.stage === 'IF');
                if (!hasInstructionInIF && scalarReadyQueue.length > 0) {
                    const [nextInst, ...remainingQueue] = scalarReadyQueue;
                    const instWithResource = assignResourceUnit(nextInst);
                    const newInst: Instruction = {
                        ...instWithResource,
                        stage: 'IF'
                    };
                    setScalarReadyQueue(remainingQueue);
                    return [...updatedInstructions, newInst];
                }

                return updatedInstructions;
            });
        } else if (multiThreadingType === 'none' || multiThreadingType === 'IMT') {
            setSuperscalarInstructions(prev => {
                const withoutCompletedInstructions = prev.filter(inst => inst.stageSuperescalar !== 'WB');
                const completedInstructions = prev.filter(inst => inst.stageSuperescalar === 'EXE');
                const instructionOnFunctionalUnits = withoutCompletedInstructions.some(inst => 
                    inst.stageSuperescalar === 'EXE'
                );
                
                if (instructionOnFunctionalUnits) {
                    functionalUnitCycles.current += 1; // Incrementa somente quando há instruções em unidades funcionais
                }

                console.log(completedInstructions);
                quantityCompletedInstructions.current += completedInstructions.length;

                const stagePriority: { [key in Instruction['stageSuperescalar']]: number } = { 'WB': 0, 'EXE': 1, 'DE2': 2,'DE1': 3, 'IF': 4 };
                const processedInstructions: Instruction[] = [];

                const updatedInstructions = [...withoutCompletedInstructions]
                .sort((a, b) => stagePriority[a.stageSuperescalar] - stagePriority[b.stageSuperescalar])
                .map(inst => {
                    const currentStages = processedInstructions.map(i => i.stageSuperescalar);

                    // Handle WB stage
                    if (inst.stageSuperescalar === 'WB') {
                        return inst;
                    }

                    // Handle EXE stage
                    if (inst.stageSuperescalar === 'EXE') {
                        return {
                            ...inst,
                            stageSuperescalar: inst.remainingLatency === 0 ? 'WB' as const : 'EXE' as const,
                            remainingLatency:0
                        };
                    }

                    // Handle DE1 stage
                    if (inst.stageSuperescalar === 'DE1') {
                        const de2Inst = withoutCompletedInstructions.find(i => i.stageSuperescalar === 'DE2');
                        const deps = detectSuperescalarDependencies(inst, withoutCompletedInstructions.filter(i => i.stageSuperescalar === 'EXE'));
                        const exInst = withoutCompletedInstructions.find(i => i.stageSuperescalar === 'EXE');

                        const indexDe1Inst = superscalarOrderQueue.findIndex(i => i.destReg === inst.destReg && i.value === inst.value);
                        const indexDe2Inst = superscalarOrderQueue.findIndex(i => i.destReg === de2Inst?.destReg && i.value === de2Inst?.value);

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.remainingLatency === 0;
                        });

                        const canMove = dependenciesResolved &&
                            !currentStages.includes('EXE') &&
                            (!exInst || exInst?.remainingLatency === 0) &&
                            (de2Inst?.resourceUnit !== inst.resourceUnit || indexDe1Inst < indexDe2Inst);

                        if (canMove) {
                            return {
                                ...inst,
                                stageSuperescalar: 'EXE' as const,
                                remainingLatency: inst.remainingLatency - 1,
                                dependencies: []
                            };
                        } 
                        
                        return { ...inst, dependencies: deps };
                    }

                    // Handle DE2 stage
                    if (inst.stageSuperescalar === 'DE2') {
                        const de1Inst = withoutCompletedInstructions.find(i => i.stageSuperescalar === 'DE1');
                        const deps = detectSuperescalarDependencies(inst, withoutCompletedInstructions.filter(i => i.stageSuperescalar === 'EXE'));
                        const exInst = withoutCompletedInstructions.find(i => i.stageSuperescalar === 'EXE');
                        
                        const indexDe1Inst = superscalarOrderQueue.findIndex(i => i.destReg === de1Inst?.destReg && i.value === de1Inst?.value);
                        const indexDe2Inst = superscalarOrderQueue.findIndex(i => i.destReg === inst.destReg && i.value === inst.value);

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.remainingLatency === 0;
                        });

                        const canMove = (dependenciesResolved) &&
                            !currentStages.includes('EXE') &&
                            (!exInst || exInst?.remainingLatency === 0) &&
                            (de1Inst?.resourceUnit !== inst.resourceUnit || indexDe2Inst < indexDe1Inst);
                        
                        if (canMove) {
                            return {
                                ...inst,
                                stageSuperescalar: 'EXE' as const,
                                remainingLatency: inst.remainingLatency - 1,
                                dependencies: []
                            };
                        }

                        return { ...inst, dependencies: deps };
                    }

                    // Handle IF stage
                    if (inst.stageSuperescalar === 'IF') {
                        const de1StageInst = withoutCompletedInstructions.filter(i => i.stageSuperescalar === 'DE1');
                        const de2StageInst = withoutCompletedInstructions.filter(i => i.stageSuperescalar === 'DE2');
                        const ifStageInsts = withoutCompletedInstructions.filter(i => i.stageSuperescalar === 'IF');

                        const canAdvanceDe1 = (!de1StageInst.length || de1StageInst.every(i => i.dependencies?.length === 0)) && inst === ifStageInsts[0];
                        const canAdvanceDe2 = (!de2StageInst.length || de2StageInst.every(i => i.dependencies?.length === 0)) && inst === ifStageInsts[1];

                        if (canAdvanceDe1) {
                            return {
                                ...inst,
                                stageSuperescalar: 'DE1' as const,
                                dependencies: detectSuperescalarDependencies(inst, withoutCompletedInstructions)
                            };
                        } else if (canAdvanceDe2) {
                            return {
                                ...inst,
                                stageSuperescalar: 'DE2' as const,
                                dependencies: detectSuperescalarDependencies(inst, withoutCompletedInstructions)
                            };
                        }
                    }

                    processedInstructions.push(inst);

                    return inst;
                });

                if (cycleCount.current > 2 && instructionOnFunctionalUnits) {
                    if (cycleCount.current === 6 || cycleCount.current === 7) {
                        quantityCompletedInstructions.current--;
                    }
                    // Update metrics
                    console.log(metrics.completedInstructions)
                    setMetrics(prev => ({
                        totalCycles: prev.totalCycles + 0.5,
                        completedInstructions: prev.completedInstructions + (quantityCompletedInstructions.current),
                        bubbleCycles: 0,
                        resourceUtilization: {
                            ...prev.resourceUtilization,
                        }
                    }));
                }
                
                quantityCompletedInstructions.current = 0;

                // Fetch new instructions if possible
                const hasInstructionInIF = updatedInstructions.some(inst => inst.stageSuperescalar === 'IF');
                if (!hasInstructionInIF && superscalarReadyQueue.length > 0) {
                    const [nextInst1, ...remainingQueue] = superscalarReadyQueue;
                    const instWithResource1 = assignResourceUnit(nextInst1);
                    const newInst1: Instruction = {
                        ...instWithResource1,
                        stageSuperescalar: 'IF'
                    };
                    
                    let newQueue: Instruction[] = [
                        ...updatedInstructions,
                        newInst1
                    ];
                    
                    if (remainingQueue.length > 0) {
                        const [nextInst2, ...updatedRemainingQueue] = remainingQueue;
                        const instWithResource2 = assignResourceUnit(nextInst2);
                        const newInst2: Instruction = {
                            ...instWithResource2,
                            stageSuperescalar: 'IF'
                        };
                        
                        setSuperscalarReadyQueue(updatedRemainingQueue);
                        
                        newQueue = [
                            ...newQueue,
                            newInst2
                        ];
                    } else {
                        setSuperscalarReadyQueue(remainingQueue);
                    }
                    
                    return newQueue;
                }

                return updatedInstructions;
            });
        } else if (multiThreadingType === 'BMT'){ 
            superScalarWithBMT();
        } else { // SMT superescalar
            superScalarWithSMT();
        }
    };

    const detectSuperescalarDependencies = (newInst: Instruction, activeInstructions: Instruction[]): string[] => {
        if (["ADD, SUB"].includes(newInst.value)) newInst.type = "RR";
        else if (["MUL", "DIV"].includes(newInst.value)) newInst.type = "RI";
        else if (["LW", "SW"].includes(newInst.value)) newInst.type = "RM";
        else newInst.type = "B";
    
        const dependencies: string[] = [];

        for (const activeInst of activeInstructions) {
            if (activeInst === newInst) break;
        
            if (!activeInst.destReg) continue;

            const hasToWait = activeInst.remainingLatency > 1;

            // Only add as dependency if not forwardable
            if (hasToWait) { // has to wait instructions despached before to finish
                dependencies.push(activeInst.value); 
            }
        }        
        
        return dependencies;
    };
    
    const superScalarWithBMT = () => {
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 11, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 12, value: 0 },
                sourceReg2: { number: 5, value: 0 },
                destReg: { number: 10, value: 0 },
                remainingLatency: 1
            }
        ];

        const instructionsCycle4 = [
            {
                value: "4",
                type: "RR",
                color: "#302a2a",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 1, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 5, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 7, value: 0 },
                sourceReg2: { number: 3, value: 0 },
                destReg: { number: 2, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
        ];

        const instructionsCycle5 = [
            {
                value: "5",
                type: "RR",
                color: "#302a2a",
                cycle: 0,
                resourceUnit: "Ciclo" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 10, value: 0 },
                destReg: { number: 9, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
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
                currentInstructions = instructionsCycle4;
                break;
            case 5:
                currentInstructions = instructionsCycle5;
                break;
            case 6:
                break;
            default:
                return;
        }

        setSuperscalarInstructions(prev => {
            // Adiciona as instruções do ciclo atual ao pipeline
            return [...prev, ...currentInstructions];
        });

        // Obter os valores das instruções que estão atualmente no pipeline
        const instructionsInPipeline = currentInstructions.map(inst => inst.value);

        // Remover as instruções que estão no pipeline da fila de pronto
        setSuperscalarReadyQueue(prevQueue => 
            prevQueue.filter(inst => !instructionsInPipeline.includes(inst.value))
        );

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
        // Limpa o layout após o quinto ciclo
        if (cycleCount.current === 6) {
            clearInstructions(); // Limpa as instruções do layout
            cycleCount.current = 0; // Reseta o contador de ciclos
            return; // Para a contagem de ciclos
        }
    }

    const superScalarWithSMT = () => {
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 11, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 20, value: 0 },
                sourceReg2: { number: 5, value: 0 },
                destReg: { number: 10, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 8, value: 0 },
                destReg: { number: 7, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#425a23",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 1, value: 0 },
                sourceReg2: { number: 6, value: 0 },
                destReg: { number: 5, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 20, value: 0 },
                sourceReg2: { number: 5, value: 0 },
                destReg: { number: 10, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 8, value: 0 },
                destReg: { number: 7, value: 0 },
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
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 0, value: 0 },
                sourceReg2: { number: 0, value: 0 },
                destReg: { number: 0, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#a14695",
                cycle: 0,
                resourceUnit: "ALU1" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 4, value: 0 },
                sourceReg2: { number: 10, value: 0 },
                destReg: { number: 9, value: 0 },
                remainingLatency: 1
            },
            {
                value: "ADD",
                type: "RR",
                color: "#a14695",
                cycle: 0,
                resourceUnit: "ALU2" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 7, value: 0 },
                sourceReg2: { number: 3, value: 0 },
                destReg: { number: 2, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "MUL" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
                remainingLatency: 1
            },
            {
                value: "",
                type: "RR",
                color: "#444444",
                cycle: 0,
                resourceUnit: "LSU" as const,
                latency: 1,
                stage: "EXE" as const,
                stageSuperescalar: "IF" as const,
                sourceReg1: { number: 24, value: 0 },
                sourceReg2: { number: 25, value: 0 },
                destReg: { number: 26, value: 0 },
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
                break;
            default:
                return;
        }

        // Atualiza o estado das instruções no contexto
        setSuperscalarInstructions(prev => {
            // Adiciona as instruções do ciclo atual ao pipeline
            return [...prev, ...currentInstructions];
        });

        // Obter os valores das instruções que estão atualmente no pipeline
        const instructionsInPipeline = currentInstructions.map(inst => inst.value);

        // Remover as instruções que estão no pipeline da fila de pronto
        setSuperscalarReadyQueue(prevQueue => 
            prevQueue.filter(inst => !instructionsInPipeline.includes(inst.value))
        );

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
        // Limpa o layout após o sexto ciclo
        if (cycleCount.current === 4) {
            clearInstructions(); // Limpa as instruções do layout
            cycleCount.current = 0; // Reseta o contador de ciclos
            return; // Para a contagem de ciclos
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
