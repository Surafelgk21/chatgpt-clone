import { ChevronDown, Menu } from "lucide-react";
import styles from "./ChatHeader.module.css";

// Top bar. `title` changes with the page; `crumb` is the project name.
function ChatHeader({ title = "ChatGPT", crumb, showModelMenu = false, onOpenMenu }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {crumb && <span className={styles.crumb}>{crumb} /</span>}
        <span className={styles.title}>{title}</span>
        {showModelMenu && <ChevronDown size={16} />}
      </div>

      <div className={styles.right}>
        <div className={styles.avatar}>IT</div>
      </div>
    </header>
  );
}

export default ChatHeader;
