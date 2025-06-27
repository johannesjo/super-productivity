import { render } from 'solid-js/web';
import App from './App';
import './styles.css';
import './background';

console.log('Sync-MD Plugin: index.tsx loaded');
console.log(
  'Sync-MD Plugin: window.PluginAPI available?',
  typeof window.PluginAPI !== 'undefined',
);

// Wait for PluginAPI to be available
function waitForPluginAPI() {
  const root = document.getElementById('root');
  console.log('Sync-MD Plugin: root element:', root);

  if (typeof window.PluginAPI !== 'undefined' && root) {
    console.log('Sync-MD Plugin: PluginAPI is available, rendering app...');
    render(() => <App />, root);
    console.log('Sync-MD Plugin: App rendered');
  } else {
    console.log('Sync-MD Plugin: Waiting for PluginAPI...');
    setTimeout(waitForPluginAPI, 100);
  }
}

// Start checking
waitForPluginAPI();
