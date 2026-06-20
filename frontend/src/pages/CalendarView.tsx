// ==============================================================================
// VISUAL CALENDAR VIEW (Kalendarz Publikacji)
// ==============================================================================
// Widok kalendarza przedstawiający artykuły zaplanowane i opublikowane w siatce
// miesięcznej. Pozwala na wizualną kontrolę terminów publikacji oraz łatwą nawigację.

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { ArticleStatus } from '../types';
import { ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const polishStatusLabels: Record<ArticleStatus, string> = {
  [ArticleStatus.IDEA]: 'Pomysł',
  [ArticleStatus.DRAFT]: 'Szkic',
  [ArticleStatus.REVIEW]: 'W recenzji',
  [ArticleStatus.APPROVED]: 'Zatwierdzone',
  [ArticleStatus.SCHEDULED]: 'Zaplanowane',
  [ArticleStatus.PUBLISHED]: 'Opublikowane',
  [ArticleStatus.REJECTED]: 'Odrzucony'
};

interface CalendarArticle {
  id: number;
  title: string;
  status: ArticleStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  author: {
    name: string;
  };
}

export const CalendarView: React.FC = () => {
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<CalendarArticle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Aktualnie wyświetlany miesiąc i rok
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/articles/calendar');
      setArticles(response.data.articles);
    } catch (error) {
      console.error('Błąd pobierania kalendarza:', error);
      addToast('Błąd', 'Nie udało się załadować kalendarza publikacji.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarArticles();

    document.title = "Kalendarz Publikacji | Wmedia Redakcja";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Harmonogram zaplanowanych oraz opublikowanych artykułów w portalu Wmedia w ujęciu kalendarzowym.');
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Harmonogram zaplanowanych oraz opublikowanych artykułów w portalu Wmedia w ujęciu kalendarzowym.";
      document.head.appendChild(meta);
    }

    // Słuchamy aktualizacji realtime, aby kalendarz odświeżał się sam
    const handleRealtimeUpdate = () => {
      fetchCalendarArticles();
    };

    window.addEventListener('article_changed_realtime', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('article_changed_realtime', handleRealtimeUpdate);
    };
  }, []);

  // Nazwy miesięcy i dni tygodnia
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  
  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

  // Przełączanie miesięcy
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // LOGIKA GENEROWANIA DNI DLA SIATKI KALENDARZA (Standardowa pętla siatki miesięcznej)
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    // 0 = Niedziela, 1 = Poniedziałek, ... w JS. Mapujemy, aby Poniedziałek był 0.
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  
  // Dni z poprzedniego miesiąca do uzupełnienia pierwszego tygodnia
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  const prevMonthCells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevMonthCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i)
    });
  }

  // Dni bieżącego miesiąca
  const currentMonthCells = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Dni kolejnego miesiąca do uzupełnienia ostatniego tygodnia (siatka 7x6 = 42 komórki)
  const totalCells = prevMonthCells.length + currentMonthCells.length;
  const nextMonthCellsNeeded = 42 - totalCells;
  const nextMonthCells = [];
  for (let i = 1; i <= nextMonthCellsNeeded; i++) {
    nextMonthCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const calendarCells = [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];

  // Sprawdzanie czy dwie daty to ten sam dzień (bez stref czasowych)
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Dopasowanie artykułów do konkretnego dnia w kalendarzu
  const getArticlesForDay = (dayDate: Date) => {
    return articles.filter(art => {
      const artDateStr = art.status === ArticleStatus.PUBLISHED ? art.publishedAt : art.scheduledAt;
      if (!artDateStr) return false;
      return isSameDay(new Date(artDateStr), dayDate);
    });
  };

  const isToday = (dayDate: Date) => {
    return isSameDay(dayDate, new Date());
  };

  return (
    <div className="animate-slide-in">
      {/* ------------------------------------------------------------------------
         NAGŁÓWEK KALENDARZA
         ------------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Kalendarz Publikacji
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
            Harmonogram zaplanowanych oraz opublikowanych artykułów w portalu
          </p>
        </div>

        {/* Nawigacja Miesiąca */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button 
            onClick={handlePrevMonth}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ 
            fontFamily: 'Outfit, sans-serif', 
            fontWeight: 700, 
            fontSize: '1.05rem', 
            minWidth: '130px', 
            textAlign: 'center',
            color: 'var(--text-primary)'
          }}>
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------
         SIATKA KALENDARZA
         ------------------------------------------------------------------------ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
          Pobieranie harmonogramu...
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          
          {/* Nazwy Dni Tygodnia */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {dayNames.map(day => (
              <div key={day} className="calendar-header-day">
                {day}
              </div>
            ))}
          </div>

          {/* Dni Kalendarza (42 komórki) */}
          <div className="calendar-grid">
            {calendarCells.map((cell, idx) => {
              const dayArticles = getArticlesForDay(cell.date);
              
              return (
                <div 
                  key={idx} 
                  className={`calendar-day-cell ${isToday(cell.date) ? 'today' : ''}`}
                  style={{
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                    borderColor: isToday(cell.date) ? 'var(--color-primary)' : 'var(--border-light)',
                    backgroundColor: isToday(cell.date) ? 'rgba(226, 0, 26, 0.02)' : 'var(--bg-secondary)'
                  }}
                >
                  <div className="calendar-day-number">
                    {cell.day}
                  </div>

                  {/* Lista Artykułów przypisanych do tego dnia */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                    {dayArticles.map(art => (
                      <div 
                        key={art.id} 
                        onClick={() => navigate(`/articles/${art.id}`)}
                        className="calendar-event"
                        style={{
                          backgroundColor: art.status === ArticleStatus.PUBLISHED ? 'rgba(6, 182, 212, 0.12)' : 'rgba(132, 204, 22, 0.12)',
                          borderLeft: art.status === ArticleStatus.PUBLISHED ? '3px solid #06b6d4' : '3px solid #84cc16',
                          color: art.status === ArticleStatus.PUBLISHED ? '#0e7490' : '#4d7c0f'
                        }}
                        title={`${art.title} - ${art.author.name} (${polishStatusLabels[art.status]})`}
                      >
                        <span style={{ fontWeight: 800 }}>
                          {art.status === ArticleStatus.PUBLISHED ? (
                            <Globe size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          ) : (
                            <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          )}
                        </span>
                        {art.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel Pomocniczy Legendy */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        gap: '24px',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        justifyContent: 'flex-start'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(132, 204, 22, 0.2)', borderLeft: '3px solid #84cc16' }} />
          <span>Zaplanowane do publikacji (SCHEDULED)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.2)', borderLeft: '3px solid #06b6d4' }} />
          <span>Opublikowane na portalu (PUBLISHED)</span>
        </div>
      </div>
    </div>
  );
};
export default CalendarView;
