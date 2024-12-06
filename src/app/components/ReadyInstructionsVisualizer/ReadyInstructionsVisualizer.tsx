"use client";
import { useState } from "react";
import { usePipelineContext } from "@/contexts/PipelineContext";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const ReadyInstructionsVisualizer = () => {
    const { readyQueue, addInstruction } = usePipelineContext();
    const [newInstruction, setNewInstruction] = useState({
        value: '',
        resourceUnit: 'ALU1' as 'ALU1' | 'ALU2' | 'LSU' | 'BRU',
        sourceReg1: { number: 0, value: 0 },
        sourceReg2: { number: 0, value: 0 },
        destReg: { number: 0, value: 0 }
    });

    const instructionTypes = ['ADD', 'SUB', 'MUL', 'DIV', 'LW', 'SW', 'BEQ', 'BNE', 'BLT', 'BGE', 'JAL'];
    const resourceUnits = ['ALU1', 'ALU2', 'LSU', 'BRU'];
    const registers = Array.from({ length: 32 }, (_, i) => i); // R0 to R31

    const handleAdd = () => {
        const instruction = {
            ...newInstruction,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            stage: 'IF' as const,
            latency: 1,
            remainingLatency: 1
        };
        addInstruction(instruction);
    };

    return (
        <div className="mt-5">
            <h3 className="text-lg font-semibold mb-2">Ready Instructions Queue</h3>
            
            <div className="mb-4 p-4 border rounded">
                <h4 className="text-md font-medium mb-2">Add New Instruction</h4>
                <div className="flex w-full gap-4">
                    <Select onValueChange={(value) => setNewInstruction({...newInstruction, value})}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Instruction" />
                        </SelectTrigger>
                        <SelectContent>
                            {instructionTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select 
                        onValueChange={(value: 'ALU1' | 'ALU2' | 'LSU' | 'BRU') => 
                            setNewInstruction({...newInstruction, resourceUnit: value})}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {resourceUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select 
                        onValueChange={(value) => setNewInstruction({
                            ...newInstruction, 
                            sourceReg1: { number: parseInt(value), value: 0 }
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Source Reg 1" />
                        </SelectTrigger>
                        <SelectContent>
                            {registers.map(reg => (
                                <SelectItem key={`src1_${reg}`} value={reg.toString()}>R{reg}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select 
                        onValueChange={(value) => setNewInstruction({
                            ...newInstruction, 
                            sourceReg2: { number: parseInt(value), value: 0 }
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Source Reg 2" />
                        </SelectTrigger>
                        <SelectContent>
                            {registers.map(reg => (
                                <SelectItem key={`src2_${reg}`} value={reg.toString()}>R{reg}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select 
                        onValueChange={(value) => setNewInstruction({
                            ...newInstruction, 
                            destReg: { number: parseInt(value), value: 0 }
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Destination Reg" />
                        </SelectTrigger>
                        <SelectContent>
                            {registers.map(reg => (
                                <SelectItem key={`dest_${reg}`} value={reg.toString()}>R{reg}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={handleAdd} className="col-span-2">
                        Add Instruction
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {readyQueue.map((instruction, index) => (
                    <div 
                        key={index}
                        className="p-2 rounded border"
                        style={{ backgroundColor: instruction.color }}
                    >
                        <div className="font-medium">{instruction.value}</div>
                        <div className="text-sm">
                            {instruction.resourceUnit && `Unit: ${instruction.resourceUnit}`}
                        </div>
                        <div className="text-sm">
                            {instruction.sourceReg1 && `Src1: R${instruction.sourceReg1.number}`}
                        </div>
                        <div className="text-sm">
                            {instruction.sourceReg2 && `Src2: R${instruction.sourceReg2.number}`}
                        </div>
                        <div className="text-sm">
                            {instruction.destReg && `Dest: R${instruction.destReg.number}`}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReadyInstructionsVisualizer;
