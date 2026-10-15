import { Injectable, inject } from '@angular/core';
import { nanoid } from 'nanoid';
import { firstValueFrom } from 'rxjs';
import typia, { IValidation } from 'typia';
import {
  LocalRestApiRequestPayload,
  LocalRestApiResponsePayload,
} from '../../../../electron/shared-with-frontend/local-rest-api.model';
import { LocalRestApiFeatureRoutes } from '../../core/electron/local-rest-api-feature-routes';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../core/electron/local-rest-api-response';
import { ProjectService } from '../project/project.service';
import { Note } from './note.model';
import { NoteService } from './note.service';

interface CreateNoteFields {
  content: string;
  projectId?: string | null;
  isPinnedToToday?: boolean;
}

/**
 * A note changes project only to another project, as with "Move to project"
 * in the note menu, so `projectId` cannot be cleared here.
 */
interface UpdateNoteFields {
  content?: string;
  projectId?: string;
  isPinnedToToday?: boolean;
}

/** Only these fields may be set on a note through the REST API. */
const WRITABLE_KEYS: ReadonlySet<string> = new Set([
  'content',
  'projectId',
  'isPinnedToToday',
]);

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; response: LocalRestApiResponsePayload };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getQueryParam = (
  query: Record<string, string | string[]>,
  key: string,
): string | undefined => {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
};

/** Local REST API routes under `/notes`. */
@Injectable()
export class LocalRestApiNoteRoutesService implements LocalRestApiFeatureRoutes {
  private readonly _noteService = inject(NoteService);
  private readonly _projectService = inject(ProjectService);

  async handle(
    request: LocalRestApiRequestPayload,
  ): Promise<LocalRestApiResponsePayload | undefined> {
    const { method, requestId, query, body } = request;
    const segments = request.path.split('/').filter(Boolean);
    if (segments[0] !== 'notes') {
      return undefined;
    }

    if (segments.length === 1) {
      if (method === 'GET') {
        return this._handleList(requestId, query);
      }
      if (method === 'POST') {
        return this._handleCreate(requestId, body);
      }
      return undefined;
    }

    if (segments.length === 2) {
      const noteId = segments[1];
      if (method === 'GET') {
        return this._handleGet(requestId, noteId);
      }
      if (method === 'PATCH') {
        return this._handleUpdate(requestId, noteId, body);
      }
      if (method === 'DELETE') {
        return this._handleDelete(requestId, noteId);
      }
    }

    return undefined;
  }

  private async _handleList(
    requestId: string,
    query: Record<string, string | string[]>,
  ): Promise<LocalRestApiResponsePayload> {
    const projectId = getQueryParam(query, 'projectId');

    let notes = await firstValueFrom(this._noteService.notes$);

    if (projectId) {
      notes = notes.filter((note) => note.projectId === projectId);
    }

    return createSuccessResponse(requestId, 200, notes);
  }

  private async _handleGet(
    requestId: string,
    noteId: string,
  ): Promise<LocalRestApiResponsePayload> {
    const note = await this._getNote(noteId);
    if (!note) {
      return this._noteNotFound(requestId);
    }
    return createSuccessResponse(requestId, 200, note);
  }

  private async _handleCreate(
    requestId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<CreateNoteFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    const fields = parsed.value;

    if (!fields.content.trim()) {
      return this._invalid(requestId, 'content must be a non-empty string');
    }
    // Without either field the note goes where "Add note" puts it: into the
    // project in view, or pinned to Today. Set explicitly, the note must still
    // show up somewhere.
    if (
      ('projectId' in fields || 'isPinnedToToday' in fields) &&
      typeof fields.projectId !== 'string' &&
      fields.isPinnedToToday !== true
    ) {
      return this._invalid(
        requestId,
        'A note needs a projectId or isPinnedToToday: true',
      );
    }
    if (typeof fields.projectId === 'string' && !this._projectExists(fields.projectId)) {
      return this._projectNotFound(requestId);
    }

    const id = nanoid();
    this._noteService.add({ ...fields, id });

    return createSuccessResponse(requestId, 201, await this._getNote(id));
  }

