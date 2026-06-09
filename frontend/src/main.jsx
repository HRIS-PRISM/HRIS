import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/axiosSetup'
import App from './App.jsx'
import '@fontsource/poppins'; // Imports Poppins with default weight (400)


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
