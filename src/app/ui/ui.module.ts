import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { EditOnClickComponent } from './edit-on-click/edit-on-click.component';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { MatIconModule, MatCardModule } from '@angular/material';
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
import { MarkdownModule } from 'ngx-markdown';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyModule } from '@ngx-formly/core';
import { MatMenuModule } from '@angular/material';
import { MatListModule } from '@angular/material';
import { MatTableModule } from '@angular/material';
import { ThemeSelectComponent } from './theme-select/theme-select.component';
import { MatSelectModule } from '@angular/material';
import { MatStepperModule } from '@angular/material';
import { MatExpansionModule } from '@angular/material';

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
  ],
  declarations: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickComponent,
    InlineMarkdownComponent,
    ThemeSelectComponent,
  ],
  exports: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickComponent,
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

    ReactiveFormsModule,
    FormlyModule,
    FormlyMaterialModule,
  ]
})
export class UiModule {
}
