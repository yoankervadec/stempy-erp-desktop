import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./ApplicationHeader.module.css";

export default function ApplicationHeader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setIsSearchOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onCommand(({ type }) => {
      switch (type) {
        case "navigation.open":
          openSearch();
          break;

        case "filter.toggle":
          // handle later
          break;
      }
    });

    return unsubscribe;
  }, [openSearch]);

  return (
    <header
      className={styles.appHeader}
      style={{ height: "35px", width: "100%" }}
    >
      <div className={styles.searchContainer}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Navigate to..."
          onBlur={closeSearch}
        />
      </div>
    </header>
  );
}
