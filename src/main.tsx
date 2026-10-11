import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initClientSecurity } from './utils/security';

initClientSecurity();

createRoot(document.getElementById('root')!).render(<App />);
