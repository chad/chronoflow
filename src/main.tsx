import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateStorageKey } from './utils/storageMigration'

migrateStorageKey('chronoflow-patch', 'mosh-patch');
migrateStorageKey('chronoflow-node-presets', 'mosh-node-presets');
migrateStorageKey('chronoflow-palette-collapsed', 'mosh-palette-collapsed');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
