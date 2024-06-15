import { ErrorHandler, NgModule, SecurityContext } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { ContentEditableOnClickDirective } from './edit-on-click/content-editable-on-click.directive';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  MAT_LEGACY_FORM_FIELD_DEFAULT_OPTIONS as MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatLegacyFormFieldModule as MatFormFieldModule,
} from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import {
  MarkdownModule,
  MarkdownService,
  MarkedOptions,
  MarkedRenderer,
  provideMarkdown,
} from 'ngx-markdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FORMLY_CONFIG, FormlyModule } from '@ngx-formly/core';
import { ThemeSelectComponent } from './theme-select/theme-select.component';
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
import { DragulaModule } from 'ng2-dragula';
import { MsToClockStringPipe } from './duration/ms-to-clock-string.pipe';
import { DatetimeInputComponent } from './datetime-input/datetime-input.component';
import { InputDurationSliderComponent } from './duration/input-duration-slider/input-duration-slider.component';
import { MsToMinuteClockStringPipe } from './duration/ms-to-minute-clock-string.pipe';
import { HumanizeTimestampPipe } from './pipes/humanize-timestamp.pipe';
import { KeysPipe } from './pipes/keys.pipe';
import { ToArrayPipe } from './pipes/to-array.pipe';
import { MomentFormatPipe } from './pipes/moment-format.pipe';
import { InlineInputComponent } from './inline-input/inline-input.component';
import { ChipListInputComponent } from './chip-list-input/chip-list-input.component';
import { ValidationModule } from './validation/validation.module';
import {
  OwlDateTimeModule,
  OwlNativeDateTimeModule,
} from 'ngx-date-time-picker-schedule';
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
import { OwlWrapperComponent } from './owl-wrapper/owl-wrapper.component';
import { DialogPromptComponent } from './dialog-prompt/dialog-prompt.component';
import { RoundDurationPipe } from './pipes/round-duration.pipe';
import { ShortPlannedAtPipe } from './pipes/short-planned-at.pipe';
import { LongPressIOSDirective } from './longpress/longpress-ios.directive';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ProgressCircleComponent } from './progress-circle/progress-circle.component';
import { FormlyLinkWidgetComponent } from './formly-link-widget/formly-link-widget.component';

const DIALOG_COMPONENTS = [
  DialogConfirmComponent,
  DialogPromptComponent,
  DialogFullscreenMarkdownComponent,
];

const COMPONENT_AND_PIPES = [
  ...DIALOG_COMPONENTS,
  ChipListInputComponent,
  CollapsibleComponent,
  ContentEditableOnClickDirective,
  DatetimeInputComponent,
  DurationFromStringPipe,
  DurationToStringPipe,
  EnlargeImgDirective,
  FormlyTranslatedTemplateComponent,
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
  ThemeSelectComponent,
  ToArrayPipe,
  SortPipe,
  RoundDurationPipe,
  ShortPlannedAtPipe,
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

const OTHER_3RD_PARTY_MODS_WITHOUT_CFG = [
  OwlDateTimeModule,
  OwlNativeDateTimeModule,
  TranslateModule,
];

const markedOptionsFactory = (): MarkedOptions => {
  const renderer = new MarkedRenderer();

  renderer.checkbox = (isChecked: boolean) => {
    return `<span class="checkbox material-icons">${
      isChecked ? 'check_box ' : 'check_box_outline_blank '
    }</span>`;
  };
  renderer.listitem = (text: string) => {
    return text.includes('checkbox')
      ? '<li class="checkbox-wrapper">' + text + '</li>'
      : '<li>' + text + '</li>';
  };
  return {
    renderer: renderer,
    gfm: true,
    breaks: false,
    pedantic: false,
    smartLists: true,
    smartypants: false,
  };
};

@NgModule({
  imports: [
    ...OTHER_3RD_PARTY_MODS_WITHOUT_CFG,
    ...MAT_MODULES,
    CommonModule,
    MarkdownModule.forRoot({
      markedOptions: {
        provide: MarkedOptions,
        useFactory: markedOptionsFactory,
      },
      sanitize: SecurityContext.HTML,
    }),
    FormsModule,
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
      ],
      extras: {
        immutable: true,
      },
    }),
    FormlyMatToggleModule,
    FormlyMaterialModule,
    // fix https://stackoverflow.com/questions/62755093/angular-error-generic-type-modulewithproviderst-requires-1-type-arguments
    (DragulaModule as any).forRoot(),

    // my modules
    ValidationModule,
    BetterDrawerModule,
  ],
  declarations: [...COMPONENT_AND_PIPES, OwlWrapperComponent, FormlyLinkWidgetComponent],
  exports: [
    ...COMPONENT_AND_PIPES,
    ...MAT_MODULES,
    ...OTHER_3RD_PARTY_MODS_WITHOUT_CFG,
    DragulaModule,
    FormlyMaterialModule,
    FormlyModule,
    MarkdownModule,
    ReactiveFormsModule,
    ValidationModule,
    OwlWrapperComponent,
  ],
  providers: [
    provideMarkdown(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'standard' },
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
export class UiModule {
  constructor(private _markdownService: MarkdownService) {
    const linkRenderer = this._markdownService.renderer.link;
    this._markdownService.renderer.link = (href, title, text) => {
      const html = linkRenderer.call(this._markdownService.renderer, href, title, text);
      return html.replace(/^<a /, '<a target="_blank" ');
    };

    this._markdownService.renderer.paragraph = (text) => {
      const split = text.split('\n');
      return split.reduce((acc, p, i) => {
        const result = /h(\d)\./.exec(p);
        if (result !== null) {
          const h = `h${result[1]}`;
          return acc + `<${h}>${p.replace(result[0], '')}</${h}>`;
        }

        if (split.length === 1) {
          return `<p>` + p + `</p>`;
        }

        return acc ? (split.length - 1 === i ? acc + p + `</p>` : acc + p) : `<p>` + p;
      }, '');
    };
  }
}
