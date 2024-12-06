import { usePipelineContext } from "@/contexts/PipelineContext";
import Instruction from "../Instruction/Instruction";
import styles from "./GridEscalar.module.css";

const GridEscalar = () => {
  const { instructions } = usePipelineContext();
  
  return (
      <div>
          <div className={styles.gridEscalar}>
              {['IF', 'DE', 'EX', 'MEM', 'WB'].map((stage) => (
                  <div key={stage} className={styles.card}>
                      <div className={styles.cardTitle}>{stage}</div>
                      <div className={styles.cardContent}>
                          {instructions
                              .filter(inst => inst.stage === stage)
                              .map((inst, index) => (
                                <Instruction 
                                    key={index}
                                    value={inst.value}
                                    color={inst.color}
                                    type=""
                                    dependencies={inst.dependencies}
                                />
                              ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
}

export default GridEscalar;
