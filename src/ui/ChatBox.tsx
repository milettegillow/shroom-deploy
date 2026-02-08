import { useState, useEffect } from "react";
import { useMushroomStore } from "../stores/mushroomStore";
import styles from "./ChatBox.module.css";

export default function ChatBox() {
  const sendMessage = useMushroomStore((s) => s.sendMessage);
  const isConversing = useMushroomStore((s) => s.isConversing);
  const [input, setInput] = useState("");
  const [sentText, setSentText] = useState("");
  const [showSent, setShowSent] = useState(false);
  const [fading, setFading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isConversing) return;
    const msg = input.trim();
    sendMessage(msg);
    setInput("");
    setSentText(msg);
    setShowSent(true);
    setFading(false);
  };

  useEffect(() => {
    if (!showSent) return;
    const fadeTimer = setTimeout(() => setFading(true), 2500);
    const hideTimer = setTimeout(() => setShowSent(false), 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [showSent, sentText]);

  return (
    <div className={styles.chatBox}>
      {showSent && (
        <div
          className={`${styles.sentMsg} ${fading ? styles.sentFadeOut : ""}`}
        >
          {sentText}
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to your shroom..."
          className={styles.input}
          disabled={isConversing}
        />
      </form>
    </div>
  );
}
