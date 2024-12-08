"use client";
import { createContext, useContext, useRef, useState } from "react";
import { 
    Instruction, 
    PipelineMetrics, 
    ThreadingMode
} from '../types/PipelineTypes';
import { detectDependencies, assignResourceUnit } from '../utils/PipelineUtils';
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
    metrics: PipelineMetrics;
    clearMetrics: () => void;
    forwardingEnabled: boolean;
    setForwardingEnabled: (enabled: boolean) => void;
    threadingMode: ThreadingMode;
    setThreadingMode: (mode: ThreadingMode) => void;
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
    const { forwardingEnabled, setForwardingEnabled } = useForwarding();
    const [totalStallCycles, setTotalStallCycles] = useState(0);
    const [totalBubbleCycles, setTotalBubbleCycles] = useState(0);
    const [threadingMode, setThreadingMode] = useState<ThreadingMode>('NONE');
    const [threads, setThreads] = useState<ThreadContext[]>([]);


    const cycleCount = useRef(0);

    const [metrics, setMetrics] = useState<PipelineMetrics>({
        totalCycles: 0,
        completedInstructions: 0,
        stallCycles: 0,
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
            stallCycles: 0,
            bubbleCycles: 0,
            resourceUtilization: {
                IF: 0,
                DE: 0,
                EXE: 0,
                MEM: 0,
                WB: 0
            }
        });
        setTotalStallCycles(0);
        setTotalBubbleCycles(0);
        cycleCount.current = 0;
    };

    const addInstruction = (newInstruction: Instruction) => {
        const instWithResource = assignResourceUnit(newInstruction);
        if (pipelineType === 'escalar') {
            setScalarReadyQueue(prev => [...prev, instWithResource]);
        } else {
            setSuperscalarReadyQueue(prev => [...prev, instWithResource]);
        }
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
        if (threadingMode === 'IMT') {
            // Lógica para IMT
            threads.forEach(thread => {
                if (thread.state === 'RUNNING') {
                    const instruction = thread.instructions[thread.pc];
                    if (instruction) {
                        // Processar a instrução
                        // Atualizar o PC da thread
                        thread.pc++;
                        // Aqui você pode adicionar a lógica para atualizar o estado da instrução
                        // Atualizar métricas da thread
                        thread.metrics.instructionsCompleted++;
                    }
                }
            });
        } else if (threadingMode === 'BMT') {
            // Lógica para BMT
            const blockSize = 2; // Número de instruções a serem executadas por thread em cada ciclo
            threads.forEach(thread => {
                if (thread.state === 'RUNNING') {
                    for (let i = 0; i < blockSize; i++) {
                        const instruction = thread.instructions[thread.pc];
                        if (instruction) {
                            // Processar a instrução
                            // Atualizar o PC da thread
                            thread.pc++;
                            // Atualizar métricas da thread
                            thread.metrics.instructionsCompleted++;
                        }
                    }
                }
            });
        }

        const isPipelineComplete = () => {
            const hasActiveInstructions = pipelineType === 'escalar' ? 
                scalarInstructions.length > 0 || scalarReadyQueue.length > 0 :
                superscalarInstructions.length > 0 || superscalarReadyQueue.length > 0;
            return !hasActiveInstructions;
        };
    
        if (isPipelineComplete()) {
            return;
        }

        console.log('Current cycle:', cycleCount.current);
        console.log('Forwarding enabled:', forwardingEnabled);
    
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
                        const deps = detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled);
                        const exInst = withoutCompletedInstructions.find(i => i.stage === 'EXE');

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.stage === 'WB';
                        });

                        const canForward = forwardingEnabled &&
                            exInst &&
                            deps.includes(exInst.value) &&
                            ["ADD", "SUB"].includes(exInst.value);

                        const canMove = (
                            dependenciesResolved || canForward) &&
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
                        const deps = detectDependencies(deInst, withoutCompletedInstructions, forwardingEnabled);
                        const exInst = withoutCompletedInstructions.find(i => i.stage === 'EXE');

                        const dependenciesResolved = deps.every(dep => {
                            const depInst = withoutCompletedInstructions.find(i => i.value === dep);
                            return depInst && depInst.stage === 'WB';
                        });

                        const canForward = forwardingEnabled &&
                            exInst &&
                            deps.includes(exInst.value) &&
                            ["ADD", "SUB"].includes(exInst.value);

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
                    stallCycles: totalStallCycles,
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
                        stage: 'IF'
                    };
                    setScalarReadyQueue(remainingQueue);
                    return [...updatedInstructions, newInst];
                }

                return updatedInstructions;
            });
        } else {
            setSuperscalarInstructions(prev => {
                const withoutCompletedInstructions = prev.filter(inst => inst.cycle !== -1);
                const resourceUnits: {
                    ALU1: Instruction[];
                    ALU2: Instruction[];
                    MUL: Instruction[];
                    LSU: Instruction[];
                } = {
                    ALU1: [],
                    ALU2: [],
                    MUL: [],
                    LSU: []
                };
            
                const cycles: { [key in "ALU1" | "ALU2" | "MUL" | "LSU"]?: number } = {};
            
                const updatedInstructions: Instruction[] = [];
            
                // Primeiro, tentamos alocar todas as instruções que podem ser executadas em um único ciclo
                withoutCompletedInstructions.forEach(inst => {
                    const resourceUnit = inst.resourceUnit;
            
                    if (!resourceUnit) {
                        updatedInstructions.push(inst);
                        return;
                    }
            
                    // Verifica se a unidade de recurso está ocupada
                    if (cycles[resourceUnit] && cycles[resourceUnit] > 0) {
                        updatedInstructions.push(inst); // Retorna a instrução sem alterações
                        return;
                    }
            
                    // Verifica as dependências
                    const dependencies = detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled);
                    const dependenciesResolved = dependencies.length === 0;
            
                    if (dependenciesResolved) {
                        // Se não houver dependências, a instrução pode avançar
                        const newInst = {
                            ...inst,
                            cycle: 1, // Define o ciclo como 1, pois estamos alocando em um único ciclo
                            dependencies: []
                        };
            
                        // Adiciona a instrução à unidade de recurso correspondente
                        resourceUnits[resourceUnit].push(newInst);
                        
                        // Atualiza o ciclo da unidade de recurso
                        cycles[resourceUnit] = (cycles[resourceUnit] || 0) + 1; // Incrementa o ciclo da unidade de recurso
            
                        updatedInstructions.push(newInst); // Adiciona a nova instrução
                    } else {
                        // Se houver dependências, mantém a instrução como está
                        updatedInstructions.push({
                            ...inst,
                            dependencies: dependencies // Atualiza as dependências
                        });
                    }
                });
            
                // Agora, verificamos se há instruções na fila de prontas que podem ser alocadas
                const hasInstructionInCycle1 = updatedInstructions.some(inst => inst.cycle === 1);
            
                if (!hasInstructionInCycle1 && superscalarReadyQueue.length > 0) {
                    const [rawInstructions, remainingQueue] = [
                        superscalarReadyQueue.filter(i => i.cycle === 0),
                        superscalarReadyQueue.filter(i => i.cycle !== 0)
                    ];
            
                    // Aloca todas as instruções possíveis em um único ciclo
                    rawInstructions.forEach(inst => {
                        const resourceUnit = inst.resourceUnit;

                        if (!resourceUnit) {
                            updatedInstructions.push(inst);
                            return;
                        }
            
                        // Verifica se a unidade de recurso está disponível
                        if (!cycles[resourceUnit] || cycles[resourceUnit] === 0) {
                            const newInst = {
                                ...inst,
                                cycle: 1 // Define o ciclo como 1
                            };
                            updatedInstructions.push(newInst);
                            // Atualiza o ciclo da unidade de recurso
                            cycles[resourceUnit] = (cycles[resourceUnit] || 0) + 1; // Incrementa o ciclo da unidade de recurso
                        }
                    });
            
                    // Atualiza a fila de prontas
                    setSuperscalarReadyQueue(remainingQueue);
                }
            
                // Repete instruções com dependências que precisam ficar mais de um ciclo
                const repeatedInstructions = updatedInstructions.flatMap(inst => {
                    if (inst.dependencies && inst.dependencies.length > 0) {
                        return Array(inst.remainingLatency).fill({
                            ...inst,
                            cycle: (inst.cycle ?? 0) + 1 // Incrementa o ciclo para as repetições
                        });
                    }
                    return inst;
                });
            
                return [...updatedInstructions, ...repeatedInstructions];
            });
        }
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

    return (
        <PipelineContext.Provider value={{ 
            instructions: pipelineType === 'escalar' ? scalarInstructions : superscalarInstructions,
            readyQueue: pipelineType === 'escalar' ? scalarReadyQueue : superscalarReadyQueue,
            addInstruction, 
            clearInstructions,
            clockCycle,
            pipelineType,
            setPipelineType,
            metrics,
            clearMetrics,
            forwardingEnabled,
            setForwardingEnabled,
            threadingMode,
            setThreadingMode,
            threads,
            addThread,
        }}>
            {children}
        </PipelineContext.Provider>
    );
}
