import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';
import { Navigate } from 'react-router-dom';

function Admin() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingLimit, setEditingLimit] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentRunning, setAgentRunning] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [emailModal, setEmailModal] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCredits, setEmailCredits] = useState(1);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [revenuePeriod, setRevenuePeriod] = useState('30d');
  const [expandedUser, setExpandedUser] = useState(null);
  const [chartMode, setChartMode] = useState('revenue'); // 'revenue' | 'users'
  const [usersChart, setUsersChart] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [perfHours, setPerfHours] = useState(24);
  const [perfLoading, setPerfLoading] = useState(false);

  const fetchPerf = async (hours) => {
    setPerfLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/perf?hours=${hours}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setPerfData(await res.json());
    } catch (err) { /* ignore */ }
    finally { setPerfLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'perf' && user?.is_superuser) fetchPerf(perfHours);
  }, [activeTab, perfHours]);

  useEffect(() => { if (user?.is_superuser) { fetchData(); fetchAgents(); fetchRevenue('30d'); } }, []);

  if (!user?.is_superuser) {
    return <Navigate to="/chat" replace />;
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/agents`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAgents(await res.json());
    } catch (err) { /* ignore */ }
  };

  const toggleAgent = async (agentId, currentEnabled) => {
    try {
      await fetch(`${API_BASE}/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      await fetchAgents();
    } catch (err) { alert(err.message); }
  };

  const runAgent = async (agentId) => {
    setAgentRunning(agentId);
    try {
      const res = await fetch(`${API_BASE}/admin/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'error') {
        alert('Agent Fehler: ' + (data.error || 'Unbekannt'));
      }
      await fetchAgents();
    } catch (err) { alert(err.message); }
    finally { setAgentRunning(null); }
  };

  const saveAgent = async (agentId, updates) => {
    try {
      await fetch(`${API_BASE}/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      setEditingAgent(null);
      await fetchAgents();
    } catch (err) { alert(err.message); }
  };

  const createAgent = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/admin/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
      setShowCreateAgent(false);
      await fetchAgents();
    } catch (err) { alert(err.message); }
  };

  const deleteAgent = async (agentId, name) => {
    if (!confirm(`Agent "${name}" wirklich loeschen?`)) return;
    try {
      await fetch(`${API_BASE}/admin/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchAgents();
    } catch (err) { alert(err.message); }
  };

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!usersRes.ok || !statsRes.ok) throw new Error('Fehler beim Laden der Admin-Daten');
      setUsers(await usersRes.json()); setStats(await statsRes.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchRevenue = async (period) => {
    try {
      const res = await fetch(`${API_BASE}/admin/revenue?period=${period}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setRevenue(await res.json());
        setRevenuePeriod(period);
      }
    } catch (err) { /* ignore */ }
  };

  const fetchUsersChart = async (period) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users-chart?period=${period}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setUsersChart(await res.json());
        setRevenuePeriod(period);
      }
    } catch (err) { /* ignore */ }
  };

  const switchChartMode = (mode) => {
    setChartMode(mode);
    if (mode === 'users' && !usersChart) {
      fetchUsersChart(revenuePeriod);
    }
  };

  const handlePeriodChange = (period) => {
    if (chartMode === 'revenue') {
      fetchRevenue(period);
    } else {
      fetchUsersChart(period);
    }
  };

  const formatEur = (cents) => {
    return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
  };

  const packageLabel = (pkg) => {
    const labels = { single: '1 Analyse (9\u20ac)', pack5: '5 Analysen (35\u20ac)', pack10: '10 Analysen (50\u20ac)' };
    return labels[pkg] || pkg;
  };

  const openFeedbackEmail = (u) => {
    setEmailModal(u);
    setEmailSubject('Kurze Frage zu deiner Amlaki-Analyse');
    setEmailBody(`Hi ${u.username},\n\nich bin Arya, Gruender von Amlaki. Du bist einer unserer allerersten Nutzer — und dein Feedback ist Gold wert.\n\nDrei kurze Fragen (dauert 2 Minuten):\n\n1. Was hat dich dazu gebracht, Amlaki auszuprobieren?\n2. War die Analyse hilfreich? Was hat gefehlt oder gestoert?\n3. Wuerdest du Amlaki weiterempfehlen? Wenn nein — warum nicht?\n\nAls Dankeschoen schenke ich dir eine weitere kostenlose Analyse.\n\nEinfach auf diese Mail antworten — kein Formular, kein Link.\n\nBeste Gruesse\nArya\nGruender, Amlaki`);
    setEmailCredits(1);
    setEmailResult(null);
  };

  const sendEmailToUser = async () => {
    if (!emailModal) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${emailModal.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, add_credits: emailCredits })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Fehler beim Senden');
      setEmailResult({ success: true, message: data.message });
      await fetchData();
    } catch (err) {
      setEmailResult({ success: false, message: err.message });
    } finally { setEmailSending(false); }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ is_active: !currentStatus }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Fehler'); }
      await fetchData();
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ is_superuser: !currentStatus }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Fehler'); }
      await fetchData();
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const deleteUser = async (userId, username) => {
    if (!confirm(`User "${username}" wirklich l\u00f6schen? Alle Analysen werden ebenfalls gel\u00f6scht!`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Fehler'); }
      await fetchData(); setSelectedUser(null);
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const updateLimit = async (userId, newLimit) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ usage_limit_usd: parseFloat(newLimit) }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Fehler'); }
      await fetchData(); setEditingLimit(null);
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatRelativeTime = (dateString) => {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `vor ${diffMins} Min`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `vor ${diffHours} Std`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return formatDate(dateString);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center gap-[6px] mx-auto mb-4 justify-center">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
        <p className="text-[#8C7E6A] text-[14px]">Lade Admin-Dashboard...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-white rounded-[16px] p-8 border border-[#E8E0D4] text-center">
        <p className="text-[#B85C5C] text-[16px] mb-4">{error}</p>
        <button onClick={fetchData} className="px-6 py-3 bg-[#7C8B6F] text-white rounded-full hover:bg-[#6B7A5E] text-[14px] font-medium">Erneut versuchen</button>
      </div>
    </div>
  );

  return (
    <div className="px-6 md:px-16 lg:px-20 py-12 md:py-20">
      <div className="max-w-[1100px] space-y-8">
        {/* Header */}
        <div className="fade-in">
          <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-[#2C2418] leading-[1.05]">Admin Dashboard</h1>
          <div className="flex items-center gap-4 mt-4">
            <button onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all ${activeTab === 'users' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F] border border-[#7C8B6F]/30' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'}`}>
              Users
            </button>
            <button onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all ${activeTab === 'agents' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F] border border-[#7C8B6F]/30' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'}`}>
              Research Agents
            </button>
            <button onClick={() => setActiveTab('perf')}
              className={`px-4 py-2 rounded-[10px] text-[14px] font-medium transition-all ${activeTab === 'perf' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F] border border-[#7C8B6F]/30' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'}`}>
              Performance
            </button>
          </div>
        </div>

        {/* ===== AGENTS TAB ===== */}
        {activeTab === 'agents' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#2C2418]">Research Agents</h2>
              <div className="flex gap-2">
                <button onClick={fetchAgents} className="text-[13px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors">Aktualisieren</button>
                <button onClick={() => setShowCreateAgent(true)} className="px-3 py-1.5 bg-[#7C8B6F] text-white text-[12px] font-medium rounded-[8px]">+ Neuer Agent</button>
              </div>
            </div>

            {/* Create Agent Form */}
            {showCreateAgent && (
              <div className="bg-white rounded-[16px] p-5 border-2 border-[#7C8B6F] space-y-3">
                <h3 className="text-[15px] font-semibold text-[#2C2418]">Neuen Agent erstellen</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input id="new-agent-name" placeholder="Name (z.B. recht_monitor)" className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                  <input id="new-agent-display" placeholder="Anzeigename" className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                </div>
                <input id="new-agent-desc" placeholder="Beschreibung" className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                <textarea id="new-agent-prompt" placeholder="KI-Prompt: Was soll der Agent tun?" rows={4} className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px] resize-none" />
                <input id="new-agent-urls" placeholder="URLs zum Scrapen (komma-getrennt)" className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                <div className="grid grid-cols-2 gap-3">
                  <input id="new-agent-file" placeholder="Ziel-File (z.B. market_data.md)" className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                  <input id="new-agent-section" placeholder="Ziel-Section (optional)" className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createAgent({
                    name: document.getElementById('new-agent-name').value,
                    display_name: document.getElementById('new-agent-display').value,
                    description: document.getElementById('new-agent-desc').value,
                    prompt: document.getElementById('new-agent-prompt').value,
                    source_urls: document.getElementById('new-agent-urls').value,
                    target_file: document.getElementById('new-agent-file').value,
                    target_section: document.getElementById('new-agent-section').value,
                  })} className="px-4 py-2 bg-[#7C8B6F] text-white text-[13px] font-medium rounded-[8px]">Erstellen</button>
                  <button onClick={() => setShowCreateAgent(false)} className="px-4 py-2 text-[#8C7E6A] text-[13px]">Abbrechen</button>
                </div>
              </div>
            )}

            {/* Agent Cards */}
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white rounded-[16px] p-4 border border-[#E8E0D4]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-[#2C2418]">{agent.display_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${agent.enabled ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'bg-[#B5A68C]/10 text-[#B5A68C]'}`}>
                        {agent.enabled ? 'Aktiv' : 'Aus'}
                      </span>
                      {agent.last_status && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          agent.last_status === 'success' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' :
                          agent.last_status === 'running' ? 'bg-[#D4A843]/10 text-[#D4A843]' :
                          'bg-[#B85C5C]/10 text-[#B85C5C]'
                        }`}>
                          {agent.last_status === 'success' ? 'OK' : agent.last_status === 'running' ? '...' : 'Fehler'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => runAgent(agent.id)} disabled={agentRunning !== null}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-[6px] transition-all ${
                          agentRunning === agent.id ? 'bg-[#D4A843]/10 text-[#D4A843]' : 'bg-[#7C8B6F] text-white hover:bg-[#6B7A5E]'
                        }`}>
                        {agentRunning === agent.id ? '...' : 'Run'}
                      </button>
                      <button onClick={() => toggleAgent(agent.id, agent.enabled)}
                        className={`w-10 h-5 rounded-full transition-all relative ${agent.enabled ? 'bg-[#7C8B6F]' : 'bg-[#E8E0D4]'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${agent.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                      <button onClick={() => setEditingAgent(editingAgent === agent.id ? null : agent.id)}
                        className="px-2 py-1 text-[11px] text-[#8C7E6A] hover:text-[#2C2418] border border-[#E8E0D4] rounded-[6px]">
                        {editingAgent === agent.id ? 'Zu' : 'Edit'}
                      </button>
                      <button onClick={() => deleteAgent(agent.id, agent.display_name)}
                        className="px-2 py-1 text-[11px] text-[#B85C5C] hover:bg-[#B85C5C]/10 border border-[#E8E0D4] rounded-[6px]">
                        X
                      </button>
                    </div>
                  </div>

                  {/* Info (collapsed) */}
                  {editingAgent !== agent.id && (
                    <div>
                      <p className="text-[12px] text-[#8C7E6A]">{agent.description}</p>
                      <p className="text-[11px] text-[#B5A68C] mt-1">
                        {agent.schedule}{agent.last_run ? ` | Letzter Lauf: ${formatRelativeTime(agent.last_run)}` : ''}
                        {agent.prompt ? ` | Prompt: ${agent.prompt.substring(0, 50)}...` : ' | Legacy-Agent'}
                      </p>
                      {agent.last_error && <p className="text-[11px] text-[#B85C5C] mt-1">{agent.last_error}</p>}
                      {agent.last_result && <p className="text-[11px] text-[#7C8B6F] mt-1 bg-[#7C8B6F]/5 p-2 rounded-[6px]">{agent.last_result.substring(0, 200)}...</p>}
                    </div>
                  )}

                  {/* Edit Form (expanded) */}
                  {editingAgent === agent.id && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-[#E8E0D4]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Name</label>
                          <input defaultValue={agent.display_name} id={`e-name-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Zeitplan</label>
                          <input defaultValue={agent.schedule} id={`e-sched-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8C7E6A] uppercase">Beschreibung</label>
                        <input defaultValue={agent.description} id={`e-desc-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8C7E6A] uppercase">KI-Prompt</label>
                        <textarea defaultValue={agent.prompt || ''} id={`e-prompt-${agent.id}`} rows={5} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px] resize-none font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8C7E6A] uppercase">URLs (komma-getrennt)</label>
                        <input defaultValue={agent.source_urls || ''} id={`e-urls-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Ziel-File</label>
                          <input defaultValue={agent.target_file || ''} id={`e-file-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Ziel-Section</label>
                          <input defaultValue={agent.target_section || ''} id={`e-section-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Modell</label>
                          <select defaultValue={agent.model || 'claude-haiku-4-5-20251001'} id={`e-model-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]">
                            <option value="claude-haiku-4-5-20251001">Haiku 4.5 (guenstig)</option>
                            <option value="claude-sonnet-4-20250514">Sonnet 4 (besser)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8C7E6A] uppercase">Max Tokens</label>
                          <input type="number" defaultValue={agent.max_tokens || 1500} id={`e-tokens-${agent.id}`} className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[6px] text-[12px]" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveAgent(agent.id, {
                          display_name: document.getElementById(`e-name-${agent.id}`).value,
                          description: document.getElementById(`e-desc-${agent.id}`).value,
                          schedule: document.getElementById(`e-sched-${agent.id}`).value,
                          prompt: document.getElementById(`e-prompt-${agent.id}`).value,
                          source_urls: document.getElementById(`e-urls-${agent.id}`).value,
                          target_file: document.getElementById(`e-file-${agent.id}`).value,
                          target_section: document.getElementById(`e-section-${agent.id}`).value,
                          model: document.getElementById(`e-model-${agent.id}`).value,
                          max_tokens: parseInt(document.getElementById(`e-tokens-${agent.id}`).value) || 1500,
                        })} className="px-3 py-1.5 bg-[#7C8B6F] text-white text-[12px] font-medium rounded-[6px]">Speichern</button>
                        <button onClick={() => setEditingAgent(null)} className="px-3 py-1.5 text-[#8C7E6A] text-[12px]">Abbrechen</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PERF TAB ===== */}
        {activeTab === 'perf' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#2C2418]">Performance</h2>
              <div className="flex items-center gap-2">
                {[1, 6, 24, 168].map(h => (
                  <button key={h} onClick={() => setPerfHours(h)}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${perfHours === h ? 'bg-[#7C8B6F] text-white' : 'bg-[#F5F0E8] text-[#5C4F3D] hover:bg-[#E8E0D4]'}`}>
                    {h === 168 ? '7T' : `${h}h`}
                  </button>
                ))}
                <button onClick={() => fetchPerf(perfHours)} className="px-3 py-1.5 text-[12px] text-[#8C7E6A] hover:text-[#7C8B6F]">Refresh</button>
              </div>
            </div>

            {perfLoading && <p className="text-[13px] text-[#8C7E6A]">Lade...</p>}

            {perfData && (
              <>
                <div className="text-[13px] text-[#8C7E6A]">
                  Letzte {perfData.period_hours}h: <span className="font-semibold text-[#2C2418]">{perfData.total_requests.toLocaleString('de-DE')} Requests</span> ueber {perfData.endpoints.length} Endpoints
                </div>

                <div className="bg-white border border-[#E8E0D4] rounded-[14px] overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#FAF7F2] border-b border-[#E8E0D4]">
                      <tr>
                        <th className="text-left p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">Endpoint</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">Calls</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">Errors</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">P50</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">P95</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">P99</th>
                        <th className="text-right p-3 text-[#8C7E6A] text-[11px] uppercase tracking-wider font-medium">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E0D4]">
                      {perfData.endpoints.map(e => {
                        const colorFor = (ms) => ms >= 5000 ? '#B85C5C' : ms >= 2000 ? '#C9A85C' : ms >= 800 ? '#8C7E6A' : '#7C8B6F';
                        const fmt = ms => ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
                        return (
                          <tr key={e.endpoint} className="hover:bg-[#FAF7F2]">
                            <td className="p-3 font-mono text-[#2C2418]">{e.endpoint}</td>
                            <td className="p-3 text-right text-[#5C4F3D]">{e.count}</td>
                            <td className="p-3 text-right">
                              {e.errors > 0 ? <span className="text-[#B85C5C] font-semibold">{e.errors} ({e.error_rate_pct}%)</span> : <span className="text-[#B5A68C]">0</span>}
                            </td>
                            <td className="p-3 text-right" style={{ color: colorFor(e.p50_ms) }}>{fmt(e.p50_ms)}</td>
                            <td className="p-3 text-right" style={{ color: colorFor(e.p95_ms) }}>{fmt(e.p95_ms)}</td>
                            <td className="p-3 text-right" style={{ color: colorFor(e.p99_ms) }}>{fmt(e.p99_ms)}</td>
                            <td className="p-3 text-right" style={{ color: colorFor(e.max_ms) }}>{fmt(e.max_ms)}</td>
                          </tr>
                        );
                      })}
                      {perfData.endpoints.length === 0 && (
                        <tr><td colSpan={7} className="p-6 text-center text-[#B5A68C]">Keine Daten in diesem Zeitraum.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-[#B5A68C] flex flex-wrap gap-4">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#7C8B6F' }} /> &lt;800ms gut</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#8C7E6A' }} /> 800-2000ms ok</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#C9A85C' }} /> 2-5s langsam</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#B85C5C' }} /> &gt;5s kritisch (User springen ab)</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && <>

        {/* Chart Dashboard */}
        <div className="bg-white rounded-[16px] border border-[#E8E0D4] overflow-hidden fade-in">
          <div className="p-4 md:p-6 border-b border-[#E8E0D4] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-[#F5F0E8] rounded-[10px] p-1 mb-3 w-fit">
                <button onClick={() => switchChartMode('revenue')}
                  className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-all ${
                    chartMode === 'revenue' ? 'bg-white text-[#2C2418] shadow-sm' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'
                  }`}>Umsatz</button>
                <button onClick={() => switchChartMode('users')}
                  className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-all ${
                    chartMode === 'users' ? 'bg-white text-[#2C2418] shadow-sm' : 'text-[#8C7E6A] hover:text-[#5C4F3D]'
                  }`}>Users</button>
              </div>
              {/* Values */}
              {chartMode === 'revenue' && revenue && (
                <>
                  <p className="text-[28px] font-bold text-[#7C8B6F] leading-tight">{formatEur(revenue.total_revenue_cents)}</p>
                  <p className="text-[12px] text-[#8C7E6A] mt-0.5">{revenue.total_purchases} Kaeufe / {revenue.total_credits} Credits</p>
                </>
              )}
              {chartMode === 'users' && usersChart && (
                <>
                  <p className="text-[28px] font-bold text-[#2C2418] leading-tight">{usersChart.total_new} neue User</p>
                  <p className="text-[12px] text-[#8C7E6A] mt-0.5">{usersChart.total_all} gesamt</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-[#F5F0E8] rounded-[10px] p-1">
              {[
                { key: 'today', label: 'Heute' },
                { key: '7d', label: '7 Tage' },
                { key: '30d', label: '1 Monat' },
                { key: '90d', label: '1 Quartal' },
                { key: '365d', label: '1 Jahr' },
              ].map(p => (
                <button key={p.key} onClick={() => handlePeriodChange(p.key)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
                    revenuePeriod === p.key
                      ? 'bg-white text-[#2C2418] shadow-sm'
                      : 'text-[#8C7E6A] hover:text-[#5C4F3D]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Chart - shared for both modes */}
          {(() => {
            let dataPoints, getValue, color, emptyMsg, tooltipFn;
            if (chartMode === 'revenue') {
              if (!revenue) return null;
              dataPoints = revenue.data_points;
              getValue = d => d.revenue_cents;
              color = '#7C8B6F';
              emptyMsg = 'Keine Umsaetze in diesem Zeitraum';
              tooltipFn = d => `${formatEur(d.revenue_cents)} / ${d.purchases}x`;
            } else {
              if (!usersChart) return <div className="p-6 text-center text-[13px] text-[#8C7E6A]">Lade...</div>;
              dataPoints = usersChart.data_points;
              getValue = d => d.count;
              color = '#2C2418';
              emptyMsg = 'Keine neuen User in diesem Zeitraum';
              tooltipFn = d => `${d.count} ${d.count === 1 ? 'User' : 'Users'}`;
            }

            if (!dataPoints || dataPoints.length === 0) {
              return <div className="p-6 text-center text-[13px] text-[#8C7E6A]">{emptyMsg}</div>;
            }

            const values = dataPoints.map(getValue);
            const maxVal = Math.max(...values, 1);
            const W = 1000;
            const H = 180;
            const padTop = 20;
            const padBottom = 30;
            const padLeft = 0;
            const padRight = 0;
            const chartH = H - padTop - padBottom;
            const chartW = W - padLeft - padRight;
            const n = dataPoints.length;
            const step = n > 1 ? chartW / (n - 1) : chartW;

            const points = dataPoints.map((d, i) => {
              const x = padLeft + (n > 1 ? i * step : chartW / 2);
              const y = padTop + chartH - (getValue(d) / maxVal) * chartH;
              return { x, y, d };
            });

            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
            const areaPath = linePath + ` L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`;

            // Label indices
            const maxLabels = 10;
            const labelStep = Math.max(1, Math.ceil(n / maxLabels));

            return (
              <div className="p-4 md:p-6">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f} x1={padLeft} x2={W - padRight} y1={padTop + chartH * (1 - f)} y2={padTop + chartH * (1 - f)}
                      stroke="#E8E0D4" strokeWidth="0.5" />
                  ))}
                  {/* Area fill */}
                  <path d={areaPath} fill={color} opacity="0.08" />
                  {/* Line */}
                  <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Dots */}
                  {points.map((p, i) => getValue(p.d) > 0 && (
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="2" />
                  ))}
                  {/* Labels */}
                  {points.map((p, i) => i % labelStep === 0 && (
                    <text key={i} x={p.x} y={H - 6} textAnchor="middle" fill="#B5A68C" fontSize="11" fontFamily="inherit">
                      {p.d.date}
                    </text>
                  ))}
                </svg>
                {/* Hover overlay with tooltips */}
                <div className="flex -mt-[180px] h-[180px] relative" style={{ pointerEvents: 'none' }}>
                  {points.map((p, i) => (
                    <div key={i} className="flex-1 group" style={{ pointerEvents: 'auto' }}>
                      {getValue(p.d) > 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-[#2C2418] text-white text-[10px] px-2 py-1 rounded-[4px] whitespace-nowrap z-10 pointer-events-none"
                          style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100 - 12}%`, transform: 'translateX(-50%)' }}>
                          {tooltipFn(p.d)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-in fade-in-delay-1">
            {[
              { label: 'Gesamt User', value: stats.total_users },
              { label: 'Aktive User', value: stats.active_users },
              { label: 'Gesamt Umsatz', value: formatEur(stats.total_revenue_cents || 0), highlight: true },
              { label: 'Analysen', value: stats.total_analyses }
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[12px] p-5 border border-[#E8E0D4]">
                <p className="text-[#8C7E6A] text-[11px] uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-[28px] font-bold ${s.highlight ? 'text-[#7C8B6F]' : 'text-[#2C2418]'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Activity Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-in fade-in-delay-2">
            {[
              { label: 'Neue User heute', value: stats.users_today },
              { label: 'Neue User diese Woche', value: stats.users_this_week },
              { label: 'Analysen heute', value: stats.analyses_today },
              { label: 'Analysen diese Woche', value: stats.analyses_this_week }
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[12px] p-4 border border-[#E8E0D4]">
                <p className="text-[#8C7E6A] text-[12px] mb-1">{s.label}</p>
                <p className="text-[20px] font-bold text-[#2C2418]">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-[16px] border border-[#E8E0D4] overflow-hidden fade-in fade-in-delay-3">
          <div className="p-4 md:p-6 border-b border-[#E8E0D4]">
            <h2 className="text-[18px] font-semibold text-[#2C2418]">Alle User ({users.length})</h2>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden p-4 space-y-4">
            {users.map((u) => (
              <div key={u.id} className={`bg-[#FAF7F2] rounded-[12px] p-4 border ${!u.is_active ? 'border-[#B85C5C]/30' : 'border-[#E8E0D4]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#2C2418] flex items-center gap-2 text-[14px]">
                      {u.username}
                      {u.is_superuser && <span className="text-[11px] px-2 py-0.5 bg-[#F5F0E8] text-[#5C4F3D] rounded-full border border-[#E8E0D4]">Admin</span>}
                      {!u.is_active && <span className="text-[11px] px-2 py-0.5 bg-[#B85C5C]/10 text-[#B85C5C] rounded-full">Blockiert</span>}
                    </p>
                    <p className="text-[#8C7E6A] text-[13px]">{u.email}</p>
                  </div>
                  <span className="text-[#7C8B6F] font-bold text-[14px]">{u.analyses_count}</span>
                </div>
                <div className="text-[12px] text-[#8C7E6A] mb-3">
                  <p>Credits: <span className="font-bold text-[#2C2418]">{u.analysis_credits || 0}</span>{u.total_purchased_credits > 0 ? ` (${u.total_purchased_credits} gekauft)` : ''}</p>
                  {u.total_revenue_cents > 0 && <p>Umsatz: <span className="font-bold text-[#7C8B6F]">{formatEur(u.total_revenue_cents)}</span> ({u.purchases?.length || 0} Kaeufe)</p>}
                  <p>Registriert: {formatDate(u.created_at)}</p>
                  <p>Letzte Aktivitat: {formatRelativeTime(u.last_activity)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openFeedbackEmail(u)} disabled={u.id === user.id}
                    className="flex-1 px-3 py-2 bg-[#7C8B6F]/10 text-[#7C8B6F] rounded-[8px] text-[12px] font-medium disabled:opacity-50">E-Mail</button>
                  <button onClick={() => toggleUserStatus(u.id, u.is_active)} disabled={actionLoading || u.id === user.id}
                    className={`flex-1 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all ${u.is_active ? 'bg-[#B85C5C]/10 text-[#B85C5C]' : 'bg-[#7C8B6F]/10 text-[#7C8B6F]'} disabled:opacity-50`}>
                    {u.is_active ? 'Blockieren' : 'Aktivieren'}
                  </button>
                  <button onClick={() => deleteUser(u.id, u.username)} disabled={actionLoading || u.id === user.id}
                    className="px-3 py-2 bg-[#B85C5C]/10 text-[#B85C5C] rounded-[8px] text-[12px] font-medium disabled:opacity-50">Loschen</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">User</th>
                  <th className="text-left p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">E-Mail</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Credits</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Umsatz</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Analysen</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Bewertung</th>
                  <th className="text-left p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Registriert</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Status</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D4]">
                {users.map((u) => (
                  <React.Fragment key={u.id}>
                  <tr className={`hover:bg-[#FAF7F2] transition-colors ${!u.is_active ? 'bg-[#B85C5C]/[0.03]' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-[#7C8B6F]">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#2C2418] text-[14px]">{u.username}</p>
                          {u.full_name && <p className="text-[#8C7E6A] text-[12px]">{u.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[#5C4F3D] text-[14px]">{u.email}</td>
                    <td className="p-4 text-center">
                      <div className="text-[14px] font-bold text-[#2C2418]">{u.analysis_credits || 0}</div>
                      {u.total_purchased_credits > 0 && (
                        <div className="text-[11px] text-[#8C7E6A]">{u.total_purchased_credits} gekauft</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {u.total_revenue_cents > 0 ? (
                        <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                          className="hover:bg-[#7C8B6F]/5 rounded-[6px] px-2 py-1 transition-all">
                          <div className="text-[14px] font-bold text-[#7C8B6F]">{formatEur(u.total_revenue_cents)}</div>
                          <div className="text-[11px] text-[#8C7E6A]">{u.purchases?.length || 0} Kaeufe</div>
                        </button>
                      ) : (
                        <span className="text-[13px] text-[#B5A68C]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center"><span className="text-[#7C8B6F] font-bold">{u.analyses_count}</span></td>
                    <td className="p-4 text-center">
                      {u.reviews_count > 0 ? (
                        <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                          className="hover:bg-[#7C8B6F]/5 rounded-[6px] px-2 py-1 transition-all">
                          <div className="text-[14px] font-bold text-[#C9A85C]" style={{ letterSpacing: '0.05em' }}>
                            {'★'.repeat(Math.round(u.avg_rating || 0))}
                            <span className="text-[#E8E0D4]">{'★'.repeat(5 - Math.round(u.avg_rating || 0))}</span>
                          </div>
                          <div className="text-[11px] text-[#8C7E6A]">
                            {(u.avg_rating || 0).toFixed(1)} ({u.reviews_count})
                          </div>
                        </button>
                      ) : (
                        <span className="text-[13px] text-[#B5A68C]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[#8C7E6A] text-[13px]">{formatDate(u.created_at)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {u.is_superuser && <span className="px-2 py-1 bg-[#F5F0E8] text-[#5C4F3D] text-[11px] rounded-full border border-[#E8E0D4]">Admin</span>}
                        <span className={`px-2 py-1 text-[11px] rounded-full ${u.is_active ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'bg-[#B85C5C]/10 text-[#B85C5C]'}`}>
                          {u.is_active ? 'Aktiv' : 'Blockiert'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => toggleUserStatus(u.id, u.is_active)} disabled={actionLoading || u.id === user.id}
                          className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${u.is_active ? 'bg-[#B85C5C]/10 text-[#B85C5C]' : 'bg-[#7C8B6F]/10 text-[#7C8B6F]'} disabled:opacity-50`}>
                          {u.is_active ? 'Blockieren' : 'Aktivieren'}
                        </button>
                        <button onClick={() => toggleAdminStatus(u.id, u.is_superuser)} disabled={actionLoading || u.id === user.id}
                          className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${u.is_superuser ? 'bg-[#F5F0E8] text-[#5C4F3D] border border-[#E8E0D4]' : 'bg-[#F5F0E8] text-[#8C7E6A]'} disabled:opacity-50`}>
                          {u.is_superuser ? 'Admin entfernen' : 'Zu Admin machen'}
                        </button>
                        <button onClick={() => openFeedbackEmail(u)} 
                          className="px-3 py-1.5 bg-[#7C8B6F]/10 text-[#7C8B6F] rounded-[8px] text-[12px] font-medium">E-Mail</button>
                        <button onClick={() => deleteUser(u.id, u.username)} disabled={actionLoading || u.id === user.id}
                          className="px-3 py-1.5 bg-[#B85C5C]/10 text-[#B85C5C] rounded-[8px] text-[12px] font-medium disabled:opacity-50">Loschen</button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Purchase + Reviews */}
                  {expandedUser === u.id && ((u.purchases && u.purchases.length > 0) || (u.reviews && u.reviews.length > 0)) && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="bg-[#FAF7F2] px-6 py-4 border-t border-[#E8E0D4] space-y-4">
                          {u.purchases && u.purchases.length > 0 && (
                            <div>
                              <p className="text-[12px] font-semibold text-[#5C4F3D] mb-2">Kaufhistorie von {u.username}</p>
                              <div className="space-y-1.5">
                                {u.purchases.map(p => (
                                  <div key={p.id} className="flex items-center justify-between text-[12px] bg-white px-3 py-2 rounded-[8px] border border-[#E8E0D4]">
                                    <span className="text-[#8C7E6A]">{new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="font-medium text-[#2C2418]">{packageLabel(p.package)}</span>
                                    <span className="font-bold text-[#7C8B6F]">{formatEur(p.amount_cents)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {u.reviews && u.reviews.length > 0 && (
                            <div>
                              <p className="text-[12px] font-semibold text-[#5C4F3D] mb-2">Bewertungen von {u.username}</p>
                              <div className="space-y-1.5">
                                {u.reviews.map(r => (
                                  <div key={r.id} className="bg-white px-3 py-2 rounded-[8px] border border-[#E8E0D4]">
                                    <div className="flex items-center justify-between text-[12px]">
                                      <span className="text-[#C9A85C] font-bold" style={{ letterSpacing: '0.08em' }}>
                                        {'★'.repeat(r.rating)}<span className="text-[#E8E0D4]">{'★'.repeat(5 - r.rating)}</span>
                                      </span>
                                      <span className="text-[#8C7E6A]">
                                        {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {r.source && <span className="ml-2 px-1.5 py-0.5 bg-[#F5F0E8] text-[#8C7E6A] text-[10px] rounded">{r.source}</span>}
                                      </span>
                                    </div>
                                    {r.comment && (
                                      <p className="mt-1.5 text-[13px] text-[#2C2418] leading-snug whitespace-pre-wrap">{r.comment}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>}

        {/* Email Modal */}
        {emailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEmailModal(null)}>
            <div className="bg-white rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-[#E8E0D4]">
                <h3 className="text-[18px] font-semibold text-[#2C2418]">E-Mail an {emailModal.username}</h3>
                <p className="text-[13px] text-[#8C7E6A] mt-1">{emailModal.email}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#5C4F3D] mb-1">Betreff</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[14px] text-[#2C2418] focus:outline-none focus:border-[#7C8B6F]" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#5C4F3D] mb-1">Nachricht</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={12}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[14px] text-[#2C2418] focus:outline-none focus:border-[#7C8B6F] resize-y font-mono" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#5C4F3D] mb-1">Gratis-Credits schenken</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="10" value={emailCredits} onChange={e => setEmailCredits(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[14px] text-center text-[#2C2418] focus:outline-none focus:border-[#7C8B6F]" />
                    <span className="text-[13px] text-[#8C7E6A]">Analysen</span>
                  </div>
                </div>
                {emailResult && (
                  <div className={`p-3 rounded-[8px] text-[13px] ${emailResult.success ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'bg-[#B85C5C]/10 text-[#B85C5C]'}`}>
                    {emailResult.message}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#E8E0D4] flex gap-3 justify-end">
                <button onClick={() => setEmailModal(null)}
                  className="px-4 py-2 text-[#8C7E6A] text-[14px] font-medium hover:text-[#5C4F3D] transition-colors">Abbrechen</button>
                <button onClick={sendEmailToUser} disabled={emailSending || !emailSubject || !emailBody}
                  className="px-6 py-2 bg-[#7C8B6F] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#6B7A5E] transition-colors disabled:opacity-50">
                  {emailSending ? 'Sende...' : `Senden${emailCredits > 0 ? ` + ${emailCredits} Credits` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
