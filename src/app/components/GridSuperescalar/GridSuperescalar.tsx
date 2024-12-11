import { usePipelineContext } from "@/contexts/PipelineContext";
import Instruction from "../Instruction/Instruction";
import styles from "./GridSuperescalar.module.css";

const GridSuperescalar = () => {
  const { instructions } = usePipelineContext();
  
  return (
      <div className={styles.gridSuperescalar}>
          {['Ciclo', 'ALU1', 'ALU2', 'MUL', 'LSU'].map((stage) => (
              <div key={stage} className={styles.card}>
                  <div className={styles.cardTitle}>{stage}</div>
                  <div className={styles.cardContent}>
                      {instructions
                          .filter(inst => inst.resourceUnit === stage)
                          .map((inst, index) => (
                              <Instruction 
                                  key={index}
                                  value={inst.value}
                                  color={inst.color}
                                  type="superescalar"
                                  dependencies={inst.dependencies}
                              />
                          ))}
                  </div>
              </div>
          ))}
      </div>
  );
}

export default GridSuperescalar;