  private async _handleUpdate(
    requestId: string,
    noteId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<UpdateNoteFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    const { projectId, ...rest } = parsed.value;

    const note = await this._getNote(noteId);
    if (!note) {
      return this._noteNotFound(requestId);
    }

    const isMove = projectId !== undefined && projectId !== note.projectId;
    if (isMove && !this._projectExists(projectId)) {
      return this._projectNotFound(requestId);
    }
    // The note menu offers unpinning only for notes in a project.
    const finalProjectId = isMove ? projectId : note.projectId;
    const finalIsPinned = rest.isPinnedToToday ?? note.isPinnedToToday;
    if (!finalProjectId && !finalIsPinned) {
      return this._invalid(
        requestId,
        'A note without a project must stay pinned to Today',
      );
    }

    if (isMove) {
      // Not a plain update: moving also moves the id between the projects'
      // note lists.
      this._noteService.moveToOtherProject(note, projectId);
    }
    const changes: Partial<Note> = {};
    if (rest.content !== undefined && rest.content !== note.content) {
      changes.content = rest.content;
    }
    if (
      rest.isPinnedToToday !== undefined &&
      rest.isPinnedToToday !== note.isPinnedToToday
    ) {
      changes.isPinnedToToday = rest.isPinnedToToday;
    }
    if (Object.keys(changes).length > 0) {
      this._noteService.update(noteId, changes);
    }

    return createSuccessResponse(requestId, 200, await this._getNote(noteId));
  }

  private async _handleDelete(
    requestId: string,
    noteId: string,
  ): Promise<LocalRestApiResponsePayload> {
    const note = await this._getNote(noteId);
    if (!note) {
      return this._noteNotFound(requestId);
    }

    this._noteService.remove(note);

    return createSuccessResponse(requestId, 200, { deleted: true, id: noteId });
  }

  private _parseBody<T>(
    requestId: string,
    body: unknown,
    validate: (body: Record<string, unknown>) => IValidation<T>,
  ): Result<T> {
    if (!isRecord(body)) {
      return {
        ok: false,
        response: this._invalid(requestId, 'Request body must be a JSON object'),
      };
    }

    const unsupported = Object.keys(body).filter((key) => !WRITABLE_KEYS.has(key));
    if (unsupported.length > 0) {
      return {
        ok: false,
        response: createErrorResponse(
          requestId,
          400,
          'UNSUPPORTED_FIELD',
          `Field(s) cannot be set through this endpoint: ${unsupported.join(', ')}`,
          { fields: unsupported },
        ),
      };
    }

    const validation = validate(body);
    if (!validation.success) {
      return {
        ok: false,
        response: this._invalid(
          requestId,
          'One or more note fields have an invalid type',
          validation.errors.map(({ path, expected }) => ({ path, expected })),
        ),
      };
    }
    return { ok: true, value: validation.data };
  }

  /**
   * By id equality over the list: `getByIdOnce$` throws for a missing id, and
   * entity map lookups would resolve ids like `__proto__` to prototype members.
   */
  private async _getNote(noteId: string): Promise<Note | undefined> {
    const notes = await firstValueFrom(this._noteService.notes$);
    return notes.find((note) => note.id === noteId);
  }

  /** Unarchived projects only, as for moving a task over the API. */
  private _projectExists(projectId: string): boolean {
    return this._projectService
      .list()
      .some((project) => project.id === projectId && !project.isArchived);
  }

  private _noteNotFound(requestId: string): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 404, 'NOTE_NOT_FOUND', 'Note not found');
  }

  private _projectNotFound(requestId: string): LocalRestApiResponsePayload {
    return createErrorResponse(
      requestId,
      404,
      'PROJECT_NOT_FOUND',
      'Project not found or archived',
    );
  }

  private _invalid(
    requestId: string,
    message: string,
    details?: unknown,
  ): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 400, 'INVALID_INPUT', message, details);
  }
}
