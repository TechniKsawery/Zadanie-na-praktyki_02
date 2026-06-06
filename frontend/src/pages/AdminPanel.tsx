// ==============================================================================
// ADMIN PANEL VIEW (Panel Administratora)
// ==============================================================================
// Widok administracyjny zabezpieczony strażnikiem ról (RoleGuard - ADMIN).
// Posiada interfejs kart (Tabs) dzielący panel na zarządzanie zespołem (zmiana ról),
// pełne logi systemowe (Activity Logs) oraz statystyki ról i artykułów.

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { User, Role, ActivityLog, DashboardStats } from '../types';
import { 
  Users, 
  Terminal, 
  PieChart as ChartIcon,
  RefreshCw
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useNotifications();
  
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Pobieramy dane równolegle
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);
      
      setUsers(usersRes.data.users);
      setStats(statsRes.data.stats);
      setLogs(statsRes.data.stats.recentLogs);
    } catch (error) {
      console.error('Błąd pobierania danych admina:', error);
      addToast('Błąd', 'Nie udało się załadować danych panelu administratora.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Zmiana roli użytkownika w bazie danych
  const handleRoleChange = async (userId: number, newRole: Role) => {
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      addToast('Zaktualizowano', `Pomyślnie zmieniono rolę użytkownika na: ${newRole}`, 'success');
      // Odświeżamy dane po zmianie roli
      fetchData();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się zmienić roli.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const polishRoleLabels: Record<Role, string> = {
    [Role.ADMIN]: 'Administrator',
    [Role.EDITOR]: 'Redaktor Naczelny',
    [Role.REVIEWER]: 'Recenzent/Korektor',
    [Role.AUTHOR]: 'Autor/Dziennikarz'
  };

  if (loading && users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
        Ładowanie danych panelu administratora...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* Nagłówek panelu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
            Panel Administratora
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Zarządzaj uprawnieniami zespołu, analizuj audyt logów i statystyki redakcji
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="btn btn-secondary"
          style={{ padding: '10px 14px' }}
        >
          <RefreshCw size={16} /> Odśwież dane
        </button>
      </div>

      {/* ------------------------------------------------------------------------
         KARTY NAWIGACYJNE PANELU (TABS)
         ------------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '24px',
        gap: '24px'
      }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'users' ? '#fff' : '#9ca3af',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} /> Zarządzanie Zespołem
        </button>

        <button 
          onClick={() => setActiveTab('logs')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'logs' ? '#fff' : '#9ca3af',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Terminal size={18} /> Logi Aktywności
        </button>

        <button 
          onClick={() => setActiveTab('stats')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'stats' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'stats' ? '#fff' : '#9ca3af',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <ChartIcon size={18} /> Szczegółowe Statystyki
        </button>
      </div>

      {/* ------------------------------------------------------------------------
         TAB 1: ZARZĄDZANIE ZESPOŁEM (USERS ROLE MANAGEMENT)
         ------------------------------------------------------------------------ */}
      {activeTab === 'users' && (
        <div className="glass-panel animate-slide-in" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: '#9ca3af', fontSize: '0.88rem' }}>
                <th style={{ padding: '16px 24px' }}>Użytkownik</th>
                <th style={{ padding: '16px 24px' }}>Rola w systemie</th>
                <th style={{ padding: '16px 24px' }}>Napisane teksty</th>
                <th style={{ padding: '16px 24px' }}>Zrecenzowane teksty</th>
                <th style={{ padding: '16px 24px' }}>Data rejestracji</th>
                <th style={{ padding: '16px 24px' }}>Modyfikacja roli</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr 
                    key={u.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', backgroundColor: isSelf ? 'rgba(99,102,241,0.02)' : 'transparent' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {u.name} {isSelf && <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: '6px' }}>(To Ty)</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge badge-${u.role.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                        {polishRoleLabels[u.role]}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {u._count?.authoredArticles || 0}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {u._count?.reviewedArticles || 0}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: '#9ca3af' }}>
                      {new Date(u.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {/* Zapobiegamy zmianie własnej roli przez admina (blokada przed odebraniem sobie ADMINA) */}
                      <select
                        className="form-input form-select"
                        style={{ width: '180px', padding: '6px 12px', fontSize: '0.82rem' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={isSelf || actionLoading === u.id}
                      >
                        {Object.values(Role).map(role => (
                          <option key={role} value={role}>{polishRoleLabels[role]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         TAB 2: LOGI AKTYWNOŚCI (SYSTEM AUDIT LOGS)
         ------------------------------------------------------------------------ */}
      {activeTab === 'logs' && (
        <div className="glass-panel animate-slide-in" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} style={{ color: '#6366f1' }} /> Log systemowy (ostatnie 30 akcji)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map(log => (
              <div 
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace'
                }}
              >
                <div>
                  <span style={{ color: '#a855f7', fontWeight: 'bold', marginRight: '12px' }}>
                    [{log.action}]
                  </span>
                  <span style={{ color: '#e5e7eb' }}>{log.details}</span>
                </div>
                <div style={{ color: '#6b7280', display: 'flex', gap: '12px' }}>
                  <span>Użytkownik: {log.user ? log.user.email : 'System'}</span>
                  <span>|</span>
                  <span>{new Date(log.createdAt).toLocaleString('pl-PL')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         TAB 3: STATYSTYKI SZCZEGÓŁOWE (ROLE & ARTICLES DATA GRID)
         ------------------------------------------------------------------------ */}
      {activeTab === 'stats' && stats && (
        <div className="stats-grid animate-slide-in">
          {/* Użytkownicy według ról */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>
              Użytkownicy w podziale na role
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.usersByRole.map(item => (
                <div 
                  key={item.role} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                >
                  <span style={{ fontWeight: 600 }}>{polishRoleLabels[item.role]}</span>
                  <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{item._count._all} kont(a)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Artykuły według statusów */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>
              Artykuły w podziale na statusy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.articlesByStatus.map(item => (
                <div 
                  key={item.status} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                >
                  <span style={{ fontWeight: 600 }}>{item.status}</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{item._count._all} tekst(y)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liderzy treści */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>
              Najbardziej aktywni Autorzy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.topAuthors.map(author => (
                <div 
                  key={author.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{author.name}</span>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{author.email}</div>
                  </div>
                  <span style={{ color: '#a855f7', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {author._count.authoredArticles} tekst(ów)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPanel;
