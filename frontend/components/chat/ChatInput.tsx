"use client";
import { useState, useRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex gap-2 items-end bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Plan Pete'e yaz… (Enter gönder, Shift+Enter yeni satır)"
        disabled={disabled}
        rows={1}
        className="resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm leading-relaxed bg-transparent min-h-[24px]"
      />
      <Button
        onClick={submit}
        disabled={disabled || !value.trim()}
        size="sm"
        className="shrink-0 rounded-xl h-8 px-3"
      >
        Gönder
      </Button>
    </div>
  );
}
