import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  ViewChild,
} from '@angular/core';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import {
  MatChipGrid,
  MatChipInput,
  MatChipInputEvent,
  MatChipRow,
} from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { UiModule } from '../../../ui/ui.module';
import { UntypedFormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { T } from '../../../t.const';
import { TagService } from '../tag.service';
import { TagModule } from '../tag.module';
import { TaskService } from '../../tasks/task.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskCopy } from '../../tasks/task.model';

interface Suggestion {
  id: string;
  title: string;

  [key: string]: any;
}

const DEFAULT_SEPARATOR_KEY_CODES: number[] = [ENTER, COMMA];

@Component({
  selector: 'tag-edit',
  standalone: true,
  imports: [
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatChipGrid,
    MatChipInput,
    MatChipRow,
    MatIcon,
    UiModule,
    TagModule,
  ],
  templateUrl: './tag-edit.component.html',
  styleUrl: './tag-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagEditComponent {
  T: typeof T = T;

  private _tagService = inject(TagService);
  private _taskService = inject(TaskService);

  task = input.required<TaskCopy>();
  tagIds = input.required<string[]>();

  escapePress = output<void>();

  inputCtrl: UntypedFormControl = new UntypedFormControl();
  separatorKeysCodes: number[] = DEFAULT_SEPARATOR_KEY_CODES;

  @ViewChild('inputElRef', { static: true }) inputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('autoElRef', { static: true }) matAutocomplete?: MatAutocomplete;

  inputVal = toSignal<string>(this.inputCtrl.valueChanges);
  tagSuggestions = toSignal(this._tagService.tagsNoMyDayAndNoList$, { initialValue: [] });

  filteredSuggestions = computed(() => {
    const val = this.inputVal();
    if (!val) {
      return this.tagSuggestions();
    }
    const filterValue = val.toLowerCase();
    return this.tagSuggestions().filter(
      (suggestion) =>
        suggestion.title.toLowerCase().indexOf(filterValue) === 0 &&
        !this.tagIds().includes(suggestion.id),
    );
  });

  tagItems = computed<Suggestion[]>(() => {
    const suggestions = this.tagSuggestions();
    return suggestions.length
      ? (this.tagIds()
          .map((id) => suggestions.find((suggestion) => suggestion.id === id))
          .filter((v) => v) as Suggestion[])
      : [];
  });

  add(event: MatChipInputEvent): void {
    if (!this.matAutocomplete) {
      throw new Error('Auto complete undefined');
    }

    if (!this.matAutocomplete.isOpen) {
      const inp = event.input;
      const value = event.value;

      // Add our fruit
      if ((value || '').trim()) {
        this._addByTitle(value.trim());
      }

      inp.value = '';

      this.inputCtrl.setValue(null);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.code === 'Escape') {
      this.escapePress.emit();
    }
  }

  remove(id: string): void {
    this._updateModel(this.tagIds().filter((tid) => tid !== id));
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this._add(event.option.value);
    if (this.inputEl) {
      this.inputEl.nativeElement.value = '';
    }
    this.inputCtrl.setValue(null);
  }

  private _updateModel(v: string[]): void {
    this._taskService.updateTags(this.task(), v);
  }

  private _getExistingSuggestionByTitle(v: string): Suggestion | undefined {
    return this.tagSuggestions().find((suggestion) => suggestion.title === v);
  }

  private _add(id: string): void {
    // prevent double items
    if (!this.tagIds().includes(id)) {
      this._updateModel([...this.tagIds(), id]);
    }
  }

  private _addByTitle(v: string): void {
    const existing = this._getExistingSuggestionByTitle(v);
    if (existing) {
      this._add(existing.id);
    } else {
      this._createNewTag(v);
    }
  }

  private _createNewTag(title: string): void {
    const cleanTitle = (t: string): string => {
      return t.replace('#', '');
    };

    const id = this._tagService.addTag({ title: cleanTitle(title) });
    this._add(id);
  }

  protected readonly onkeydown = onkeydown;
}
