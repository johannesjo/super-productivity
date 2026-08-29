import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { ChipListInputComponent } from './chip-list-input.component';

describe('ChipListInputComponent', () => {
  let component: ChipListInputComponent;
  let fixture: ComponentFixture<ChipListInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipListInputComponent, NoopAnimationsModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipListInputComponent);
    component = fixture.componentInstance;
  });

  describe('suggestions setter', () => {
    it('should not mutate the passed array', () => {
      // consumers bind memoized NgRx selector output, which every other
      // subscriber holds a reference to
      const suggestions = [
        { id: 'c', title: 'C' },
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ];

      component.suggestions = suggestions;

      expect(suggestions.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    });

    it('should sort its own copy alphabetically by title', () => {
      component.suggestions = [
        { id: 'c', title: 'C' },
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ];

      expect(component.suggestionsIn.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    });
  });
});
