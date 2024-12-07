"use client";
import { createContext, useContext, useRef, useState } from "react";
import { 
    Instruction, 
    PipelineMetrics, 
    ThreadingMode
} from '../types/PipelineTypes';
import { SUPERSCALAR_LIMITS } from '../constants/PipelineConstants';
import { detectDependencies, assignResourceUnit } from '../utils/PipelineUtils';
import { countSuperscalarStallsAndBubbles } from '../logic/PipelineLogic';
import { useForwarding } from './ForwardingContext';

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
                    EX: withoutCompletedInstructions.filter(i => i.stage === 'EX').length,
                    MEM: withoutCompletedInstructions.filter(i => i.stage === 'MEM').length,
                    WB: withoutCompletedInstructions.filter(i => i.stage === 'WB').length
                };
        
                const stagePriority = { 'WB': 0, 'MEM': 1, 'EX': 2, 'DE': 3, 'IF': 4 };
                const processedInstructions: Instruction[] = [];
        
                const updatedInstructions: Instruction[] = [...withoutCompletedInstructions]
                    .sort((a, b) => stagePriority[a.stage] - stagePriority[b.stage])
                    .map(inst => {
                        const currentStages = processedInstructions.map(i => i.stage);
                        
                        // Handle WB stage
                        if (inst.stage === 'WB') {
                            return inst;
                        }
        
                        // Handle MEM stage
                        if (inst.stage === 'MEM' && !currentStages.includes('WB')) {
                            return {
                                ...inst,
                                stage: 'WB'
                            };
                        }
        
                        // Handle EX stage
                        if (inst.stage === 'EX') {
                            if (inst.remainingLatency > 1) {
                                return { 
                                    ...inst, 
                                    remainingLatency: inst.remainingLatency - 1
                                };
                            }
                            const nextStage: 'MEM' | 'WB' = inst.type === 'RM' ? 'MEM' : 'WB';
                            if (!currentStages.includes(nextStage)) {
                                return { 
                                    ...inst, 
                                    stage: nextStage,
                                    remainingLatency: 0
                                };
                            }
                        }
        
                        // Handle DE stage
                        if (inst.stage === 'DE') {
                            const deps = detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled);
                            const exInst = withoutCompletedInstructions.find(i => i.stage === 'EX');
                            
                            const canForward = forwardingEnabled && 
                                             exInst && 
                                             deps.includes(exInst.value) && 
                                             ["ADD", "SUB"].includes(exInst.value);
                            
                            const canMove = (!deps.length || canForward) && !currentStages.includes('EX');
                
                            if (canMove) {
                                return {
                                    ...inst,
                                    stage: 'EX',
                                    remainingLatency: inst.latency,
                                    dependencies: []
                                };
                            }
                            return { ...inst, dependencies: deps };
                        }
        
                        // Handle IF stage
                        if (inst.stage === 'IF' && !currentStages.includes('DE')) {
                            return {
                                ...inst,
                                stage: 'DE',
                                dependencies: detectDependencies(inst, withoutCompletedInstructions, forwardingEnabled)
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
                        EX: prev.resourceUtilization.EX + (stageOccupancy.EX > 0 ? 1 : 0),
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
                            const dataAvailable = !currentDependencies?.length;
                            // Add the canMoveToEX check here
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
                        }
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
                            const dependencies = detectDependencies(instWithResource, updatedInstructions, forwardingEnabled);
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
            threadingMode,
            setThreadingMode,
        }}>
            {children}
        </PipelineContext.Provider>
    );
}
