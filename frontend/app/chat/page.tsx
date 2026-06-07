"use client";
import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Trash2 } from "lucide-react";

const QUICK_ACTIONS = [
  "Bu haftayı planla",
  "Takvimimde ne var?",
  "Me Time planla",
  "Yapılacaklarıma bak",
];

export default function ChatPage() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
            PP
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 leading-none">Plan Pete</p>
            <p className="text-xs text-zinc-400 mt-0.5">Kişisel yaşam asistanın</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50"
          >
            <Trash2 size={12} />
            Temizle
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-16 gap-8">
            {/* Avatar büyük */}
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-xl font-bold shadow-lg">
              PP
            </div>
            <div className="text-center space-y-1.5">
              <p className="font-semibold text-zinc-900 text-lg">Merhaba! Ben Plan Pete.</p>
              <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                Takvimini, maillerini ve yapılacaklarını okuyarak haftanı planlarım.
              </p>
            </div>
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-sm text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 px-4 py-4 max-w-2xl mx-auto w-full">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
        <p className="text-center text-xs text-zinc-400 mt-2">
          Plan Pete takvim, mail ve yapılacaklarını okuyabilir.
        </p>
      </div>
    </div>
  );
}
