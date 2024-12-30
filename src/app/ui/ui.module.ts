import { ErrorHandler, NgModule, SecurityContext } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MarkdownModule, MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FORMLY_CONFIG, FormlyModule } from '@ngx-formly/core';
import { InputDurationFormlyComponent } from './duration/input-duration-formly/input-duration-formly.component';
import { ValidationModule } from './validation/validation.module';
import { TranslateService } from '@ngx-translate/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { GlobalErrorHandler } from '../core/error-handler/global-error-handler.class';
import { HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { MyHammerConfig } from '../../hammer-config.class';
import { registerTranslateExtension } from './formly-translate-extension/formly-translate-extension';
import { FormlyTranslatedTemplateComponent } from './formly-translated-template/formly-translated-template.component';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle';
import { FormlyLinkWidgetComponent } from './formly-link-widget/formly-link-widget.component';
import { MaterialCssVarsModule } from 'angular-material-css-vars';
import { markedOptionsFactory } from './marked-options-factory';

import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker';
import { FormlyCollapsibleComponent } from './formly-collapsible/formly-collapsible.component';
import { ShortTime2Pipe } from './pipes/short-time2.pipe';
import { KeyboardInputComponent } from '../features/config/keyboard-input/keyboard-input.component';
import { IconInputComponent } from '../features/config/icon-input/icon-input.component';
import { SelectProjectComponent } from '../features/config/select-project/select-project.component';
import { RepeatSectionTypeComponent } from '../features/config/repeat-section-type/repeat-section-type.component';

@NgModule({
  imports: [
    MatMomentDateModule,
    MatNativeDateModule,
    CommonModule,
    MarkdownModule.forRoot({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useFactory: markedOptionsFactory,
      },
      sanitize: SecurityContext.HTML,
    }),
    FormsModule,
    MaterialCssVarsModule.forRoot(),
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        { name: 'link', component: FormlyLinkWidgetComponent },
        {
          name: 'duration',
          component: InputDurationFormlyComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'tpl',
          component: FormlyTranslatedTemplateComponent,
        },
        { name: 'collapsible', component: FormlyCollapsibleComponent, wrappers: [] },
        {
          name: 'keyboard',
          component: KeyboardInputComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'icon',
          component: IconInputComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'project-select',
          component: SelectProjectComponent,
          // technically no input, but as the properties get us what we need...
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'repeat',
          component: RepeatSectionTypeComponent,
        },
      ],
      extras: {
        immutable: true,
      },
    }),
    FormlyMatToggleModule,
    FormlyMaterialModule,
    FormlyMatDatepickerModule,
    // my modules
    ValidationModule,
    FormlyLinkWidgetComponent,
  ],
  exports: [
    FormlyMaterialModule,
    FormlyModule,
    MarkdownModule,
    ReactiveFormsModule,
    ValidationModule,
  ],
  providers: [
    provideMarkdown(),
    ShortTime2Pipe,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'fill', subscriptSizing: 'dynamic' },
    },
    { provide: HAMMER_GESTURE_CONFIG, useClass: MyHammerConfig },
    {
      provide: FORMLY_CONFIG,
      multi: true,
      useFactory: registerTranslateExtension,
      deps: [TranslateService],
    },
    DatePipe,
  ],
})
export class UiModule {}
