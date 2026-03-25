import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Très important : c'est ce qui charge Tailwind !

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
// À AJOUTER TOUT EN BAS DE VOTRE FICHIER src/index.tsx (ou main.tsx)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès :', registration.scope);
      })
      .catch(error => {
        console.log('Échec de l\'enregistrement du Service Worker :', error);
      });
  });
}