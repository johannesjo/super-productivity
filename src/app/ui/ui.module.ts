import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InputDurationDirective} from './duration/input-duration.directive';
import {DurationFromStringPipe} from './duration/duration-from-string.pipe';
import {DurationToStringPipe} from './duration/duration-to-string.pipe';
import {EditOnClickDirective} from './edit-on-click/edit-on-click.directive';
import {InlineMarkdownComponent} from './inline-markdown/inline-markdown.component';
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
import {MarkdownModule, MarkdownService} from 'ngx-markdown';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {FormlyMaterialModule} from '@ngx-formly/material';
import {FormlyModule} from '@ngx-formly/core';
import {ThemeSelectComponent} from './theme-select/theme-select.component';
import {MsToStringPipe} from './duration/ms-to-string.pipe';
import {StringToMsPipe} from './duration/string-to-ms.pipe';
import {ProgressBarComponent} from './progress-bar/progress-bar.component';
import {MsToStringPipe$} from './duration/ms-to-string$.pipe';
import {CollapsibleComponent} from './collapsible/collapsible.component';
import {HelpSectionComponent} from './help-section/help-section.component';
import {NumberToMonthPipe} from './pipes/number-to-month.pipe';
import {SplitModule} from '../pages/work-view/split/split.module';
import {SimpleDownloadDirective} from './simple-download/simple-download.directive';
import {Angular2PromiseButtonModule} from 'angular2-promise-buttons';
import {DialogConfirmComponent} from './dialog-confirm/dialog-confirm.component';
import {FormlyMatToggleModule} from '@ngx-formly/material/toggle';
import {InputDurationFormlyComponent} from './duration/input-duration-formly/input-duration-formly.component';
import {EnlargeImgDirective} from './enlarge-img/enlarge-img.directive';
import {DragulaModule} from 'ng2-dragula';
import {MsToClockStringPipe} from './duration/ms-to-clock-string.pipe';
import {DatetimeInputComponent} from './datetime-input/datetime-input.component';
import {InputDurationSliderComponent} from './duration/input-duration-slider/input-duration-slider.component';
import {MsToMinuteClockStringPipe} from './duration/ms-to-minute-clock-string.pipe';
import {HumanizeTimestampPipe} from './pipes/humanize-timestamp.pipe';
import {KeysPipe} from './pipes/keys.pipe';
import {ToArrayPipe} from './pipes/to-array.pipe';
import {MomentFormatPipe} from './pipes/moment-format.pipe';
import {InlineInputComponent} from './inline-input/inline-input.component';
import {ChipListInputComponent} from './chip-list-input/chip-list-input.component';
import {ValidationModule} from './validation/validation.module';
import {OwlDateTimeModule, OwlNativeDateTimeModule} from 'ng-pick-datetime';

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
    ValidationModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
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
    HumanizeTimestampPipe,
    MomentFormatPipe,
    InlineInputComponent,
    ChipListInputComponent,
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
    InlineInputComponent,
    ChipListInputComponent,

    MsToClockStringPipe,
    MsToMinuteClockStringPipe,
    MsToStringPipe,
    MsToStringPipe$,
    StringToMsPipe,
    NumberToMonthPipe,
    KeysPipe,
    ToArrayPipe,
    HumanizeTimestampPipe,
    MomentFormatPipe,

    DragulaModule,
    Angular2PromiseButtonModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,

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
    ValidationModule,
  ]
})
export class UiModule {
  constructor(private _markdownService: MarkdownService) {
    const linkRenderer = _markdownService.renderer.link;
    _markdownService.renderer.link = (href, title, text) => {
      const html = linkRenderer.call(_markdownService.renderer, href, title, text);
      return html.replace(/^<a /, '<a target="_blank" ');
    };

    _markdownService.renderer.paragraph = (text) => {
      const split = text.split('\n');
      return split.reduce((acc, p) => {
        const result = /h(\d)\./.exec(p);
        if (result) {
          const h = `h${result[1]}`;
          return acc + `<${h}>${p.replace(result[0], '')}</${h}>`;
        }
        return acc + `<p>${p}</p>`;
      }, '');
    };
  }
}
