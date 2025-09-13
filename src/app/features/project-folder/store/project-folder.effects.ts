import { inject, Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { PfapiService } from '../../../pfapi/pfapi.service';
// import { Actions, createEffect, ofType } from '@ngrx/effects';
// import { catchError, map, switchMap, tap } from 'rxjs/operators';
// import { of, from } from 'rxjs';
// import * as ProjectFolderActions from './project-folder.actions';

@Injectable()
export class ProjectFolderEffects {
  private readonly _actions$ = inject(Actions);
  private readonly _pfapiService = inject(PfapiService);
  //
  // loadProjectFolders$ = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(ProjectFolderActions.loadProjectFolders),
  //     switchMap(() =>
  //       from(this._pfapiService.m.projectFolder.load()).pipe(
  //         map((projectFolderState) => {
  //           const projectFolders = projectFolderState.ids
  //             .map((id) => projectFolderState.entities[id])
  //             .filter(
  //               (
  //                 folder,
  //               ): folder is Readonly<import('../project-folder.model').ProjectFolder> =>
  //                 Boolean(folder),
  //             );
  //           return ProjectFolderActions.loadProjectFoldersSuccess({ projectFolders });
  //         }),
  //         catchError((error) => {
  //           console.error('Error loading project folders:', error);
  //           return of(
  //             ProjectFolderActions.loadProjectFoldersSuccess({ projectFolders: [] }),
  //           );
  //         }),
  //       ),
  //     ),
  //   ),
  // );
  //
  // addProjectFolder$ = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(ProjectFolderActions.addProjectFolder),
  //     tap(({ projectFolder }) => {
  //       this._pfapiService.m.projectFolder.load().then((currentState) => {
  //         const newState: import('../project-folder.model').ProjectFolderState = {
  //           ...currentState,
  //           entities: { ...currentState.entities, [projectFolder.id]: projectFolder },
  //           ids: [...currentState.ids, projectFolder.id] as string[],
  //         };
  //         return this._pfapiService.m.projectFolder.save(newState, {
  //           isUpdateRevAndLastUpdate: true,
  //         });
  //       });
  //     }),
  //     map(({ projectFolder }) =>
  //       ProjectFolderActions.addProjectFolderSuccess({
  //         projectFolder,
  //       }),
  //     ),
  //   ),
  // );
  //
  // updateProjectFolder$ = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(ProjectFolderActions.updateProjectFolder),
  //     tap(({ id, changes }) => {
  //       this._pfapiService.m.projectFolder.load().then((currentState) => {
  //         const existingFolder = currentState.entities[id];
  //         if (!existingFolder) return;
  //         const newState: import('../project-folder.model').ProjectFolderState = {
  //           ...currentState,
  //           entities: {
  //             ...currentState.entities,
  //             [id]: { ...existingFolder, ...changes },
  //           },
  //         };
  //         return this._pfapiService.m.projectFolder.save(newState, {
  //           isUpdateRevAndLastUpdate: true,
  //         });
  //       });
  //     }),
  //     map(({ id, changes }) =>
  //       ProjectFolderActions.updateProjectFolderSuccess({ update: { id, changes } }),
  //     ),
  //   ),
  // );
  //
  // deleteProjectFolder$ = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(ProjectFolderActions.deleteProjectFolder),
  //     tap(({ id }) => {
  //       this._pfapiService.m.projectFolder.load().then((currentState) => {
  //         const newEntities = { ...currentState.entities };
  //         delete newEntities[id];
  //         const newState: import('../project-folder.model').ProjectFolderState = {
  //           ...currentState,
  //           entities: newEntities,
  //           ids: currentState.ids.filter((existingId) => existingId !== id) as string[],
  //         };
  //         return this._pfapiService.m.projectFolder.save(newState, {
  //           isUpdateRevAndLastUpdate: true,
  //         });
  //       });
  //     }),
  //     map(({ id }) => ProjectFolderActions.deleteProjectFolderSuccess({ id })),
  //   ),
  // );
  //
  // toggleFolderExpansion$ = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(ProjectFolderActions.toggleFolderExpansion),
  //       tap(({ id }) => {
  //         this._pfapiService.m.projectFolder.load().then((currentState) => {
  //           const folder = currentState.entities[id];
  //           if (!folder) return;
  //           const newState: import('../project-folder.model').ProjectFolderState = {
  //             ...currentState,
  //             entities: {
  //               ...currentState.entities,
  //               [id]: { ...folder, isExpanded: !folder.isExpanded },
  //             },
  //           };
  //           return this._pfapiService.m.projectFolder.save(newState, {
  //             isUpdateRevAndLastUpdate: true,
  //           });
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );
}
