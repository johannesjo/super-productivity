console.log("Yesterday's Tasks Plugin loaded");

// Register a keyboard shortcut
PluginAPI.registerShortcut({
  id: 'show_yesterday',
  label: "Show Yesterday's Tasks",
  onExec: function () {
    PluginAPI.showIndexHtmlAsView();
  },
});

// Helper function to get yesterday's date range
function getYesterdayRange() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Set to start of yesterday (00:00:00)
  const startOfYesterday = new Date(yesterday);
  startOfYesterday.setHours(0, 0, 0, 0);

  // Set to end of yesterday (23:59:59)
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  return {
    start: startOfYesterday.getTime(),
    end: endOfYesterday.getTime(),
  };
}

// Function to calculate total time spent
function calculateTimeSpent(timeSpentOnDay) {
  if (!timeSpentOnDay) return 0;

  let total = 0;
  for (const date in timeSpentOnDay) {
    const entries = timeSpentOnDay[date];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry && typeof entry === 'object') {
          total += entry.e - entry.s || 0;
        }
      }
    } else if (typeof entries === 'number') {
      total += entries;
    }
  }
  return total;
}

// Function to format duration
function formatDuration(ms) {
  if (!ms || ms === 0) return '0m';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return hours + 'h ' + minutes + 'm';
  }
  return minutes + 'm';
}

// Note: The plugin.js runs in a sandboxed environment separate from the iframe.
// The iframe has access to PluginAPI for communication with the host app,
// but not to variables defined in plugin.js.
