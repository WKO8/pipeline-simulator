import styles from "./Instruction.module.css";

const Instruction = (props: { 
    value: string, 
    color: string, 
    type: string, 
    dependencies?: string[] 
}) => {
    return (
        <div 
            className={styles.instruction}
            style={{ backgroundColor: props.color }}
        >
            <div>{props.value}</div>
            {props.dependencies && props.dependencies.length > 0 && (
                <div className={styles.dependencies}>
                    Stalled: {props.dependencies.join(', ')}
                </div>
            )}
        </div>
    );
}

export default Instruction;