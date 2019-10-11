export interface AddTaskReminderInterface {
  title: string;
  taskId: string;
  isMoveToBacklogPossible?: boolean;
  reminderId?: string;
}
