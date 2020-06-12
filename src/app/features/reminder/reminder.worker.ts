/// <reference lib="webworker" />
const CHECK_INTERVAL_DURATION = 1000;
const MESSAGE_INTERVAL_DURATION = 10000;
let currentMessageTimerVal = 0;
let checkInterval;

addEventListener('message', ({data}) => {
  // console.log('REMINDER WORKER', data);
  reInitCheckInterval(data);
});


const reInitCheckInterval = (reminders: any[]) => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  if (!reminders || !reminders.length) {
    return;
  }

  checkInterval = setInterval(() => {
    const dueReminders = getDueReminders(reminders);
    if (dueReminders.length) {
      if (currentMessageTimerVal <= 0) {
        postMessage(dueReminders);
        console.log('Worker postMessage', dueReminders);
        currentMessageTimerVal = MESSAGE_INTERVAL_DURATION;
      } else {
        currentMessageTimerVal -= CHECK_INTERVAL_DURATION;
      }
    }
  }, CHECK_INTERVAL_DURATION);
};

const getDueReminders = (reminders: any[]): any[] => {
  const now = Date.now();
  return reminders
    .filter(reminder => (reminder.remindAt < now))
    .sort((a, b) => a.remindAt - b.remindAt);
};
