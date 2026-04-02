import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';

const QUICK_QUESTIONS = [
  { category: 'Marktpreise', questions: [
    'Was kostet eine Wohnung in Munchen pro qm?',
    'Wie sind die Immobilienpreise in Hamburg?',
    'Was sind aktuelle Mietpreise in Berlin?',
    'Wie hat sich der Markt in Frankfurt entwickelt?'
  ]},
  { category: 'Finanzierung', questions: [
    'Was ist der Unterschied zwischen Zinsbindung und Laufzeit?',
    'Wie viel Eigenkapital brauche ich wirklich?',
    'Was bedeutet Annuitat?',
    'Wann lohnt sich ein Forward-Darlehen?'
  ]},
  { category: 'F\u00f6rderungen', questions: [
    'Welche KfW-Programme gibt es 2025?',
    'Was ist KfW 300 Wohneigentum f\u00fcr Familien?',
    'Wie funktioniert Jung kauft Alt?',
    'Welche Landesf\u00f6rderungen gibt es?'
  ]},
  { category: 'Steuern', questions: [
    'Wie funktioniert die AfA bei Vermietung?',
    'Was kann ich als Werbungskosten absetzen?',
    'Wann ist ein Immobilienverkauf steuerfrei?',
    'Was ist der Unterschied zwischen linearer und degressiver AfA?'
  ]},
  { category: 'Recht', questions: [
    'Wie funktioniert eine Mieterh\u00f6hung?',
    'Was ist die Mietpreisbremse?',
    'Welche K\u00fcndigungsfristen gelten?',
    'Was muss ich bei WEG beachten?'
  ]},
  { category: 'Bewertung', questions: [
    'Was ist ein guter Kaufpreisfaktor?',
    'Wie berechne ich die Bruttorendite?',
    'Was sind Red Flags beim Immobilienkauf?',
    'Wie bewerte ich eine Eigentumswohnung?'
  ]}
];

