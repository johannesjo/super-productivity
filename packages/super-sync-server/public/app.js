document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const messageArea = document.getElementById('message-area');

  // Tab Switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      if (target === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      }
      clearMessage();
    });
  });

  // Login Handler
  document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(e.target, true);
    clearMessage();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          'Login successful! You can now use these credentials in Super Productivity.',
          'success',
        );
        // Optional: Store token if needed for future admin features
        // localStorage.setItem('token', data.token);
      } else {
        showMessage(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showMessage('Network error occurred', 'error');
    } finally {
      setLoading(e.target, false);
    }
  });

  // Register Handler
  document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(e.target, true);
    clearMessage();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      setLoading(e.target, false);
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      setLoading(e.target, false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          'Registration successful! Please check your server logs for the verification link (dev mode) or verify if email configured.',
          'success',
        );
        // Switch to login tab after brief delay
        setTimeout(() => {
          tabs[0].click();
        }, 2000);
      } else {
        showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      showMessage('Network error occurred', 'error');
    } finally {
      setLoading(e.target, false);
    }
  });

  function showMessage(text, type) {
    messageArea.textContent = text;
    messageArea.className = `message ${type}`;
    messageArea.classList.remove('hidden');
  }

  function clearMessage() {
    messageArea.classList.add('hidden');
    messageArea.textContent = '';
  }

  function setLoading(form, isLoading) {
    const btn = form.querySelector('button');
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');

    if (isLoading) {
      text.classList.add('hidden');
      loader.classList.remove('hidden');
      btn.disabled = true;
    } else {
      text.classList.remove('hidden');
      loader.classList.add('hidden');
      btn.disabled = false;
    }
  }
});
