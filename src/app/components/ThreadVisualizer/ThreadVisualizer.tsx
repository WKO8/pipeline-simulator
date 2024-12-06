"use client";
import { usePipelineContext } from "@/contexts/PipelineContext";

export const ThreadVisualizer = () => {
    const { threads, activeThread, threadingMode } = usePipelineContext();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Threading Mode: {threadingMode}</h2>
                <span className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded">
                    Active Thread: {activeThread}
                </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {threads.map(thread => (
                    <div 
                        key={thread.id} 
                        className={`p-4 rounded-lg border ${
                            thread.id === activeThread 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">Thread {thread.id}</h3>
                            <span className={`px-2 py-1 text-sm rounded ${
                                thread.state === 'RUNNING' 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {thread.state}
                            </span>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Instructions Completed:</div>
                                <div>{thread.metrics.instructionsCompleted}</div>
                                <div>Cycles Executed:</div>
                                <div>{thread.metrics.cyclesExecuted}</div>
                                <div>Stall Cycles:</div>
                                <div>{thread.metrics.stallCycles}</div>
                                <div>Bubble Cycles:</div>
                                <div>{thread.metrics.bubbleCycles}</div>
                            </div>
                            
                            <div className="mt-4">
                                <div className="text-sm font-medium mb-2">Current PC: {thread.pc}</div>
                                <div className="text-sm text-muted-foreground">
                                    Remaining Instructions: {thread.instructions.length}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};