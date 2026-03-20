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
  const [activeTab, setActiveTab] = useState('users');

  if (!user?.is_superuser) {
    return <Navigate to="/chat" replace />;
  }

  useEffect(() => { fetchData(); fetchAgents(); }, []);

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
    if (!confirm(`User "${username}" wirklich loschen? Alle Analysen werden ebenfalls geloscht!`)) return;
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
        <div className="w-12 h-12 border-2 border-[#E8E0D4] border-t-[#7C8B6F] rounded-full animate-spin mx-auto mb-4"></div>
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
          </div>
        </div>

        {/* ===== AGENTS TAB ===== */}
        {activeTab === 'agents' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#2C2418]">Research Agents</h2>
              <button onClick={fetchAgents} className="text-[13px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors">Aktualisieren</button>
            </div>

            {agents.length === 0 ? (
              <div className="bg-white rounded-[16px] p-8 border border-[#E8E0D4] text-center">
                <p className="text-[#8C7E6A]">Keine Agents konfiguriert.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-white rounded-[16px] p-5 border border-[#E8E0D4]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-[16px] font-semibold text-[#2C2418]">{agent.display_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            agent.enabled ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' : 'bg-[#B5A68C]/10 text-[#B5A68C]'
                          }`}>
                            {agent.enabled ? 'Aktiv' : 'Deaktiviert'}
                          </span>
                          {agent.last_status && (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              agent.last_status === 'success' ? 'bg-[#7C8B6F]/10 text-[#7C8B6F]' :
                              agent.last_status === 'running' ? 'bg-[#D4A843]/10 text-[#D4A843]' :
                              'bg-[#B85C5C]/10 text-[#B85C5C]'
                            }`}>
                              {agent.last_status === 'success' ? 'Erfolg' : agent.last_status === 'running' ? 'Laeuft...' : 'Fehler'}
                            </span>
                          )}
                        </div>
                        {editingAgent === agent.id ? (
                          <div className="space-y-2 mt-3">
                            <input defaultValue={agent.display_name} id={`edit-name-${agent.id}`}
                              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px] text-[#2C2418]" placeholder="Name" />
                            <input defaultValue={agent.description} id={`edit-desc-${agent.id}`}
                              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px] text-[#2C2418]" placeholder="Beschreibung" />
                            <input defaultValue={agent.schedule} id={`edit-sched-${agent.id}`}
                              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[8px] text-[13px] text-[#2C2418]" placeholder="Zeitplan" />
                            <div className="flex gap-2">
                              <button onClick={() => saveAgent(agent.id, {
                                display_name: document.getElementById(`edit-name-${agent.id}`).value,
                                description: document.getElementById(`edit-desc-${agent.id}`).value,
                                schedule: document.getElementById(`edit-sched-${agent.id}`).value,
                              })} className="px-3 py-1.5 bg-[#7C8B6F] text-white text-[12px] font-medium rounded-[8px]">Speichern</button>
                              <button onClick={() => setEditingAgent(null)} className="px-3 py-1.5 text-[#8C7E6A] text-[12px]">Abbrechen</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-[13px] text-[#8C7E6A]">{agent.description}</p>
                            <p className="text-[12px] text-[#B5A68C] mt-1">
                              Zeitplan: {agent.schedule}
                              {agent.last_run && ` | Letzter Lauf: ${formatRelativeTime(agent.last_run)}`}
                            </p>
                            {agent.last_error && (
                              <p className="text-[12px] text-[#B85C5C] mt-1">Fehler: {agent.last_error}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditingAgent(editingAgent === agent.id ? null : agent.id)}
                          className="px-3 py-1.5 text-[12px] text-[#8C7E6A] hover:text-[#2C2418] border border-[#E8E0D4] rounded-[8px] transition-colors">
                          Bearbeiten
                        </button>
                        <button onClick={() => runAgent(agent.id)} disabled={agentRunning !== null}
                          className={`px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-all ${
                            agentRunning === agent.id ? 'bg-[#D4A843]/10 text-[#D4A843]' : 'bg-[#7C8B6F] text-white hover:bg-[#6B7A5E]'
                          }`}>
                          {agentRunning === agent.id ? 'Laeuft...' : 'Jetzt ausfuehren'}
                        </button>
                        <button onClick={() => toggleAgent(agent.id, agent.enabled)}
                          className={`w-12 h-6 rounded-full transition-all relative ${agent.enabled ? 'bg-[#7C8B6F]' : 'bg-[#E8E0D4]'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${agent.enabled ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && <>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-in fade-in-delay-1">
            {[
              { label: 'Gesamt User', value: stats.total_users },
              { label: 'Aktive User', value: stats.active_users },
              { label: 'Blockiert', value: stats.blocked_users },
              { label: 'Analysen', value: stats.total_analyses }
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[12px] p-5 border border-[#E8E0D4]">
                <p className="text-[#8C7E6A] text-[11px] uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-[28px] font-bold text-[#2C2418]">{s.value}</p>
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
                  <p>Registriert: {formatDate(u.created_at)}</p>
                  <p>Letzte Aktivitat: {formatRelativeTime(u.last_activity)}</p>
                  <p>Verbrauch: ${u.total_cost_usd?.toFixed(3) || '0.000'} / ${u.usage_limit_usd?.toFixed(2) || '5.00'}</p>
                </div>
                <div className="flex gap-2">
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
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Analysen</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Verbrauch</th>
                  <th className="text-left p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Registriert</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Status</th>
                  <th className="text-center p-4 text-[#8C7E6A] text-[12px] uppercase tracking-wider font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D4]">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-[#FAF7F2] transition-colors ${!u.is_active ? 'bg-[#B85C5C]/[0.03]' : ''}`}>
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
                    <td className="p-4 text-center"><span className="text-[#7C8B6F] font-bold">{u.analyses_count}</span></td>
                    <td className="p-4 text-center">
                      <div className="text-[13px] font-mono text-[#5C4F3D]">${u.total_cost_usd?.toFixed(3) || '0.000'}</div>
                      {editingLimit?.userId === u.id ? (
                        <div className="flex items-center gap-1 mt-1 justify-center">
                          <span className="text-[12px] text-[#8C7E6A]">$</span>
                          <input type="number" step="0.5" min="0" value={editingLimit.value} onChange={(e) => setEditingLimit({ userId: u.id, value: e.target.value })}
                            className="w-16 px-1 py-0.5 bg-white border border-[#7C8B6F] rounded text-[12px] text-[#2C2418] text-center" autoFocus />
                          <button onClick={() => updateLimit(u.id, editingLimit.value)} disabled={actionLoading}
                            className="px-1.5 py-0.5 bg-[#7C8B6F]/10 text-[#7C8B6F] rounded text-[12px]">OK</button>
                          <button onClick={() => setEditingLimit(null)}
                            className="px-1.5 py-0.5 bg-[#B85C5C]/10 text-[#B85C5C] rounded text-[12px]">X</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingLimit({ userId: u.id, value: u.usage_limit_usd || 5 })}
                          className="text-[12px] text-[#8C7E6A] hover:text-[#7C8B6F] transition-colors">
                          Limit: ${u.usage_limit_usd?.toFixed(2) || '5.00'}
                        </button>
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
                        <button onClick={() => deleteUser(u.id, u.username)} disabled={actionLoading || u.id === user.id}
                          className="px-3 py-1.5 bg-[#B85C5C]/10 text-[#B85C5C] rounded-[8px] text-[12px] font-medium disabled:opacity-50">Loschen</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}

export default Admin;
