"use client";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Message } from "@/hooks/useChat";
import { fadeUp } from "@/lib/animations";

// ── Markdown renderer (bold/italic/satır) ──────────────────────────────────
function renderMarkdown(text: string) {
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of text.split("\n")) {
    if (line.trim() === "") { elements.push(<div key={key++} className="h-2" />); continue; }

    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const inline = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-700">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))   return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });

    elements.push(<p key={key++} className="leading-relaxed">{inline}</p>);
  }
  return elements;
}

// ── Pete "düşünüyor" dots ──────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[#FF6B35]/60"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Pete Avatar ────────────────────────────────────────────────────────────
export function PeteAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 rounded-2xl" : "w-8 h-8 rounded-full";
  const icon = size === "lg" ? 24 : 14;
  return (
    <div className={`${dim} gradient-primary flex items-center justify-center shrink-0 shadow-elevated`}>
      <Zap size={icon} strokeWidth={2.5} className="text-white fill-white" />
    </div>
  );
}

// ── Main bubble ────────────────────────────────────────────────────────────
export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isEmpty = !message.content && message.streaming;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Pete avatar */}
      {!isUser && <PeteAvatar />}

      {/* Bubble */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "gradient-primary text-white rounded-br-sm leading-relaxed"
            : "bg-white border-l-2 border-[#FF6B35]/30 text-[#1A0F0A] rounded-bl-sm shadow-card"
        }`}
      >
        {isEmpty ? (
          <ThinkingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="space-y-0.5">{renderMarkdown(message.content)}</div>
            {message.streaming && (
              <motion.span
                className="inline-block w-0.5 h-3.5 rounded-full bg-[#FF6B35] ml-0.5"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
