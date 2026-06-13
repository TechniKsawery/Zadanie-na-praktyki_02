// ==============================================================================
// ARTICLE EDIT & DETAILS PAGE (Obszar Roboczy Artykułu)
// ==============================================================================
// Zaawansowany pulpit edycji tekstu. Oferuje podział ekranu na edytor Markdown
// i podgląd HTML (własny offline parser), panel zmiany statusów zależny od ról
// (z obsługą planowania), sekcję komentarzy redakcyjnych działających w czasie
// rzeczywistym oraz moduł załączników (upload plików).

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Article, ArticleStatus, Role, User } from '../types';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Send, 
  Upload as UploadIcon,
  MessageSquare,
  History,
  Calendar,
  UserCheck,
  File,
  Eye
} from 'lucide-react';

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

export const ArticleEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Stan edycji treści
  const [title, setTitle] = useState('');
  const [lead, setLead] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'split' | 'edit' | 'preview'>('split');

  // Stan workflow
  const [selectedReviewer, setSelectedReviewer] = useState<number | null>(null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [statusComment, setStatusComment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Stan komentarzy
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Stan plików
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autorski parser Markdown -> HTML (działa 100% offline, bez instalacji pakietów)
  const parseMarkdown = (md: string): string => {
    if (!md) return '';
    // Bezpieczne kodowanie znaków specjalnych HTML
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Nagłówki
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');

    // Pogrubienie i Kursywa
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Listy wypunktowane
    html = html.replace(/^\s*-\s*(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, ''); // Scalanie przylegających list

    // Bloki kodu
    html = html.replace(/```([\s\S]*?)```/gim, '<pre style="background:rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding:14px; border-radius:6px; overflow-x:auto; font-family:monospace; font-size:0.88rem; margin: 12px 0;">$1</pre>');
    // Kod w linii
    html = html.replace(/`([^`]+)`/gim, '<code style="background:rgba(99,102,241,0.15); color:#a5b4fc; padding:2px 6px; border-radius:4px; font-family:monospace;">$1</code>');

    // Paragrafy (dzielenie po podwójnej nowej linii)
    html = html.split('\n\n').map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<pre')) {
        return trimmed;
      }
      return trimmed ? `<p style="margin-bottom:12px; line-height:1.6;">${trimmed.replace(/\n/g, '<br/>')}</p>` : '';
    }).join('\n');

    return html;
  };

  // Pobranie szczegółów artykułu i listy recenzentów
  const fetchArticleDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/articles/${id}`);
      const art = response.data.article;
      setArticle(art);
      setTitle(art.title);
      setLead(art.lead);
      setContent(art.content);
      setSelectedReviewer(art.reviewerId);
      
      if (art.scheduledAt) {
        // Formatuje datę na format odpowiedni do input[type="datetime-local"]
        const dateObj = new Date(art.scheduledAt);
        // Przesunięcie strefy czasowej
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
        setScheduledDate(localISOTime);
      }
    } catch (error) {
      console.error('Błąd pobierania szczegółów artykułu:', error);
      addToast('Błąd', 'Nie udało się pobrać szczegółów artykułu.', 'error');
      navigate('/articles');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewers = async () => {
    try {
      const response = await api.get('/admin/users');
      // Filtrujemy tylko użytkowników o roli REVIEWER lub ADMIN
      const revs = response.data.users.filter((u: User) => u.role === Role.REVIEWER || u.role === Role.ADMIN);
      setReviewers(revs);
    } catch (err) {
      console.error('Błąd pobierania recenzentów:', err);
    }
  };

  useEffect(() => {
    fetchArticleDetails();
    fetchReviewers();

    // Słuchamy odświeżeń Socket.IO w czasie rzeczywistym
    const handleArticleChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.articleId === parseInt(id || '')) {
        // Przeładuj delikatnie szczegóły z bazy (bez pełnego loadera)
        api.get(`/articles/${id}`).then(res => {
          setArticle(res.data.article);
        });
      }
    };

    const handleCommentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.articleId === parseInt(id || '')) {
        setArticle(prev => {
          if (!prev) return null;
          // Dodajemy nowy komentarz na koniec listy, jeśli go jeszcze nie ma
          const exists = prev.comments?.some(c => c.id === detail.comment.id);
          if (exists) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), detail.comment]
          };
        });
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    window.addEventListener('article_changed_realtime', handleArticleChange);
    window.addEventListener('comment_added_realtime', handleCommentChange);

    return () => {
      window.removeEventListener('article_changed_realtime', handleArticleChange);
      window.removeEventListener('comment_added_realtime', handleCommentChange);
    };
  }, [id]);

  // Zapisywanie edycji treści artykułu
  const handleSaveContent = async () => {
    setSaving(true);
    try {
      const updateData: any = { title, lead, content };
      // Edytor może też przypisywać recenzenta w tym formularzu
      if (user?.role === Role.EDITOR || user?.role === Role.ADMIN) {
        updateData.reviewerId = selectedReviewer;
      }

      await api.patch(`/articles/${id}`, updateData);
      addToast('Sukces', 'Artykuł został pomyślnie zapisany.', 'success');
      fetchArticleDetails();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się zapisać artykułu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Obsługa zmiany statusu w workflow
  const handleStatusChange = async (newStatus: ArticleStatus) => {
    setStatusLoading(true);
    try {
      const payload: any = {
        status: newStatus,
        comment: statusComment
      };

      if (newStatus === ArticleStatus.SCHEDULED) {
        if (!scheduledDate) {
          addToast('Wymagana data', 'Proszę podać datę publikacji.', 'warning');
          setStatusLoading(false);
          return;
        }
        payload.scheduledAt = new Date(scheduledDate).toISOString();
      }

      await api.patch(`/articles/${id}/status`, payload);
      addToast('Sukces', `Status artykułu zmieniony na: ${newStatus}`, 'success');
      setStatusComment('');
      fetchArticleDetails();
    } catch (error: any) {
      addToast('Błąd workflow', error.response?.data?.message || 'Niedozwolona zmiana statusu.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Dodawanie komentarza do dyskusji
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);

    try {
      await api.post(`/articles/${id}/comments`, { content: newComment });
      setNewComment('');
      // Dane zostaną zaktualizowane przez Socket.io event lub ręczne pobranie
      fetchArticleDetails();
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (error: any) {
      addToast('Błąd', 'Nie udało się dodać komentarza.', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  // Obsługa wgrywania załącznika
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('articleId', id || '');

    try {
      await api.post('/articles/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      addToast('Sukces', 'Załącznik został pomyślnie dodany.', 'success');
      fetchArticleDetails();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się wgrać pliku.', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  // Pomocnicza translacja statusów na język polski
  const polishStatusLabels: Record<ArticleStatus, string> = {
    [ArticleStatus.IDEA]: 'Pomysł',
    [ArticleStatus.DRAFT]: 'Szkic',
    [ArticleStatus.REVIEW]: 'W weryfikacji',
    [ArticleStatus.APPROVED]: 'Zatwierdzony',
    [ArticleStatus.SCHEDULED]: 'Zaplanowany',
    [ArticleStatus.PUBLISHED]: 'Opublikowany',
    [ArticleStatus.REJECTED]: 'Odrzucony'
  };

  // Sprawdzamy czy użytkownik to autor tekstu
  const isAuthor = article?.authorId === user?.id;
  const isEditorOrAdmin = user?.role === Role.EDITOR || user?.role === Role.ADMIN;
  const isReviewer = user?.role === Role.REVIEWER;

  // Możliwość edycji treści (tylko autor lub redaktor/admin)
  const canEditContent = isOwnDraftOrIdea() || isEditorOrAdmin;
  
  function isOwnDraftOrIdea() {
    if (!article) return false;
    return isAuthor && (
      article.status === ArticleStatus.IDEA || 
      article.status === ArticleStatus.DRAFT || 
      article.status === ArticleStatus.REJECTED
    );
  }

  if (loading || !article) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
        Ładowanie obszaru roboczego artykułu...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* ------------------------------------------------------------------------
         GÓRNY RETRO PASEK
         ------------------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <Link to="/articles" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Powrót do bazy
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status tekstu:</span>
          <span className={`badge badge-${article.status.toLowerCase()}`}>
            {polishStatusLabels[article.status]}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------------
         SIATKA GŁÓWNA (GRID)
         ------------------------------------------------------------------------ */}
      <div className="article-edit-container">
        {/* LEWA KOLUMNA: EDYTOR MARKDOWN & PODGLĄD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit' }}>
              <FileText size={22} style={{ color: 'var(--color-primary)' }} />
              Obszar Roboczy Artykułu
            </h2>

            {/* Inputy Tytułu i Leada */}
            <div className="form-group">
              <label className="form-label">Tytuł prasowy (Nagłówek główny)</label>
              <input 
                type="text" 
                className="form-input" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditContent || saving}
                style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}
                placeholder="Wpisz chwytliwy tytuł artykułu..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Lead / Wstęp (Wyróżniony akapit początkowy)</label>
              <textarea 
                className="form-input" 
                rows={2}
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                disabled={!canEditContent || saving}
                style={{ resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500 }}
                placeholder="Napisz krótki, zachęcający wstęp (będzie pogrubiony na początku artykułu)..."
              />
            </div>

            {/* Przełącznik trybu edytora / podglądu (wzorem profesjonalnych CMS) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '16px', 
              borderBottom: '1px solid var(--border-light)', 
              paddingBottom: '12px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditorMode('split')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: editorMode === 'split' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                    color: editorMode === 'split' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  🖥️ Podział ekranu
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('edit')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: editorMode === 'edit' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                    color: editorMode === 'edit' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  ✏️ Edytor (Markdown)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: editorMode === 'preview' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                    color: editorMode === 'preview' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Eye size={16} /> Podgląd (Wmedia Live)
                </button>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {editorMode === 'split' && 'Podgląd na żywo obok edytora'}
                {editorMode === 'edit' && 'Pełna szerokość do wygodnego pisania'}
                {editorMode === 'preview' && 'Wizualizacja artykułu w portalu prasowym'}
              </span>
            </div>
            
            <div 
              className="editor-layout" 
              style={{ 
                marginBottom: '24px',
                gridTemplateColumns: editorMode === 'split' ? '1fr 1fr' : '1fr'
              }}
            >
              {(editorMode === 'split' || editorMode === 'edit') && (
                <div style={{ height: '100%' }}>
                  <textarea 
                    className="editor-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!canEditContent || saving}
                    placeholder="# Nagłówek sekcji&#10;&#10;Zacznij pisać treść artykułu... Możesz używać tagów Markdown, np. **pogrubienie**, *kursywa*, czy `kod`."
                    style={{ height: '100%', resize: 'none' }}
                  />
                </div>
              )}
              
              {(editorMode === 'split' || editorMode === 'preview') && (
                /* Portal-Style live preview */
                <div className="preview-container" style={{ height: '100%' }}>
                  <div className="portal-article-wrapper">
                    <span className="portal-article-category">
                      {getMockCategoryAndGradient(article.id).category}
                    </span>
                    <h1 className="portal-article-title">{title || 'Brak Tytułu'}</h1>
                    
                    <div className="portal-article-author-row">
                      <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.78rem' }}>
                        {article.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="portal-article-author-info">
                        <span className="portal-article-author-name">{article.author.name}</span>
                        <span className="portal-article-meta">
                          {article.publishedAt ? `Opublikowano: ${new Date(article.publishedAt).toLocaleDateString('pl-PL')}` : 'Szkic roboczy'} • ⏱️ {Math.max(1, Math.round(content.split(/\s+/).length / 180))} min czytania
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Hero Image */}
                    {article.uploads && article.uploads.length > 0 && article.uploads.some(up => up.mimetype.startsWith('image/')) ? (
                      <img 
                        src={`${BACKEND_URL}${article.uploads.find(up => up.mimetype.startsWith('image/'))?.filepath}`} 
                        alt="Ilustracja artykułu" 
                        className="portal-article-image" 
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '180px',
                        borderRadius: '6px',
                        background: getMockCategoryAndGradient(article.id).gradient,
                        marginBottom: '24px',
                        opacity: 0.15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        border: '1px solid var(--border-light)'
                      }}>
                        📰
                      </div>
                    )}

                    {lead && (
                      <div className="portal-article-lead">
                        {lead}
                      </div>
                    )}

                    <div 
                      className="portal-article-content"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Przycisk Zapisz */}
            {canEditContent && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleSaveContent}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <Save size={18} /> {saving ? 'Zapisywanie...' : 'Zapisz i synchronizuj'}
                </button>
              </div>
            )}
          </div>

          {/* DYSKUSJA I UWAGI (KOMENTARZE REALTIME) */}
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', height: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
              <MessageSquare size={20} style={{ color: '#a855f7' }} />
              Uwagi i Komentarze Zespołu
            </h3>

            {/* Lista komentarzy */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              marginBottom: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              paddingRight: '6px'
            }}>
              {article.comments?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Brak uwag. Rozpocznij dyskusję wpisując pierwszy komentarz redakcyjny.
                </div>
              ) : (
                article.comments?.map((comment) => {
                  const isMe = comment.userId === user?.id;
                  return (
                    <div 
                      key={comment.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        backgroundColor: isMe ? 'rgba(226, 0, 26, 0.04)' : 'var(--bg-tertiary)',
                        border: isMe ? '1px solid rgba(226, 0, 26, 0.15)' : '1px solid var(--border-light)',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        maxWidth: '80%',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span style={{ color: isMe ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                          {comment.user.name} ({comment.user.role === Role.ADMIN ? 'Admin' : comment.user.role === Role.EDITOR ? 'Redaktor' : comment.user.role === Role.REVIEWER ? 'Recenzent' : 'Autor'})
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {new Date(comment.createdAt).toLocaleTimeString('pl-PL')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Formularz komentarza */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Wpisz uwagę lub zalecenie poprawki dla autora..." 
                className="form-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={commentLoading}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: '10px 18px', flexShrink: 0 }}
                disabled={commentLoading}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* PRAWA KOLUMNA: WORKFLOW, PLIKI, HISTORIA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* PANEL WORKFLOW REDAKCYJNEGO */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} style={{ color: '#059669' }} />
              Karta Metadanych i Stanu
            </h3>

            {/* Informacje o zespole */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Autor tekstu:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{article.author.name}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Recenzent:</span>
                {isEditorOrAdmin ? (
                  /* Edytor może przypisywać recenzenta */
                  <select 
                    className="form-input form-select" 
                    style={{ width: '180px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                    value={selectedReviewer || ''}
                    onChange={(e) => setSelectedReviewer(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Nieprzypisany</option>
                    {reviewers.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {article.reviewer ? article.reviewer.name : 'Nieprzypisany'}
                  </span>
                )}
              </div>

              {article.publishedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Opublikowano:</span>
                  <span style={{ fontWeight: 700, color: '#0891b2' }}>
                    {new Date(article.publishedAt).toLocaleString('pl-PL')}
                  </span>
                </div>
              )}
            </div>

            {/* INTERFEJS ZMIANY STATUSÓW (Zależny od uprawnień) */}
            <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '20px' }}>
              <h4 className="form-label" style={{ marginBottom: '14px', fontSize: '0.75rem' }}>Dozwolone Akcje Workflow</h4>
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Uzasadnienie / Komentarz do statusu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Krótkie wyjaśnienie akcji workflow..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  disabled={statusLoading}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Warunkowe wyświetlanie planowania dla statusu SCHEDULED */}
              {((isEditorOrAdmin) && (article.status === ArticleStatus.APPROVED || article.status === ArticleStatus.SCHEDULED)) && (
                <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#65a30d' }}>
                    <Calendar size={14} /> Zaplanuj datę publikacji
                  </label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={statusLoading}
                    style={{ fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
              )}

              {/* Przyciski Akcji */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. Akcje Autora */}
                {isAuthor && article.status === ArticleStatus.IDEA && (
                  <button 
                    onClick={() => handleStatusChange(ArticleStatus.DRAFT)} 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    disabled={statusLoading}
                  >
                    Rozpocznij pisanie szkicu
                  </button>
                )}
                {isAuthor && article.status === ArticleStatus.DRAFT && (
                  <button 
                    onClick={() => handleStatusChange(ArticleStatus.REVIEW)} 
                    className="btn btn-primary" 
                    style={{ width: '100%', backgroundColor: 'var(--status-review)' }}
                    disabled={statusLoading}
                  >
                    Prześlij do weryfikacji redaktora
                  </button>
                )}
                {isAuthor && article.status === ArticleStatus.REJECTED && (
                  <button 
                    onClick={() => handleStatusChange(ArticleStatus.DRAFT)} 
                    className="btn btn-secondary" 
                    style={{ width: '100%' }}
                    disabled={statusLoading}
                  >
                    Cofnij do szkicu (Poprawianie)
                  </button>
                )}

                {/* 2. Akcje Recenzenta (Reviewera) */}
                {(isReviewer || isEditorOrAdmin) && article.status === ArticleStatus.REVIEW && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.DRAFT)} 
                      className="btn btn-secondary" 
                      style={{ flex: 1, color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)', fontWeight: 700 }}
                      disabled={statusLoading}
                    >
                      Odeślij do poprawki
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.APPROVED)} 
                      className="btn btn-primary" 
                      style={{ flex: 1, backgroundColor: 'var(--status-approved)' }}
                      disabled={statusLoading}
                    >
                      Zatwierdź
                    </button>
                  </div>
                )}
                {(isReviewer || isEditorOrAdmin) && article.status === ArticleStatus.REVIEW && (
                  <button 
                    onClick={() => handleStatusChange(ArticleStatus.REJECTED)} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '4px', color: 'var(--text-secondary)' }}
                    disabled={statusLoading}
                  >
                    Odrzuć całkowicie pomysł
                  </button>
                )}

                {/* 3. Akcje Edytora (Editora) */}
                {isEditorOrAdmin && article.status === ArticleStatus.APPROVED && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.SCHEDULED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: 'var(--status-scheduled)' }}
                      disabled={statusLoading}
                    >
                      Zaplanuj datę publikacji
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.PUBLISHED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: 'var(--status-published)' }}
                      disabled={statusLoading}
                    >
                      Opublikuj na portalu teraz
                    </button>
                  </div>
                )}

                {isEditorOrAdmin && article.status === ArticleStatus.SCHEDULED && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.PUBLISHED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: 'var(--status-published)' }}
                      disabled={statusLoading}
                    >
                      Publikuj ręcznie teraz
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.DRAFT)} 
                      className="btn btn-secondary" 
                      style={{ width: '100%', color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)', fontWeight: 700 }}
                      disabled={statusLoading}
                    >
                      Wycofaj z publikacji (do Szkicu)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WGRYWANIE I LISTA ZAŁĄCZNIKÓW */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadIcon size={20} style={{ color: '#0891b2' }} />
              Pliki i Ilustracje prasowe
            </h3>

            {/* Lista wgranych plików */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {article.uploads?.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', border: '1px dashed var(--border-light)', borderRadius: '6px' }}>
                  Brak wgranych załączników. Każda wgrana grafika zostanie automatycznie powiązana jako cover photo artykułu.
                </div>
              ) : (
                article.uploads?.map((up) => (
                  <div 
                    key={up.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <File size={16} style={{ color: '#0891b2', flexShrink: 0 }} />
                      <a 
                        href={`${BACKEND_URL}${up.filepath}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 700 }}
                      >
                        {up.filename}
                      </a>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', flexShrink: 0, fontWeight: 600 }}>
                      {(up.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Input Wgrywania pliku */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              accept="image/*,application/pdf"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
              disabled={uploadLoading}
            >
              <UploadIcon size={16} /> {uploadLoading ? 'Przesyłanie...' : 'Wgraj ilustrację prasową'}
            </button>
          </div>

          {/* HISTORIA ZMIAN STATUSÓW (Timeline) */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} style={{ color: 'var(--color-primary)' }} />
              Dziennik Workflow Tekstu
            </h3>

            <div className="timeline">
              {article.history?.map((entry) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-item-header">
                    <span className="timeline-user">{entry.user.name}</span>
                    <span className="timeline-time">
                      {new Date(entry.changedAt).toLocaleDateString('pl-PL')} o {new Date(entry.changedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    Status: <span className={`badge badge-${entry.newStatus.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{polishStatusLabels[entry.newStatus]}</span>
                  </div>
                  {entry.comment && (
                    <div className="timeline-comment">{entry.comment}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ArticleEdit;
