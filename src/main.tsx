import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import { RefreshProvider } from './contexts/RefreshContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RefreshProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </RefreshProvider>
    </ThemeProvider>
  </StrictMode>,
)
