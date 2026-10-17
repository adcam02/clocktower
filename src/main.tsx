import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/sorts-mill-goudy/400.css';
import '@fontsource/sorts-mill-goudy/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/unifrakturmaguntia/400.css';
import './styles/base.css';
import './styles/scene.css';
import './styles/token.css';
import './styles/square.css';
import './styles/app.css';
import './styles/cards.css';
import './styles/modals.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
