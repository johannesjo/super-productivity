import { ErrorHandler, NgModule, SecurityContext } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatNativeDateModule,
  MatOptionModule,
  MatRippleModule,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule, MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FORMLY_CONFIG, FormlyModule } from '@ngx-formly/core';
import { MsToStringPipe } from './duration/ms-to-string.pipe';
import { StringToMsPipe } from './duration/string-to-ms.pipe';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { MsToStringPipe$ } from './duration/ms-to-string$.pipe';
import { CollapsibleComponent } from './collapsible/collapsible.component';
import { HelpSectionComponent } from './help-section/help-section.component';
import { NumberToMonthPipe } from './pipes/number-to-month.pipe';
import { SimpleDownloadDirective } from './simple-download/simple-download.directive';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { InputDurationFormlyComponent } from './duration/input-duration-formly/input-duration-formly.component';
import { EnlargeImgDirective } from './enlarge-img/enlarge-img.directive';
import { MsToClockStringPipe } from './duration/ms-to-clock-string.pipe';
import { InputDurationSliderComponent } from './duration/input-duration-slider/input-duration-slider.component';
import { MsToMinuteClockStringPipe } from './duration/ms-to-minute-clock-string.pipe';
import { HumanizeTimestampPipe } from './pipes/humanize-timestamp.pipe';
import { KeysPipe } from './pipes/keys.pipe';
import { ToArrayPipe } from './pipes/to-array.pipe';
import { MomentFormatPipe } from './pipes/moment-format.pipe';
import { InlineInputComponent } from './inline-input/inline-input.component';
import { ChipListInputComponent } from './chip-list-input/chip-list-input.component';
import { ValidationModule } from './validation/validation.module';

import { FullPageSpinnerComponent } from './full-page-spinner/full-page-spinner.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { GlobalErrorHandler } from '../core/error-handler/global-error-handler.class';
import { HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { MyHammerConfig } from '../../hammer-config.class';
import { registerTranslateExtension } from './formly-translate-extension/formly-translate-extension';
import { FormlyTranslatedTemplateComponent } from './formly-translated-template/formly-translated-template.component';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { DialogFullscreenMarkdownComponent } from './dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { JiraToMarkdownPipe } from './pipes/jira-to-markdown.pipe';
import { BetterDrawerModule } from './better-drawer/better-drawer.module';
import { SortPipe } from './pipes/sort.pipe';
import { LongPressDirective } from './longpress/longpress.directive';
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle';
import { DialogPromptComponent } from './dialog-prompt/dialog-prompt.component';
import { RoundDurationPipe } from './pipes/round-duration.pipe';
import { ShortPlannedAtPipe } from './pipes/short-planned-at.pipe';
import { LongPressIOSDirective } from './longpress/longpress-ios.directive';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ProgressCircleComponent } from './progress-circle/progress-circle.component';
import { FormlyLinkWidgetComponent } from './formly-link-widget/formly-link-widget.component';
import { MaterialCssVarsModule } from 'angular-material-css-vars';
import { markedOptionsFactory } from './marked-options-factory';

import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker';
import { LocalDateStrPipe } from './pipes/local-date-str.pipe';
import { FormlyCollapsibleComponent } from './formly-collapsible/formly-collapsible.component';
import { ShortTime2Pipe } from './pipes/short-time2.pipe';
import { KeyboardInputComponent } from '../features/config/keyboard-input/keyboard-input.component';
import { IconInputComponent } from '../features/config/icon-input/icon-input.component';
import { SelectProjectComponent } from '../features/config/select-project/select-project.component';
import { RepeatSectionTypeComponent } from '../features/config/repeat-section-type/repeat-section-type.component';

const DIALOG_COMPONENTS = [
  DialogConfirmComponent,
  DialogPromptComponent,
  DialogFullscreenMarkdownComponent,
];

const COMPONENT_AND_PIPES = [
  ...DIALOG_COMPONENTS,
  ChipListInputComponent,
  CollapsibleComponent,
  DurationFromStringPipe,
  DurationToStringPipe,
  EnlargeImgDirective,
  FormlyTranslatedTemplateComponent,
  FormlyCollapsibleComponent,
  FullPageSpinnerComponent,
  HelpSectionComponent,
  HumanizeTimestampPipe,
  InlineInputComponent,
  InlineMarkdownComponent,
  InputDurationDirective,
  InputDurationFormlyComponent,
  InputDurationSliderComponent,
  JiraToMarkdownPipe,
  KeysPipe,
  LongPressDirective,
  LongPressIOSDirective,
  MomentFormatPipe,
  MsToClockStringPipe,
  MsToMinuteClockStringPipe,
  MsToStringPipe$,
  MsToStringPipe,
  NumberToMonthPipe,
  ProgressBarComponent,
  ProgressCircleComponent,
  SimpleDownloadDirective,
  StringToMsPipe,
  ToArrayPipe,
  SortPipe,
  RoundDurationPipe,
  ShortTime2Pipe,
  ShortPlannedAtPipe,
  LocalDateStrPipe,
];

const MAT_MODULES = [
  MatAutocompleteModule,
  MatBadgeModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatButtonToggleModule,
  MatMomentDateModule,
  MatNativeDateModule,
  MatOptionModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRippleModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatStepperModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
];

const OTHER_3RD_PARTY_MODS_WITHOUT_CFG = [TranslateModule];

@NgModule({
  imports: [
    ...OTHER_3RD_PARTY_MODS_WITHOUT_CFG,
    ...MAT_MODULES,
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
    BetterDrawerModule,
    ...COMPONENT_AND_PIPES,
    FormlyLinkWidgetComponent,
  ],
  exports: [
    ...COMPONENT_AND_PIPES,
    ...MAT_MODULES,
    ...OTHER_3RD_PARTY_MODS_WITHOUT_CFG,
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
