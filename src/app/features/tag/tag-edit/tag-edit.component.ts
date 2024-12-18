import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
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
import { Observable, Subscription } from 'rxjs';
import { map, startWith, withLatestFrom } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { T } from '../../../t.const';
import { Tag } from '../tag.model';
import { TagService } from '../tag.service';
import { TagModule } from '../tag.module';
import { TaskService } from '../../tasks/task.service';

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
    AsyncPipe,
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

  @Output() addItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() addNewItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() removeItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() additionalAction: EventEmitter<string> = new EventEmitter<string>();
  @Output() ctrlEnterSubmit: EventEmitter<void> = new EventEmitter<void>();

  tagSuggestions$: Observable<Tag[]> = this._tagService.tagsNoMyDayAndNoList$;
  modelItems: Suggestion[] = [];
  inputCtrl: UntypedFormControl = new UntypedFormControl();
  separatorKeysCodes: number[] = DEFAULT_SEPARATOR_KEY_CODES;

  @ViewChild('inputElRef', { static: true }) inputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('autoElRef', { static: true }) matAutocomplete?: MatAutocomplete;
  private _tagIds: string[] = [];

  suggestionsIn: Suggestion[] = [];

  filteredSuggestions$: Observable<Suggestion[]> = this.inputCtrl.valueChanges.pipe(
    startWith(''),
    withLatestFrom(this.tagSuggestions$),
    map(([val, tagSuggestions]) =>
      val !== null
        ? this._filter(val)
        : tagSuggestions.filter((suggestion) => !this._tagIds.includes(suggestion.id)),
    ),
  );

  private _subs: Subscription = new Subscription();

  constructor() {
    this._subs.add(
      this.tagSuggestions$.subscribe((suggestions) => {
        this.suggestionsIn = suggestions;
        this._updateModelItems(this._tagIds);
      }),
    );
  }

  @Input() set tagIds(v: string[]) {
    this._tagIds = v;
    this._updateModelItems(v);
  }

  add(event: MatChipInputEvent): void {
    if (!this.matAutocomplete) {
      throw new Error('Auto complete undefined');
    }

    if (!this.matAutocomplete.isOpen) {
      const input = event.input;
      const value = event.value;

      // Add our fruit
      if ((value || '').trim()) {
        this._addByTitle(value.trim());
      }

      input.value = '';

      this.inputCtrl.setValue(null);
    }
  }

  remove(id: string): void {
    this.removeItem.emit(id);
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this._add(event.option.value);
    if (this.inputEl) {
      this.inputEl.nativeElement.value = '';
    }
    this.inputCtrl.setValue(null);
  }

  triggerCtrlEnterSubmit(ev: KeyboardEvent): void {
    const isCyrillic = /^[А-яёЁ]$/.test(ev.key);
    if (isCyrillic) {
      this.separatorKeysCodes = [ENTER];
    } else {
      this.separatorKeysCodes = DEFAULT_SEPARATOR_KEY_CODES;
    }

    if (ev.code === 'Enter' && ev.ctrlKey) {
      this.ctrlEnterSubmit.next();
    }
  }

  private _updateModelItems(modelIds: string[]): void {
    this.modelItems = this.suggestionsIn.length
      ? (modelIds
          .map((id) => this.suggestionsIn.find((suggestion) => suggestion.id === id))
          .filter((v) => v) as Suggestion[])
      : [];
  }

  private _getExistingSuggestionByTitle(v: string): Suggestion | undefined {
    return this.suggestionsIn.find((suggestion) => suggestion.title === v);
  }

  private _add(id: string): void {
    // prevent double items
    if (!this._tagIds.includes(id)) {
      this.addItem.emit(id);
    }
  }

  private _addByTitle(v: string): void {
    const existing = this._getExistingSuggestionByTitle(v);
    if (existing) {
      this._add(existing.id);
    } else {
      this.addNewItem.emit(v);
    }
  }

  private _filter(val: string): Suggestion[] {
    if (!val) {
      return this.suggestionsIn;
    }

    const filterValue = val.toLowerCase();
    return this.suggestionsIn.filter(
      (suggestion) =>
        suggestion.title.toLowerCase().indexOf(filterValue) === 0 &&
        !this._tagIds.includes(suggestion.id),
    );
  }
}
