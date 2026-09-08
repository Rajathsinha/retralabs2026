import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import type { AirtableRecord } from './types';
import {
  queryAdminAi,
  SUGGESTED_PROMPTS,
  type AiCopilotResponse,
} from '../../utils/adminAiEngine';

interface AdminAiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AirtableRecord[];
  onSelectOrder?: (record: AirtableRecord) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  response?: AiCopilotResponse;
  timestamp: Date;
}

export function AdminAiCopilotModal({
  isOpen,
  onClose,
  records,
  onSelectOrder,
}: AdminAiCopilotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your **RetraLabs Admin AI Copilot**. Ask me anything about store performance, orders, product sales, revenue, manual UPI verification, shipping routing, AWB status, or deep-trace an order.',
      response: queryAdminAi('How is business doing?', records),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate snappy AI reasoning
    setTimeout(() => {
      const aiResponse = queryAdminAi(q, records);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse.summary,
        response: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 280);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleOrderClick = (orderId: string, recordId?: string) => {
    if (!onSelectOrder) return;
    const cleanId = orderId.toLowerCase().replace('#', '');
    const found = records.find((r) => {
      const oid = String(r.fields['orderID'] || '').toLowerCase().replace('#', '');
      return oid === cleanId || r.id === recordId || r.id.toLowerCase() === cleanId;
    });
    if (found) {
      onSelectOrder(found);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity animate-[fadeIn_0.15s_ease]">
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-slate-900 text-white shadow-2xl border-l border-slate-800 animate-[slideLeft_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-md shadow-blue-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  RetraLabs AI Admin Copilot
                </h2>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                  Live Airtable
                </span>
              </div>
              <p className="text-xs text-slate-400">
                11 Intelligence Domains • {records.length} active orders loaded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome',
                    sender: 'ai',
                    text: 'Chat history cleared. How can I assist you with RetraLabs order intelligence today?',
                    timestamp: new Date(),
                  },
                ])
              }
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Close Copilot"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggested Prompts Bar */}
        <div className="border-b border-slate-800/60 bg-slate-950/40 px-4 py-2.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Suggestions:
            </span>
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSend(p.query)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-blue-600/20 hover:border-blue-500/50 hover:text-blue-200 transition-all active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const resp = msg.response;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[84%] rounded-2xl p-4 text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/20'
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-xs border border-slate-700/60 shadow-lg'
                  }`}
                >
                  {isUser ? (
                    <p className="font-medium leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="space-y-3">
                      {/* AI Domain Badge & Title */}
                      {resp && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-300 border border-blue-500/30">
                              {resp.domain}
                            </span>
                            <h4 className="font-bold text-white text-sm">{resp.title}</h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopy(resp.rawMarkdown, msg.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                            title="Copy response markdown"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Summary Text */}
                      <div className="text-slate-300 leading-relaxed space-y-1 text-xs sm:text-sm whitespace-pre-wrap">
                        {msg.text}
                      </div>

                      {/* Metrics Chips */}
                      {resp?.metrics && resp.metrics.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {resp.metrics.map((m, i) => {
                            let toneClass = 'bg-slate-900/80 border-slate-700/80 text-white';
                            if (m.tone === 'positive')
                              toneClass = 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300';
                            else if (m.tone === 'amber')
                              toneClass = 'bg-amber-950/40 border-amber-800/50 text-amber-300';
                            else if (m.tone === 'blue')
                              toneClass = 'bg-blue-950/40 border-blue-800/50 text-blue-300';
                            else if (m.tone === 'negative')
                              toneClass = 'bg-rose-950/40 border-rose-800/50 text-rose-300';

                            return (
                              <div
                                key={i}
                                className={`rounded-xl border p-2.5 ${toneClass} transition-all`}
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                                  {m.label}
                                </p>
                                <p className="text-base font-extrabold tracking-tight mt-0.5">
                                  {m.value}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Investigation Trace Timeline */}
                      {resp?.investigationTrace && resp.investigationTrace.length > 0 && (
                        <div className="mt-2 space-y-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Investigation Trace Pipeline
                          </h5>
                          {resp.investigationTrace.map((t, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                  t.status === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : t.status === 'warning'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-300 mr-1">{t.label}:</span>
                                <span className="text-slate-400">{t.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Breakdown Table */}
                      {resp?.breakdownTable && (
                        <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/60 mt-2">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <tr>
                                {resp.breakdownTable.headers.map((h, i) => (
                                  <th key={i} className="px-3 py-2 whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
                              {resp.breakdownTable.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Related Orders Clickable Pills */}
                      {resp?.relatedOrders && resp.relatedOrders.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                            Relevant Orders (Click to open details):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {resp.relatedOrders.map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => handleOrderClick(o.orderId, o.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white hover:bg-blue-950/30 transition-all font-mono"
                              >
                                <span className="font-bold text-blue-400">#{o.orderId}</span>
                                <span className="text-slate-400 truncate max-w-[100px]">
                                  {o.name}
                                </span>
                                <span className="font-bold text-emerald-400">
                                  ₹{o.total.toLocaleString('en-IN')}
                                </span>
                                <ChevronRight className="w-3 h-3 text-slate-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-center gap-3 text-slate-400 text-xs animate-pulse">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl bg-slate-800/90 border border-slate-700/60 px-4 py-2.5 text-slate-300">
                Analyzing active Airtable records across 11 domains...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800/80 bg-slate-950/90 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything: 'How many reta orders last week?', 'Why hasn't #20260907013 shipped?', 'How is business doing?'…"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 hover:brightness-110 disabled:opacity-40 transition-all shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Powered by RetraLabs Intelligence Engine</span>
            <span>Airtable Live Source of Truth • No Inventory Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
