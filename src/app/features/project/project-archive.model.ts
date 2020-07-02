import { NoteState } from '../note/store/note.reducer';
import { BookmarkState } from '../bookmark/store/bookmark.reducer';
import { Task, TaskState } from '../tasks/task.model';
import { EntityState } from '@ngrx/entity';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';
import { Tag } from '../tag/tag.model';
import { MetricState } from '../metric/metric.model';
import { ImprovementState } from '../metric/improvement/improvement.model';
import { ObstructionState } from '../metric/obstruction/obstruction.model';
import { Project } from './project.model';

export interface ProjectArchivedRelatedData {
  note?: NoteState;
  bookmark?: BookmarkState;
  task?: TaskState;
  taskArchive?: EntityState<Task>;
  taskAttachment?: EntityState<TaskAttachment>;
  taskTag?: EntityState<Tag>;
  metric?: MetricState;
  improvement?: ImprovementState;
  obstruction?: ObstructionState;
}

export interface ExportedProject extends Project {
  relatedModels: ProjectArchivedRelatedData;
}

export interface ProjectArchive {
  [key: string]: string;
}
