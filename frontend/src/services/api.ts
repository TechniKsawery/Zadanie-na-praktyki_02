// ==============================================================================
// AXIOS API CLIENT
// ==============================================================================
// Konfiguracja biblioteki Axios do obsługi zapytań HTTP do naszego API.
// Automatycznie dołącza token JWT z localStorage do każdego zapytania.

import axios from 'axios';

// Pobieramy adres URL serwera z pliku .env (lub domyślnie http://localhost:5000/api)
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor żądań: automatycznie dodaje nagłówek Authorization, jeśli token istnieje
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wmedia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
