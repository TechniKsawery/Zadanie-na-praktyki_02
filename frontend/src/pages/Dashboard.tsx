// ==============================================================================
// DASHBOARD VIEW (Pulpit Główny)
// ==============================================================================
// Główny widok po zalogowaniu. Agreguje statystyki, wyświetla wykres słupkowy
// przedstawiający rozkład statusów artykułów (za pomocą Recharts) oraz listę
// ostatnich logów aktywności redakcyjnej w czasie rzeczywistym.

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats, ArticleStatus, Role } from '../types';
import { 
  FileText, 
  Users, 
  MessageSquare, 
  Upload as UploadIcon,
  PlusCircle, 
  Calendar as CalendarIcon, 
  ShieldAlert,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.stats);
    } catch (err: any) {
      console.error('Błąd pobierania statystyk:', err);
      setError('Nie udało się załadować danych statystycznych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Słuchamy zdarzeń realtime do odświeżania dashboardu, gdy zajdą zmiany w bazie
    const handleRealtimeUpdate = () => {
      fetchStats();
    };

    window.addEventListener('article_changed_realtime', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('article_changed_realtime', handleRealtimeUpdate);
    };
  }, []);

  // Mapowanie angielskich statusów na czytelne polskie opisy do wykresu
  const polishStatusLabels: Record<ArticleStatus, string> = {
    [ArticleStatus.IDEA]: 'Pomysł',
    [ArticleStatus.DRAFT]: 'Szkic',
    [ArticleStatus.REVIEW]: 'W recenzji',
    [ArticleStatus.APPROVED]: 'Zatwierdzone',
    [ArticleStatus.SCHEDULED]: 'Zaplanowane',
    [ArticleStatus.PUBLISHED]: 'Opublikowane',
    [ArticleStatus.REJECTED]: 'Odrzucone'
  };

  // Kolory słupków na wykresie
  const statusColors: Record<ArticleStatus, string> = {
    [ArticleStatus.IDEA]: '#9ca3af',
    [ArticleStatus.DRAFT]: '#3b82f6',
    [ArticleStatus.REVIEW]: '#f59e0b',
    [ArticleStatus.APPROVED]: '#10b981',
    [ArticleStatus.SCHEDULED]: '#84cc16',
    [ArticleStatus.PUBLISHED]: '#06b6d4',
    [ArticleStatus.REJECTED]: '#ef4444'
  };

  // Przygotowanie danych do wykresu Recharts
  const chartData = stats?.articlesByStatus.map(item => ({
    name: polishStatusLabels[item.status] || item.status,
    count: item._count._all,
    statusKey: item.status
  })) || [];

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
        Ładowanie statystyk pulpitu...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* Nagłówek powitalny */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
          Witaj, {user?.name}!
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.98rem' }}>
          Oto bieżący stan prac redakcyjnych. Twoja rola to:{' '}
          <strong style={{ color: '#6366f1' }}>{user?.role}</strong>.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '16px',
          borderRadius: '8px',
          color: '#fca5a5',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Grid z licznikami statystycznymi */}
      {stats && (
        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div>
              <div className="stat-title">Artykuły</div>
              <div className="stat-value">{stats.counters.articles}</div>
            </div>
            <div className="stat-icon">
              <FileText size={24} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div>
              <div className="stat-title">Dyskusje / Uwagi</div>
              <div className="stat-value">{stats.counters.comments}</div>
            </div>
            <div className="stat-icon" style={{ color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
              <MessageSquare size={24} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div>
              <div className="stat-title">Załączniki</div>
              <div className="stat-value">{stats.counters.uploads}</div>
            </div>
            <div className="stat-icon" style={{ color: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)' }}>
              <UploadIcon size={24} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div>
              <div className="stat-title">Redaktorzy</div>
              <div className="stat-value">{stats.counters.users}</div>
            </div>
            <div className="stat-icon" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Users size={24} />
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Wykres statusów */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Rozkład Statusów Tekstów
          </h3>
          <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
            {chartData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
                Brak danych do wygenerowania wykresu.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12121e', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.statusKey as ArticleStatus] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Panel Szybkich Akcji */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Skróty Klawiszowe</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '8px' }}>
            Szybki dostęp do najczęstszych akcji w systemie:
          </p>

          <Link to="/articles" className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
            <FileText size={18} /> Przejdź do bazy artykułów
          </Link>

          {(user?.role === Role.AUTHOR || user?.role === Role.ADMIN) && (
            <Link to="/articles" className="btn btn-primary" style={{ justifyContent: 'flex-start', width: '100%' }}>
              <PlusCircle size={18} /> Utwórz nowy pomysł/szkic
            </Link>
          )}

          <Link to="/calendar" className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
            <CalendarIcon size={18} /> Otwórz kalendarz publikacji
          </Link>

          {user?.role === Role.ADMIN && (
            <Link to="/admin" className="btn btn-danger" style={{ justifyContent: 'flex-start', width: '100%' }}>
              <ShieldAlert size={18} /> Zarządzaj rolami redakcji
            </Link>
          )}
        </div>
      </div>

      {/* Logi Aktywności Systemowej */}
      {stats && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} style={{ color: '#6366f1' }} />
            Ostatnie Działania Redakcyjne
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
            {stats.recentLogs.length === 0 ? (
              <div style={{ padding: '20px 0', color: '#6b7280', textAlign: 'center' }}>
                Brak logów w systemie.
              </div>
            ) : (
              stats.recentLogs.map((log) => (
                <div 
                  key={log.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      backgroundColor: 'rgba(99,102,241,0.1)',
                      color: '#6366f1',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: '#d1d5db' }}>{log.details}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280', fontSize: '0.78rem' }}>
                    <span>{log.user ? log.user.name : 'System'}</span>
                    <span>•</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString('pl-PL')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
