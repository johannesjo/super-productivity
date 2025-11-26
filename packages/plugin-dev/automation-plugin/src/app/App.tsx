import { createSignal, onMount } from 'solid-js';
import './App.css';

// Communication with plugin.js
const sendMessage = async (type: string, payload?: any) => {
  return new Promise((resolve) => {
    const messageId = Math.random().toString(36).substr(2, 9);

    const handler = (event: MessageEvent) => {
      if (event.data.messageId === messageId) {
        window.removeEventListener('message', handler);
        resolve(event.data.response);
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ type, payload, messageId }, '*');
  });
};

function App() {
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(async () => {
    setIsLoading(false);
  });

  return (
    <div class="app">
      <header class="app-header">
        <h1>Automation Rules</h1>
      </header>
      <main class="app-main">
        <p>Rule editor coming soon...</p>
      </main>
    </div>
  );
}

export default App;
