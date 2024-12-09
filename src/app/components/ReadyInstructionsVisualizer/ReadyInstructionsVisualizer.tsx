"use client";
import { usePipelineContext } from "@/contexts/PipelineContext";

export const ReadyInstructionsVisualizer = () => {
    const { readyQueue } = usePipelineContext();

    // const instructionTypes = ['ADD', 'SUB', 'MUL', 'DIV', 'LW', 'SW', 'BEQ'];
    // const resourceUnits = ['ALU1', 'ALU2', 'MUL', 'LSU'];
    // const registers = Array.from({ length: 32 }, (_, i) => i); // R0 to R31

    // const handleAdd = () => {
    //     const instruction = {
    //         ...newInstruction,
    //         color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    //         type: 'RR',
    //         stage: 'IF' as const,
    //         latency: 1,
    //         remainingLatency: 1,
    //         dependencies: []
    //     };
    //     addInstruction(instruction);
    // };

    return (
        <div className="text-center mt-5">
            <h3 className="text-2xl font-semibold mb-4">Ready Instructions Queue</h3>
            
            {/* <div className="mb-4 p-4 border rounded">
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
                        onValueChange={(value: 'ALU1' | 'ALU2' | 'MUL' | 'LSU') => 
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
                                <SelectItem key={`src1_${reg}`} value={reg.toString()}>{reg > 15 ? "" : "R"}{reg}</SelectItem>
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
            </div> */}

            <div className="grid grid-cols-5 gap-2">
                {readyQueue.map((instruction, index) => (
                    <div 
                        key={index}
                        className="w-32 h-36 text-xl p-2 rounded border"
                        style={{ backgroundColor: instruction.color }}
                    >
                        <div className="font-bold">
                            {instruction.value}
                        </div>
                        <div>
                            {instruction.sourceReg1 && `Src1: ${instruction.sourceReg1.number > 15 ? "" : "R"}${instruction.sourceReg1.number}`}
                        </div>
                        <div>
                            {instruction.sourceReg2 && `Src2: R${instruction.sourceReg2.number}`}
                        </div>
                        <div>
                            {instruction.destReg && `Dest: R${instruction.destReg.number}`}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReadyInstructionsVisualizer;
