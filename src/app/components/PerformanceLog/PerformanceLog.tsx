import { Button } from "@/components/ui/button";
import styles from "./PerformanceLog.module.css";
import { usePipelineContext } from "@/contexts/PipelineContext";

const PerformanceLog = () => {
    const { metrics, clearMetrics } = usePipelineContext();
    const ipc = metrics.completedInstructions / metrics.totalCycles;

    return (
        <div className={styles.container}>
             <div className={styles.metric}>
                <h3>IPC</h3>
                <p>{ipc.toFixed(2)}</p>
            </div>
            <div className={styles.metric}>
                <h3>Total Cycles</h3>
                <p>{metrics.totalCycles}</p>
            </div>
            <div className={styles.metric}>
                <h3>Stall Cycles</h3>
                <p>{metrics.stallCycles}</p>
            </div>
            <div className={styles.metric}>
                <h3>Bubble Cycles</h3>
                <p>{metrics.bubbleCycles}</p>
            </div>
            <div className={styles.metric}>
                <h3>Stage Utilization</h3>
                {Object.entries(metrics.resourceUtilization).map(([stage, usage]) => (
                    <p key={stage}>{stage}: {(usage / metrics.totalCycles * 100).toFixed(1)}%</p>
                ))}
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