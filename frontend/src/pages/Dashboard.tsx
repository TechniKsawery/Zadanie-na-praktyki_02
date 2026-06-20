// ==============================================================================
// DASHBOARD VIEW (Pulpit Główny)
// ==============================================================================
// Główny widok po zalogowaniu. Agreguje statystyki, wyświetla wykres słupkowy
// przedstawiający rozkład statusów artykułów (za pomocą Recharts) oraz listę
// ostatnich logów aktywności redakcyjnej w czasie rzeczywistym.

import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
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
  Activity,
  Newspaper,
  TrendingUp,
  Eye
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const getMockCategoryAndGradient = (id: number) => {
  const categories = ['SPORT', 'POLITYKA', 'KULTURA', 'BIZNES', 'TECHNOLOGIE', 'ROZRYWKA'];
  const gradients = [
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #a6c0fe 0%, #f1a7f1 100%)',
    'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)'
  ];
  return {
    category: categories[id % categories.length],
    gradient: gradients[id % gradients.length]
  };
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'portal' | 'stats'>('portal');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, articlesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/articles')
      ]);
      setStats(statsRes.data.stats);
      setArticles(articlesRes.data.articles || articlesRes.data || []);
    } catch (err: any) {
      console.error('Błąd pobierania danych pulpitu:', err);
      setError('Nie udało się załadować danych statystycznych oraz artykułów.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    document.title = "Pulpit Redakcyjny | Wmedia Redakcja";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Główny pulpit redakcyjny z analizami, makietą portalu na żywo oraz statystykami.');
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Główny pulpit redakcyjny z analizami, makietą portalu na żywo oraz statystykami.";
      document.head.appendChild(meta);
    }

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

  // Wyliczanie najpopularniejszych artykułów na podstawie liczby odsłon
  const trendingArticles = [...articles]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 4);

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
        Ładowanie statystyk i artykułów pulpitu...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* Nagłówek powitalny */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '6px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Dzień dobry, {user?.name}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
            Zarządzasz systemem automatyzacji redakcji. Rola:{' '}
            <strong style={{ color: 'var(--color-primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>{user?.role}</strong>.
          </p>
        </div>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          padding: '8px 16px',
          borderRadius: '30px',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Wydanie Główne Wmedia: Aktywne
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
          padding: '16px',
          borderRadius: '8px',
          color: '#b91c1c',
          marginBottom: '24px',
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      {/* Przełącznik Widoków Dashboardu */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('portal')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid var(--border-light)',
            backgroundColor: activeTab === 'portal' ? 'var(--color-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'portal' ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none'
          }}
        >
          <Newspaper size={18} /> Makieta Portalu (Wmedia Live)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid var(--border-light)',
            backgroundColor: activeTab === 'stats' ? 'var(--color-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'stats' ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none'
          }}
        >
          <TrendingUp size={18} /> Statystyki & Audyt Redakcji
        </button>
      </div>

      {activeTab === 'portal' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-slide-in">
          {/* Menu kategorii portalowych - Wmedia style */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '4px 20px',
            gap: '24px',
            overflowX: 'auto',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em', borderRight: '2px solid #e2001a', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#e2001a' }}>wmedia</span>sport
            </span>
            {['PIŁKA NOŻNA', 'SIATKÓWKA', 'KOSZYKÓWKA', 'SKOKI NARCIARSKIE', 'FORMUŁA 1', 'BOKS', 'INNE'].map((cat, idx) => (
              <span 
                key={idx} 
                style={{ 
                  color: idx === 0 ? '#e2001a' : 'var(--text-secondary)', 
                  fontSize: '0.78rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  padding: '12px 0', 
                  transition: 'color 0.2s' 
                }}
                onMouseEnter={(e) => idx !== 0 && (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => idx !== 0 && (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Główna sekcja: Lewa (Hero) + Prawa (List) */}
          <div className="portal-main-grid">
            {/* Lewa kolumna: Hero Artykuł */}
            <div>
              {articles.length === 0 ? (
                <div style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  Brak artykułów w bazie danych. Dodaj nowy temat w bazie artykułów!
                </div>
              ) : (() => {
                const heroArticle = articles.find(a => a.status === ArticleStatus.PUBLISHED) || articles[0];
                const { category, gradient } = getMockCategoryAndGradient(heroArticle.id);
                const hasImage = heroArticle.uploads && heroArticle.uploads.length > 0 && heroArticle.uploads.some((up: any) => up.mimetype.startsWith('image/'));
                const imagePath = hasImage ? heroArticle.uploads.find((up: any) => up.mimetype.startsWith('image/'))?.filepath : null;

                return (
                  <div 
                    onClick={() => navigate(`/articles/${heroArticle.id}`)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    {imagePath ? (
                      <div style={{ position: 'relative', height: '380px', width: '100%', overflow: 'hidden' }}>
                        <img 
                          src={`${BACKEND_URL}${imagePath}`} 
                          alt={heroArticle.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: '#e2001a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 900, padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                          WYDANIE GŁÓWNE
                        </div>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', height: '360px', width: '100%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
                        📰
                        <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: '#e2001a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 900, padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                          WYDANIE GŁÓWNE
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '24px' }}>
                      <span style={{ color: '#e2001a', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                        {category}
                      </span>
                      <h2 style={{ fontSize: '1.9rem', fontWeight: 900, lineHeight: '1.25', color: 'var(--text-primary)', marginBottom: '12px', fontFamily: 'Outfit' }}>
                        {heroArticle.title}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: '1.5', marginBottom: '20px' }}>
                        {heroArticle.lead || 'Brak opisu wstępnego dla tego artykułu.'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {heroArticle.author.name[0].toUpperCase()}
                        </div>
                        <span>{heroArticle.author.name}</span>
                        <span>•</span>
                        <span>⏱️ {Math.max(1, Math.round((heroArticle.content || '').split(/\s+/).length / 180))} min czytania</span>
                        <span>•</span>
                        <span style={{ textTransform: 'uppercase', color: heroArticle.status === ArticleStatus.PUBLISHED ? '#0891b2' : '#d97706' }}>
                          {heroArticle.status === ArticleStatus.PUBLISHED ? 'Opublikowano' : 'W redakcji'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Prawa kolumna: Najnowsze wiadomości */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-primary)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                Najnowsze w redakcji
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', maxHeight: '520px', paddingRight: '4px' }}>
                {articles.slice(1, 8).map((art, index) => {
                  const timeStr = new Date(art.updatedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                  const { category } = getMockCategoryAndGradient(art.id);
                  return (
                    <div 
                      key={art.id} 
                      onClick={() => navigate(`/articles/${art.id}`)}
                      style={{ 
                        paddingBottom: '14px', 
                        borderBottom: index === articles.slice(1, 8).length - 1 ? 'none' : '1px solid var(--border-light)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        const titleEl = e.currentTarget.querySelector('h4');
                        if (titleEl) titleEl.style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        const titleEl = e.currentTarget.querySelector('h4');
                        if (titleEl) titleEl.style.color = 'var(--text-primary)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        <span style={{ color: '#ef4444' }}>{timeStr}</span>
                        <span style={{ color: '#64748b', textTransform: 'uppercase' }}>{category}</span>
                      </div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.4', transition: 'color 0.2s' }}>
                        {art.title}
                      </h4>
                    </div>
                  );
                })}
                {articles.length <= 1 && (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '0.85rem' }}>
                    Brak kolejnych artykułów w bazie.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dolna sekcja: Kafelki tematów (Grid 3-kolumnowy) */}
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '20px', fontFamily: 'Outfit' }}>
              Polecane w serwisie
            </h3>
            {articles.length <= 2 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                Dodaj więcej artykułów, aby zapełnić grid polecanych treści!
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px'
              }}>
                {articles.slice(2, 8).map(art => {
                  const { category, gradient } = getMockCategoryAndGradient(art.id);
                  const hasImage = art.uploads && art.uploads.length > 0 && art.uploads.some((up: any) => up.mimetype.startsWith('image/'));
                  const imagePath = hasImage ? art.uploads.find((up: any) => up.mimetype.startsWith('image/'))?.filepath : null;

                  return (
                    <div 
                      key={art.id}
                      onClick={() => navigate(`/articles/${art.id}`)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      {imagePath ? (
                        <img 
                          src={`${BACKEND_URL}${imagePath}`} 
                          alt={art.title} 
                          style={{ width: '100%', height: '170px', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '170px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                          📰
                        </div>
                      )}
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ color: '#e2001a', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            {category}
                          </span>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '8px' }}>
                            {art.title}
                          </h4>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.4', marginBottom: '14px' }}>
                            {art.lead ? (art.lead.length > 90 ? `${art.lead.substring(0, 90)}...` : art.lead) : 'Brak opisu.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{art.author.name}</span>
                          <span>⏱️ {Math.max(1, Math.round((art.content || '').split(/\s+/).length / 180))} min</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Grid z licznikami statystycznymi */}
            <div className="stats-grid">
              <div className="glass-panel stat-card" style={{ borderLeftColor: 'var(--color-primary)' }}>
                <div>
                  <div className="stat-title">Wszystkie Artykuły</div>
                  <div className="stat-value">{stats.counters.articles}</div>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(226, 0, 26, 0.06)', color: 'var(--color-primary)' }}>
                  <FileText size={24} />
                </div>
              </div>

              <div className="glass-panel stat-card" style={{ borderLeftColor: '#a855f7' }}>
                <div>
                  <div className="stat-title">Uwagi & Dyskusje</div>
                  <div className="stat-value">{stats.counters.comments}</div>
                </div>
                <div className="stat-icon" style={{ color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.06)' }}>
                  <MessageSquare size={24} />
                </div>
              </div>

              <div className="glass-panel stat-card" style={{ borderLeftColor: '#06b6d4' }}>
                <div>
                  <div className="stat-title">Wgrane Załączniki</div>
                  <div className="stat-value">{stats.counters.uploads}</div>
                </div>
                <div className="stat-icon" style={{ color: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.06)' }}>
                  <UploadIcon size={24} />
                </div>
              </div>

              <div className="glass-panel stat-card" style={{ borderLeftColor: '#10b981' }}>
                <div>
                  <div className="stat-title">Zespół Redakcyjny</div>
                  <div className="stat-value">{stats.counters.users}</div>
                </div>
                <div className="stat-icon" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.06)' }}>
                  <Users size={24} />
                </div>
              </div>

              <div className="glass-panel stat-card" style={{ borderLeftColor: '#f59e0b' }}>
                <div>
                  <div className="stat-title">Suma Odsłon</div>
                  <div className="stat-value">{stats.counters.views || 0}</div>
                </div>
                <div className="stat-icon" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.06)' }}>
                  <Eye size={24} />
                </div>
              </div>
            </div>

            <div className="dashboard-main-grid">
              {/* Wykres statusów */}
              <div className="glass-panel" style={{ padding: '24px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit' }}>
                  Rozkład Statusów Tekstów
                </h3>
                <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
                  {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
                      Brak danych do wygenerowania wykresu.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={11} allowDecimals={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            borderColor: 'var(--border-light)', 
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-primary)'
                          }}
                          labelStyle={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}
                          itemStyle={{ fontWeight: 600 }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={statusColors[entry.statusKey as ArticleStatus] || '#e2001a'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Panel Szybkich Akcji */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', fontFamily: 'Outfit' }}>Nawigacja Redakcyjna</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '8px', lineHeight: '1.4' }}>
                  Szybki dostęp do kluczowych obszarów zarządzania treścią i zespołem:
                </p>

                <Link to="/articles" className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Przejdź do bazy artykułów
                </Link>

                {(user?.role === Role.AUTHOR || user?.role === Role.ADMIN) && (
                  <Link to="/articles" className="btn btn-primary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <PlusCircle size={18} /> Stwórz nowy temat/szkic
                  </Link>
                )}

                <Link to="/calendar" className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <CalendarIcon size={18} style={{ color: '#65a30d' }} /> Otwórz kalendarz publikacji
                </Link>

                {user?.role === Role.ADMIN && (
                  <Link to="/admin" className="btn btn-danger" style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <ShieldAlert size={18} /> Zarządzaj uprawnieniami zespołu
                  </Link>
                )}
              </div>
            </div>

            {/* DOLNA SEKCJA: DZIAŁANIA REDAKCJI + LIVE ANALYTICS TRENDY */}
            <div className="dashboard-bottom-grid">
              {/* Logi Aktywności Systemowej */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit' }}>
                  <Activity size={20} style={{ color: 'var(--color-primary)' }} />
                  Dziennik Aktywności Redakcyjnej
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {stats.recentLogs.length === 0 ? (
                    <div style={{ padding: '40px 0', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                      Brak zarejestrowanych logów w systemie.
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
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                          <span style={{
                            backgroundColor: 'rgba(226, 0, 26, 0.08)',
                            color: 'var(--color-primary)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {log.action}
                          </span>
                          <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{log.details}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.78rem', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{log.user ? log.user.name : 'System'}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString('pl-PL')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Portal View Analytics (Trendy portalowe z polskimi tytułami prasowymi) */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit' }}>
                  <span style={{ display: 'flex', position: 'relative', width: '10px', height: '10px', marginRight: '4px' }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#ef4444', opacity: 0.75, animation: 'ping 1s infinite' }} />
                    <span style={{ position: 'relative', borderRadius: '50%', width: '10px', height: '10px', backgroundColor: '#ef4444' }} />
                  </span>
                  Najpopularniejsze na Portalu (Na żywo)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '20px' }}>
                  Bieżące statystyki odsłon artykułów opublikowanych na stronie głównej Wmedia Sport.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                  {trendingArticles.length === 0 ? (
                    <div style={{ padding: '40px 0', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                      Brak popularnych artykułów w bazie.
                    </div>
                  ) : (
                    trendingArticles.map((art, index) => {
                      const commentsCount = art._count?.comments || 0;
                      const viewsVal = art.views >= 1000 ? `${(art.views / 1000).toFixed(1)}k` : art.views;
                      const wordCount = art.content ? art.content.split(/\s+/).length : 0;
                      const readTime = Math.max(1, Math.round(wordCount / 180));

                      return (
                        <div 
                          key={art.id}
                          onClick={() => navigate(`/articles/${art.id}`)}
                          className="trending-item"
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="trending-number">0{index + 1}</div>
                          <div className="trending-content">
                            <div className="trending-title">{art.title}</div>
                            <div className="trending-meta">
                              <span>🔥 {viewsVal} odsłon</span>
                              <span>⏱️ Śr. czas: {readTime} min</span>
                              <span>💬 {commentsCount} komentarzy</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
export default Dashboard;
