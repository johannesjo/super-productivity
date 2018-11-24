const CHECK_INTERVAL_DURATION = 1000;
let checkInterval;

self.onmessage = function(msg) {
  console.log(msg);
  reInitCheckInterval(msg.data);
};

function reInitCheckInterval(reminders) {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  if (!reminders || !reminders.length) {
    return;
  }

  setInterval(() => {
    const oldestDueReminder = reminders.reduce(
      (minReminder, reminder) => (reminder.remindAt < minReminder.remindAt)
        ? reminder
        : minReminder, reminders[0]
    );
    console.log(oldestDueReminder);

    if (oldestDueReminder) {
      self.postMessage(oldestDueReminder);
    }
  }, CHECK_INTERVAL_DURATION);
}

