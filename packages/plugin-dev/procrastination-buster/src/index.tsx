/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';

const root = document.getElementById('root');

function waitForPluginAPI() {
  if (typeof (window as any).PluginAPI !== 'undefined') {
    if (root) {
      render(() => <App />, root);
    }
  } else {
    setTimeout(waitForPluginAPI, 100);
  }
}

waitForPluginAPI();
