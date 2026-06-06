// ==============================================================================
// ARTICLE EDIT & DETAILS PAGE (Obszar Roboczy Artykułu)
// ==============================================================================
// Zaawansowany pulpit edycji tekstu. Oferuje podział ekranu na edytor Markdown
// i podgląd HTML (własny offline parser), panel zmiany statusów zależny od ról
// (z obsługą planowania), sekcję komentarzy redakcyjnych działających w czasie
// rzeczywistym oraz moduł załączników (upload plików).

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
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
  File
} from 'lucide-react';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link to="/articles" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Powrót do bazy
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.88rem', color: '#9ca3af' }}>Status:</span>
          <span className={`badge badge-${article.status.toLowerCase()}`}>
            {polishStatusLabels[article.status]}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------------
         SIATKA GŁÓWNA (GRID)
         ------------------------------------------------------------------------ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '7fr 4fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* LEWA KOLUMNA: EDYTOR MARKDOWN & PODGLĄD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
              <FileText size={22} style={{ color: '#6366f1' }} />
              Treść Artykułu
            </h2>

            {/* Inputy Tytułu i Leada */}
            <div className="form-group">
              <label className="form-label">Tytuł</label>
              <input 
                type="text" 
                className="form-input" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditContent || saving}
                style={{ fontSize: '1.1rem', fontWeight: 600 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lead (Wstęp)</label>
              <textarea 
                className="form-input" 
                rows={2}
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                disabled={!canEditContent || saving}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Split Screen Editor i Live Preview */}
            <label className="form-label">Treść (Format Markdown)</label>
            <div className="editor-layout" style={{ marginBottom: '20px' }}>
              <div>
                <textarea 
                  className="editor-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!canEditContent || saving}
                  placeholder="# Wpisz nagłówek..."
                />
              </div>
              <div 
                className="preview-container"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
              />
            </div>

            {/* Przycisk Zapisz */}
            {canEditContent && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleSaveContent}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <Save size={18} /> {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            )}
          </div>

          {/* DYSKUSJA I UWAGI (KOMENTARZE REALTIME) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '450px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
              <MessageSquare size={20} style={{ color: '#a855f7' }} />
              Uwagi i Komentarze Redakcyjne
            </h3>

            {/* Lista komentarzy */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              marginBottom: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              paddingRight: '6px'
            }}>
              {article.comments?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: '0.88rem' }}>
                  Brak komentarzy. Rozpocznij dyskusję wpisując pierwszą uwagę.
                </div>
              ) : (
                article.comments?.map((comment) => (
                  <div 
                    key={comment.id}
                    style={{
                      alignSelf: comment.userId === user?.id ? 'flex-end' : 'flex-start',
                      backgroundColor: comment.userId === user?.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: comment.userId === user?.id ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--border-light)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      maxWidth: '80%',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                      <span style={{ color: comment.userId === user?.id ? '#a5b4fc' : '#fff' }}>
                        {comment.user.name} ({comment.user.role})
                      </span>
                      <span style={{ color: '#6b7280' }}>
                        {new Date(comment.createdAt).toLocaleTimeString('pl-PL')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Formularz komentarza */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Wpisz uwagę do tekstu..." 
                className="form-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={commentLoading}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: '10px 16px' }}
                disabled={commentLoading}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* PRAWA KOLUMNA: WORKFLOW, PLIKI, HISTORIA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PANEL WORKFLOW REDAKCYJNEGO */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} style={{ color: '#10b981' }} />
              Workflow Redakcyjny
            </h3>

            {/* Informacje o zespole */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Autor:</span>
                <span style={{ fontWeight: 600 }}>{article.author.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af' }}>Recenzent:</span>
                {isEditorOrAdmin ? (
                  /* Edytor może przypisywać recenzenta */
                  <select 
                    className="form-input" 
                    style={{ width: '180px', padding: '6px 12px', fontSize: '0.8rem' }}
                    value={selectedReviewer || ''}
                    onChange={(e) => setSelectedReviewer(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Nieprzypisany</option>
                    {reviewers.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontWeight: 600 }}>
                    {article.reviewer ? article.reviewer.name : 'Brak przypisanego'}
                  </span>
                )}
              </div>
              {article.publishedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Opublikowano:</span>
                  <span style={{ fontWeight: 600, color: '#06b6d4' }}>
                    {new Date(article.publishedAt).toLocaleString('pl-PL')}
                  </span>
                </div>
              )}
            </div>

            {/* INTERFEJS ZMIANY STATUSÓW (Zależny od uprawnień) */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <h4 className="form-label" style={{ marginBottom: '12px' }}>Dozwolone Akcje Workflow</h4>
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Komentarz do statusu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="np. Przekazuję do korekty, poprawiłem lead..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  disabled={statusLoading}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Warunkowe wyświetlanie planowania dla statusu SCHEDULED */}
              {((isEditorOrAdmin) && (article.status === ArticleStatus.APPROVED || article.status === ArticleStatus.SCHEDULED)) && (
                <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-light)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: '#84cc16' }} /> Zaplanuj datę publikacji
                  </label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={statusLoading}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Przyciski Akcji */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
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
                    style={{ width: '100%', backgroundColor: '#f59e0b' }}
                    disabled={statusLoading}
                  >
                    Prześlij do weryfikacji redakcji
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
                      style={{ flex: 1, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      disabled={statusLoading}
                    >
                      Zwróć do poprawki
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.APPROVED)} 
                      className="btn btn-primary" 
                      style={{ flex: 1, backgroundColor: '#10b981' }}
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
                    style={{ width: '100%', marginTop: '4px', color: '#6b7280' }}
                    disabled={statusLoading}
                  >
                    Odrzuć całkowicie pomysł
                  </button>
                )}

                {/* 3. Akcje Edytora (Editora) */}
                {isEditorOrAdmin && article.status === ArticleStatus.APPROVED && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.SCHEDULED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: '#84cc16' }}
                      disabled={statusLoading}
                    >
                      Zaplanuj publikację
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.PUBLISHED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: '#06b6d4' }}
                      disabled={statusLoading}
                    >
                      Opublikuj teraz na portalu
                    </button>
                  </div>
                )}

                {isEditorOrAdmin && article.status === ArticleStatus.SCHEDULED && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.PUBLISHED)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', backgroundColor: '#06b6d4' }}
                      disabled={statusLoading}
                    >
                      Publikuj ręcznie teraz
                    </button>
                    <button 
                      onClick={() => handleStatusChange(ArticleStatus.DRAFT)} 
                      className="btn btn-secondary" 
                      style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      disabled={statusLoading}
                    >
                      Wycofaj z publikacji (do Szkicu)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WGrywanie I LISTA ZAŁĄCZNIKÓW */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadIcon size={20} style={{ color: '#06b6d4' }} />
              Pliki i Ilustracje
            </h3>

            {/* Lista wgranych plików */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {article.uploads?.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', border: '1px dashed var(--border-light)', borderRadius: '6px' }}>
                  Brak załączników.
                </div>
              ) : (
                article.uploads?.map((up) => (
                  <div 
                    key={up.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <File size={16} style={{ color: '#06b6d4', flexShrink: 0 }} />
                      <a 
                        href={`http://localhost:5000${up.filepath}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#d1d5db', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 500 }}
                      >
                        {up.filename}
                      </a>
                    </div>
                    <span style={{ color: '#6b7280', fontSize: '0.75rem', flexShrink: 0 }}>
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
              className="btn btn-secondary animate-slide-in"
              style={{ width: '100%', fontSize: '0.85rem' }}
              disabled={uploadLoading}
            >
              <UploadIcon size={16} /> {uploadLoading ? 'Wgrywanie pliku...' : 'Wgraj ilustrację lub PDF'}
            </button>
          </div>

          {/* HISTORIA ZMIAN STATUSÓW (Timeline) */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} style={{ color: '#a855f7' }} />
              Historia Zmian Tekstu
            </h3>

            <div className="timeline">
              {article.history?.map((entry) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-item-header">
                    <span className="timeline-user">{entry.user.name}</span>
                    <span className="timeline-time">
                      {new Date(entry.changedAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                    Status:{' '}
                    <span style={{ color: '#fff', fontWeight: 600 }}>
                      {polishStatusLabels[entry.newStatus]}
                    </span>
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
