import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CurrencyProvider } from './context/CurrencyContext.tsx';
import App from './App.tsx';
import './index.css';

// Auto-reload to the latest deployment when a stale cached chunk 404s
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('chunk_reload_ts');
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 8000) {
    sessionStorage.setItem('chunk_reload_ts', String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </BrowserRouter>
  </StrictMode>
);
