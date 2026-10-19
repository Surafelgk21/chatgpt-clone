import ChatMessage from "../ChatMessage/ChatMessage";
import styles from "./MessageList.module.css";
import { Bot } from "lucide-react";

function MessageList({ conversations, isLoading, messagesEndRef, emptyText = "What are you working on?", emptyHint }) {
  return (
    <div className={styles.messages}>
      {conversations?.length === 0 ? (
        <div className={styles.empty}>
          <div>{emptyText}</div>
          {emptyHint && <div className={styles.emptyHint}>{emptyHint}</div>}
        </div>
      ) : (
        conversations?.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))
      )}

      {/* Loading animation renders inside the scrollable container */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingAvatar}>
            <Bot size={20} color="white" />
          </div>

          <div className={styles.loading}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        </div>
      )}

      {/* Scroll target anchor directly at the bottom */}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
