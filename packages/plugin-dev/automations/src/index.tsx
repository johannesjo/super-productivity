import { render } from 'solid-js/web';
import '@picocss/pico/css/pico.classless.css';
import App from './app/App';

// Mount the Solid.js app
const root = document.getElementById('root');
if (root) {
  render(() => <App />, root);
} else {
  console.error('Root element not found');
}
