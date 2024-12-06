"use client";
// components/Layout.js
import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import styles from "./Layout.module.css";
import GridEscalar from "../GridEscalar/GridEscalar";
import GridSuperescalar from "../GridSuperescalar/GridSuperescalar";
import PerformanceLog from "../PerformanceLog/PerformanceLog";
import { usePipelineContext } from "@/contexts/PipelineContext";
import ReadyInstructionsVisualizer from "../ReadyInstructionsVisualizer/ReadyInstructionsVisualizer";
// import { SimulationControls } from "../SimulationControls/SimulationControls";
// import { ThreadVisualizer } from "../ThreadVisualizer/ThreadVisualizer";

const Layout = () => {
  const [selectedPipeline, setSelectedPipeline] = useState("escalar")
  const [selectedMultithreading, setSelectedMultithreading] = useState("none")
  const [isRunning, setIsRunning] = useState(false);
  const [forwardingEnabled, setForwardingEnabled] = useState(false);

  const { addInstruction, clockCycle, setPipelineType, clearInstructions, clearMetrics } = usePipelineContext();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setTimeout(() => {
        clockCycle();
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isRunning, clockCycle]);

  const generateRandomInstruction = () => {
    const instructions = [
        { value: "ADD", resourceUnit: "ALU1" as const, latency: 1 },
        { value: "SUB", resourceUnit: "ALU1" as const, latency: 1 },
        { value: "MUL", resourceUnit: "ALU2" as const, latency: 4 },
        { value: "DIV", resourceUnit: "ALU2" as const, latency: 4 },
        { value: "LW", resourceUnit: "LSU" as const, latency: 3 },
        { value: "SW", resourceUnit: "LSU" as const, latency: 3 },
        { value: "BEQ", resourceUnit: "BRU" as const, latency: 2 }
    ];

    const getRandomRegister = () => Math.floor(Math.random() * 32); // RISC-V has 32 registers

    return () => {
        const instruction = instructions[Math.floor(Math.random() * instructions.length)];
        const src1 = getRandomRegister();
        const src2 = getRandomRegister();
        const dest = getRandomRegister();
        
        return {
            value: instruction.value,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            stage: "IF" as const,
            resourceUnit: instruction.resourceUnit,
            sourceReg1: { number: src1, value: 0 },
            sourceReg2: { number: src2, value: 0 },
            destReg: { number: dest, value: 0 },
            latency: instruction.latency,
            remainingLatency: instruction.latency
        };
    };
  };

  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
    setPipelineType(value as 'escalar' | 'superescalar');
  }
  
  const handleGenerate = () => {
    const instructionGenerator = generateRandomInstruction();
    
    // Generate 5 unique instructions
    for(let i = 0; i < 5; i++) {
        const newInstruction = instructionGenerator();
        addInstruction(newInstruction);
    }
  }

  const handleStart = () => {
    setIsRunning(true);
  }

  const handlePause = () => {
    setIsRunning(false);
  }

  const handleContinue = () => {
    setIsRunning(true);
  }

  return (
    <div className={styles.container}>
      <div className={styles.simulator}>
        {/* Barra Superior */}
        <div className={styles.topBar}>
          <div className={styles.optionsLeft}>
            <div className="type">
              <RadioGroup
                defaultValue="escalar"
                value={selectedPipeline}
                onValueChange={handlePipelineChange}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="escalar" id="r-escalar" />
                  <Label htmlFor="r-escalar">Escalar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="superescalar" id="r-superescalar" />
                  <Label htmlFor="r-superescalar">Superescalar</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="forwarding">
              <RadioGroup
              defaultValue="false"
              value={forwardingEnabled ? "true" : "false"}
              onValueChange={(value) => setForwardingEnabled(value === "true")}
              className="flex flex-row gap-6"
              >
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="r-noforward" />
                      <Label htmlFor="r-noforward">No Forwarding</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="r-forward" />
                      <Label htmlFor="r-forward">Forwarding</Label>
                  </div>
              </RadioGroup>
            </div>
          </div>
          <div className={styles.actions}>
            <RadioGroup
              defaultValue="none"
              value={selectedMultithreading}
              onValueChange={(value) => {
                setSelectedMultithreading(value);
                // if (value === 'IMT') {
                //   setThreadingMode('IMT');
                // }
              }}
              className="flex flex-row gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="r-none" />
                <Label htmlFor="r-none">Nenhum</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="IMT" id="r-imt" />
                <Label htmlFor="r-imt">IMT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SMT" id="r-smt" />
                <Label htmlFor="r-smt">SMT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BMT" id="r-bmt" />
                <Label htmlFor="r-bmt">BMT</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        

        {/* Pipeline Grid */}
        {selectedPipeline === "escalar" ? <GridEscalar /> :  <GridSuperescalar />}

        <div className={styles.bottomBar}>
          <div className={styles.actionButtons}>
            <Button onClick={handleGenerate} className={styles.actionButton}>Gerar Instruções</Button>
            <Button onClick={handleStart} className={styles.actionButton}>Iniciar</Button>
            <Button onClick={handlePause} className={styles.actionButton}>Pausar</Button>
            <Button onClick={handleContinue} className={styles.actionButton}>Continuar</Button>
            <Button onClick={() => { clearInstructions(); clearMetrics(); }} className={styles.actionButton}>Resetar</Button>
          </div>
        </div>
      </div>
      <div className={styles.performance}>
        {/* Barra Superior */}
        <div className={styles.topBar}>Métricas de Desempenho</div>
        {/* PerformanceLog */}
        <PerformanceLog />
      </div>
      
      {/* Ready Instructions Visualizer */}
      <ReadyInstructionsVisualizer />

      {/* Thread Visualization */}
      {/* <SimulationControls /> */}

      {/* Thread Visualization */}
      {/* <ThreadVisualizer /> */}


    </div>
  );
};

export default Layout;
