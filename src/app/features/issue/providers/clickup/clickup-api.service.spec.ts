import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ClickUpApiService } from './clickup-api.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { ClickUpCfg } from './clickup.model';
import { ClickUpTask } from './clickup-issue.model';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';

describe('ClickUpApiService', () => {
  let service: ClickUpApiService;
  let httpMock: HttpTestingController;
  let snackServiceMock: Partial<SnackService>;

  const mockCfg: ClickUpCfg = {
    apiKey: 'TEST_API_KEY',
    isEnabled: true,
  };

  beforeEach(() => {
    snackServiceMock = {
      open: jasmine.createSpy('open'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ClickUpApiService,
        { provide: SnackService, useValue: snackServiceMock },
      ],
    });

    service = TestBed.inject(ClickUpApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getById$', () => {
    it('should fetch a task by ID', () => {
      const mockTask: ClickUpTask = {
        id: 'TASK_ID',
        name: 'Task Name',
      } as Partial<ClickUpTask> as ClickUpTask;

      service.getById$('TASK_ID', mockCfg).subscribe((task) => {
        expect(task).toEqual(mockTask);
      });

      const req = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/task/TASK_ID`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('include_markdown_description')).toBe('true');
      expect(req.request.params.get('include_subtasks')).toBe('true');
      expect(req.request.headers.get('Authorization')).toBe(mockCfg.apiKey!);
      req.flush(mockTask);
    });
  });

  describe('getAuthorizedTeams$', () => {
    it('should fetch and map authorized teams', () => {
      const mockResponse = {
        teams: [
          { id: '1', name: 'Team 1', members: [] },
          { id: '2', name: 'Team 2', members: [] },
        ],
      };

      const expectedTeams = [
        { id: '1', name: 'Team 1' },
        { id: '2', name: 'Team 2' },
      ];

      service.getAuthorizedTeams$(mockCfg).subscribe((teams) => {
        expect(teams).toEqual(expectedTeams);
      });

      const req = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(mockCfg.apiKey!);
      req.flush(mockResponse);
    });
  });

  describe('getCurrentUser$', () => {
    it('should fetch current user', () => {
      const mockUser = {
        user: {
          id: 123,
          username: 'Test User',
          email: 'test@example.com',
        },
      };

      service.getCurrentUser$(mockCfg).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/user`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(mockCfg.apiKey!);
      req.flush(mockUser);
    });
  });

  describe('searchTasks$', () => {
    const mockTasksResponse = {
      tasks: [
        {
          id: '1',
          name: 'Task 1',
          custom_id: 'C1',
          status: { status: 'open', type: 'open', color: '#000' },
          date_updated: '123',
          url: 'url1',
        },
        {
          id: '2',
          name: 'Task 2',
          custom_id: undefined,
          status: { status: 'closed', type: 'closed', color: '#fff' },
          date_updated: '124',
          url: 'url2',
        },
      ],
    };

    it('should search tasks in specific teams when teamIds are provided', () => {
      const cfgWithTeams: ClickUpCfg = { ...mockCfg, teamIds: ['T1', 'T2'] };
      const expectedTasks = [
        {
          id: '1',
          name: 'Task 1',
          custom_id: 'C1',
          status: { status: 'open', type: 'open', color: '#000' },
          date_updated: '123',
          url: 'url1',
        },
        {
          id: '2',
          name: 'Task 2',
          custom_id: undefined,
          status: { status: 'closed', type: 'closed', color: '#fff' },
          date_updated: '124',
          url: 'url2',
        },
      ];

      service.searchTasks$('Task', cfgWithTeams).subscribe((tasks) => {
        // We expect flattened results from 2 teams, each returning same mock data for this test
        expect(tasks.length).toBe(4);
        expect(tasks[0]).toEqual(expectedTasks[0]);
      });

      const req1 = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team/T1/task`,
      );
      expect(req1.request.method).toBe('GET');
      expect(req1.request.params.get('page')).toBe('0');
      expect(req1.request.params.get('subtasks')).toBe('true');
      req1.flush(mockTasksResponse);

      const req2 = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team/T2/task`,
      );
      expect(req2.request.method).toBe('GET');
      expect(req2.request.params.get('page')).toBe('0');
      expect(req2.request.params.get('subtasks')).toBe('true');
      req2.flush(mockTasksResponse);
    });

    it('should fetch authorized teams and then search in all of them when teamIds are NOT provided', () => {
      const cfgNoTeams: ClickUpCfg = { ...mockCfg, teamIds: [] };
      const teamResponse = {
        teams: [{ id: 'T1', name: 'Team 1' }],
      };

      service.searchTasks$('Task', cfgNoTeams).subscribe((tasks) => {
        expect(tasks.length).toBe(2);
      });

      // 1. Fetch teams
      const reqTeams = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team`,
      );
      expect(reqTeams.request.method).toBe('GET');
      reqTeams.flush(teamResponse);

      // 2. Search in T1
      const reqSearch = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team/T1/task`,
      );
      expect(reqSearch.request.method).toBe('GET');
      expect(reqSearch.request.params.get('page')).toBe('0');
      expect(reqSearch.request.params.get('subtasks')).toBe('true');
      reqSearch.flush(mockTasksResponse);
    });

    it('should return empty array if no authorized teams found', () => {
      const cfgNoTeams: ClickUpCfg = { ...mockCfg, teamIds: [] };
      const teamResponse = { teams: [] };

      service.searchTasks$('Task', cfgNoTeams).subscribe((tasks) => {
        expect(tasks).toEqual([]);
      });

      const reqTeams = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team`,
      );
      reqTeams.flush(teamResponse);
    });

    it('should filter tasks by search term locally', () => {
      const cfgWithTeams: ClickUpCfg = { ...mockCfg, teamIds: ['T1'] };

      service.searchTasks$('Task 1', cfgWithTeams).subscribe((tasks) => {
        expect(tasks.length).toBe(1);
        expect(tasks[0].name).toBe('Task 1');
      });

      const req = httpMock.expectOne(
        (request) => request.url === `${CLICKUP_API_URL}/team/T1/task`,
      );
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('subtasks')).toBe('true');
      req.flush(mockTasksResponse);
    });

    it('should handle error in one of the team searches gracefully', () => {
      const cfgWithTeams: ClickUpCfg = { ...mockCfg, teamIds: ['T1', 'T2'] };

      service.searchTasks$('Task', cfgWithTeams).subscribe((tasks) => {
        // T1 failed, T2 succeeded with 2 tasks
        expect(tasks.length).toBe(2);
      });

      const req1 = httpMock.expectOne(
        `${CLICKUP_API_URL}/team/T1/task?page=0&subtasks=true`,
      );
      req1.flush(null, { status: 500, statusText: 'Server Error' });

      const req2 = httpMock.expectOne(
        `${CLICKUP_API_URL}/team/T2/task?page=0&subtasks=true`,
      );
      req2.flush(mockTasksResponse);
    });
  });
});
