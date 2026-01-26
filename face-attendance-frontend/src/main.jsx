import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("main.jsx loaded");
const rootElement = document.getElementById('root');
console.log("root element:", rootElement);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

console.log("App rendered");
