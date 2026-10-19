import { useEffect, useRef, useState } from "react";
import styles from "./Sidebar.module.css";
import {
  MessageSquare,
  Search,
  Image as ImageIcon,
  LayoutGrid,
  Microscope,
  Code2,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
} from "lucide-react";

// The main menu. `id` is what App.jsx uses to decide which page to show.
const NAV = [
  { id: "new", label: "New chat", icon: MessageSquare },
  { id: "search", label: "Search chats", icon: Search, hint: "Ctrl K" },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "research", label: "Deep research", icon: Microscope },
  { id: "codex", label: "Codex", icon: Code2 },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

// One chat in the "Recents" list, with inline rename and delete.
function ChatItem({ chat, active, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = () => {
    const title = draft.trim();
    setEditing(false);
    if (title && title !== chat.title) onRename(chat.id, title);
    else setDraft(chat.title);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.renameInput}
        value={draft}
        maxLength={255}
        aria-label="Chat name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setDraft(chat.title);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div className={`${styles.chatRow} ${active ? styles.active : ""}`}>
      <button
        type="button"
        className={styles.chatTitle}
        title={chat.title}
        onClick={() => onOpen(chat.id)}
        aria-current={active ? "page" : undefined}
      >
        {chat.title}
      </button>
      <div className={styles.chatActions}>
        <button
          type="button"
          className={styles.miniBtn}
          aria-label={`Rename ${chat.title}`}
          onClick={() => {
            setDraft(chat.title);
            setEditing(true);
          }}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className={styles.miniBtn}
          aria-label={`Delete ${chat.title}`}
          onClick={() => onDelete(chat)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  view,
  activeChatId,
  chats,
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  onNewChat,
  onOpenSearch,
  onNavigate,
  onOpenChat,
  onRenameChat,
  onDeleteChat,
}) {
  const handleNav = (id) => {
    if (id === "new") onNewChat();
    else if (id === "search") onOpenSearch();
    else onNavigate(id);
    onCloseMobile();
  };

  // On a phone the top-left button closes the sliding menu; on a computer it
  // shrinks or expands the sidebar.
  const handleToggle = () => {
    if (window.matchMedia("(max-width: 768px)").matches) onCloseMobile();
    else onToggle();
  };

  const isActive = (id) =>
    id === "new" ? view === "chat" && !activeChatId : id === view;

  return (
    <>
      {mobileOpen && <div className={styles.backdrop} onClick={onCloseMobile} />}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
          mobileOpen ? styles.open : ""
        }`}
        aria-label="Main menu"
      >
        <div className={styles.header}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleToggle}
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {!collapsed && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => handleNav("new")}
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquare size={20} />
            </button>
          )}
        </div>

        <nav className={styles.nav} aria-label="Sections">
          {NAV.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              type="button"
              className={`${styles.item} ${isActive(id) ? styles.active : ""}`}
              onClick={() => handleNav(id)}
              aria-current={isActive(id) ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span className={styles.label}>{label}</span>}
              {!collapsed && hint && <kbd className={styles.hint}>{hint}</kbd>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className={styles.recents}>
            <div className={styles.recentsTitle}>Recents</div>
            {chats.length === 0 ? (
              <div className={styles.recentsEmpty}>Your chats will show up here.</div>
            ) : (
              chats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  active={view === "chat" && chat.id === activeChatId}
                  onOpen={(id) => {
                    onOpenChat(id);
                    onCloseMobile();
                  }}
                  onRename={onRenameChat}
                  onDelete={onDeleteChat}
                />
              ))
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
