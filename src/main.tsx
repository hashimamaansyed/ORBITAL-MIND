import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global unhandledrejection and error listeners to suppress Vite WebSocket disconnect warnings
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (reason && (reason.message || String(reason))) || '';
    if (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('closed without opened') ||
      msg.includes('failed to connect to websocket') ||
      msg.includes('socket.send')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = (event && (event.message || '')) || '';
    if (
      msg.includes('socket.send') ||
      msg.includes('WebSocket') ||
      msg.includes('websocket')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
