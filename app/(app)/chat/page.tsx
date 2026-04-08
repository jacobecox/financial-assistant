"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="text-xl font-semibold mb-4">Chat</h1>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm">
            Ask me anything about your finances — bills due, savings suggestions, monthly expenses, and more.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "bg-sky-900 ml-8"
                : "bg-slate-800 mr-8"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bg-slate-800 rounded-xl px-4 py-3 text-sm mr-8 text-slate-400 animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
