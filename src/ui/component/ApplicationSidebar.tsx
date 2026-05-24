import styles from "./ApplicationSidebar.module.css";

export function ApplicationSidebar() {
  return (
    <nav className={styles.sidebar}>
      <ul className={styles.sidebarList}>
        <li>Dashboard</li>
        <li data-selected="true">Orders</li>
        <li>Products</li>
        <li>Customers</li>
        <li>Reports</li>
        <li>Integrations</li>
        <li>Lorem ipsum, dolor sit amet consectetur adipisicing elit.</li>
      </ul>
    </nav>
  );
}