function AIChat({ analysisContext, isProjectSpecific = false }) {
  const { token } = useAuth();

  const getInitialMessage = () => {
    if (isProjectSpecific && analysisContext) {
      const stadt = analysisContext.stadt || 'unbekannt';
      const kaufpreis = analysisContext.kaufpreis ? `${(analysisContext.kaufpreis / 1000).toFixed(0)}k` : 'unbekannt';
      const score = analysisContext.gesamtscore ? `${Math.round(analysisContext.gesamtscore)}/100` : '';
      return {
        role: 'assistant',
        content: `Ich bin Ihr Assistent f\u00fcr **diese Immobilie** in ${stadt} (${kaufpreis})!\n\n` +
          (score ? `Aktueller Score: **${score}**\n\n` : '') +
          `Frag mich zu diesem Objekt:\n` +
          `- "Ist der Preis angemessen?"\n` +
          `- "Wie kann ich den Cashflow verbessern?"\n` +
          `- "Welche F\u00f6rderungen passen hier?"\n` +
          `- "Was sind die Risiken bei dieser Immobilie?"`
      };
    }
    return {
      role: 'assistant',
      content: 'Hallo! Ich bin dein **Immobilien-Experte**.\n\nIch helfe dir bei **allem rund um Immobilien:**\n- Finanzierung & Eigenkapital-Strategien\n- KfW-F\u00f6rderungen & Zusch\u00fcsse maximieren\n- Steuern, AfA & Abschreibungen\n- Rendite-Analyse & Cashflow-Berechnung\n- Mietrecht, WEG & Due Diligence\n- **Live-Marktpreise** f\u00fcr jede Stadt\n\nStell mir jede Frage!'
    };
  };

  const [messages, setMessages] = useState([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [stadtInput, setStadtInput] = useState(analysisContext?.stadt || '');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (question = input) => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput(''); setIsLoading(true);

    const stadtMatch = question.match(/(?:in|fur|nach)\s+([A-ZAOU a-zaou\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df-]+(?:\s+[A-ZAOU a-zaou\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df-]+)?)/i);
    const detectedStadt = stadtMatch ? stadtMatch[1] : stadtInput;

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: question, context: analysisContext || null, stadt: detectedStadt || null })
      });
      if (response.ok) {
        const data = await response.json();
        let responseText = data.response;
        if (data.marktdaten_verwendet) {
          responseText = `*Live-Daten f\u00fcr ${data.recherche_standort}*\n\n${responseText}`;
        }
        setMessages(prev => [...prev, { role: 'assistant', content: responseText, liveData: data.marktdaten_verwendet, standort: data.recherche_standort }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: generateLocalResponse(question) }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: generateLocalResponse(question) }]);
    } finally { setIsLoading(false); }
  };

  const generateLocalResponse = (question) => {
    const q = question.toLowerCase();
    if (q.includes('eigenkapital') || q.includes('ek')) return `**Eigenkapital-Anforderungen:**\n\nDie meisten Banken erwarten mindestens die **Kaufnebenkosten** (ca. 10-12%) als Eigenkapital.\n\n**Szenarien:**\n- **20%+ EK:** Beste Konditionen, 95% Bewilligungschance\n- **10-20% EK:** Gute Konditionen, 80% Chance\n- **Nur Nebenkosten:** M\u00f6glich, aber h\u00f6here Zinsen (+0,2-0,5%)\n- **110% Finanzierung:** Nur bei sehr guter Bonit\u00e4t`;
    if (q.includes('kfw') || q.includes('forderung')) return `**KfW-F\u00f6rderungen 2025:**\n\n**KfW 300 - Wohneigentum f\u00fcr Familien:**\n- Zinssatz: nur **1,12%**\n- Kredit: 170.000-270.000 je nach Kinderzahl\n- Einkommensgrenze: 90.000 + 10.000/Kind`;
    return `Ich helfe dir bei:\n\n**Finanzierung** - Eigenkapital, Bankenvergleich\n**F\u00f6rderungen** - KfW, Landesf\u00f6rderungen\n**Steuern** - AfA, Werbungskosten\n**Recht** - Mietrecht, WEG\n\nStell mir eine konkrete Frage!`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#E8E0D4]">
        <h3 className="text-[16px] font-semibold text-[#2C2418]">Immobilien-Assistent AI</h3>
        <p className="text-[#8C7E6A] text-[13px] mt-1">Frag mich alles zu Immobilien</p>
      </div>

      {/* Quick Questions */}
      <div className="p-4 border-b border-[#E8E0D4] overflow-x-auto">
        <div className="flex gap-2">
          {QUICK_QUESTIONS.map((cat) => (
            <button key={cat.category} onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.category
                  ? 'bg-[#7C8B6F]/10 text-[#7C8B6F] border border-[#7C8B6F]/30'
                  : 'bg-[#F5F0E8] text-[#8C7E6A] hover:bg-[#E8E0D4] border border-[#E8E0D4]'
              }`}>
              {cat.category}
            </button>
          ))}
        </div>
        {activeCategory && (
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_QUESTIONS.find(c => c.category === activeCategory)?.questions.map((q, i) => (
              <button key={i} onClick={() => { handleSend(q); setActiveCategory(null); }}
                className="text-[12px] px-3 py-1.5 bg-white border border-[#E8E0D4] rounded-[8px] text-[#5C4F3D] hover:text-[#7C8B6F] hover:border-[#7C8B6F]/30 transition-all text-left">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-[16px] ${
              message.role === 'user'
                ? 'bg-[#7C8B6F] text-white'
                : 'bg-[#F5F0E8] border border-[#E8E0D4]'
            }`}>
              <div className={`text-[14px] whitespace-pre-line ${message.role === 'assistant' ? 'text-[#5C4F3D]' : ''}`}>
                {message.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <strong className={message.role === 'assistant' ? 'text-[#2C2418]' : 'text-white'}>{line.replace(/\*\*/g, '')}</strong>
                    ) : line.startsWith('- ') ? (
                      <span className="block ml-2">{line.substring(2)}</span>
                    ) : line.startsWith('|') ? (
                      <span className="block font-mono text-[12px]">{line}</span>
                    ) : (
                      line
                    )}
                    {i < message.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#F5F0E8] border border-[#E8E0D4] p-4 rounded-[16px]">
              <div className="flex items-center gap-[6px]">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-[#E8E0D4]">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Stelle eine Frage..."
            className="flex-1 px-4 py-3.5 md:py-3 min-h-[44px] bg-white border border-[#E8E0D4] rounded-[12px] focus:border-[#7C8B6F] focus:outline-none focus:ring-2 focus:ring-[#7C8B6F]/10 transition-all text-[#2C2418] placeholder:text-[#B5A68C] text-[15px]"
          />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
            className="px-4 md:px-6 py-3.5 md:py-3 min-h-[44px] bg-[#7C8B6F] text-white rounded-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed active:opacity-80 hover:bg-[#6B7A5E] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;
