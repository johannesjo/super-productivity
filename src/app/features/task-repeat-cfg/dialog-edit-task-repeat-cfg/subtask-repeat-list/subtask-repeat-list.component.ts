import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { SubTaskRepeatTemplate } from '../../task-repeat-cfg.model';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../../t.const';
import { MatCard, MatCardContent } from '@angular/material/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'subtask-repeat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButton,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatCard,
    MatCardContent,
    TranslatePipe,
  ],
  templateUrl: './subtask-repeat-list.component.html',
  styleUrls: ['./subtask-repeat-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtaskRepeatListComponent extends FieldType<FormlyFieldConfig> {
  T: typeof T = T;

  get subTasks(): SubTaskRepeatTemplate[] {
    return this.value || [];
  }

  addSubTask(): void {
    const newSubTask: SubTaskRepeatTemplate = {
      title: '',
      notes: '',
      timeEstimate: 0,
      isDone: false,
    };
    const updatedSubTasks = [...this.subTasks, newSubTask];
    this.formControl.setValue(updatedSubTasks);
  }

  removeSubTask(index: number): void {
    const updatedSubTasks = this.subTasks.filter((_, i) => i !== index);
    this.formControl.setValue(updatedSubTasks);
  }

  updateSubTask(index: number, field: keyof SubTaskRepeatTemplate, value: any): void {
    const updatedSubTasks = [...this.subTasks];
    updatedSubTasks[index] = { ...updatedSubTasks[index], [field]: value };
    this.formControl.setValue(updatedSubTasks);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
