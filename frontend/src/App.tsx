// ==============================================================================
// APP ROUTING & PROVIDERS (Główna Konfiguracja React)
// ==============================================================================
// Ten plik spina całą aplikację kliencką. Odpowiada za konfigurację React Routera,
// osadzenie dostawców stanu globalnego (Auth, Notifications/Sockets) oraz
// zdefiniowanie tras chronionych odpowiednimi strażnikami.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

// Importy Widoków i Layoutów
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import ArticleEdit from './pages/ArticleEdit';
import CalendarView from './pages/CalendarView';
import AdminPanel from './pages/AdminPanel';

// Importy Strażników Tras (Guards)
import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';
import { Role } from './types';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {/* Dostawca uwierzytelniania JWT */}
        <AuthProvider>
          {/* Dostawca powiadomień realtime w oparciu o Socket.IO (wymaga zalogowania, stąd zagnieżdżenie) */}
          <NotificationProvider>
            <Routes>
              
              {/* ------------------------------------------------------------------
                 TRASY PUBLICZNE (Dla niezalogowanych)
                 ------------------------------------------------------------------ */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ------------------------------------------------------------------
                 TRASY CHRONIONE (Wymagają tokena JWT oraz Layoutu nawigacyjnego)
                 ------------------------------------------------------------------ */}
              <Route 
                path="/" 
                element={
                  <AuthGuard>
                    <Layout />
                  </AuthGuard>
                }
              >
                {/* Pulpit użytkownika (Dashboard) */}
                <Route index element={<Dashboard />} />

                {/* Baza artykułów i Kanban */}
                <Route path="articles" element={<Articles />} />

                {/* Edycja i szczegóły tekstu (Maszyna stanów, Komentarze, Upload) */}
                <Route path="articles/:id" element={<ArticleEdit />} />

                {/* Kalendarz planowanych publikacji */}
                <Route path="calendar" element={<CalendarView />} />

                {/* Panel admina (Dostępny wyłącznie dla roli ADMIN) */}
                <Route 
                  path="admin" 
                  element={
                    <RoleGuard allowedRoles={[Role.ADMIN]}>
                      <AdminPanel />
                    </RoleGuard>
                  }
                />
              </Route>

              {/* Catch-all: w przypadku wpisania błędnej ścieżki, przekierowujemy do dashboardu */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
