import styles from "./LogCard.module.css";

const LogCard = (props: {name?: string, ipc?: number, cycles?: number, bubbleCycles?: number}) => {
    return (
        <div className={styles.logItem}>
            <h1>[LOG] {props.name}</h1>
            <p>IPC: {props.ipc}</p>
            <p>Ciclos gastos: {props.cycles}</p>
            <p>Ciclos de bolha: {props.bubbleCycles}</p>
        </div>
    );
}

export default LogCard;