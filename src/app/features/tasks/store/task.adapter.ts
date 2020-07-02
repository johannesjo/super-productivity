import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Task } from '../task.model';

export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();
