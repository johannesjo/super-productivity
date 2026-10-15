import { Injectable, inject } from '@angular/core';
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
import { INBOX_PROJECT } from './project.const';
import { Project } from './project.model';
import { ProjectService } from './project.service';

interface UpdateProjectFields {
  title?: string;
  icon?: string | null;
}

interface CreateProjectFields extends UpdateProjectFields {
  title: string;
}

const WRITABLE_KEYS: ReadonlySet<string> = new Set(['title', 'icon']);

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; response: LocalRestApiResponsePayload };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Local REST API write routes under `/projects`. `GET /projects` is served by
 * the core handler before feature routes run, so this only handles POST,
 * PATCH and DELETE. Like `GET /projects`, it only sees unarchived projects.
 */
@Injectable()
export class LocalRestApiProjectRoutesService implements LocalRestApiFeatureRoutes {
  private readonly _projectService = inject(ProjectService);

  async handle(
    request: LocalRestApiRequestPayload,
  ): Promise<LocalRestApiResponsePayload | undefined> {
    const { method, requestId, body } = request;
    const segments = request.path.split('/').filter(Boolean);
    if (segments[0] !== 'projects') {
      return undefined;
    }

    if (segments.length === 1 && method === 'POST') {
      return this._handleCreate(requestId, body);
    }

    if (segments.length === 2) {
      const projectId = segments[1];
      if (method === 'PATCH') {
        return this._handleUpdate(requestId, projectId, body);
      }
      if (method === 'DELETE') {
        return this._handleDelete(requestId, projectId);
      }
    }

    return undefined;
  }

  private async _handleCreate(
    requestId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<CreateProjectFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    const { title, icon } = parsed.value;

    const projectId = this._projectService.add({
      title,
      ...(icon !== undefined ? { icon } : {}),
    });

    return createSuccessResponse(requestId, 201, await this._getProject(projectId));
  }

  private async _handleUpdate(
    requestId: string,
    projectId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<UpdateProjectFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }

    const project = await this._getProject(projectId);
    if (!project) {
      return this._projectNotFound(requestId);
    }

    if (Object.keys(parsed.value).length > 0) {
      this._projectService.update(projectId, parsed.value);
    }

    return createSuccessResponse(requestId, 200, await this._getProject(projectId));
  }

  /**
   * Refuses a project that still has tasks rather than cascading onto them:
   * the app's "Delete project" deletes its tasks, backlog and subtasks, and a
   * REST caller cannot see what that would take with it. What does go with
   * the project is what the app's delete removes too: its notes, sections,
   * archived tasks and time-tracking data.
   */
  private async _handleDelete(
    requestId: string,
    projectId: string,
  ): Promise<LocalRestApiResponsePayload> {
    // The fallback target for tasks that belong nowhere; the UI does not
    // offer deleting it either.
    if (projectId === INBOX_PROJECT.id) {
      return createErrorResponse(
        requestId,
        400,
        'UNSUPPORTED_FIELD',
        'The Inbox project cannot be deleted',
      );
    }

    const project = await this._getProject(projectId);
    if (!project) {
      return this._projectNotFound(requestId);
    }

    if (project.taskIds.length > 0 || project.backlogTaskIds.length > 0) {
      return createErrorResponse(
        requestId,
        400,
        'PROJECT_NOT_EMPTY',
        'Project has tasks; move or delete them first, then delete the project',
        {
          taskCount: project.taskIds.length,
          backlogTaskCount: project.backlogTaskIds.length,
        },
      );
    }

    await this._projectService.remove(project);

    return createSuccessResponse(requestId, 200, { deleted: true, id: projectId });
  }

  /**
   * Rejects a non-object body and keys other than title and icon, then
   * type-checks the rest. A title, where given, is trimmed and must not end up
   * empty.
   */
  private _parseBody<T extends UpdateProjectFields>(
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
          'One or more project fields have an invalid type',
          validation.errors.map(({ path, expected }) => ({ path, expected })),
        ),
      };
    }

    const fields = validation.data;
    if (fields.title === undefined) {
      return { ok: true, value: fields };
    }
    const title = fields.title.trim();
    if (!title) {
      return {
        ok: false,
        response: this._invalid(requestId, 'title must be a non-empty string'),
      };
    }
    return { ok: true, value: { ...fields, title } };
  }

  /**
   * By id equality over the unarchived list: the entity map lookup would
   * resolve ids like `__proto__` to prototype members.
   */
  private async _getProject(projectId: string): Promise<Project | undefined> {
    const projects = await firstValueFrom(this._projectService.list$);
    return projects.find((project) => project.id === projectId);
  }

  private _projectNotFound(requestId: string): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  private _invalid(
    requestId: string,
    message: string,
    details?: unknown,
  ): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 400, 'INVALID_INPUT', message, details);
  }
}
