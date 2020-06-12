/// <reference lib="webworker" />

import {ReminderCopy} from './reminder.model';

const CHECK_INTERVAL_DURATION = 1000;
const MESSAGE_INTERVAL_DURATION = 10000;
let currentMessageTimerVal = 0;
let checkInterval;

addEventListener('message', ({data}) => {
  // console.log('REMINDER WORKER', data);
  reInitCheckInterval(data);
});


const reInitCheckInterval = (reminders: ReminderCopy[]) => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  if (!reminders || !reminders.length) {
    return;
  }

  checkInterval = setInterval(() => {
    const dueReminders = getDueReminders(reminders);
    if (dueReminders.length) {
      const oldest = dueReminders[0];

      const remindersToSend = (oldest.type === 'TASK')
        ? dueReminders.filter(r => r.type === 'TASK')
        // NOTE: for notes we just send the oldest due reminder
        : [oldest];

      if (currentMessageTimerVal <= 0) {
        postMessage(remindersToSend);
        console.log('Worker postMessage', remindersToSend);
        currentMessageTimerVal = MESSAGE_INTERVAL_DURATION;
      } else {
        currentMessageTimerVal -= CHECK_INTERVAL_DURATION;
      }
    }
  }, CHECK_INTERVAL_DURATION);
};


const getDueReminders = (reminders: ReminderCopy[]): ReminderCopy[] => {
  const now = Date.now();
  return reminders
    .filter(reminder => (reminder.remindAt < now))
    .sort((a, b) => a.remindAt - b.remindAt);
};
