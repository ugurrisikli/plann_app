const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(
  message: string,
  history: ChatHistoryItem[],
  onToken: (text: string) => void,
  onStatus: (msg: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const resp = await fetch(`${BACKEND}/api/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!resp.ok) {
    onError(`Sunucu hatası: ${resp.status}`);
    return;
  }

  const reader = resp.body?.getReader();
  if (!reader) { onError("Stream alınamadı"); return; }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "token") onToken(payload.data);
        else if (payload.type === "status") onStatus(payload.data);
        else if (payload.type === "done") onDone();
      } catch {}
    }
  }
}
