import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../popup/App';
import '../css/popup.css';
import { registerPwa } from './registerPwa';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

registerPwa();
