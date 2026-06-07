"use client";
import { useState, useRef, useCallback } from "react";
import { streamChat } from "@/lib/api";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  status?: string;
  streaming?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    // Mevcut mesajlardan history oluştur (son 10, streaming olanları dışla)
    const history = messages
      .filter((m) => !m.streaming && m.content)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);
    abortRef.current = false;

    await streamChat(
      text,
      history,
      (token) => {
        if (abortRef.current) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + token }
              : m
          )
        );
      },
      (status) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, status } : m
          )
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false, status: undefined } : m
          )
        );
        setIsLoading(false);
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Hata: ${err}`, streaming: false }
              : m
          )
        );
        setIsLoading(false);
      },
    );
  }, [isLoading]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
