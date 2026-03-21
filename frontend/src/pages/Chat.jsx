import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { useAuth } from '../contexts/AuthContext';

// ── Markdown renderer ──────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={i} style={{ color: '#2C2418', fontWeight: 600, fontSize: '0.95rem', marginTop: '16px', marginBottom: '6px' }}>{inlineFormat(trimmed.slice(4))}</h4>);
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ color: '#2C2418', fontWeight: 700, fontSize: '1.05rem', marginTop: '20px', marginBottom: '8px' }}>{inlineFormat(trimmed.slice(3))}</h3>);
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ color: '#2C2418', fontWeight: 700, fontSize: '1.15rem', marginTop: '20px', marginBottom: '8px' }}>{inlineFormat(trimmed.slice(2))}</h2>);
      i++; continue;
    }

    // Bullet list - collect consecutive items
    if (trimmed.match(/^[\-\*]\s/)) {
      const items = [];
      while (i < lines.length && (lines[i].trim().match(/^[\-\*]\s/) || lines[i].trim() === '')) {
        if (lines[i].trim()) items.push(lines[i].trim().replace(/^[\-\*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: '4px', listStyleType: 'disc' }}>{inlineFormat(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (trimmed.match(/^\d+[\.\)]\s/)) {
      const items = [];
      while (i < lines.length && (lines[i].trim().match(/^\d+[\.\)]\s/) || lines[i].trim() === '')) {
        if (lines[i].trim()) items.push(lines[i].trim().replace(/^\d+[\.\)]\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: '4px', listStyleType: 'decimal' }}>{inlineFormat(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i} style={{ margin: '6px 0' }}>{inlineFormat(trimmed)}</p>);
    i++;
  }

  return elements;
}

function inlineFormat(text) {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ── Typing indicator ───────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', height: '42px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <style>{`
        .typing-dot {
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #B5A68C;
          opacity: 0.25;
          will-change: opacity;
          animation: typingPulse 1.4s ease-in-out infinite;
        }
        @keyframes typingPulse {
          0%, 80%, 100% { opacity: 0.25; }
          40% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

// ── Relative time helper ───────────────────────────────────────────
function relativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `vor ${diffD} T.`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// ── Format currency helper ─────────────────────────────────────────
function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

// ── Building icon (inline SVG to avoid extra imports) ──────────────
function BuildingIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

// ── Sidebar item ───────────────────────────────────────────────────
function ConversationItem({ conv, isActive, onClick, onDelete }) {
  const [hovering, setHovering] = useState(false);
  const hasAnalysis = !!conv.analysis_id;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
        isActive
          ? 'bg-[#7C8B6F]/[0.12] text-[#2C2418]'
          : 'text-[#5C4F3D] hover:bg-[#F5F0E8]'
      }`}
    >
      <div className="flex items-center gap-2">
        {hasAnalysis && (
          <BuildingIcon className="w-3.5 h-3.5 text-[#7C8B6F] shrink-0" />
        )}
        <p className="text-[13px] font-medium truncate pr-6">
          {conv.title || 'Neue Unterhaltung'}
        </p>
      </div>
      {conv.last_message && (
        <p className={`text-[11px] text-[#8C7E6A] truncate mt-0.5 ${hasAnalysis ? 'pl-5.5' : ''}`}>
          {conv.last_message}
        </p>
      )}
      {hovering && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conv.id);
          }}
          className="absolute right-2 top-2.5 text-[#B5A68C] hover:text-[#5C4F3D] transition-colors"
          title="Loeschen"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </button>
  );
}

