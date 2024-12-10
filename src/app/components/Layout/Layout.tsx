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
import { useForwarding } from "@/contexts/ForwardingContext";

const Layout = () => {
  const [selectedPipeline, setSelectedPipeline] = useState("escalar")
  const [selectedMultithreading, setSelectedMultithreading] = useState("none")
  const [isRunning, setIsRunning] = useState(false);
  const { forwardingEnabled, setForwardingEnabled } = useForwarding();

  const { addInstruction, clockCycle, setPipelineType, setMultiThreadingType, clearInstructions, clearMetrics } = usePipelineContext();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setTimeout(() => {
        clockCycle();
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isRunning, clockCycle]);

  // const generateRandomInstruction = () => {
  //   const instructions = [
  //       { value: "ADD", type: "RR", resourceUnit: "ALU1" as const, latency: 1 },
  //       { value: "SUB", type: "RR", resourceUnit: "ALU1" as const, latency: 1 },
  //       { value: "MUL", type: "RI", resourceUnit: "MUL" as const, latency: 4 },
  //       { value: "DIV", type: "RI", resourceUnit: "MUL" as const, latency: 4 },
  //       { value: "LW", type: "RM", resourceUnit: "LSU" as const, latency: 3 },
  //       { value: "SW", type: "RM", resourceUnit: "LSU" as const, latency: 3 },
  //   ];

  //   const getRandomRegister = () => Math.floor(Math.random() * 32); // RISC-V has 32 registers

  //   return () => {
  //       const instruction = instructions[Math.floor(Math.random() * instructions.length)];
  //       const src1 = getRandomRegister();
  //       const src2 = getRandomRegister();
  //       const dest = getRandomRegister();
        
  //       return {
  //           value: instruction.value,
  //           color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
  //           type: instruction.type,
  //           stage: "IF" as const,
  //           resourceUnit: instruction.resourceUnit,
  //           sourceReg1: { number: src1, value: 0 },
  //           sourceReg2: { number: src2, value: 0 },
  //           destReg: { number: dest, value: 0 },
  //           latency: instruction.latency,
  //           remainingLatency: instruction.latency
  //       };
  //   };
  // };

  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
    setPipelineType(value as 'escalar' | 'superescalar');
  }

  const handleMultithreadingChange = (value: string) => {
    setSelectedMultithreading(value);
    setMultiThreadingType(value as 'none' | 'IMT' | 'BMT' | 'SMT');
  }

  const handleScalarTest1 = () => {
    const instructions = [
      {
        threadId: 1,
        value: "ADD",
        type: "RR",
        color: "#a3091c",
        resourceUnit: "ALU1" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 1, value: 0 },
        sourceReg2: { number: 2, value: 0 },
        destReg: { number: 0, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 2,
        value: "ADD",
        type: "RR",
        color: "#0f1734",
        resourceUnit: "ALU1" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 0, value: 0 },
        sourceReg2: { number: 2, value: 0 },
        destReg: { number: 3, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 1,
        value: "SUB",
        type: "RR",
        color: "#197e8e",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 6, value: 0 },
        sourceReg2: { number: 7, value: 0 },
        destReg: { number: 5, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 1,
        value: "MUL",
        type: "RI",
        color: "#295e1e",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 1, value: 0 },
        sourceReg2: { number: 5, value: 0 },
        destReg: { number: 0, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 2,
        value: "SW",
        type: "RM",
        color: "#244853",
        resourceUnit: "LSU" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 18, value: 0 },
        sourceReg2: { number: 3, value: 0 },
        destReg: { number: 9, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 2,
        value: "ADD",
        type: "RR",
        color: "#a54b9e",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 13, value: 0 },
        sourceReg2: { number: 12, value: 0 },
        destReg: { number: 11, value: 0 },
        remainingLatency: 1
      },
      {
        threadId: 1,
        value: "LW",
        type: "RR",
        color: "#d88037",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 19, value: 0 },
        sourceReg2: { number: 15, value: 0 },
        destReg: { number: 16, value: 0 },
        remainingLatency: 1
      }
    ]

    instructions.map(i => addInstruction(i));
  }

  const handleScalarTest2 = () => {
    const instructions = [
      {
        value: "LW",
        type: "RM",
        color: "#e85665",
        resourceUnit: "ALU1" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 16, value: 0 },
        sourceReg2: { number: 2, value: 0 },
        destReg: { number: 0, value: 0 },
        remainingLatency: 1
      },
      {
        value: "SUB",
        type: "RR",
        color: "#977954",
        resourceUnit: "ALU1" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 0, value: 0 },
        sourceReg2: { number: 1, value: 0 },
        destReg: { number: 3, value: 0 },
        remainingLatency: 1
      },
      {
        value: "ADD",
        type: "RR",
        color: "#197e8e",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 0, value: 0 },
        sourceReg2: { number: 2, value: 0 },
        destReg: { number: 3, value: 0 },
        remainingLatency: 1
      },
      {
        value: "ADD",
        type: "RR",
        color: "#f8b586",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 8, value: 0 },
        sourceReg2: { number: 6, value: 0 },
        destReg: { number: 9, value: 0 },
        remainingLatency: 1
      },
      {
        value: "SUB",
        type: "RR",
        color: "#d49972",
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "IF" as const,
        sourceReg1: { number: 7, value: 0 },
        sourceReg2: { number: 8, value: 0 },
        destReg: { number: 5, value: 0 },
        remainingLatency: 1
      }
    ]
    
    instructions.map(i => addInstruction(i));

  }

  const handleSuperscalarTest = () => {
    const instructions = selectedMultithreading === "none" ? [
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
        color: "#616ea5",
        cycle: 0,
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "EXE" as const,
        sourceReg1: { number: 4, value: 0 },
        sourceReg2: { number: 6, value: 0 },
        destReg: { number: 11, value: 0 },
        remainingLatency: 1
      }
    ] : ["IMT", "BMT"].includes(selectedMultithreading) ? [
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
        value: "LW",
        type: "RM",
        color: "#11114e",
        cycle: 0,
        resourceUnit: "LSU" as const,
        latency: 1,
        stage: "EXE" as const,
        sourceReg1: { number: 20, value: 0 },
        sourceReg2: { number: 5, value: 0 },
        destReg: { number: 10, value: 0 },
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
    ] : [
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
        value: "LW",
        type: "RM",
        color: "#11114e",
        cycle: 0,
        resourceUnit: "LSU" as const,
        latency: 1,
        stage: "EXE" as const,
        sourceReg1: { number: 20, value: 0 },
        sourceReg2: { number: 5, value: 0 },
        destReg: { number: 10, value: 0 },
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
        sourceReg1: { number: 1, value: 0 },
        sourceReg2: { number: 6, value: 0 },
        destReg: { number: 5, value: 0 },
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
        value: "ADD",
        type: "RR",
        color: "#a14695",
        cycle: 0,
        resourceUnit: "ALU2" as const,
        latency: 1,
        stage: "EXE" as const,
        sourceReg1: { number: 7, value: 0 },
        sourceReg2: { number: 3, value: 0 },
        destReg: { number: 2, value: 0 },
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
        sourceReg1: { number: 4, value: 0 },
        sourceReg2: { number: 10, value: 0 },
        destReg: { number: 9, value: 0 },
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
    ]

    instructions.map(i => addInstruction(i));
  }
  
  // const handleGenerate = () => {
  //   const instructionGenerator = generateRandomInstruction();
    
  //   // Generate 5 unique instructions
  //   for(let i = 0; i < 5; i++) {
  //       const newInstruction = instructionGenerator();
  //       addInstruction(newInstruction);
  //   }
  // }

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
            {selectedPipeline === "escalar" && selectedMultithreading === "none" ? <div className="forwarding">
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
            </div> : ""}
            
          </div>
          <div className={styles.actions}>
            <RadioGroup
              defaultValue="none"
              value={selectedMultithreading}
              onValueChange={handleMultithreadingChange}
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
              {selectedPipeline === "escalar" ? "" :
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SMT" id="r-smt" />
                  <Label htmlFor="r-smt">SMT</Label>
                </div>
              }
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
            {selectedPipeline === "escalar"  ? 
              selectedMultithreading === "none" ?
              <>
                <Button onClick={handleScalarTest1} className={styles.actionButton}>TE 1</Button>
                <Button onClick={handleScalarTest2} className={styles.actionButton}>TE 2</Button>
              </>
              : <Button onClick={handleScalarTest1} className={styles.actionButton}>TE 1</Button>
            :
            <Button onClick={handleSuperscalarTest} className={styles.actionButton}>TSE</Button>
            }

            {/* <Button onClick={handleGenerate} className={styles.actionButton}>Gerar Instruções</Button> */}
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
