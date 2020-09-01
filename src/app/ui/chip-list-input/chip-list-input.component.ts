import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { T } from '../../t.const';

interface Suggestion {
  id: string;
  title: string;

  [key: string]: any;
}

@Component({
  selector: 'chip-list-input',
  templateUrl: './chip-list-input.component.html',
  styleUrls: ['./chip-list-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChipListInputComponent {
  T: typeof T = T;

  @Input() label?: string;
  @Input() additionalActionIcon?: string;
  @Input() additionalActionTooltip?: string;
  @Input() additionalActionTooltipUnToggle?: string;
  @Input() toggledItems?: string[];
  @Input() isAutoFocus?: boolean;

  @Output() addItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() addNewItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() removeItem: EventEmitter<string> = new EventEmitter<string>();
  @Output() additionalAction: EventEmitter<string> = new EventEmitter<string>();

  suggestionsIn: Suggestion[] = [];
  modelItems: Suggestion[] = [];
  inputCtrl: FormControl = new FormControl();
  separatorKeysCodes: number[] = [ENTER, COMMA];
  @ViewChild('inputElRef', {static: true}) inputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('autoElRef', {static: true}) matAutocomplete?: MatAutocomplete;
  private _modelIds: string[] = [];

  filteredSuggestions: Observable<Suggestion[]> = this.inputCtrl.valueChanges.pipe(
    startWith(''),
    map((val: string | null) => (val !== null)
      ? this._filter(val)
      : this.suggestionsIn.filter(suggestion => !this._modelIds.includes(suggestion.id))
    )
  );

  constructor() {
  }

  @Input() set suggestions(val: Suggestion[]) {
    this.suggestionsIn = val.sort((a, b) => a.title.localeCompare(b.title));
    this._updateModelItems(this._modelIds);
  }

  @Input() set model(v: string[]) {
    this._modelIds = v;
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

  trackById(i: number, item: Suggestion) {
    return item.id;
  }

  isToggled(id: string) {
    return this.toggledItems && this.toggledItems.includes(id);
  }

  private _updateModelItems(modelIds: string[]) {
    this.modelItems = (this.suggestionsIn.length)
      ? modelIds.map(id => this.suggestionsIn.find(suggestion => suggestion.id === id)) as Suggestion[]
      : [];
  }

  private _getExistingSuggestionByTitle(v: string) {
    return this.suggestionsIn.find(suggestion => suggestion.title === v);
  }

  private _add(id: string) {
    // prevent double items
    if (!this._modelIds.includes(id)) {
      this.addItem.emit(id);
    }
  }

  private _addByTitle(v: string) {
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
      suggestion => suggestion.title.toLowerCase().indexOf(filterValue) === 0
        && !this._modelIds.includes(suggestion.id)
    );
  }
}