// ── Analysis info card at top of chat ──────────────────────────────
function AnalysisInfoCard({ analysisData }) {
  if (!analysisData) return null;
  return (
    <div className="bg-white border border-[#E8E0D4] rounded-2xl px-4 py-3 mb-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#7C8B6F]/10 rounded-[10px] flex items-center justify-center shrink-0">
          <BuildingIcon className="w-5 h-5 text-[#7C8B6F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#2C2418] truncate">
            {analysisData.title || `${analysisData.stadt || 'Unbekannt'} - Analyse`}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {analysisData.kaufpreis > 0 && (
              <span className="text-[11px] text-[#8C7E6A]">{formatCurrency(analysisData.kaufpreis)}</span>
            )}
            {analysisData.gesamtscore > 0 && (
              <span className="text-[11px] font-medium text-[#7C8B6F]">Score: {Math.round(analysisData.gesamtscore)}/100</span>
            )}
            {analysisData.stadt && (
              <span className="text-[11px] text-[#B5A68C]">{analysisData.stadtteil ? `${analysisData.stadtteil}, ` : ''}{analysisData.stadt}</span>
            )}
          </div>
        </div>
        <Link
          to={`/library/${analysisData.id}`}
          className="text-[11px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors shrink-0"
        >
          Analyse ansehen
        </Link>
      </div>
    </div>
  );
}

