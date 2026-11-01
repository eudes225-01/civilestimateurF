import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

// Écran d'intro (logo animé, défini dans index.html) : retiré une fois l'application montée.
requestAnimationFrame(() => { if (window.__hideSplash) window.__hideSplash() })
