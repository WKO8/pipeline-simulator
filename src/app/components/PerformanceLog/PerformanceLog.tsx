import { Button } from "@/components/ui/button";
import styles from "./PerformanceLog.module.css";
import { usePipelineContext } from "@/contexts/PipelineContext";

const PerformanceLog = () => {
    const { metrics, clearMetrics } = usePipelineContext();
    const { pipelineType } = usePipelineContext();
    const ipc = metrics.completedInstructions / metrics.totalCycles;
    
    console.log("Completed instructions: " + metrics.completedInstructions)
    console.log("Total Cycles: " + metrics.totalCycles)

    const cpi = metrics.totalCycles / metrics.completedInstructions

    return (
        <div className={styles.container}>
            <div className={styles.metric}>
                <h3>{pipelineType === "escalar" ? "CPI" : "IPC"}</h3>
                <p>{pipelineType === "escalar" ? cpi.toFixed(2) : ipc.toFixed(2)}</p>
            </div> 
            <div className={styles.metric}>
                <h3>Total Cycles</h3>
                <p>{metrics.totalCycles}</p>
            </div>
            <div className={styles.metric}>
                <h3>Bubble Cycles</h3>
                <p>{metrics.bubbleCycles}</p>
            </div>
            <div className={styles.bottomBar}>
                <Button 
                    className={styles.actionButton}
                    onClick={clearMetrics}
                >
                    Limpar
                </Button>
            </div>
        </div>
    );
}

export default PerformanceLog;