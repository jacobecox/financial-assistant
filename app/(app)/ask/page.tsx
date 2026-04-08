"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em:     ({ children }) => <em className="italic text-slate-300">{children}</em>,
        ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 last:mb-0">{children}</ul>,
        ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 last:mb-0">{children}</ol>,
        li:     ({ children }) => <li className="text-slate-200">{children}</li>,
        code:   ({ children }) => <code className="bg-slate-700 rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{children}</code>,
        h1:     ({ children }) => <h1 className="text-base font-bold text-white mb-1">{children}</h1>,
        h2:     ({ children }) => <h2 className="text-sm font-bold text-white mb-1">{children}</h2>,
        h3:     ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mb-1">{children}</h3>,
        hr:     () => <hr className="border-slate-600 my-2" />,
        table:  ({ children }) => (
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead:  ({ children }) => <thead className="border-b border-slate-600">{children}</thead>,
        tbody:  ({ children }) => <tbody>{children}</tbody>,
        tr:     ({ children }) => <tr className="border-b border-slate-700/50 last:border-0">{children}</tr>,
        th:     ({ children }) => <th className="text-left py-1.5 px-2 font-semibold text-slate-300">{children}</th>,
        td:     ({ children }) => <td className="py-1.5 px-2 text-slate-200">{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

const SUGGESTIONS = [
  "What bills are due this week?",
  "How much am I spending on bills monthly?",
  "What's my next paycheck and when?",
  "How much should I transfer to savings?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);       // true = dots (tool calls running)
  const [streamingContent, setStreamingContent] = useState<string | null>(null); // text arriving
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingContent]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || streamingContent !== null) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setLoading(true);
    setStreamingContent(null);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // First chunk: switch from dots to streaming bubble
        if (accumulated.length > 0) setLoading(false);
        setStreamingContent(accumulated);
      }

      // Commit completed message to history
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
      setLoading(false);
    } finally {
      setStreamingContent(null);
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.25rem)" }}>
      {/* Header */}
      <div className="shrink-0 pb-3 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight">Ask AI</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ask anything about your finances</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {empty && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">
              I have access to your bills, income schedules, and spending data. Try asking:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left rounded-xl bg-slate-800 hover:bg-slate-700 ring-1 ring-white/5 px-4 py-3 text-sm text-slate-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-sm whitespace-pre-wrap"
                  : "bg-slate-800 text-slate-100 rounded-bl-sm ring-1 ring-white/5"
              }`}
            >
              {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
            </div>
          </div>
        ))}

        {/* Dots while tool calls run (before any text) */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 ring-1 ring-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Streaming bubble — text arriving live */}
        {streamingContent !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-slate-800 text-slate-100 ring-1 ring-white/5">
              <Markdown>{streamingContent}</Markdown>
              <span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 pt-3 border-t border-slate-800">
        <div className="flex items-end gap-2 rounded-xl bg-slate-800 ring-1 ring-white/5 px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances…"
            className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed py-1"
            style={{ minHeight: "2rem" }}
          />
          <button
            type="submit"
            disabled={loading || streamingContent !== null || !input.trim()}
            className="shrink-0 mb-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg className="h-4 w-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-1.5">Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  );
}
