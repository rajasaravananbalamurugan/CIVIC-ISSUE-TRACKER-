import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster position="top-right" toastOptions={{
      duration: 4000,
      style: {
        background: '#1e2d4a',
        color: '#f8fafc',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        borderRadius: '10px',
      },
      success: { iconTheme: { primary: '#22c55e', secondary: '#1e2d4a' } },
      error: { iconTheme: { primary: '#ef4444', secondary: '#1e2d4a' } },
    }} />
  </BrowserRouter>,
)
