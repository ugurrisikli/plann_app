"use client";
import { Message } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Inline bold + italic
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const inline = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });

    elements.push(
      <p key={key++} className="leading-relaxed">
        {inline}
      </p>
    );
  }

  return elements;
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isEmpty = !message.content && message.streaming;

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
          PP
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-zinc-900 text-white rounded-br-sm leading-relaxed"
            : "bg-white border border-zinc-100 text-zinc-800 rounded-bl-sm shadow-sm"
        )}
      >
        {/* İçerik yok + streaming → dots göster */}
        {isEmpty ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div>{renderMarkdown(message.content)}</div>
            {message.streaming && (
              <span className="inline-block w-1 h-3.5 bg-zinc-400 rounded-sm ml-0.5 animate-pulse" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
