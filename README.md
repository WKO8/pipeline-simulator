# Pipeline Simulator

A RISC-V pipeline simulator that supports scalar and superscalar architectures with multithreading capabilities (IMT, SMT, BMT).

## Features

### Pipeline Types
- Scalar Pipeline
- Superscalar Pipeline (Multiple instruction issue)

### Multithreading Support
- IMT (Interleaved Multithreading)
- SMT (Simultaneous Multithreading)
- BMT (Block Multithreading)

### Hazard Handling
- Data Dependencies
- Resource Conflicts
- Structural Hazards
- Data Forwarding Support

### Resource Units
- ALU1 & ALU2 (Arithmetic Logic Units)
- LSU (Load/Store Unit)
- BRU (Branch Unit)

### Performance Metrics
- Total Cycles
- Completed Instructions
- Stall Cycles
- Bubble Cycles
- Resource Utilization
- IPC (Instructions Per Cycle)

## Instructions Supported
- Arithmetic: ADD, SUB, MUL, DIV
- Memory: LW, SW
- Branch: BEQ, BNE, BLT, BGE, JAL

## Pipeline Stages
1. IF (Instruction Fetch)
2. DE (Decode)
3. EX (Execute)
4. MEM (Memory)
5. WB (Write Back)

## Instalation
```bash
git clone https://github.com/WKO8/pipeline-simulator
```
```bash
npm i
```
```bash
npm run dev
```
## Usage

### Running the Simulator
1. Select pipeline type (Scalar/Superscalar)
2. Choose threading mode (None/IMT/SMT/BMT)
3. Enable/Disable forwarding
4. Generate instructions
5. Control execution with Start/Pause/Continue/Reset buttons

### Visualization
- Real-time pipeline stage visualization
- Performance metrics display
- Resource utilization tracking
- Thread state monitoring

## Technical Details

### Superscalar Limits
- IF: 4 instructions
- DE: 4 instructions
- EX: 2 instructions
- MEM: 2 instructions
- WB: 4 instructions

### Instruction Latencies
- Basic ALU: 1 cycle
- MUL/DIV: 4 cycles
- Load/Store: 3 cycles
- Branch: 2 cycles

## Implementation
Built with:
- React
- TypeScript
- Context API for state management
