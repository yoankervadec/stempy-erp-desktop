import styles from "./ApplicationHeader.module.css";

export default function ApplicationHeader() {
  return (
    <header
      className={styles.appHeader}
      style={{ height: "35px", width: "100%" }}
    >
      <div className={styles.searchContainer}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Navigate to..."
        />
      </div>
    </header>
  );
}
