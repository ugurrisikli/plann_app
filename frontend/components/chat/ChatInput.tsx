"use client";
import { useState, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim() && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      className={`flex gap-3 items-end bg-white rounded-2xl px-4 py-3 border transition-all duration-200 ${
        focused
          ? "border-[#FF6B35]/50 shadow-[0_0_0_3px_rgba(255,107,53,0.12)]"
          : "border-[#F0E4D7] shadow-card"
      }`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Plan Pete'e yaz… (Enter gönder, Shift+Enter yeni satır)"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none border-0 outline-none bg-transparent text-sm leading-relaxed text-[#1A0F0A] placeholder-[#C4A899] min-h-[24px] font-[inherit]"
      />

      <motion.button
        onClick={submit}
        disabled={!canSend}
        whileTap={{ scale: 0.9 }}
        whileHover={canSend ? { scale: 1.05 } : {}}
        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
          canSend
            ? "gradient-primary text-white shadow-elevated"
            : "bg-[#F8EFE8] text-[#C4A899]"
        }`}
      >
        <ArrowUp size={15} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
