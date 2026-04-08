"use client";

import { createContext, useContext, useState } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  streamingContent: string | null;
  setStreamingContent: React.Dispatch<React.SetStateAction<string | null>>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages]               = useState<Message[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ messages, setMessages, loading, setLoading, streamingContent, setStreamingContent }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
