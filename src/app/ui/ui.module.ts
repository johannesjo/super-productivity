import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { EditOnClickDirective } from './edit-on-click/edit-on-click.directive';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import {
  MatAutocompleteModule, MatBadgeModule,
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
import { ReactiveFormsModule } from '@angular/forms';
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
import { SplitModule } from './split/split.module';

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forRoot(),

    ReactiveFormsModule,
    FormlyModule.forChild(),
    FormlyMaterialModule,
    SplitModule,

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
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,
    MsToStringPipe,
    MsToStringPipe$,
    StringToMsPipe,
    ProgressBarComponent,
    CollapsibleComponent,
    HelpSectionComponent,
    NumberToMonthPipe,
  ],
  exports: [
    SplitModule,
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,
    ProgressBarComponent,
    CollapsibleComponent,
    HelpSectionComponent,

    MsToStringPipe,
    MsToStringPipe$,
    StringToMsPipe,
    NumberToMonthPipe,

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
  ]
})
export class UiModule {
}
