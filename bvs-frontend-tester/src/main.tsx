import React from 'react';
import ReactDOM from 'react-dom/client';
import { Dashboard } from './views/pages/Dashboard';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
