import { usePipelineContext } from "@/contexts/PipelineContext";
import Instruction from "../Instruction/Instruction";
import styles from "./GridSuperescalar.module.css";

const GridSuperescalar = () => {
  const { instructions } = usePipelineContext();
  
  return (
      <div className={styles.gridSuperescalar}>
          {['DE1', 'DE2'].map((stageSuperescalar) => (
              <div key={stageSuperescalar} className={styles.card}>
                  <div className={styles.cardTitle}>{stageSuperescalar}</div>
                  <div className={styles.cardContent}>
                      {instructions
                          .filter(inst => inst.stageSuperescalar === stageSuperescalar)
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
          {['ALU', 'MUL', 'LSU'].map((resourceUnit) => (
              <div key={resourceUnit} className={styles.card}>
                  <div className={styles.cardTitle}>{resourceUnit}</div>
                  <div className={styles.cardContent}>
                      {instructions
                          .filter(inst => inst.resourceUnit === resourceUnit && inst.stageSuperescalar === 'EXE')
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