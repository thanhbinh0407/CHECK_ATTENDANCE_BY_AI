import { StrictMode, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AppToastContainer } from './lib/notify.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Fragment>
      <App />
      <AppToastContainer />
    </Fragment>
  </StrictMode>,
)

