"use client";
import React, { createContext, useContext, useState } from 'react';

// Define o tipo para o contexto
interface ForwardingContextType {
    forwardingEnabled: boolean;
    setForwardingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

// Criação do contexto com um valor padrão
const ForwardingContext = createContext<ForwardingContextType | undefined>(undefined);

// Provedor do contexto
export const ForwardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [forwardingEnabled, setForwardingEnabled] = useState(false);

    return (
        <ForwardingContext.Provider value={{ forwardingEnabled, setForwardingEnabled }}>
            {children}
        </ForwardingContext.Provider>
    );
};

// Hook personalizado para acessar o contexto
export const useForwarding = (): ForwardingContextType => {
    const context = useContext(ForwardingContext);
    if (!context) {
        throw new Error('useForwarding deve ser usado dentro de um ForwardingProvider');
    }
    return context;
};
