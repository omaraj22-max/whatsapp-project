"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, User, RefreshCw, Search, Phone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { timeAgo, formatPhone, formatDateTime } from "@/lib/utils";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  status: string | null;
  sentBy: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: string;
  agentMode: string;
  lastMessageAt: string | null;
  unreadCount: number;
  contact: Contact;
  messages?: Message[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id);
      const interval = setInterval(() => fetchMessages(selected.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    fetchMessages(conv.id);
    // mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, type: "text" }),
      });
      if (res.ok) {
        setText("");
        fetchMessages(selected.id);
        fetchConversations();
      }
    } finally {
      setSending(false);
    }
  };

  const updateAgentMode = async (mode: string) => {
    if (!selected) return;
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentMode: mode }),
    });
    setSelected((prev) => prev ? { ...prev, agentMode: mode } : prev);
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, agentMode: mode } : c))
    );
  };

  const filtered = conversations.filter((c) => {
    const name = c.contact.name || c.contact.phone;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const statusColor: Record<string, string> = {
    open: "bg-emerald-500",
    waiting: "bg-yellow-400",
    closed: "bg-gray-400",
  };

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">Inbox</h1>
            <Button variant="ghost" size="icon" onClick={fetchConversations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">Sin conversaciones</div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 px-3 py-3 border-b border-gray-100 hover:bg-gray-50 text-left transition-colors ${
                  selected?.id === conv.id ? "bg-emerald-50 border-l-2 border-l-emerald-500" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-medium text-emerald-700">
                    {(conv.contact.name || conv.contact.phone)[0].toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor[conv.status] || "bg-gray-400"}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {conv.contact.name || formatPhone(conv.contact.phone)}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-1">
                      {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {conv.agentMode === "ai" && (
                      <Bot className="w-3 h-3 text-purple-500 shrink-0" />
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="bg-emerald-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat view */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-medium text-emerald-700">
                {(selected.contact.name || selected.contact.phone)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selected.contact.name || formatPhone(selected.contact.phone)}
                </p>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{formatPhone(selected.contact.phone)}</span>
                  <Badge variant={selected.status as "open" | "closed" | "waiting"} className="ml-1">
                    {selected.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Modo:</span>
                <Select value={selected.agentMode} onValueChange={updateAgentMode}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Humano
                      </span>
                    </SelectItem>
                    <SelectItem value="ai">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-3 h-3" /> IA
                      </span>
                    </SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                    msg.direction === "outbound"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 shadow-sm rounded-bl-sm"
                  }`}
                >
                  {msg.sentBy === "ai" && (
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                      <Bot className="w-3 h-3" />
                      <span className="text-xs">IA</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.direction === "outbound" ? "text-emerald-200" : "text-gray-400"
                    }`}
                  >
                    {formatDateTime(msg.createdAt)}
                    {msg.status && msg.direction === "outbound" && (
                      <span className="ml-1">· {msg.status}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            {selected.agentMode === "ai" && (
              <p className="text-xs text-purple-600 mb-2 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                El agente de IA está manejando esta conversación
              </p>
            )}
            <div className="flex items-end gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecciona una conversación</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageSquare({ className }: { className: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
