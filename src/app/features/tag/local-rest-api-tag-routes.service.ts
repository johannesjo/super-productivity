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
import { TODAY_TAG } from './tag.const';
import { Tag } from './tag.model';
import { TagService } from './tag.service';

interface UpdateTagFields {
  title?: string;
  icon?: string | null;
}

interface CreateTagFields extends UpdateTagFields {
  title: string;
}

const WRITABLE_KEYS: ReadonlySet<string> = new Set(['title', 'icon']);

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; response: LocalRestApiResponsePayload };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Local REST API write routes under `/tags`. `GET /tags` is served by the core
 * handler before feature routes run, so this only handles POST, PATCH and
 * DELETE.
 */
@Injectable()
export class LocalRestApiTagRoutesService implements LocalRestApiFeatureRoutes {
  private readonly _tagService = inject(TagService);

  async handle(
    request: LocalRestApiRequestPayload,
  ): Promise<LocalRestApiResponsePayload | undefined> {
    const { method, requestId, body } = request;
    const segments = request.path.split('/').filter(Boolean);
    if (segments[0] !== 'tags') {
      return undefined;
    }

    if (segments.length === 1 && method === 'POST') {
      return this._handleCreate(requestId, body);
    }

    if (segments.length === 2) {
      const tagId = segments[1];
      if (method === 'PATCH') {
        return this._handleUpdate(requestId, tagId, body);
      }
      if (method === 'DELETE') {
        return this._handleDelete(requestId, tagId);
      }
    }

    return undefined;
  }

  private async _handleCreate(
    requestId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<CreateTagFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    const { title, icon } = parsed.value;

    // Like the create-tag dialog: color and theme come from the defaults.
    const tagId = this._tagService.addTag({
      title,
      ...(icon !== undefined ? { icon } : {}),
    });

    return createSuccessResponse(requestId, 201, await this._getTag(tagId));
  }

  private async _handleUpdate(
    requestId: string,
    tagId: string,
    body: unknown,
  ): Promise<LocalRestApiResponsePayload> {
    // The work-context menu offers no rename for Today either.
    if (tagId === TODAY_TAG.id) {
      return this._todayTagRefused(requestId, 'modified');
    }

    const parsed = this._parseBody(requestId, body, (b) =>
      typia.validate<UpdateTagFields>(b),
    );
    if (!parsed.ok) {
      return parsed.response;
    }

    const tag = await this._getTag(tagId);
    if (!tag) {
      return this._tagNotFound(requestId);
    }

    if (Object.keys(parsed.value).length > 0) {
      this._tagService.updateTag(tagId, parsed.value);
    }

    return createSuccessResponse(requestId, 200, await this._getTag(tagId));
  }

  private async _handleDelete(
    requestId: string,
    tagId: string,
  ): Promise<LocalRestApiResponsePayload> {
    // Only Today is protected: the work-context menu offers "Delete tag" for
    // every other tag, the board tags (urgent, important, in-progress)
    // included, and a board recreates those on demand.
    if (tagId === TODAY_TAG.id) {
      return this._todayTagRefused(requestId, 'deleted');
    }

    const tag = await this._getTag(tagId);
    if (!tag) {
      return this._tagNotFound(requestId);
    }

    // Also removes the tag from all tasks, active and archived, as the UI's
    // "Delete tag" does.
    this._tagService.deleteTag(tagId);

    return createSuccessResponse(requestId, 200, { deleted: true, id: tagId });
  }

  /**
   * Rejects a non-object body and keys other than title and icon, then
   * type-checks the rest. A title, where given, is trimmed and must not end up
   * empty.
   */
  private _parseBody<T extends UpdateTagFields>(
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
          'One or more tag fields have an invalid type',
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
   * By id equality over the list: the entity map lookup throws for unknown
   * ids and resolves ids like `__proto__` to prototype members.
   */
  private async _getTag(tagId: string): Promise<Tag | undefined> {
    const tags = await firstValueFrom(this._tagService.tags$);
    return tags.find((tag) => tag.id === tagId);
  }

  private _todayTagRefused(
    requestId: string,
    verb: 'modified' | 'deleted',
  ): LocalRestApiResponsePayload {
    return createErrorResponse(
      requestId,
      400,
      'UNSUPPORTED_FIELD',
      `The Today tag is virtual and cannot be ${verb}`,
    );
  }

  private _tagNotFound(requestId: string): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 404, 'TAG_NOT_FOUND', 'Tag not found');
  }

  private _invalid(
    requestId: string,
    message: string,
    details?: unknown,
  ): LocalRestApiResponsePayload {
    return createErrorResponse(requestId, 400, 'INVALID_INPUT', message, details);
  }
}
