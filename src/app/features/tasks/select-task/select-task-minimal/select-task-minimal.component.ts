import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  viewChild,
  effect,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  UntypedFormControl,
} from '@angular/forms';
import { MatInput } from '@angular/material/input';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { MatOptionSelectionChange } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { Task } from '../../task.model';
import { WorkContextService } from '../../../work-context/work-context.service';
import { map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  selectStartableTasksActiveContextFirst,
  selectTrackableTasksActiveContextFirst,
} from '../../../work-context/store/work-context.selectors';

@Component({
  selector: 'select-task-minimal',
  standalone: true,
  imports: [
    MatInput,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    AsyncPipe,
    ReactiveFormsModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectTaskMinimalComponent),
      multi: true,
    },
  ],
  templateUrl: './select-task-minimal.component.html',
  styleUrl: './select-task-minimal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTaskMinimalComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  private _workContextService = inject(WorkContextService);
  private _store = inject(Store);

  placeholder = input<string>();
  isIncludeDoneTasks = input<boolean>(false);
  isLimitToProject = input<boolean>(false);

  // Outputs
  taskSelected = output<Task>();
  textChanged = output<string>();
  blurred = output<void>();
  keyPressed = output<KeyboardEvent>();
  autocompleteOpened = output<void>();
  autocompleteClosed = output<void>();

  // Internal state
  taskSelectCtrl: UntypedFormControl = new UntypedFormControl();
  filteredTasks$!: Observable<Task[]>;

  private _destroy$ = new Subject<void>();
  private _onChange: (value: Task | string) => void = (): void => {};
  private _onTouched: () => void = (): void => {};

  readonly inputElement = viewChild<ElementRef>('input');
  readonly autocomplete = viewChild<MatAutocomplete>('auto');

  constructor() {
    // Set up autocomplete event listeners when autocomplete becomes available
    effect(() => {
      const autocomplete = this.autocomplete();
      if (autocomplete) {
        autocomplete.opened.pipe(takeUntil(this._destroy$)).subscribe(() => {
          this.autocompleteOpened.emit();
        });

        autocomplete.closed.pipe(takeUntil(this._destroy$)).subscribe(() => {
          this.autocompleteClosed.emit();
        });
      }
    });
  }

  ngOnInit(): void {
    // Use the same task selection logic as the original SelectTaskComponent
    const tasks$: Observable<Task[]> = this.isLimitToProject()
      ? this.isIncludeDoneTasks()
        ? this._workContextService.trackableTasksForActiveContext$
        : this._workContextService.startableTasksForActiveContext$
      : this.isIncludeDoneTasks()
        ? this._store.select(selectTrackableTasksActiveContextFirst)
        : this._store.select(selectStartableTasksActiveContextFirst);

    // Use FormControl value changes with withLatestFrom to match original behavior
    this.filteredTasks$ = this.taskSelectCtrl.valueChanges.pipe(
      startWith(''),
      withLatestFrom(tasks$),
      map(([searchValue, tasks]) => {
        const searchText =
          typeof searchValue === 'string' ? searchValue : searchValue?.title || '';
        const search = searchText.toLowerCase().trim();
        const filtered =
          search.length > 0
            ? tasks
                .filter((task) => task.title.toLowerCase().includes(search))
                .slice(0, 10) // Limit to 10 suggestions
            : [];
        return filtered;
      }),
      takeUntil(this._destroy$),
    );

    // Subscribe to form control changes to emit events
    this.taskSelectCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.textChanged.emit(value);
          this._onChange(value);
        } else if (value && value.title) {
          this.taskSelected.emit(value);
          this._onChange(value);
        }
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: string | Task): void {
    if (typeof value === 'string') {
      this.taskSelectCtrl.setValue(value);
    } else if (value?.title) {
      this.taskSelectCtrl.setValue(value);
    } else {
      this.taskSelectCtrl.setValue('');
    }
  }

  registerOnChange(fn: (value: Task | string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.taskSelectCtrl.disable();
    } else {
      this.taskSelectCtrl.enable();
    }
  }

  // Event handlers
  onOptionSelected(event: MatOptionSelectionChange): void {
    const selectedTask: Task = event.source.value;

    // Explicitly set the FormControl value to ensure consistency
    this.taskSelectCtrl.setValue(selectedTask, { emitEvent: false });

    // Emit the task selected event
    this.taskSelected.emit(selectedTask);

    // Call onChange to update the form value
    this._onChange(selectedTask);
  }

  onBlur(): void {
    this._onTouched();
    this.blurred.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keyPressed.emit(event);
  }

  // Public methods
  focus(): void {
    this.inputElement()?.nativeElement?.focus();
  }

  clear(): void {
    this.taskSelectCtrl.setValue('');
  }

  getValue(): string {
    const value = this.taskSelectCtrl.value;
    return typeof value === 'string' ? value : value?.title || '';
  }
}
