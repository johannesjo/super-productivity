const API_BASE = '/api';

// State
const state = {
  token: null,
};

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authForms = document.getElementById('auth-forms');
const tokenDisplay = document.getElementById('token-display');
const tokenArea = document.getElementById('token-area');
const messageArea = document.getElementById('message-area');
const copyBtn = document.getElementById('copy-btn');

// --- Event Listeners ---

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  await handleAuth('/login', { email, password });
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const termsAccepted = document.getElementById('register-terms').checked;

  if (password !== confirm) {
    showMessage('Passwords do not match', 'error');
    return;
  }

  if (!termsAccepted) {
    showMessage('You must accept the Terms of Service', 'error');
    return;
  }

  // Register first
  const success = await handleAuth('/register', { email, password, termsAccepted }, true);

  // Auto login if registration successful
  if (success) {
    // Wait a bit for UX
    setTimeout(async () => {
      showMessage('Registration successful! Logging in...', 'success');
      await handleAuth('/login', { email, password });
    }, 1000);
  }
});

// --- Functions ---

function switchTab(tab) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.innerText.toLowerCase().includes(tab)) {
      btn.classList.add('active');
    }
  });

  // Update forms
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.classList.remove('active');
  });
  document.getElementById(`${tab}-form`).classList.add('active');

  // Clear messages
  hideMessage();
}

async function handleAuth(endpoint, body, isRegister = false) {
  setLoading(true);
  hideMessage();

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (isRegister) {
      // Registration success
      return true;
    } else {
      // Login success -> Show Token
      showToken(data.token);
    }
  } catch (err) {
    showMessage(err.message, 'error');
    return false;
  } finally {
    setLoading(false);
  }
}

function showToken(token) {
  state.token = token;
  tokenArea.value = token;
  authForms.classList.add('hidden');
  tokenDisplay.classList.remove('hidden');
  showMessage('Logged in successfully!', 'success');
}

function logout() {
  state.token = null;
  tokenArea.value = '';
  tokenDisplay.classList.add('hidden');
  authForms.classList.remove('hidden');
  hideMessage();
  document.getElementById('login-password').value = '';
}

async function copyToken() {
  if (!state.token) return;

  try {
    await navigator.clipboard.writeText(state.token);
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'Copied!';
    copyBtn.classList.add('success');

    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.classList.remove('success');
    }, 2000);
  } catch (err) {
    showMessage('Failed to copy to clipboard', 'error');
  }
}

async function refreshToken() {
  if (!state.token) return;

  // Show confirmation dialog
  const confirmed = confirm(
    'Are you sure you want to refresh your token?\n\n' +
      'This will invalidate your current token. You will need to update ' +
      'the token in Super Productivity and any other devices using this account.',
  );

  if (!confirmed) return;

  const refreshBtn = document.getElementById('refresh-btn');
  setLoading(true);
  hideMessage();

  try {
    const res = await fetch(`${API_BASE}/replace-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: '{}',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    // Update with new token
    state.token = data.token;
    tokenArea.value = data.token;

    // Visual feedback
    const originalText = refreshBtn.innerText;
    refreshBtn.innerText = 'Refreshed!';
    refreshBtn.classList.add('success');
    showMessage('Token refreshed! Old token is now invalid.', 'success');

    setTimeout(() => {
      refreshBtn.innerText = originalText;
      refreshBtn.classList.remove('success');
    }, 2000);
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

function showMessage(msg, type) {
  messageArea.innerText = msg;
  messageArea.className = type === 'error' ? 'msg-error' : 'msg-success';
  messageArea.classList.remove('hidden');
}

function hideMessage() {
  messageArea.classList.add('hidden');
}

function setLoading(isLoading) {
  const btns = document.querySelectorAll('button');
  btns.forEach((btn) => (btn.disabled = isLoading));
  if (isLoading) {
    document.body.style.cursor = 'wait';
  } else {
    document.body.style.cursor = 'default';
  }
}
