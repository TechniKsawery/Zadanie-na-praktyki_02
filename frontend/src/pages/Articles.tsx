// ==============================================================================
// ARTICLES BOARD & LIST VIEW (Baza Artykułów)
// ==============================================================================
// Widok bazy artykułów. Umożliwia przełączanie się pomiędzy tablicą Kanban
// a widokiem listy tabelarycznej. Zawiera filtry wyszukiwania, modal tworzenia
// nowego artykułu oraz mechanizm awansu statusu zależny od ról.

import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Article, ArticleStatus, Role } from '../types';
import { 
  Plus, 
  Search, 
  KanbanSquare, 
  List, 
  ArrowRight, 
  Check, 
  X, 
  MessageSquare, 
  FileEdit, 
  Clock, 
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const polishStatusLabels: Record<ArticleStatus, string> = {
  [ArticleStatus.IDEA]: 'Pomysł',
  [ArticleStatus.DRAFT]: 'Szkic',
  [ArticleStatus.REVIEW]: 'W recenzji',
  [ArticleStatus.APPROVED]: 'Zatwierdzone',
  [ArticleStatus.SCHEDULED]: 'Zaplanowane',
  [ArticleStatus.PUBLISHED]: 'Opublikowane',
  [ArticleStatus.REJECTED]: 'Odrzucone'
};

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

export const Articles: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  
  // Stan filtrów
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Stan Modala Tworzenia
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLead, setNewLead] = useState('');
  const [newContent, setNewContent] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Pobieranie artykułów z backendu
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/articles');
      setArticles(response.data.articles);
    } catch (error) {
      console.error('Błąd pobierania artykułów:', error);
      addToast('Błąd', 'Nie udało się załadować artykułów.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();

    // Słuchamy zdarzeń realtime w celu automatycznego przeładowania tablicy
    const handleRealtimeUpdate = () => {
      fetchArticles();
    };

    window.addEventListener('article_changed_realtime', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('article_changed_realtime', handleRealtimeUpdate);
    };
  }, []);

  // Obsługa tworzenia nowego artykułu
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      await api.post('/articles', {
        title: newTitle,
        lead: newLead,
        content: newContent
      });
      
      addToast('Sukces', 'Utworzono pomysł artykułu!', 'success');
      setShowCreateModal(false);
      setNewTitle('');
      setNewLead('');
      setNewContent('');
      fetchArticles();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się stworzyć artykułu.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Szybka zmiana statusu bezpośrednio z poziomu tablicy Kanban (dla odpowiednich ról)
  const handleQuickStatusChange = async (articleId: number, status: ArticleStatus, comment: string) => {
    try {
      await api.patch(`/articles/${articleId}/status`, { status, comment });
      addToast('Workflow', `Zmieniono status artykułu na ${status}`, 'success');
      fetchArticles();
    } catch (error: any) {
      addToast('Błąd uprawnień', error.response?.data?.message || 'Nie można zmienić statusu.', 'error');
    }
  };

  // Eksport aktualnie przefiltrowanych artykułów do pliku CSV
  const handleExportCSV = () => {
    if (filteredArticles.length === 0) {
      addToast('Informacja', 'Brak artykułów spełniających kryteria wyszukiwania do eksportu.', 'info');
      return;
    }

    const headers = ['ID', 'Tytuł', 'Lead/Wstęp', 'Status', 'Autor', 'Recenzent', 'Ostatnia aktualizacja'];
    const csvRows = [
      headers.join(';'), // Średnik jako separator dla zgodności z polskimi arkuszami kalkulacyjnymi
      ...filteredArticles.map(art => [
        art.id,
        `"${art.title.replace(/"/g, '""')}"`,
        `"${art.lead.replace(/"/g, '""')}"`,
        art.status,
        `"${art.author.name.replace(/"/g, '""')}"`,
        art.reviewer ? `"${art.reviewer.name.replace(/"/g, '""')}"` : 'Brak',
        new Date(art.updatedAt).toLocaleDateString('pl-PL')
      ].join(';'))
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Dodajemy BOM dla poprawnego kodowania polskich znaków diakrytycznych w Excelu
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `raport_artykulow_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Eksport', 'Wygenerowano i pobrano plik CSV.', 'success');
  };

  // Filtrowanie artykułów po wyszukiwarce tekstowej
  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      article.lead.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = selectedStatus === 'ALL' || article.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Lista kolumn Kanban
  const kanbanColumns: { id: ArticleStatus; label: string; color: string }[] = [
    { id: ArticleStatus.IDEA, label: 'Pomysły', color: '#9ca3af' },
    { id: ArticleStatus.DRAFT, label: 'Szkice', color: '#3b82f6' },
    { id: ArticleStatus.REVIEW, label: 'Do weryfikacji', color: '#f59e0b' },
    { id: ArticleStatus.APPROVED, label: 'Zatwierdzone', color: '#10b981' },
    { id: ArticleStatus.SCHEDULED, label: 'Zaplanowane', color: '#84cc16' },
    { id: ArticleStatus.PUBLISHED, label: 'Opublikowane', color: '#06b6d4' },
    { id: ArticleStatus.REJECTED, label: 'Odrzucone', color: '#ef4444' }
  ];

  // Sprawdza, czy zalogowany użytkownik ma uprawnienia do szybkiego pchnięcia statusu na Kanbanie
  const canQuickPromote = (article: Article) => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;

    const isOwnArticle = article.authorId === user.id;

    if (article.status === ArticleStatus.IDEA && user.role === Role.AUTHOR && isOwnArticle) return true;
    if (article.status === ArticleStatus.DRAFT && user.role === Role.AUTHOR && isOwnArticle) return true;
    if (article.status === ArticleStatus.REJECTED && user.role === Role.AUTHOR && isOwnArticle) return true;
    if (article.status === ArticleStatus.REVIEW && user.role === Role.REVIEWER) return true;
    if (article.status === ArticleStatus.APPROVED && user.role === Role.EDITOR) return true;
    if (article.status === ArticleStatus.SCHEDULED && user.role === Role.EDITOR) return true;

    return false;
  };

  return (
    <div className="animate-slide-in">
      {/* ------------------------------------------------------------------------
         NAGŁÓWEK I FILTRY
         ------------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
            Baza Artykułów
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Przeglądaj i zarządzaj cyklem życia artykułów redakcyjnych
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Przełącznik Widoków */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button 
              onClick={() => setViewType('kanban')}
              style={{
                background: viewType === 'kanban' ? 'var(--bg-secondary)' : 'none',
                boxShadow: viewType === 'kanban' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                color: viewType === 'kanban' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <KanbanSquare size={16} /> Kanban
            </button>
            <button 
              onClick={() => setViewType('list')}
              style={{
                background: viewType === 'list' ? 'var(--bg-secondary)' : 'none',
                boxShadow: viewType === 'list' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                color: viewType === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <List size={16} /> Lista
            </button>
          </div>

          {/* Przycisk Eksportu CSV */}
          <button 
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Eksportuj aktualną listę do CSV"
          >
            <Download size={18} /> Eksport CSV
          </button>

          {/* Przycisk Nowy Artykuł */}
          {(user?.role === Role.AUTHOR || user?.role === Role.ADMIN) && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus size={18} /> Nowy artykuł
            </button>
          )}
        </div>
      </div>

      {/* PASEK WYSZUKIWANIA I FILTROWANIA */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Wyszukiwarka tekstowa */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280'
          }} />
          <input 
            type="text" 
            placeholder="Szukaj po tytule, wstępie lub autorze..." 
            className="form-input" 
            style={{ paddingLeft: '42px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtr statusu (widoczny głównie w widoku listy) */}
        {viewType === 'list' && (
          <div style={{ minWidth: '180px' }}>
            <select 
              className="form-input form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Wszystkie statusy</option>
              {kanbanColumns.map(col => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------
         WIDOK KANBAN (Domyślny)
         ------------------------------------------------------------------------ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
          Pobieranie artykułów...
        </div>
      ) : viewType === 'kanban' ? (
        <div className="kanban-board">
          {kanbanColumns.map(col => {
            const colArticles = filteredArticles.filter(art => art.status === col.id);
            return (
              <div key={col.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                    {col.label}
                  </div>
                  <span className="kanban-column-count">{colArticles.length}</span>
                </div>

                <div className="kanban-column-cards">
                  {colArticles.length === 0 ? (
                    <div style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.8rem',
                      border: '1px dashed rgba(255,255,255,0.03)',
                      borderRadius: '8px'
                    }}>
                      Brak artykułów
                    </div>
                  ) : (
                    colArticles.map(art => {
                      const { category, gradient } = getMockCategoryAndGradient(art.id);
                      const hasImage = art.uploads && art.uploads.length > 0 && art.uploads.some(up => up.mimetype.startsWith('image/'));
                      const imagePath = hasImage ? art.uploads?.find(up => up.mimetype.startsWith('image/'))?.filepath : null;
                      const wordCount = art.content ? art.content.split(/\s+/).length : 0;
                      const readTime = Math.max(1, Math.round(wordCount / 180));

                      return (
                        <div 
                          key={art.id} 
                          className="kanban-card"
                          onClick={() => navigate(`/articles/${art.id}`)}
                        >
                          {imagePath ? (
                            <img 
                              src={`${BACKEND_URL}${imagePath}`} 
                              alt={art.title} 
                              style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px', border: '1px solid var(--border-light)' }} 
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100px', borderRadius: '4px', background: gradient, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.85, border: '1px solid var(--border-light)' }}>
                              📰
                            </div>
                          )}
                          <div>
                            <span className="news-card-category">{category}</span>
                            <h4 className="kanban-card-title">{art.title}</h4>
                          </div>
                          <p className="kanban-card-lead">{art.lead}</p>
                          
                          <div className="kanban-card-meta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--bg-dark-sidebar)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                fontFamily: 'Outfit'
                              }}>
                                {art.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{art.author.name}</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem' }}>
                              <span>⏱️ {readTime} min</span>
                              {art._count && art._count.comments > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#a855f7' }}>
                                  <MessageSquare size={12} />
                                  {art._count.comments}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Szybka promocja statusu na karcie */}
                          {canQuickPromote(art) && (
                            <div 
                              style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}
                              onClick={(e) => e.stopPropagation()} // Zapobiegamy nawigacji przy kliknięciu w guzik akcji
                            >
                              {art.status === ArticleStatus.IDEA && (
                                <button 
                                  onClick={() => handleQuickStatusChange(art.id, ArticleStatus.DRAFT, 'Rozpoczęto pisanie szkicu.')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                  Pisz szkic <ArrowRight size={12} />
                                </button>
                              )}
                              {art.status === ArticleStatus.DRAFT && (
                                <button 
                                  onClick={() => handleQuickStatusChange(art.id, ArticleStatus.REVIEW, 'Przesłano do recenzji redaktora.')}
                                  className="btn btn-primary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                  Do recenzji <Clock size={12} />
                                </button>
                              )}
                              {art.status === ArticleStatus.REJECTED && (
                                <button 
                                  onClick={() => handleQuickStatusChange(art.id, ArticleStatus.DRAFT, 'Poprawianie odrzuconego tekstu.')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                  Popraw tekst <FileEdit size={12} />
                                </button>
                              )}
                              {art.status === ArticleStatus.REVIEW && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={() => handleQuickStatusChange(art.id, ArticleStatus.DRAFT, 'Odesłano do poprawy - recenzent.')}
                                    className="btn btn-secondary" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                    title="Odeślij do poprawy"
                                  >
                                    <X size={12} /> Popraw
                                  </button>
                                  <button 
                                    onClick={() => handleQuickStatusChange(art.id, ArticleStatus.APPROVED, 'Zaakceptowano treść - recenzent.')}
                                    className="btn btn-primary" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#10b981' }}
                                    title="Zatwierdź do publikacji"
                                  >
                                    <Check size={12} /> Akceptuj
                                  </button>
                                </div>
                              )}
                              {art.status === ArticleStatus.APPROVED && (
                                <button 
                                  onClick={() => navigate(`/articles/${art.id}`)}
                                  className="btn btn-primary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#84cc16' }}
                                >
                                  Zaplanuj publikację
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ------------------------------------------------------------------------
           WIDOK LISTY (TABELA)
           ------------------------------------------------------------------------ */
        <div className="glass-panel animate-slide-in" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: '#9ca3af', fontSize: '0.88rem' }}>
                <th style={{ padding: '16px 24px' }}>Tytuł artykułu</th>
                <th style={{ padding: '16px 24px' }}>Autor</th>
                <th style={{ padding: '16px 24px' }}>Status</th>
                <th style={{ padding: '16px 24px' }}>Recenzent</th>
                <th style={{ padding: '16px 24px' }}>Ostatnia aktualizacja</th>
                <th style={{ padding: '16px 24px' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Brak artykułów spełniających kryteria filtrowania.
                  </td>
                </tr>
              ) : (
               filteredArticles.map(art => {
                const { category, gradient } = getMockCategoryAndGradient(art.id);
                const hasImage = art.uploads && art.uploads.length > 0 && art.uploads.some(up => up.mimetype.startsWith('image/'));
                const imagePath = hasImage ? art.uploads?.find(up => up.mimetype.startsWith('image/'))?.filepath : null;

                return (
                  <tr 
                    key={art.id} 
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s', cursor: 'pointer' }}
                    onClick={() => navigate(`/articles/${art.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {imagePath ? (
                          <img 
                            src={`${BACKEND_URL}${imagePath}`} 
                            alt={art.title} 
                            style={{ width: '50px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-light)', flexShrink: 0 }} 
                          />
                        ) : (
                          <div style={{ width: '50px', height: '38px', borderRadius: '4px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', opacity: 0.85, border: '1px solid var(--border-light)', flexShrink: 0 }}>
                            📰
                          </div>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            {category}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '400px' }}>
                            {art.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {art.lead}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 600 }}>{art.author.name}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge badge-${art.status.toLowerCase()}`}>
                        {polishStatusLabels[art.status]}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: art.reviewer ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {art.reviewer ? art.reviewer.name : 'Brak'}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {new Date(art.updatedAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '16px 24px' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/articles/${art.id}`)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Otwórz
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         MODAL TWORZENIA NOWEGO ARTYKUŁU
         ------------------------------------------------------------------------ */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel animate-slide-in" style={{
            maxWidth: '650px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', fontWeight: 700 }}>
                Utwórz pomysł artykułu
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateArticle}>
              <div className="form-group">
                <label className="form-label">Tytuł artykułu</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="np. Wprowadzenie do React Server Components"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={createLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lead / Wstęp (Krótkie podsumowanie)</label>
                <textarea 
                  required 
                  className="form-input" 
                  placeholder="Krótki, chwytliwy wstęp przyciągający uwagę czytelnika (50-200 znaków)..."
                  rows={3}
                  value={newLead}
                  onChange={(e) => setNewLead(e.target.value)}
                  style={{ resize: 'vertical' }}
                  disabled={createLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Inicjalna treść (Szkic)</label>
                <textarea 
                  required 
                  className="form-input" 
                  placeholder="Wpisz tutaj zarys tekstu lub pierwsze akapity w formacie Markdown..."
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'Courier New', fontSize: '0.9rem' }}
                  disabled={createLoading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  Anuluj
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? 'Tworzenie...' : 'Utwórz pomysł'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Articles;
