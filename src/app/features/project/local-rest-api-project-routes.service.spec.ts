import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { LocalRestApiProjectRoutesService } from './local-rest-api-project-routes.service';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { INBOX_PROJECT } from './project.const';
import { createProject } from './project.test-helper';
import {
  LocalRestApiRequestPayload,
  LocalRestApiResponsePayload,
} from '../../../../electron/shared-with-frontend/local-rest-api.model';

describe('LocalRestApiProjectRoutesService', () => {
  let service: LocalRestApiProjectRoutesService;
  let projectServiceMock: jasmine.SpyObj<ProjectService>;
  let list$: BehaviorSubject<Project[]>;

  const request = (
    method: string,
    path: string,
    body?: unknown,
  ): LocalRestApiRequestPayload => ({
    requestId: 'test-request-id',
    method,
    path,
    query: {},
    body,
  });

  const handle = async (
    req: LocalRestApiRequestPayload,
  ): Promise<LocalRestApiResponsePayload> => {
    const response = await service.handle(req);
    if (!response) {
      throw new Error(`Route not handled: ${req.method} ${req.path}`);
    }
    return response;
  };

  const errorCode = (response: LocalRestApiResponsePayload): string | undefined =>
    response.body.ok ? undefined : response.body.error.code;

  const data = <T>(response: LocalRestApiResponsePayload): T => {
    if (!response.body.ok) {
      throw new Error(`Expected success, got ${response.body.error.code}`);
    }
    return response.body.data as T;
  };

  const expectNoWrite = (): void => {
    expect(projectServiceMock.add).not.toHaveBeenCalled();
    expect(projectServiceMock.update).not.toHaveBeenCalled();
    expect(projectServiceMock.remove).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    // The service's list$ only holds unarchived projects.
    list$ = new BehaviorSubject<Project[]>([
      { ...INBOX_PROJECT, taskIds: [] },
      createProject({ id: 'empty', title: 'Empty', icon: 'list_alt' }),
      createProject({ id: 'withNotes', title: 'With notes', noteIds: ['n1', 'n2'] }),
      createProject({ id: 'withTasks', title: 'With tasks', taskIds: ['t1'] }),
      createProject({
        id: 'withBacklog',
        title: 'With backlog',
        isEnableBacklog: true,
        backlogTaskIds: ['b1'],
      }),
    ]);

    projectServiceMock = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['add', 'update', 'remove'],
      { list$ },
    );
    projectServiceMock.add.and.callFake((project: Partial<Project>) => {
      const id = 'new-project';
      list$.next([...list$.value, createProject({ ...project, id })]);
      return id;
    });
    projectServiceMock.update.and.callFake(
      (id: string, changes: Partial<Project>): void => {
        list$.next(list$.value.map((p) => (p.id === id ? { ...p, ...changes } : p)));
      },
    );
    projectServiceMock.remove.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        LocalRestApiProjectRoutesService,
        { provide: ProjectService, useValue: projectServiceMock },
      ],
    });
    service = TestBed.inject(LocalRestApiProjectRoutesService);
  });

  describe('unowned requests', () => {
    it('leaves other paths and methods to the rest of the handler', async () => {
      const unowned = [
        request('GET', '/projects'),
        request('GET', '/projects/empty'),
        request('PUT', '/projects/empty', { title: 'x' }),
        request('POST', '/projects/empty', { title: 'x' }),
        request('PATCH', '/projects', { title: 'x' }),
        request('DELETE', '/projects'),
        request('DELETE', '/projects/empty/extra'),
        request('POST', '/tags', { title: 'x' }),
        request('POST', '/projectsx', { title: 'x' }),
      ];
      for (const req of unowned) {
        expect(await service.handle(req))
          .withContext(`${req.method} ${req.path}`)
          .toBeUndefined();
      }
      expectNoWrite();
    });
  });

  describe('POST /projects', () => {
    it('creates a project with a trimmed title and returns it with 201', async () => {
      const response = await handle(
        request('POST', '/projects', { title: ' Garden  ', icon: 'yard' }),
      );

      expect(response.status).toBe(201);
      expect(projectServiceMock.add).toHaveBeenCalledOnceWith({
        title: 'Garden',
        icon: 'yard',
      });
      const project = data<Project>(response);
      expect(project.id).toBe('new-project');
      expect(project.title).toBe('Garden');
      expect(project.icon).toBe('yard');
    });

    it('leaves the icon to the default when not given', async () => {
      await handle(request('POST', '/projects', { title: 'Plain' }));

      expect(projectServiceMock.add).toHaveBeenCalledOnceWith({ title: 'Plain' });
    });

    it('requires a non-blank title', async () => {
      for (const body of [{}, { icon: 'yard' }, { title: '' }, { title: ' \n ' }]) {
        const response = await handle(request('POST', '/projects', body));
        expect(response.status).withContext(JSON.stringify(body)).toBe(400);
        expect(errorCode(response)).toBe('INVALID_INPUT');
      }
      expectNoWrite();
    });

    it('rejects wrong value types', async () => {
      for (const body of [{ title: ['x'] }, { title: 'X', icon: {} }]) {
        const response = await handle(request('POST', '/projects', body));
        expect(response.status).withContext(JSON.stringify(body)).toBe(400);
        expect(errorCode(response)).toBe('INVALID_INPUT');
      }
      expectNoWrite();
    });

    it('rejects a body that is not an object', async () => {
      for (const body of [undefined, null, 'Garden', [{ title: 'Garden' }], true]) {
        const response = await handle(request('POST', '/projects', body));
        expect(response.status).withContext(String(body)).toBe(400);
        expect(errorCode(response)).toBe('INVALID_INPUT');
      }
      expectNoWrite();
    });

    it('rejects fields other than title and icon', async () => {
      const response = await handle(
        request('POST', '/projects', { title: 'X', taskIds: ['t1'], isArchived: true }),
      );

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('UNSUPPORTED_FIELD');
      expect(response.body.ok ? undefined : response.body.error.details).toEqual({
        fields: ['taskIds', 'isArchived'],
      });
      expectNoWrite();
    });
  });

  describe('PATCH /projects/:id', () => {
    it('updates title and icon and returns the project', async () => {
      const response = await handle(
        request('PATCH', '/projects/empty', { title: ' Renamed ', icon: 'star' }),
      );

      expect(response.status).toBe(200);
      expect(projectServiceMock.update).toHaveBeenCalledOnceWith('empty', {
        title: 'Renamed',
        icon: 'star',
      });
      const project = data<Project>(response);
      expect(project.title).toBe('Renamed');
      expect(project.icon).toBe('star');
    });

    it('accepts a null icon', async () => {
      await handle(request('PATCH', '/projects/empty', { icon: null }));

      expect(projectServiceMock.update).toHaveBeenCalledOnceWith('empty', { icon: null });
    });

    it('returns the unchanged project for an empty body without writing', async () => {
      const response = await handle(request('PATCH', '/projects/empty', {}));

      expect(response.status).toBe(200);
      expect(data<Project>(response).id).toBe('empty');
      expectNoWrite();
    });

    it('returns 404 for an unknown or archived project', async () => {
      const response = await handle(request('PATCH', '/projects/nope', { title: 'X' }));

      expect(response.status).toBe(404);
      expect(errorCode(response)).toBe('PROJECT_NOT_FOUND');
      expectNoWrite();
    });

    it('returns 404 for prototype property names', async () => {
      for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
        const response = await handle(request('PATCH', `/projects/${id}`, { icon: 'x' }));
        expect(response.status).withContext(id).toBe(404);
        expect(errorCode(response)).toBe('PROJECT_NOT_FOUND');
      }
      expectNoWrite();
    });

    it('rejects a blank title', async () => {
      const response = await handle(request('PATCH', '/projects/empty', { title: ' ' }));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('INVALID_INPUT');
      expectNoWrite();
    });

    it('rejects wrong value types', async () => {
      const response = await handle(request('PATCH', '/projects/empty', { title: 1 }));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('INVALID_INPUT');
      expectNoWrite();
    });

    it('rejects a body that is not an object', async () => {
      const response = await handle(request('PATCH', '/projects/empty', 'Renamed'));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('INVALID_INPUT');
      expectNoWrite();
    });

    it('rejects fields other than title and icon', async () => {
      const response = await handle(
        request('PATCH', '/projects/empty', { title: 'X', isHiddenFromMenu: true }),
      );

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('UNSUPPORTED_FIELD');
      expectNoWrite();
    });
  });

  describe('DELETE /projects/:id', () => {
    it('deletes an empty project', async () => {
      const response = await handle(request('DELETE', '/projects/empty'));

      expect(response.status).toBe(200);
      expect(data(response)).toEqual({ deleted: true, id: 'empty' });
      expect(projectServiceMock.remove).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ id: 'empty' }),
      );
    });

    it('deletes a project with notes but no tasks, notes included', async () => {
      const response = await handle(request('DELETE', '/projects/withNotes'));

      expect(response.status).toBe(200);
      // remove() takes the notes with it, as the app's "Delete project" does.
      expect(projectServiceMock.remove).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ id: 'withNotes', noteIds: ['n1', 'n2'] }),
      );
    });

    it('refuses a project with tasks', async () => {
      const response = await handle(request('DELETE', '/projects/withTasks'));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('PROJECT_NOT_EMPTY');
      expect(response.body.ok ? undefined : response.body.error.details).toEqual({
        taskCount: 1,
        backlogTaskCount: 0,
      });
      expectNoWrite();
    });

    it('refuses a project with only backlog tasks', async () => {
      const response = await handle(request('DELETE', '/projects/withBacklog'));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('PROJECT_NOT_EMPTY');
      expect(response.body.ok ? undefined : response.body.error.details).toEqual({
        taskCount: 0,
        backlogTaskCount: 1,
      });
      expectNoWrite();
    });

    it('refuses the Inbox project, even when empty', async () => {
      const response = await handle(request('DELETE', `/projects/${INBOX_PROJECT.id}`));

      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe('UNSUPPORTED_FIELD');
      expectNoWrite();
    });

    it('returns 404 for an unknown or archived project', async () => {
      const response = await handle(request('DELETE', '/projects/nope'));

      expect(response.status).toBe(404);
      expect(errorCode(response)).toBe('PROJECT_NOT_FOUND');
      expectNoWrite();
    });

    it('returns 404 for prototype property names', async () => {
      for (const id of ['__proto__', 'constructor', 'valueOf']) {
        const response = await handle(request('DELETE', `/projects/${id}`));
        expect(response.status).withContext(id).toBe(404);
        expect(errorCode(response)).toBe('PROJECT_NOT_FOUND');
      }
      expectNoWrite();
    });
  });
});
