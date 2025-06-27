// Get elements
const showMainBtn = document.getElementById('show-main') as HTMLButtonElement;
const container = document.getElementById('overlay-container') as HTMLDivElement;
const taskTitle = document.getElementById('task-title') as HTMLDivElement;
const timeDisplay = document.getElementById('time-display') as HTMLDivElement;

// Prevent all right-click events
document.addEventListener(
  'contextmenu',
  (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  },
  true,
);

// Also prevent mousedown for right-click
document.addEventListener(
  'mousedown',
  (e) => {
    if (e.button === 2) {
      // Right mouse button
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  },
  true,
);

// Prevent mouseup for right-click
document.addEventListener(
  'mouseup',
  (e) => {
    if (e.button === 2) {
      // Right mouse button
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  },
  true,
);

// Handle show main button
showMainBtn.addEventListener('click', () => {
  window.overlayAPI.showMainWindow();
});

// Listen for content updates
window.overlayAPI.onUpdateContent((data) => {
  // Clear existing mode classes
  container.classList.remove('mode-pomodoro', 'mode-focus', 'mode-task', 'mode-idle');

  // Update mode
  if (data.mode) {
    container.classList.add(`mode-${data.mode}`);
  }

  // Update content
  taskTitle.textContent = data.title || 'No active task';
  timeDisplay.textContent = data.time || '--:--';
});
