import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { EditOnClickDirective } from './edit-on-click/edit-on-click.directive';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { MatCardModule, MatIconModule } from '@angular/material';
import { MatDatepickerModule } from '@angular/material';
import { MatDialogModule } from '@angular/material';
import { MatProgressBarModule } from '@angular/material';
import { MatNativeDateModule } from '@angular/material';
import { MatAutocompleteModule } from '@angular/material';
import { MatInputModule } from '@angular/material';
import { MatOptionModule } from '@angular/material';
import { MatCheckboxModule } from '@angular/material';
import { MatToolbarModule } from '@angular/material';
import { MatFormFieldModule } from '@angular/material';
import { MatButtonModule } from '@angular/material';
import { MatMenuModule } from '@angular/material';
import { MatListModule } from '@angular/material';
import { MatTableModule } from '@angular/material';
import { MatSelectModule } from '@angular/material';
import { MatStepperModule } from '@angular/material';
import { MatExpansionModule } from '@angular/material';
import { MatTabsModule } from '@angular/material';
import { MarkdownModule } from 'ngx-markdown';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyModule } from '@ngx-formly/core';
import { ThemeSelectComponent } from './theme-select/theme-select.component';

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forRoot(),

    ReactiveFormsModule,
    FormlyModule.forChild(),
    FormlyMaterialModule,

    // material2
    MatSelectModule,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatListModule,
    MatTableModule,
    MatStepperModule,
    MatExpansionModule,
    MatCardModule,
    MatTabsModule,
  ],
  declarations: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,
  ],
  exports: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickDirective,
    InlineMarkdownComponent,
    ThemeSelectComponent,

    // material2
    MatSelectModule,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatListModule,
    MatTableModule,
    MatStepperModule,
    MatExpansionModule,
    MatCardModule,
    MatTabsModule,

    ReactiveFormsModule,
    FormlyModule,
    FormlyMaterialModule,
  ]
})
export class UiModule {
}
