const CHECK_INTERVAL_DURATION = 1000;
const MESSAGE_INTERVAL_DURATION = 10000;
let currentMessageTimerVal = 0;
let checkInterval;

self.onmessage = function(msg) {
  reInitCheckInterval(msg.data);
};

const reInitCheckInterval = (reminders) => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  if (!reminders || !reminders.length) {
    return;
  }

  checkInterval = setInterval(() => {
    const oldestDueReminder = reminders.reduce(
      (minReminder, reminder) => (reminder.remindAt < minReminder.remindAt)
        ? reminder
        : minReminder, reminders[0]
    );

    console.log('oldestDueReminder in:', (oldestDueReminder.remindAt - Date.now()) / 1000, oldestDueReminder);

    if (oldestDueReminder && oldestDueReminder.remindAt < Date.now()) {
      if (currentMessageTimerVal <= 0) {
        self.postMessage(oldestDueReminder);
        console.log('Worker postMessage', oldestDueReminder);
        currentMessageTimerVal = MESSAGE_INTERVAL_DURATION;
      } else {
        currentMessageTimerVal -= CHECK_INTERVAL_DURATION;
      }
    }
  }, CHECK_INTERVAL_DURATION);
};
