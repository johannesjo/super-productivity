import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FormlyFieldConfig, FormlyFormOptions, FormlyModule} from '@ngx-formly/core';
import {FormlyFieldInput} from './input.type';

@Component({
  selector: 'formly-test',
  template: `
    <formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>
  `,
})
class FormlyTestComponent {
  form = new FormGroup({});
  fields: FormlyFieldConfig[];
  model: any;
  options: FormlyFormOptions;
}

describe('ui-material: Formly Input Component', () => {
  let fixture: ComponentFixture<FormlyTestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FormlyTestComponent, FormlyFieldInput],
      imports: [
        NoopAnimationsModule,
        MatInputModule,
        ReactiveFormsModule,
        FormlyModule.forRoot({
          types: [
            {
              name: 'input',
              component: FormlyFieldInput,
            },
          ],
        }),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormlyTestComponent);
  });

  it('should properly set the readonly value on text inputs', () => {
    const componentInstance = fixture.componentInstance;
    componentInstance.fields = [
      {
        key: 'name',
        type: 'input',
        templateOptions: {
          readonly: true,
        },
      },
    ];
    fixture.detectChanges();

    // assert
    const inputField = fixture.debugElement.query(By.css('input'));
    expect(inputField.nativeElement.getAttribute('readonly')).not.toBeNull();
  });

  it('should properly set the readonly value on number inputs', () => {
    const componentInstance = fixture.componentInstance;
    componentInstance.fields = [
      {
        key: 'name',
        type: 'input',
        templateOptions: {
          type: 'number',
          readonly: true,
        },
      },
    ];
    fixture.detectChanges();

    // assert
    const inputField = fixture.debugElement.query(By.css('input'));
    expect(inputField.nativeElement.getAttribute('readonly')).not.toBeNull();
  });
});
