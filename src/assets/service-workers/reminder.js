const CHECK_INTERVAL_DURATION = 1000;
const MESSAGE_INTERVAL_DURATION = 5000;
let currentMessageTimerVal = MESSAGE_INTERVAL_DURATION;
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

  setInterval(() => {
    const oldestDueReminder = reminders.reduce(
      (minReminder, reminder) => (reminder.remindAt < minReminder.remindAt)
        ? reminder
        : minReminder, reminders[0]
    );
    console.log(oldestDueReminder);

    if (oldestDueReminder) {
      self.postMessage(oldestDueReminder);
      console.log(currentMessageTimerVal);

      if (currentMessageTimerVal <= 0) {
        showMessage();
        currentMessageTimerVal = MESSAGE_INTERVAL_DURATION;
      } else {
        currentMessageTimerVal -= CHECK_INTERVAL_DURATION;
      }
    }
  }, CHECK_INTERVAL_DURATION);
};

const showMessage = () => {
  const title = 'Yay a message.';
  const body = 'We have received a push message.';
  const icon = 'icons/icon-128x128.png';
  const tag = 'simple-push-demo-notification-tag';

  console.log(self.registration);
  if (self.registration) {
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      tag: tag
    });
  }
};

