import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/playfair-display/wght.css';
import './index.css';

// The app restores the catalog's scroll position itself (useScrollMemory) once the virtual
// list has its height; the browser's automatic restoration would run too early.
window.history.scrollRestoration = 'manual';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
