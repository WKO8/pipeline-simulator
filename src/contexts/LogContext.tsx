"use client";
import { createContext, useContext, useState } from "react";

interface Log {
    name?: string;
    ipc: number;
    cycles: number;
    bubbleCycles: number;
}

interface LogContextType {
    logs: Log[];
    handleAddLog: (log: Log) => void;
    handleClearLogs: () => void;
}

export const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLogContext = () => {
    const context = useContext(LogContext);
    if (!context) throw new Error('useLogContext must be used within LogProvider');
    return context;
}

export const LogProvider = ({ children }: { children: React.ReactNode }) => {
    const [logs, setLogs] = useState<Log[]>([
        { name: "Pipeline", ipc: 100, cycles: 1000, bubbleCycles: 100 },
        { ipc: 23.2, cycles: 30, bubbleCycles: 10 },
        { name: "Pipeline 3", ipc: 24.4, cycles: 45, bubbleCycles: 15 }
    ]);

    const handleClearLogs = () => {
        setLogs([]);
    }

    const handleAddLog = (newLog: Log) => {
        setLogs([...logs, newLog]);
    }

    return (
        <LogContext.Provider value={{ logs, handleAddLog, handleClearLogs }}>
            {children}
        </LogContext.Provider>
    );
}