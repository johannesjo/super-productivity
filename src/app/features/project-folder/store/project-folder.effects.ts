import { Injectable, inject } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class ProjectFolderEffects {
  private readonly actions$ = inject(Actions);
}
