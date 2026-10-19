import { useEffect, useRef, useState } from "react";
import { Plus, ArrowUp } from "lucide-react";
import styles from "./ChatInput.module.css";

/**
 * ChatInput Component
 * Renders the text input form and submit button for sending messages.
 *
 * @param {Object} props
 * @param {boolean} props.isLoading - Disables input while waiting for API responses
 * @param {Function} props.handleSubmit - Callback function to submit prompt text
 * @param {string} [props.placeholder] - Hint text shown in the empty field
 * @param {string|number} [props.focusKey] - Change this to move the cursor back into the field
 */
function ChatInput({ isLoading, handleSubmit, placeholder = "Ask anything", focusKey }) {
  // Initialize input state with an empty string to prevent uncontrolled input warnings
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  // Put the cursor back in the field after an answer arrives or the chat changes
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading, focusKey]);

  /**
   * Form submit handler
   * Prevents default page refresh and passes input up to App component
   */
  function submitHandler(event) {
    event.preventDefault();

    // Prevent submission if string is empty or request is pending
    if (!input.trim() || isLoading) return;

    handleSubmit(input.trim());
    setInput(""); // Clear input field after submission
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={submitHandler}>
        {/* Attachment/Action Icon */}
        <div className={styles.icon} aria-hidden="true">
          <Plus size={20} />
        </div>

        {/* Text Input Field */}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
