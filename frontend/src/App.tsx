// ==============================================================================
// APP ROUTING & PROVIDERS (Główna Konfiguracja React)
// ==============================================================================
// Ten plik spina całą aplikację kliencką. Odpowiada za konfigurację React Routera,
// osadzenie dostawców stanu globalnego (Auth, Notifications/Sockets) oraz
// zdefiniowanie tras chronionych odpowiednimi strażnikami.

import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "articles", element: <Articles /> },
      { path: "articles/:id", element: <ArticleEdit /> },
      { path: "calendar", element: <CalendarView /> },
      {
        path: "admin",
        element: (
          <RoleGuard allowedRoles={[Role.ADMIN]}>
            <AdminPanel />
          </RoleGuard>
        ),
      },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
