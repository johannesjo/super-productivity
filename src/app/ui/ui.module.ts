import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { EditOnClickDirective } from './edit-on-click/edit-on-click.directive';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import {
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
} from '@angular/material';
import { MarkdownModule } from 'ngx-markdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyModule } from '@ngx-formly/core';
import { ThemeSelectComponent } from './theme-select/theme-select.component';
import { MsToStringPipe } from './duration/ms-to-string.pipe';
import { StringToMsPipe } from './duration/string-to-ms.pipe';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { MsToStringPipe$ } from './duration/ms-to-string$.pipe';
import { CollapsibleComponent } from './collapsible/collapsible.component';
import { HelpSectionComponent } from './help-section/help-section.component';
import { NumberToMonthPipe } from './duration/number-to-month.pipe';
import { SplitModule } from '../pages/work-view/split/split.module';
import { SimpleDownloadDirective } from './simple-download/simple-download.directive';
import { Angular2PromiseButtonModule } from 'angular2-promise-buttons';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle';
import { InputDurationFormlyComponent } from './duration/input-duration-formly/input-duration-formly.component';
import { EnlargeImgDirective } from './enlarge-img/enlarge-img.directive';
import { DragulaModule } from 'ng2-dragula';
import { MsToClockStringPipe } from './duration/ms-to-clock-string.pipe';
import { DatetimeInputComponent } from './datetime-input/datetime-input.component';
import { InputDurationSliderComponent } from './duration/input-duration-slider/input-duration-slider.component';
import { MsToMinuteClockStringPipe } from './duration/ms-to-minute-clock-string.pipe';
import { KeysPipe } from '../util/keys.pipe';
import { ToArrayPipe } from '../util/to-array.pipe';

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [{
        name: 'duration',
        component: InputDurationFormlyComponent,
        extends: 'input',
        wrappers: ['form-field'],
      }]
    }),
    FormlyMaterialModule,
    FormlyMatToggleModule,

    Angular2PromiseButtonModule.forRoot({
      // handleCurrentBtnOnly: true,
    }),

    DragulaModule.forRoot(),

    // material2
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatOptionModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatBadgeModule,
  ],
  declarations: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    InputDurationFormlyComponent,
    InputDurationSliderComponent,
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,
    MsToClockStringPipe,
    MsToMinuteClockStringPipe,
    MsToStringPipe,
    MsToStringPipe$,
    StringToMsPipe,
    ProgressBarComponent,
    CollapsibleComponent,
    HelpSectionComponent,
    NumberToMonthPipe,
    SimpleDownloadDirective,
    DialogConfirmComponent,
    EnlargeImgDirective,
    DatetimeInputComponent,
    KeysPipe,
    ToArrayPipe,
  ],
  entryComponents: [
    DialogConfirmComponent,
  ],
  exports: [
    SplitModule,
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    InputDurationFormlyComponent,
    InputDurationSliderComponent,
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,
    ProgressBarComponent,
    CollapsibleComponent,
    HelpSectionComponent,
    SimpleDownloadDirective,
    DialogConfirmComponent,
    EnlargeImgDirective,
    DatetimeInputComponent,

    MsToClockStringPipe,
    MsToMinuteClockStringPipe,
    MsToStringPipe,
    MsToStringPipe$,
    StringToMsPipe,
    NumberToMonthPipe,
    KeysPipe,
    ToArrayPipe,

    DragulaModule,
    Angular2PromiseButtonModule,

    // material2
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatOptionModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatBadgeModule,

    ReactiveFormsModule,
    FormlyModule,
    FormlyMaterialModule,
    MarkdownModule,
  ]
})
export class UiModule {
}
