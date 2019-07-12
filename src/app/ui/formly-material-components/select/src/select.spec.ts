import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {MatSelectModule} from '@angular/material/select';
import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {createGenericTestComponent} from '../../../../../../ngx-formly/src/core/src/lib/test-utils';
import {By} from '@angular/platform-browser';

import {Component, ViewChild} from '@angular/core';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FormlyForm, FormlyModule} from '@ngx-formly/core';
import {FormlySelectModule} from '@ngx-formly/core/select';
import {FormlyFieldSelect} from './select.type';
import {of as observableOf} from 'rxjs';
import {MatPseudoCheckboxModule} from '@angular/material/core';
import {timeout} from 'rxjs/operators';

const createTestComponent = (html: string) =>
  createGenericTestComponent(html, TestComponent) as ComponentFixture<TestComponent>;

let testComponentInputs;

describe('ui-material: Formly Field Select Component', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestComponent, FormlyFieldSelect],
      imports: [
        NoopAnimationsModule,
        MatSelectModule,
        MatPseudoCheckboxModule,
        ReactiveFormsModule,
        FormlySelectModule,
        FormlyModule.forRoot({
          types: [
            {
              name: 'select',
              component: FormlyFieldSelect,
            },
          ],
        }),
      ],
    });
  });

  describe('options', () => {
    beforeEach(() => {
      testComponentInputs = {
        form: new FormGroup({}),
        options: {},
        model: {},
      };
    });

    it('should correctly bind to a static array of data', () => {
      testComponentInputs.fields = [{
        key: 'sportId',
        type: 'select',
        templateOptions: {
          options: [
            {id: '1', name: 'Soccer'},
            {id: '2', name: 'Basketball'},
            {id: {test: 'A'}, name: 'Not Soccer or Basketball'},
          ],
          valueProp: 'id',
          labelProp: 'name',
        },
      }];

      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>'),
        trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('mat-option')).length).toEqual(3);
    });

    it('should correctly bind to an Observable', async(() => {
      const sports$ = observableOf([
        {id: '1', name: 'Soccer'},
        {id: '2', name: 'Basketball'},
        {id: {test: 'A'}, name: 'Not Soccer or Basketball'},
      ]);

      testComponentInputs.fields = [{
        key: 'sportId',
        type: 'select',
        templateOptions: {
          options: sports$,
          valueProp: 'id',
          labelProp: 'name',
        },
      }];

      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>'),
        trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('mat-option')).length).toEqual(3);
    }));

  });

  describe('multi select', () => {

    beforeEach(() => {
      testComponentInputs = {
        form: new FormGroup({}),
        options: {},
        model: {},
      };

      testComponentInputs.fields = [{
        key: 'sportId',
        type: 'select',
        templateOptions: {
          multiple: true,
          selectAllOption: 'Select All',
          options: [
            {id: '1', name: 'Soccer'},
            {id: '2', name: 'Basketball'},
            {id: '3', name: 'Martial Arts'},
          ],
          valueProp: 'id',
          labelProp: 'name',
        },
      }];
    });

    it('should have a "Select All" option if configured', () => {
      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>');
      const trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('mat-option')).length).toEqual(1 + 3);
    });

    it('should select all options if clicking the "Select All" option', () => {
      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>');
      const trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      const selectAllOption = fixture.debugElement.queryAll(By.css('mat-option'))[0].nativeElement;
      selectAllOption.click();
      fixture.detectChanges();

      expect(testComponentInputs.form.get('sportId').value.length).toEqual(3);

      // clicking again should deselect all
      selectAllOption.click();
      fixture.detectChanges();

      expect(testComponentInputs.form.get('sportId').value.length).toEqual(0);
    });

    it('should use the selectAllOption prop as label for the option entry', () => {
      testComponentInputs.fields = [{
        key: 'sportId',
        type: 'select',
        templateOptions: {
          multiple: true,
          selectAllOption: 'Click me!!',
          options: [
            {id: '1', name: 'Soccer'},
            {id: '2', name: 'Basketball'},
            {id: '3', name: 'Martial Arts'},
          ],
          valueProp: 'id',
          labelProp: 'name',
        },
      }];

      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>');
      const trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      const selectAllOption = fixture.debugElement.queryAll(By.css('mat-option'))[0].nativeElement;
      expect(selectAllOption.innerHTML).toContain('Click me!!');
    });

    it('should correctly bind a multi select to an observable', fakeAsync(() => {
      // bind a value which triggers the error in case
      testComponentInputs.model = {
        sportId: [1],
      };
      testComponentInputs.fields = [{
        key: 'sportId',
        type: 'select',
        templateOptions: {
          multiple: true,
          selectAllOption: 'Click me!!',
          options: observableOf([
            {id: '1', name: 'Soccer'},
            {id: '2', name: 'Basketball'},
            {id: '3', name: 'Martial Arts'},
          ]).pipe(
            timeout(50),
          ),
          valueProp: 'id',
          labelProp: 'name',
        },
      }];

      const fixture = createTestComponent('<formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>');

      tick(51);
      fixture.detectChanges();

      const trigger = fixture.debugElement.query(By.css('.mat-select-trigger')).nativeElement;

      trigger.click();
      fixture.detectChanges();

      const selectAllOption = fixture.debugElement.queryAll(By.css('mat-option'))[0].nativeElement;
      expect(selectAllOption.innerHTML).toContain('Click me!!');
    }));

  });

});

@Component({selector: 'formly-form-test', template: '', entryComponents: []})
class TestComponent {
  @ViewChild(FormlyForm) formlyForm: FormlyForm;

  fields = testComponentInputs.fields;
  form: FormGroup = testComponentInputs.form;
  model = testComponentInputs.model || {};
  options = testComponentInputs.options;
}
