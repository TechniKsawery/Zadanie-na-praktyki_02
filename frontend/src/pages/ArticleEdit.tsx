// ==============================================================================
// ARTICLE EDIT & DETAILS PAGE (Obszar Roboczy Artykułu)
// ==============================================================================
// Zaawansowany pulpit edycji tekstu. Oferuje podział ekranu na edytor Markdown
// i podgląd HTML (własny offline parser), panel zmiany statusów zależny od ról
// (z obsługą planowania), sekcję komentarzy redakcyjnych działających w czasie
// rzeczywistym oraz moduł załączników (upload plików).

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useBlocker } from 'react-router-dom';
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
  Eye,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List as ListIcon,
  Link as LinkIcon,
  Globe,
  RefreshCw,
  AlertCircle,
  Share2
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stan SEO i autozapisu
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaImage, setMetaImage] = useState('');
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [recoveryAvailable, setRecoveryAvailable] = useState<boolean>(false);
  const [recoveredDraft, setRecoveredDraft] = useState<{ title: string, lead: string, content: string, timestamp: number } | null>(null);

  // Stan wersji
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState<boolean>(false);

  // Sprawdzamy czy użytkownik to autor tekstu
  const isAuthor = article?.authorId === user?.id;
  const isEditorOrAdmin = user?.role === Role.EDITOR || user?.role === Role.ADMIN;
  const isReviewer = user?.role === Role.REVIEWER;

  function isOwnDraftOrIdea() {
    if (!article) return false;
    return isAuthor && (
      article.status === ArticleStatus.IDEA || 
      article.status === ArticleStatus.DRAFT || 
      article.status === ArticleStatus.REJECTED
    );
  }

  // Możliwość edycji treści (tylko autor lub redaktor/admin)
  const canEditContent = isOwnDraftOrIdea() || isEditorOrAdmin;

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
      setMetaTitle(art.metaTitle || '');
      setMetaDescription(art.metaDescription || '');
      setMetaImage(art.metaImage || '');

      // Aktualizacja tytułu karty i meta opisu dla SEO
      document.title = `${art.metaTitle || art.title || 'Edycja artykułu'} | Wmedia Redakcja`;
      const metaDesc = document.querySelector('meta[name="description"]');
      const descVal = art.metaDescription || art.lead || 'Obszar roboczy i edycja szczegółów artykułu w systemie Wmedia.';
      if (metaDesc) {
        metaDesc.setAttribute('content', descVal);
      } else {
        const meta = document.createElement('meta');
        meta.name = "description";
        meta.content = descVal;
        document.head.appendChild(meta);
      }
      
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

  const fetchVersions = async () => {
    try {
      setVersionsLoading(true);
      const response = await api.get(`/articles/${id}/versions`);
      setVersions(response.data.versions || []);
    } catch (err) {
      console.error('Błąd pobierania wersji:', err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRollback = async (versionId: number, versionNum: number) => {
    if (!window.confirm(`Czy na pewno chcesz przywrócić wersję #${versionNum}? Obecny tekst zostanie zapisany jako nowa wersja.`)) {
      return;
    }
    try {
      setSaving(true);
      await api.post(`/articles/${id}/versions/${versionId}/rollback`);
      addToast('Sukces', `Przywrócono wersję #${versionNum}`, 'success');
      localStorage.removeItem(`wmedia-autosave-${id}`);
      setRecoveryAvailable(false);
      setRecoveredDraft(null);
      await fetchArticleDetails();
      await fetchVersions();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się przywrócić wersji.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (syntaxBefore: string, syntaxAfter: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const replacement = syntaxBefore + selectedText + syntaxAfter;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxBefore.length, start + syntaxBefore.length + selectedText.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertMarkdown('**', '**');
    } else if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertMarkdown('*', '*');
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

  // Ładowanie autozapisu z localStorage przy starcie
  useEffect(() => {
    if (!article) return;
    const saved = localStorage.getItem(`wmedia-autosave-${article.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasDifferences = 
          parsed.title !== article.title || 
          parsed.lead !== article.lead || 
          parsed.content !== article.content;
        
        // Jeśli są różnice między zapisanym w localStorage szkicem a bazą, pokazujemy opcję przywrócenia
        if (hasDifferences) {
          setRecoveredDraft(parsed);
          setRecoveryAvailable(true);
        } else {
          // Jeżeli tekst z bazy jest taki sam jak szkic w localStorage, można go bezpiecznie usunąć.
          localStorage.removeItem(`wmedia-autosave-${article.id}`);
          setRecoveryAvailable(false);
          setRecoveredDraft(null);
        }
      } catch (err) {
        console.error('Błąd wczytywania autozapisu:', err);
      }
    }
  }, [article?.id, article?.updatedAt]);

  // Sprawdzamy czy są niezapisane zmiany (tekst, lead lub pola SEO) w stosunku do bazy danych
  const isDirty = article ? (
    title !== article.title ||
    lead !== article.lead ||
    content !== article.content ||
    metaTitle !== (article.metaTitle || '') ||
    metaDescription !== (article.metaDescription || '') ||
    metaImage !== (article.metaImage || '')
  ) : false;

  // Ref do trzymania aktualnej wartości isDirty w celu uniknięcia stale closures w zdarzeniach i blockerach
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Ostrzeżenie przed zamknięciem karty lub przeładowaniem strony z niezapisanymi zmianami
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Nowoczesne przeglądarki ignorują własny tekst, pokazują własną wiadomość
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Blokowanie nawigacji wewnątrz aplikacji (np. kliknięcie w link do innej strony w menu)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowBlockerModal(true);
    } else {
      setShowBlockerModal(false);
    }
  }, [blocker.state]);

  // Dynamiczna aktualizacja tytułu karty podczas edycji
  useEffect(() => {
    if (article) {
      document.title = `${metaTitle || title || 'Edycja artykułu'} | Wmedia Redakcja`;
    }
  }, [title, metaTitle, article]);

  // Natychmiastowy autozapis z debouncem 1s przy każdej edycji
  useEffect(() => {
    if (!article || !canEditContent) return;

    const isDifferentFromDb = title !== article.title || lead !== article.lead || content !== article.content;

    if (!isDifferentFromDb) {
      // Usunęliśmy twarde kasowanie localStorage w tym miejscu, aby nie nadpisywać 
      // i nie tracić szkiców podczas nawigacji między artykułami.
      setAutoSaveStatus('');
      return;
    }

    const timer = setTimeout(() => {
      const draft = {
        title,
        lead,
        content,
        timestamp: Date.now()
      };
      localStorage.setItem(`wmedia-autosave-${article.id}`, JSON.stringify(draft));
      const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setAutoSaveStatus(`Zapisano roboczo w przeglądarce o ${timeStr}`);
    }, 1000); // 1 sekunda debounce

    return () => clearTimeout(timer);
  }, [title, lead, content, article?.id, canEditContent]);

  useEffect(() => {
    fetchArticleDetails();
    fetchReviewers();
    fetchVersions();

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
      const updateData: any = { 
        title, 
        lead, 
        content,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaImage: metaImage || null
      };
      // Edytor może też przypisywać recenzenta w tym formularzu
      if (user?.role === Role.EDITOR || user?.role === Role.ADMIN) {
        updateData.reviewerId = selectedReviewer;
      }

      await api.patch(`/articles/${id}`, updateData);
      addToast('Sukces', 'Artykuł został pomyślnie zapisany.', 'success');
      localStorage.removeItem(`wmedia-autosave-${id}`);
      setRecoveryAvailable(false);
      setRecoveredDraft(null);
      setAutoSaveStatus('Zmiany zapisane w bazie.');
      fetchArticleDetails();
      fetchVersions();
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



  if (loading || !article) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
        Ładowanie obszaru roboczego artykułu...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* Blocker Modal */}
      {showBlockerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
              Masz niezapisane zmiany! ⚠️
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
              Czy na pewno chcesz opuścić tę stronę? Twoja praca została zapisana w pamięci podręcznej przeglądarki, ale zmiany nie zostały zsynchronizowane z bazą danych.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                onClick={() => {
                  setShowBlockerModal(false);
                  if (blocker.reset) blocker.reset();
                }} 
                className="btn btn-secondary"
                style={{ padding: '10px 18px' }}
              >
                Zostań i zapisz
              </button>
              <button 
                onClick={() => {
                  setShowBlockerModal(false);
                  if (blocker.proceed) blocker.proceed();
                }} 
                className="btn btn-primary"
                style={{ padding: '10px 18px', backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                Odrzuć i opuść
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Baner odzyskiwania autozapisu */}
      {recoveryAvailable && recoveredDraft && (
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          marginBottom: '24px',
          borderLeft: '4px solid var(--status-review)',
          backgroundColor: 'var(--bg-tertiary)',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} style={{ color: 'var(--status-review)', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700, display: 'block', fontSize: '0.95rem' }}>
                Wykryto nowszą lokalną kopię roboczą!
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Zapisano automatycznie w przeglądarce: {new Date(recoveredDraft.timestamp).toLocaleString('pl-PL')}. Czy chcesz przywrócić tę wersję i nadpisać obecny stan w edytorze?
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={() => {
                setTitle(recoveredDraft.title);
                setLead(recoveredDraft.lead);
                setContent(recoveredDraft.content);
                setRecoveryAvailable(false);
                addToast('Sukces', 'Przywrócono szkic z pamięci przeglądarki.', 'success');
              }}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--status-review)', border: 'none' }}
            >
              Przywróć kopię
            </button>
            <button 
              type="button"
              onClick={() => {
                localStorage.removeItem(`wmedia-autosave-${id}`);
                setRecoveryAvailable(false);
                setRecoveredDraft(null);
                addToast('Informacja', 'Odrzucono kopię roboczą.', 'info');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Odrzuć
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         GÓRNY RETRO PASEK
         ------------------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/articles" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Powrót do bazy
          </Link>
          {isDirty && (
            <div style={{ 
              backgroundColor: '#fef3c7', 
              color: '#d97706', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: '1px solid #fcd34d',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}>
              <AlertCircle size={16} /> Niezapisane zmiany! (Kliknij Zapisz)
            </div>
          )}
        </div>
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
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Pasek narzędzi formatowania Markdown */}
                  {canEditContent && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)',
                      borderBottom: 'none',
                      borderTopLeftRadius: 'var(--radius-sm)',
                      borderTopRightRadius: 'var(--radius-sm)',
                      alignItems: 'center'
                    }}>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**', '**')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Pogrubienie (Ctrl+B)"
                      >
                        <Bold size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('*', '*')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Kursywa (Ctrl+I)"
                      >
                        <Italic size={16} />
                      </button>
                      
                      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-light)', margin: '0 4px' }} />

                      <button
                        type="button"
                        onClick={() => insertMarkdown('# ')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Nagłówek H1"
                      >
                        <Heading1 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('## ')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Nagłówek H2"
                      >
                        <Heading2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('### ')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Nagłówek H3"
                      >
                        <Heading3 size={16} />
                      </button>

                      <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-light)', margin: '0 4px' }} />

                      <button
                        type="button"
                        onClick={() => insertMarkdown('```\n', '\n```')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Blok kodu"
                      >
                        <Code size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('> ')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Cytat"
                      >
                        <Quote size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('- ')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Lista punktowana"
                      >
                        <ListIcon size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('[', '](url)')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Dodaj link"
                      >
                        <LinkIcon size={16} />
                      </button>

                      {/* Status autozapisu i zapisu w bazie */}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {isDirty ? (
                          <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }} title="Zmiany w edytorze różnią się od zapisanych w bazie danych">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block' }} />
                            Niezapisane zmiany
                          </span>
                        ) : (
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }} title="Wszystkie wprowadzone dane są zsynchronizowane z bazą danych">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }} />
                            Zsynchronizowano
                          </span>
                        )}
                        {autoSaveStatus && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            ({autoSaveStatus})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <textarea 
                    ref={textareaRef}
                    className="editor-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!canEditContent || saving}
                    placeholder="# Nagłówek sekcji&#10;&#10;Zacznij pisać treść artykułu... Możesz używać tagów Markdown, np. **pogrubienie**, *kursywa*, czy `kod`."
                    style={{ 
                      height: '100%', 
                      resize: 'none',
                      ...(canEditContent ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {})
                    }}
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

          {/* GENERATOR META TAGÓW I PREVIEW SEO */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
              <Globe size={20} style={{ color: 'var(--status-scheduled)' }} />
              Generator Meta Tagów & Open Graph (SEO)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Formularz SEO */}
              <div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Meta Tytuł (SEO Title)</label>
                    <span style={{ fontSize: '0.75rem', color: metaTitle.length >= 50 && metaTitle.length <= 60 ? '#059669' : 'var(--text-secondary)' }}>
                      {metaTitle.length} / 60 znaków (zalecane: 50-60)
                    </span>
                  </div>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    disabled={!canEditContent || saving}
                    placeholder="np. Nowe Trendy w UX w 2026 r. - Co Się Zmieni?"
                    style={{ fontSize: '0.9rem' }}
                  />
                  <div style={{ height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (metaTitle.length / 60) * 100)}%`,
                      backgroundColor: metaTitle.length >= 50 && metaTitle.length <= 60 ? '#059669' : metaTitle.length > 60 ? '#dc2626' : '#d97706',
                      transition: 'all 0.3s'
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Meta Opis (SEO Description)</label>
                    <span style={{ fontSize: '0.75rem', color: metaDescription.length >= 150 && metaDescription.length <= 160 ? '#059669' : 'var(--text-secondary)' }}>
                      {metaDescription.length} / 160 znaków (zalecane: 150-160)
                    </span>
                  </div>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    disabled={!canEditContent || saving}
                    placeholder="np. Zobacz najnowsze prognozy i trendy w projektowaniu interfejsów na rok 2026. Dowiedz się, jak sztuczna inteligencja wpłynie na codzienną pracę designerów."
                    style={{ resize: 'none', fontSize: '0.88rem' }}
                  />
                  <div style={{ height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (metaDescription.length / 160) * 100)}%`,
                      backgroundColor: metaDescription.length >= 150 && metaDescription.length <= 160 ? '#059669' : metaDescription.length > 160 ? '#dc2626' : '#d97706',
                      transition: 'all 0.3s'
                    }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meta Zdjęcie (Open Graph Image)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {article.uploads && article.uploads.filter(up => up.mimetype.startsWith('image/')).length > 0 ? (
                      <select 
                        className="form-input form-select"
                        value={metaImage}
                        onChange={(e) => setMetaImage(e.target.value)}
                        disabled={!canEditContent || saving}
                        style={{ fontSize: '0.88rem' }}
                      >
                        <option value="">-- Wybierz grafikę z załączników (lub wklej URL poniżej) --</option>
                        {article.uploads
                          .filter(up => up.mimetype.startsWith('image/'))
                          .map(up => (
                            <option key={up.id} value={`${BACKEND_URL}${up.filepath}`}>{up.filename}</option>
                          ))
                        }
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                        Brak załączników graficznych. Wgraj grafikę w panelu po prawej, by wybrać ją tutaj.
                      </div>
                    )}
                    <input 
                      type="text" 
                      className="form-input" 
                      value={metaImage}
                      onChange={(e) => setMetaImage(e.target.value)}
                      disabled={!canEditContent || saving}
                      placeholder="Wklej własny adres URL zdjęcia lub wybierz z listy..."
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Podglądy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Google Preview */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🖥️ Podgląd w Google Search
                  </h4>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontFamily: 'Arial, sans-serif'
                  }}>
                    <span style={{ fontSize: '12px', color: '#4d5156', display: 'block', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      https://wmedia.pl › artykul › {article.id}
                    </span>
                    <h4 style={{
                      fontSize: '18px',
                      color: '#1a0dab',
                      lineHeight: '1.3',
                      fontWeight: 'normal',
                      margin: '0 0 4px 0',
                      fontFamily: 'Arial, sans-serif',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {metaTitle || title || 'Brak tytułu meta'}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#4d5156', lineHeight: '1.57', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {metaDescription || lead || 'Proszę uzupełnić opis meta, aby poprawić optymalizację SEO i współczynnik klikalności (CTR) w wyszukiwarce.'}
                    </p>
                  </div>
                </div>

                {/* Facebook Preview */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Share2 size={14} style={{ color: '#1877f2' }} /> Podgląd w Social Media
                  </h4>
                  <div style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-secondary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
                  }}>
                    {/* Cover photo */}
                    <div style={{ height: '180px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden', position: 'relative' }}>
                      {metaImage ? (
                        <img 
                          src={metaImage} 
                          alt="SEO Cover" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextElementSibling as HTMLDivElement;
                            if (sibling) sibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: metaImage ? 'none' : 'flex',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '2rem'
                      }}>
                        🖼️
                      </div>
                    </div>
                    {/* Meta info */}
                    <div style={{ padding: '12px', borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-tertiary)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                        WMEDIA.PL
                      </span>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {metaTitle || title || 'Brak tytułu meta'}
                      </h5>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                        {metaDescription || lead || 'Wmedia Redakcja Portalowa...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Liczba odsłon:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  👁️ {article.views || 0}
                </span>
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

          {/* HISTORIA WERSJI TEKSTU (Article Versions) */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} style={{ color: 'var(--color-primary)' }} />
              Historia Zmian Tekstu
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {versionsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Ładowanie wersji...
                </div>
              ) : versions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', border: '1px dashed var(--border-light)', borderRadius: '6px' }}>
                  Brak zapisanych wersji historycznych. Pierwsza wersja powstanie przy edycji tekstu.
                </div>
              ) : (
                versions.map((ver) => (
                  <div 
                    key={ver.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Wersja #{ver.versionNumber}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>
                        {new Date(ver.createdAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Autor zmian: <strong style={{ color: 'var(--text-primary)' }}>{ver.user.name}</strong>
                    </div>
                    {canEditContent && (
                      <button
                        type="button"
                        onClick={() => handleRollback(ver.id, ver.versionNumber)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%', marginTop: '4px' }}
                        disabled={saving}
                      >
                        <RefreshCw size={12} /> Przywróć tę wersję
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
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
