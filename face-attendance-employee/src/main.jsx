import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AppToastContainer } from './lib/notify.jsx'

console.log("main.jsx loaded")

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <App />
      <AppToastContainer />
    </>
  </React.StrictMode>,
)

console.log("root element:", document.getElementById('root'))
console.log("App rendered")
