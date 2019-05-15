import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogImprovementSuggestionsComponent } from './dialog-improvement-suggestions.component';

describe('DialogImprovementSuggestionsComponent', () => {
  let component: DialogImprovementSuggestionsComponent;
  let fixture: ComponentFixture<DialogImprovementSuggestionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogImprovementSuggestionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogImprovementSuggestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
