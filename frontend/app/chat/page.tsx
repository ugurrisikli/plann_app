"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Zap } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble, PeteAvatar } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

const QUICK_ACTIONS = [
  { label: "Bu haftayı planla", emoji: "📅" },
  { label: "Takvimimde ne var?", emoji: "🗓️" },
  { label: "Me Time planla", emoji: "✨" },
  { label: "Yapılacaklarıma bak", emoji: "📋" },
];

export default function ChatPage() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#FFF8F2]">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#F0E4D7]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-elevated">
            <Zap size={16} strokeWidth={2.5} className="text-white fill-white" />
          </div>
          <div>
            <p className="text-sm font-700 text-[#1A0F0A] leading-none">Plan Pete</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <p className="text-xs text-[#A88070]">Hazır</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearMessages}
              className="flex items-center gap-1.5 text-xs text-[#A88070] hover:text-[#6B4F3A] transition-colors px-2.5 py-1.5 rounded-xl hover:bg-[#F8EFE8]"
            >
              <Trash2 size={12} />
              Temizle
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            /* Empty state */
            <motion.div
              key="empty"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center justify-center h-full pt-8 gap-7"
            >
              {/* Pete büyük avatar */}
              <motion.div variants={scaleIn}>
                <PeteAvatar size="lg" />
              </motion.div>

              <motion.div variants={fadeUp} className="text-center space-y-1.5">
                <p className="font-800 text-[#1A0F0A] text-xl">Merhaba! Ben Plan Pete.</p>
                <p className="text-sm text-[#A88070] max-w-xs leading-relaxed">
                  Takvimini, maillerini ve yapılacaklarını okuyarak haftanı planlarım.
                </p>
              </motion.div>

              {/* Quick action chips */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center max-w-sm">
                {QUICK_ACTIONS.map(({ label, emoji }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(label)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#F0E4D7] bg-white text-sm text-[#6B4F3A] font-500 hover:border-[#FF6B35]/40 hover:bg-[#FFF1EC] hover:shadow-sm transition-all"
                  >
                    <span>{emoji}</span>
                    {label}
                  </motion.button>
                ))}
              </motion.div>

              <motion.p variants={fadeUp} className="text-xs text-[#C4A899] text-center max-w-[220px] leading-relaxed">
                Takvim, Gmail ve Google Sheets'e erişebilir
              </motion.p>
            </motion.div>
          ) : (
            /* Message list */
            <motion.div
              key="messages"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-5 max-w-2xl mx-auto"
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-4 max-w-2xl mx-auto w-full">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
        <p className="text-center text-xs text-[#C4A899] mt-2">
          Takvim · Gmail · Yapılacaklar
        </p>
      </div>
    </div>
  );
}
