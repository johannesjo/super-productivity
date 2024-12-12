import { transition, trigger } from '@angular/animations';
import { STANDARD_LIST_ANI } from '../../../ui/animations/standard-list.ani';

export const taskListAnimation = trigger('taskList', [
  transition(':increment, :decrement', STANDARD_LIST_ANI),
  transition('* <=> ALWAYS', STANDARD_LIST_ANI),
  transition('* <=> BLOCK', []),
]);
