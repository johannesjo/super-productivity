import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputDurationDirective } from './duration/input-duration.directive';
import { DurationFromStringPipe } from './duration/duration-from-string.pipe';
import { DurationToStringPipe } from './duration/duration-to-string.pipe';
import { EditOnClickComponent } from './edit-on-click/edit-on-click.component';
import { InlineMarkdownComponent } from './inline-markdown/inline-markdown.component';
import { MatIconModule } from '@angular/material';
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

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forRoot(),

    ReactiveFormsModule,
    FormlyModule.forChild(),
    FormlyMaterialModule,

    // material2
    MatToolbarModule,
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
  ],
  declarations: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickComponent,
    InlineMarkdownComponent,
  ],
  exports: [
    DurationFromStringPipe,
    DurationToStringPipe,
    InputDurationDirective,
    EditOnClickComponent,
    InlineMarkdownComponent,

    // material2
    MatToolbarModule,
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

    ReactiveFormsModule,
    FormlyModule,
    FormlyMaterialModule,
  ]
})
export class UiModule {
}
