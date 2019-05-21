import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocomplete, MatAutocompleteSelectedEvent, MatChipInputEvent } from '@angular/material';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';


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
  @Input() label: string;

  @Input() set suggestions(val) {
    this.suggestions_ = val.sort((a, b) => a.title.localeCompare(b.title));
    this._updateModelItems(this._modelIds);
  }

  suggestions_: Suggestion[];

  @Input() set model(v: string[]) {
    this._modelIds = v;
    this._updateModelItems(v);
  }

  @Output() addItem = new EventEmitter<string>();
  @Output() addNewItem = new EventEmitter<string>();
  @Output() removeItem = new EventEmitter<string>();

  modelItems: Suggestion[];

  inputCtrl = new FormControl();
  separatorKeysCodes: number[] = [ENTER, COMMA];

  filteredSuggestions: Observable<Suggestion[]> = this.inputCtrl.valueChanges.pipe(
    startWith(null),
    map((val: string | null) => val
      ? this._filter(val)
      : this.suggestions_.filter(suggestion => !this._modelIds || !this._modelIds.includes(suggestion.id)))
  );

  @ViewChild('inputElRef') fruitInput: ElementRef<HTMLInputElement>;
  @ViewChild('autoElRef') matAutocomplete: MatAutocomplete;

  private _modelIds: string[] = [];

  constructor() {
  }

  add(event: MatChipInputEvent): void {
    if (!this.matAutocomplete.isOpen) {
      const input = event.input;
      const value = event.value;

      // Add our fruit
      if ((value || '').trim()) {
        this._addByTitle(value.trim());
      }

      // Reset the input value
      if (input) {
        input.value = '';
      }

      this.inputCtrl.setValue(null);
    }
  }

  remove(id: string): void {
    this.removeItem.emit(id);
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this._add(event.option.value);
    this.fruitInput.nativeElement.value = '';
    this.inputCtrl.setValue(null);
  }

  trackById(i: number, item: Suggestion) {
    return item.id;
  }

  private _updateModelItems(modelIds) {
    this.modelItems = (modelIds)
      ? modelIds.map(id => this.suggestions_.find(suggestion => suggestion.id === id))
      : [];
  }

  private _getExistingSuggestionByTitle(v: string) {
    return this.suggestions_.find(suggestion => suggestion.title === v);
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
    const filterValue = val.toLowerCase();
    return this.suggestions_.filter(
      suggestion => suggestion.title.toLowerCase().indexOf(filterValue) === 0
        && !this._modelIds.includes(suggestion.id)
    );
  }
}
