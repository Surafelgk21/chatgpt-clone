import { useEffect, useRef, useState } from "react";
import { Search, MessageSquare, X, Loader2 } from "lucide-react";
import { api, errorMessage } from "../../api";
import styles from "./SearchModal.module.css";

// Wrap the matching part of a text in <mark>.
function Highlight({ text, query }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : part,
  );
}

function SearchModal({ open, onClose, recents, onOpenChat }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const requestId = useRef(0);
  const inputRef = useRef(null);

  const trimmed = query.trim();

  // Reset every time the window opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Search 250 ms after the person stops typing. Older answers are ignored.
  useEffect(() => {
    if (!open || !trimmed) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/chat/search", { params: { q: trimmed } });
        if (id !== requestId.current) return;
        setResults(data.data || []);
        setError("");
        setSelected(0);
      } catch (err) {
        if (id === requestId.current) setError(errorMessage(err));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmed, open]);

  if (!open) return null;

  const items = trimmed ? results : recents.slice(0, 8);

  const choose = (item) => {
    if (!item) return;
    onOpenChat(item.id);
    onClose();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(items[selected]);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Search chats"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className={styles.searchRow}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search chats..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search chats"
          />
          {loading && <Loader2 size={16} className={styles.spin} />}
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>

        <div className={styles.list} role="listbox">
          {error && <div className={styles.message}>{error}</div>}

          {!trimmed && items.length > 0 && <div className={styles.groupTitle}>Recent</div>}

          {items.map((item, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === selected}
              key={item.id}
              className={`${styles.result} ${index === selected ? styles.selected : ""}`}
              onMouseEnter={() => setSelected(index)}
              onClick={() => choose(item)}
            >
              <MessageSquare size={16} className={styles.resultIcon} />
              <span className={styles.resultText}>
                <span className={styles.resultTitle}>
                  <Highlight text={item.title} query={trimmed} />
                </span>
                {item.snippet && (
                  <span className={styles.snippet}>
                    <Highlight text={item.snippet} query={trimmed} />
                  </span>
                )}
              </span>
            </button>
          ))}

          {!error && !loading && trimmed && results.length === 0 && (
            <div className={styles.message}>No chats found for “{trimmed}”.</div>
          )}
          {!trimmed && items.length === 0 && (
            <div className={styles.message}>You have no chats yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
