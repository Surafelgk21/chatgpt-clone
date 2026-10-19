import { User, Bot } from "lucide-react";
import Markdown from "../Markdown/Markdown";
import styles from "./ChatMessage.module.css";

// One message bubble: plain text for the user, Markdown for the assistant.
function ChatMessage({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={`${styles.avatar} ${styles[role]}`}>
        {isUser ? (
          <User size={20} color="white" />
        ) : (
          <Bot size={20} color="white" />
        )}
      </div>

      <div className={styles.content}>
        {isUser ? content : <Markdown content={content} />}
      </div>
    </div>
  );
}

export default ChatMessage;