// ── Nudge banner after N general messages ──────────────────────────
function AnalyseNudgeBanner() {
  return (
    <div className="max-w-2xl mx-auto my-4">
      <div className="bg-[#F5F0E8] border border-[#E8E0D4] rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="shrink-0 w-8 h-8 bg-[#7C8B6F]/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-[#7C8B6F]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-[#5C4F3D]">
            <span className="font-medium">Tipp:</span> Erstelle eine Objektanalyse fuer eine detaillierte, personalisierte Beratung.
          </p>
        </div>
        <Link
          to="/analyze"
          className="shrink-0 text-[12px] font-medium text-[#7C8B6F] hover:text-[#6B7A5E] transition-colors"
        >
          Analyse starten
        </Link>
      </div>
    </div>
  );
}

// ── Main Chat component ────────────────────────────────────────────
export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendMessage, stopStreaming, isStreaming } = useStreamingChat();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLinkHandled, setAnalysisLinkHandled] = useState(false);
  const [generalMessageCount, setGeneralMessageCount] = useState(0);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    return localStorage.getItem('welcomeBannerDismissed') === 'true';
  });

  const showWelcomeBanner = !welcomeDismissed && !localStorage.getItem('profileSetupDone');

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem('welcomeBannerDismissed', 'true');
  };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ── Fetch conversations ────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(
          Array.isArray(data) ? data : data.conversations || []
        );
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Handle analysis_id from URL search params ──────────────────
  useEffect(() => {
    const analysisId = searchParams.get('analysis_id');
    if (!analysisId || analysisLinkHandled) return;

    setAnalysisLinkHandled(true);

    (async () => {
      try {
        const token = localStorage.getItem('token');

        // Load analysis data
        const analysisRes = await fetch(`${API_BASE}/library/${analysisId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!analysisRes.ok) return;
        const analysis = await analysisRes.json();
        setAnalysisData(analysis);

        // Find existing or create new conversation for this analysis
        const convRes = await fetch(`${API_BASE}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: analysis.title || `${analysis.stadt || 'Unbekannt'} - Beratung`,
            analysis_id: parseInt(analysisId),
          }),
        });
        if (!convRes.ok) return;
        const conv = await convRes.json();

        // Navigate to the conversation (replace the ?analysis_id URL)
        navigate(`/chat/${conv.id}`, { replace: true });

        if (conv.existing) {
          // Existing conversation - load its messages
          const msgRes = await fetch(`${API_BASE}/conversations/${conv.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setActiveConversation(msgData);
            setMessages(msgData.messages || []);
          }
        } else {
          // New conversation - show welcome message
          setActiveConversation(conv);
          setMessages([
            {
              role: 'assistant',
              content: 'Ich habe alle Daten zu diesem Objekt. Stelle mir eine Frage zur Analyse, Finanzierung, Verhandlung oder zu anderen Aspekten.',
            },
          ]);
        }

        loadConversations();
      } catch {
        // silent
      }
    })();
  }, [searchParams, analysisLinkHandled, navigate, loadConversations]);

  // ── Load conversation by id ────────────────────────────────────
  useEffect(() => {
    if (!conversationId) {
      if (!searchParams.get('analysis_id')) {
        setActiveConversation(null);
        setMessages([]);
        setAnalysisData(null);
        setGeneralMessageCount(0);
      }
      return;
    }
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/conversations/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setActiveConversation(data);
          setMessages(data.messages || []);

          // Count general messages for nudge
          if (!data.analysis_id) {
            const userMsgs = (data.messages || []).filter(m => m.role === 'user');
            setGeneralMessageCount(userMsgs.length);
          } else {
            setGeneralMessageCount(0);
          }

          // If conversation is linked to an analysis, load it
          if (data.analysis_id && !analysisData) {
            const analysisRes = await fetch(`${API_BASE}/library/${data.analysis_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (analysisRes.ok) {
              setAnalysisData(await analysisRes.json());
            }
          } else if (!data.analysis_id) {
            setAnalysisData(null);
          }
        }
      } catch {
        // silent
      }
    })();
  }, [conversationId]);

  // ── Auto-scroll ────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ── Auto-resize textarea ───────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // ── Send handler ───────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideMessage) => {
      const text = (overrideMessage || input).trim();
      if (!text || isStreaming) return;

      setInput('');
      const userMsg = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);

      // Track general message count for nudge
      if (!analysisData && !activeConversation?.analysis_id) {
        setGeneralMessageCount((prev) => prev + 1);
      }

      // Placeholder for assistant response
      const assistantMsg = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMsg]);

      const convId = activeConversation?.id || conversationId || null;

      sendMessage(
        text,
        convId,
        // onChunk
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return updated;
          });
        },
        // onDone
        (data) => {
          if (data?.conversation_id && !convId) {
            navigate(`/chat/${data.conversation_id}`, { replace: true });
          }
          loadConversations();
        },
        // onError
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content:
                  'Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
              };
            }
            return updated;
          });
        }
      );
    },
    [
      input,
      isStreaming,
      activeConversation,
      conversationId,
      analysisData,
      sendMessage,
      navigate,
      loadConversations,
    ]
  );

  // ── New conversation ───────────────────────────────────────────
  const handleNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setAnalysisData(null);
    setAnalysisLinkHandled(false);
    setGeneralMessageCount(0);
    navigate('/chat');
    setSidebarOpen(false);
  };

  // ── Delete conversation ────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id || conversationId === String(id)) {
        handleNewConversation();
      }
    } catch {
      // silent
    }
  };

  // ── Title editing ──────────────────────────────────────────────
  const startEditTitle = () => {
    setTitleDraft(activeConversation?.title || '');
    setEditingTitle(true);
  };
  const saveTitle = async () => {
    setEditingTitle(false);
    if (!activeConversation?.id || !titleDraft.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });
      setActiveConversation((prev) => ({ ...prev, title: titleDraft.trim() }));
      loadConversations();
    } catch {
      // silent
    }
  };

  const isNewChat = messages.length === 0;

  // ── Separate conversations into analysis-linked and general ────
  const analysisChats = conversations.filter((c) => c.analysis_id);
  const generalChats = conversations.filter((c) => !c.analysis_id);

  // ── Show nudge after 3 general messages ────────────────────────
  const showNudge = !analysisData && !activeConversation?.analysis_id && generalMessageCount >= 3;

  // ── Sidebar content ────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C8B6F] text-white text-[13px] font-medium rounded-xl hover:bg-[#6B7A5F] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Neue Unterhaltung
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Analysis-linked chats */}
        {analysisChats.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-[#8C7E6A] uppercase tracking-wider px-3 mb-1.5">
              Objekt-Chats
            </p>
            <div className="space-y-0.5">
              {analysisChats.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={
                    activeConversation?.id === conv.id ||
                    conversationId === String(conv.id)
                  }
                  onClick={() => {
                    navigate(`/chat/${conv.id}`);
                    setSidebarOpen(false);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* General chats */}
        {generalChats.length > 0 && (
          <div>
            {analysisChats.length > 0 && (
              <p className="text-[10px] font-semibold text-[#8C7E6A] uppercase tracking-wider px-3 mb-1.5">
                Allgemeine Chats
              </p>
            )}
            <div className="space-y-0.5">
              {generalChats.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={
                    activeConversation?.id === conv.id ||
                    conversationId === String(conv.id)
                  }
                  onClick={() => {
                    navigate(`/chat/${conv.id}`);
                    setSidebarOpen(false);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <p className="text-[12px] text-[#B5A68C] text-center py-8 px-2">
            Noch keine Unterhaltungen. Starte eine neue Konversation.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-60px)] md:h-screen bg-[#FAF7F2] overflow-hidden">
      {/* ── Desktop sidebar ──────────────────────────── */}
      <div className="hidden md:flex flex-col w-[280px] bg-[#F5F0E8] border-r border-[#E8E0D4] shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile sidebar overlay ───────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#2C2418]/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-[#F5F0E8] border-r border-[#E8E0D4] z-50 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* ── Main chat area ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-[#E8E0D4] bg-white/60 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-[#8C7E6A] hover:text-[#2C2418] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              className="flex-1 text-[15px] font-semibold text-[#2C2418] bg-transparent border-b border-[#7C8B6F] outline-none py-0.5"
            />
          ) : (
            <h1
              onClick={activeConversation ? startEditTitle : undefined}
              className={`flex-1 text-[15px] font-semibold text-[#2C2418] truncate ${
                activeConversation ? 'cursor-pointer hover:text-[#7C8B6F]' : ''
              }`}
            >
              {activeConversation?.title || 'Neue Unterhaltung'}
            </h1>
          )}
          {isStreaming && (
            <button
              onClick={stopStreaming}
              className="text-[12px] text-[#8C7E6A] hover:text-[#5C4F3D] border border-[#E8E0D4] rounded-lg px-2.5 py-1 transition-colors"
            >
              Stoppen
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-6"
        >
          {isNewChat ? (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto">
              {/* Welcome Banner for new users */}
              {showWelcomeBanner && (
                <div className="w-full mb-6 p-4 bg-[#7C8B6F]/[0.08] border border-[#7C8B6F]/20 rounded-2xl relative">
                  <button
                    onClick={dismissWelcome}
                    className="absolute top-3 right-3 text-[#8C7E6A] hover:text-[#2C2418] transition-colors text-lg leading-none"
                    aria-label="Schliessen"
                  >
                    &times;
                  </button>
                  <h3 className="text-[15px] font-semibold text-[#2C2418] mb-1">
                    Willkommen bei AmlakiAI{user?.username ? `, ${user.username}` : ''}!
                  </h3>
                  <p className="text-[13px] text-[#5C4F3D] mb-3 pr-6">
                    Richte dein Investoren-Profil ein, damit ich dich personalisiert beraten kann -- abgestimmt auf deine Ziele, Risikobereitschaft und finanzielle Situation.
                  </p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-[13px] font-medium text-[#7C8B6F] hover:text-[#5C4F3D] transition-colors"
                  >
                    Profil einrichten &rarr;
                  </button>
                </div>
              )}
              <div className="mb-8 text-center">
                <h2 className="text-[22px] font-bold text-[#2C2418] mb-2">
                  Wie kann ich helfen?
                </h2>
                <p className="text-[14px] text-[#8C7E6A]">
                  Dein KI-Berater fuer den Immobilienkauf im DACH-Raum
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {/* Primary: Analyze */}
                <button
                  onClick={() => navigate('/analyze')}
                  className="text-left p-4 bg-[#7C8B6F] border border-[#6B7A5E] rounded-2xl hover:bg-[#6B7A5E] transition-all duration-200 group"
                >
                  <p className="text-[13px] font-semibold text-white mb-1">
                    Neue Immobilie analysieren
                  </p>
                  <p className="text-[12px] text-white/70 leading-relaxed">
                    Expose hochladen oder Daten eingeben
                  </p>
                </button>
                {/* Secondary: Library */}
                <button
                  onClick={() => navigate('/library')}
                  className="text-left p-4 bg-white border border-[#E8E0D4] rounded-2xl hover:border-[#B5A68C] hover:shadow-sm transition-all duration-200 group"
                >
                  <p className="text-[13px] font-semibold text-[#2C2418] mb-1 group-hover:text-[#7C8B6F] transition-colors">
                    Objekt aus Bibliothek laden
                  </p>
                  <p className="text-[12px] text-[#8C7E6A] leading-relaxed">
                    Gespeicherte Analysen aufrufen
                  </p>
                </button>
                {/* Tertiary: General question */}
                <button
                  onClick={() => setInput('Ich habe eine allgemeine Frage: ')}
                  className="text-left p-4 bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl hover:border-[#B5A68C] transition-all duration-200 group"
                >
                  <p className="text-[13px] font-semibold text-[#5C4F3D] mb-1 group-hover:text-[#7C8B6F] transition-colors">
                    Allgemeine Frage stellen
                  </p>
                  <p className="text-[12px] text-[#8C7E6A] leading-relaxed">
                    Finanzierung, Steuern, Recht
                  </p>
                </button>
                {/* Tertiary: Tools */}
                <button
                  onClick={() => navigate('/tools')}
                  className="text-left p-4 bg-[#FAF7F2] border border-[#E8E0D4] rounded-2xl hover:border-[#B5A68C] transition-all duration-200 group"
                >
                  <p className="text-[13px] font-semibold text-[#5C4F3D] mb-1 group-hover:text-[#7C8B6F] transition-colors">
                    Rechner verwenden
                  </p>
                  <p className="text-[12px] text-[#8C7E6A] leading-relaxed">
                    Projektion, Szenarien, Fairer Preis
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Analysis context card */}
              {analysisData && <AnalysisInfoCard analysisData={analysisData} />}

              {messages.map((msg, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] px-4 py-3 text-[14px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#7C8B6F] text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-[#2C2418] rounded-2xl rounded-bl-md border border-[#E8E0D4]'
                      }`}
                    >
                      {msg.role === 'assistant'
                        ? renderMarkdown(msg.content)
                        : msg.content}
                      {msg.role === 'assistant' &&
                        !msg.content &&
                        isStreaming &&
                        idx === messages.length - 1 && <TypingIndicator />}
                    </div>
                  </div>
                  {/* Show nudge banner after the 3rd user message in general chat */}
                  {showNudge && msg.role === 'user' && (() => {
                    const userMsgsSoFar = messages.slice(0, idx + 1).filter(m => m.role === 'user').length;
                    return userMsgsSoFar === 3;
                  })() && <AnalyseNudgeBanner />}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 md:px-6 pb-4 pt-2">
          <div className="max-w-2xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={analysisData ? 'Frage zu diesem Objekt stellen...' : 'Stelle eine Frage zum Immobilienkauf...'}
              rows={1}
              className="w-full resize-none rounded-full bg-white border border-[#E8E0D4] pl-5 pr-12 py-3 text-[14px] text-[#2C2418] placeholder:text-[#B5A68C] outline-none focus:border-[#7C8B6F] transition-colors"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 bottom-2 w-9 h-9 flex items-center justify-center rounded-full bg-[#7C8B6F] text-white disabled:opacity-40 hover:bg-[#6B7A5F] transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
