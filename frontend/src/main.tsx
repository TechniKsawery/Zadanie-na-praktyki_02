// ==============================================================================
// GŁÓWNY PUNKT WEJŚCIA FRONTENDU (Entry Point)
// ==============================================================================
// Inicjalizacja aplikacji React, ładowanie głównych stylów oraz montowanie 
// komponentu App do elementu root w pliku index.html.

import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Uwaga: React.StrictMode zostało celowo wyłączone, ponieważ podwójnie wywołuje
// useEffect w trybie deweloperskim, co niszczy działanie useBlocker (blokowanie
// nawigacji przy niezapisanych zmianach). StrictMode jest niezgodny z tym wzorcem.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
