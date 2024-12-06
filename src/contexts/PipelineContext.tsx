"use client";
import { createContext, useContext, useRef, useState } from "react";
import { ThreadContext } from '../types/ThreadContext';
import { 
    Instruction, 
    PipelineMetrics, 
    ThreadingMode,
    ForwardingPath 
} from '../types/PipelineTypes';
import { SUPERSCALAR_LIMITS } from '../constants/PipelineConstants';
import { detectDependencies, assignResourceUnit } from '../utils/PipelineUtils';
import { countSuperscalarStallsAndBubbles } from '../logic/PipelineLogic';

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
    threads: ThreadContext[];
    activeThread: number;
    addThread: (instructions: Instruction[]) => void;
    switchThread: (threadId: number) => void;
    threadingMode: ThreadingMode;
    setThreadingMode: (mode: ThreadingMode) => void;
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
    const [forwardingEnabled, setForwardingEnabled] = useState(false);
    const [threads, setThreads] = useState<ThreadContext[]>([]);
    const [activeThread, setActiveThread] = useState<number>(0);
    const [threadingMode, setThreadingMode] = useState<ThreadingMode>('NONE');
    const [totalStallCycles, setTotalStallCycles] = useState(0);
    const [totalBubbleCycles, setTotalBubbleCycles] = useState(0);



    const cycleCount = useRef(0);

    const [metrics, setMetrics] = useState<PipelineMetrics>({
        totalCycles: 0,
        completedInstructions: 0,
        stallCycles: 0,
        bubbleCycles: 0,
        resourceUtilization: {
            IF: 0,
            DE: 0,
            EX: 0,
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
                EX: 0,
                MEM: 0,
                WB: 0
            }
        });
        setTotalStallCycles(0);
        setTotalBubbleCycles(0);
        cycleCount.current = 0;
    };

    const addThread = (instructions: Instruction[]) => {
        const newThread: ThreadContext = {
            id: threads.length,
            state: 'READY',
            priority: 1,
            registers: {},
            pc: 0,
            instructions,
            metrics: {
                cyclesExecuted: 0,
                instructionsCompleted: 0,
                stallCycles: 0,
                bubbleCycles: 0
            }
        };
        setThreads(prev => [...prev, newThread]);
    };
    
    const switchThread = (threadId: number) => {
        if (threadId < threads.length) {
            setActiveThread(threadId);
            threads[threadId].state = 'RUNNING';
            threads[activeThread].state = 'READY';
        }
    };

    const addInstruction = (newInstruction: Instruction) => {
        const instWithResource = assignResourceUnit(newInstruction);
        if (pipelineType === 'escalar') {
            setScalarReadyQueue(prev => [...prev, instWithResource]);
        } else {
            setSuperscalarReadyQueue(prev => [...prev, instWithResource]);
        }
    };

    const clockCycle = () => {
        const isPipelineComplete = () => {
            if (threadingMode === 'IMT') {
                return threads.every(thread => 
                    thread.state === 'COMPLETED' || 
                    (thread.instructions.length === 0 && thread.state !== 'RUNNING')
                );
            }
            
            const hasActiveInstructions = pipelineType === 'escalar' ? 
                scalarInstructions.length > 0 || scalarReadyQueue.length > 0 :
                superscalarInstructions.length > 0 || superscalarReadyQueue.length > 0;
            return !hasActiveInstructions;
        };
    
        if (isPipelineComplete()) {
            return;
        }
    
        cycleCount.current++;
    
        if (threadingMode === 'IMT') {
            const nextThreadId = (activeThread + 1) % threads.length;
            switchThread(nextThreadId);
            
            setThreads(prev => prev.map(thread => {
                if (thread.id === activeThread) {
                    return {
                        ...thread,
                        metrics: {
                            ...thread.metrics,
                            cyclesExecuted: thread.metrics.cyclesExecuted + 1
                        }
                    };
                }
                return thread;
            }));
        }
    
        if (pipelineType === 'escalar') {
            setScalarInstructions(prev => {
                const completedInstructions = prev.filter(inst => inst.stage === 'WB');
                const withoutCompletedInstructions = prev.filter(inst => inst.stage !== 'WB');
    
                const stageOccupancy = {
                    IF: withoutCompletedInstructions.filter(i => i.stage === 'IF').length,
                    DE: withoutCompletedInstructions.filter(i => i.stage === 'DE').length,
                    EX: withoutCompletedInstructions.filter(i => i.stage === 'EX').length,
                    MEM: withoutCompletedInstructions.filter(i => i.stage === 'MEM').length,
                    WB: withoutCompletedInstructions.filter(i => i.stage === 'WB').length
                };
    
                const countStallsAndBubbles = (instructions: Instruction[]) => {
                    let newStalls = 0;
                    let newBubbles = 0;
                
                    // Count stalls from data hazards
                    instructions.forEach(inst => {
                        if (inst.stage === 'DE') {
                            // Data hazards
                            const hasDataHazard = inst.dependencies && inst.dependencies.length > 0;
                            
                            // Structural hazards - EX stage occupied
                            const hasStructuralHazard = instructions.some(
                                other => other.stage === 'EX' && other.remainingLatency > 0
                            );
                
                            // Resource conflicts - specific ALU required but occupied
                            const resourceConflict = instructions.some(
                                other => other.stage === 'EX' && 
                                other.resourceUnit === inst.resourceUnit
                            );
                
                            // Multi-cycle instruction blocking
                            const blockedByMultiCycle = instructions.some(
                                other => other.stage === 'EX' && 
                                other.remainingLatency > 1
                            );
                
                            if (hasDataHazard || hasStructuralHazard || resourceConflict || blockedByMultiCycle) {
                                newStalls++;
                                // Each stall in DE creates bubbles in previous stages
                                newBubbles += instructions.filter(i => i.stage === 'IF').length;
                            }
                        }
                    });
                
                    // Update total counts
                    setTotalStallCycles(prev => prev + newStalls);
                    setTotalBubbleCycles(prev => prev + newBubbles);
                
                    return { newStalls, newBubbles };
                };
    
                const updatedInstructions: Instruction[] = withoutCompletedInstructions.map(inst => {
                    const currentDependencies = inst.dependencies?.filter(dep => 
                        withoutCompletedInstructions.some(other => other.value === dep)
                    );
    
                    if (inst.stage === 'EX') {
                        if (inst.remainingLatency > 1) {
                            return { 
                                ...inst, 
                                remainingLatency: inst.remainingLatency - 1,
                                dependencies: currentDependencies 
                            };
                        }
                        return { 
                            ...inst, 
                            stage: 'MEM', 
                            remainingLatency: 0,
                            dependencies: currentDependencies 
                        };
                    }
    
                    if (inst.stage === 'DE') {
                        const exStageOccupied = withoutCompletedInstructions.some(
                            other => other.stage === 'EX' && other.remainingLatency > 0
                        );
                        if (!exStageOccupied && !currentDependencies?.length) {
                            return { 
                                ...inst, 
                                stage: 'EX', 
                                remainingLatency: inst.latency,
                                dependencies: currentDependencies 
                            };
                        }
                        return { 
                            ...inst, 
                            dependencies: currentDependencies 
                        };
                    }
    
                    let nextStage: 'IF' | 'DE' | 'EX' | 'MEM' | 'WB' = inst.stage;
                    switch(inst.stage) {
                        case 'IF': 
                            nextStage = stageOccupancy.DE === 0 ? 'DE' : 'IF';
                            break;
                        case 'MEM': 
                            nextStage = 'WB';
                            break;
                    }
    
                    return { 
                        ...inst, 
                        stage: nextStage,
                        dependencies: currentDependencies 
                    };
                });
    
                countStallsAndBubbles(withoutCompletedInstructions);
    
                setMetrics(prev => ({
                    totalCycles: cycleCount.current,
                    completedInstructions: prev.completedInstructions + completedInstructions.length,
                    stallCycles: totalStallCycles,
                    bubbleCycles: totalBubbleCycles,
                    resourceUtilization: {
                        IF: prev.resourceUtilization.IF + (stageOccupancy.IF > 0 ? 1 : 0),
                        DE: prev.resourceUtilization.DE + (stageOccupancy.DE > 0 ? 1 : 0),
                        EX: prev.resourceUtilization.EX + (stageOccupancy.EX > 0 ? 1 : 0),
                        MEM: prev.resourceUtilization.MEM + (stageOccupancy.MEM > 0 ? 1 : 0),
                        WB: prev.resourceUtilization.WB + (completedInstructions.length > 0 ? 1 : 0)
                    }
                }));
    
                const hasInstructionInIF = updatedInstructions.some(inst => inst.stage === 'IF');
                
                if (!hasInstructionInIF && scalarReadyQueue.length > 0) {
                    const [nextInst, ...remainingQueue] = scalarReadyQueue;
                    const instWithResource = assignResourceUnit(nextInst);
                    const dependencies = detectDependencies(instWithResource, updatedInstructions);
                    const newInst = { ...instWithResource, dependencies };
                    setScalarReadyQueue(remainingQueue);
                    return [...updatedInstructions, newInst];
                }
    
                return updatedInstructions;
            });
        } else {
            setSuperscalarInstructions(prev => {
                const completedInstructions = prev.filter(inst => inst.stage === 'WB');
                const withoutCompletedInstructions = prev.filter(inst => inst.stage !== 'WB');
            
                const stageOccupancy = {
                    IF: withoutCompletedInstructions.filter(i => i.stage === 'IF').length,
                    DE: withoutCompletedInstructions.filter(i => i.stage === 'DE').length,
                    EX: withoutCompletedInstructions.filter(i => i.stage === 'EX').length,
                    MEM: withoutCompletedInstructions.filter(i => i.stage === 'MEM').length,
                    WB: withoutCompletedInstructions.filter(i => i.stage === 'WB').length
                };
            
                const resourceInUse = {
                    ALU1: 0,
                    ALU2: 0,
                    LSU: 0,
                    BRU: 0
                };
            
                withoutCompletedInstructions
                    .filter(i => i.stage === 'EX')
                    .forEach(i => {
                        if (i.resourceUnit) {
                            resourceInUse[i.resourceUnit]++;
                        }
                    });
            
                const forwardingPaths: ForwardingPath[] = forwardingEnabled ? 
                    withoutCompletedInstructions
                        .filter(inst => (inst.stage === 'EX' && inst.remainingLatency === 1) || inst.stage === 'MEM')
                        .map(inst => ({
                            sourceStage: inst.stage as 'EX' | 'MEM' | 'WB',
                            register: inst.destReg?.number || 0,
                            value: 0
                        })) : [];
            
                const { currentStalls, currentBubbles } = countSuperscalarStallsAndBubbles(
                    withoutCompletedInstructions, 
                    forwardingEnabled
                );
            
                setTotalStallCycles(prev => prev + currentStalls);
                setTotalBubbleCycles(prev => prev + currentBubbles);
            
                const canMoveToEX = (inst: Instruction) => {
                    if (!inst.resourceUnit) return false;
                    const maxUsage = inst.resourceUnit.includes('ALU') ? 2 : 1;
                    return resourceInUse[inst.resourceUnit] < maxUsage;
                };
            
                const updatedInstructions: Instruction[] = withoutCompletedInstructions.map(inst => {
                    const currentDependencies = inst.dependencies?.filter(dep => 
                        withoutCompletedInstructions.some(other => other.value === dep)
                    );
            
                    if (inst.stage === 'EX') {
                        if (inst.remainingLatency > 1) {
                            return { 
                                ...inst, 
                                remainingLatency: inst.remainingLatency - 1,
                                dependencies: currentDependencies 
                            };
                        }
                        if (inst.resourceUnit) {
                            resourceInUse[inst.resourceUnit]--;
                        }
                        return { 
                            ...inst, 
                            stage: 'MEM', 
                            remainingLatency: 0,
                            dependencies: currentDependencies 
                        };
                    }
            
                    if (inst.stage === 'DE') {
                        if (forwardingEnabled) {
                            const requiredRegisters = [inst.sourceReg1?.number, inst.sourceReg2?.number]
                                .filter((reg): reg is number => reg !== undefined);
                            
                            const dataAvailable = requiredRegisters.every(reg =>
                                forwardingPaths.some(path => path.register === reg)
                            );
                            
                            if (dataAvailable && canMoveToEX(inst) && stageOccupancy.EX < SUPERSCALAR_LIMITS.EX) {
                                if (inst.resourceUnit) {
                                    resourceInUse[inst.resourceUnit]++;
                                }
                                return { 
                                    ...inst, 
                                    stage: 'EX', 
                                    remainingLatency: inst.latency,
                                    dependencies: [] 
                                };
                            }
                        } else {
                            if (!currentDependencies?.length && canMoveToEX(inst) && stageOccupancy.EX < SUPERSCALAR_LIMITS.EX) {
                                if (inst.resourceUnit) {
                                    resourceInUse[inst.resourceUnit]++;
                                }
                                return { 
                                    ...inst, 
                                    stage: 'EX', 
                                    remainingLatency: inst.latency,
                                    dependencies: [] 
                                };
                            }
                        }
                        return { ...inst, dependencies: currentDependencies };
                    }
            
                    let nextStage: 'IF' | 'DE' | 'EX' | 'MEM' | 'WB' = inst.stage;
                    switch(inst.stage) {
                        case 'IF': 
                            nextStage = stageOccupancy.DE < SUPERSCALAR_LIMITS.DE ? 'DE' : 'IF';
                            break;
                        case 'MEM': 
                            nextStage = 'WB';
                            break;
                    }
            
                    return { 
                        ...inst, 
                        stage: nextStage,
                        dependencies: currentDependencies 
                    };
                });
            
                setMetrics(prev => ({
                    totalCycles: cycleCount.current,
                    completedInstructions: prev.completedInstructions + completedInstructions.length,
                    stallCycles: totalStallCycles,
                    bubbleCycles: totalBubbleCycles,
                    resourceUtilization: {
                        IF: prev.resourceUtilization.IF + (stageOccupancy.IF > 0 ? 1 : 0),
                        DE: prev.resourceUtilization.DE + (stageOccupancy.DE > 0 ? 1 : 0),
                        EX: prev.resourceUtilization.EX + (stageOccupancy.EX > 0 ? 1 : 0),
                        MEM: prev.resourceUtilization.MEM + (stageOccupancy.MEM > 0 ? 1 : 0),
                        WB: prev.resourceUtilization.WB + (completedInstructions.length > 0 ? 1 : 0)
                    }
                }));
            
                const availableSlots = SUPERSCALAR_LIMITS.IF - updatedInstructions.filter(i => i.stage === 'IF').length;
                if (availableSlots > 0 && superscalarReadyQueue.length > 0) {
                    const newInstructions = superscalarReadyQueue
                        .slice(0, availableSlots)
                        .map(inst => {
                            const instWithResource = assignResourceUnit(inst);
                            const dependencies = detectDependencies(instWithResource, updatedInstructions);
                            return { 
                                ...instWithResource, 
                                dependencies, 
                                stage: 'IF' as const
                            };
                        });
                    setSuperscalarReadyQueue(prev => prev.slice(availableSlots));
                    return [...updatedInstructions, ...newInstructions];
                }
            
                return updatedInstructions;
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
            activeThread,
            addThread,
            switchThread,
            threads,
            threadingMode,
            setThreadingMode,
        }}>
            {children}
        </PipelineContext.Provider>
    );
}
