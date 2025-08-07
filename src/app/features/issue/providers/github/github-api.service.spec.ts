import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GithubApiService } from './github-api.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { GithubCfg } from './github.model';
import { GITHUB_API_BASE_URL } from './github.const';

describe('GithubApiService', () => {
  let service: GithubApiService;
  let httpMock: HttpTestingController;
  let snackService: jasmine.SpyObj<SnackService>;

  const mockCfg: GithubCfg = {
    isEnabled: true,
    repo: 'owner/repo',
    token: 'test-token',
    filterUsernameForIssueUpdates: undefined,
    backlogQuery: undefined,
  };

  beforeEach(() => {
    const snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GithubApiService, { provide: SnackService, useValue: snackServiceSpy }],
    });

    service = TestBed.inject(GithubApiService);
    httpMock = TestBed.inject(HttpTestingController);
    snackService = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('searchIssueForRepoNoMap$', () => {
    describe('URL encoding', () => {
      it('should properly encode simple search text', () => {
        const searchText = 'bug fix';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        expect(req.request.url).toContain('q=bug%20fix%2Brepo%3Aowner%2Frepo');
        req.flush({ items: [] });
      });

      it('should properly encode search with parentheses', () => {
        const searchText = 'state:open (author:@me OR assignee:@me)';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Parentheses should be encoded as %28 and %29
        expect(req.request.url).toContain('%28');
        expect(req.request.url).toContain('%29');
        expect(req.request.url).toContain('author%3A%40me');
        expect(req.request.url).toContain('assignee%3A%40me');
        req.flush({ items: [] });
      });

      it('should properly encode special characters', () => {
        const searchText = 'label:"bug fix" @mentions #123';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Check for proper encoding of various special characters
        expect(req.request.url).toContain('label%3A%22bug%20fix%22');
        expect(req.request.url).toContain('%40mentions');
        expect(req.request.url).toContain('%23123');
        req.flush({ items: [] });
      });

      it('should properly encode repo qualifier with forward slash', () => {
        const searchText = 'test';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Forward slash in repo name should be encoded as %2F
        expect(req.request.url).toContain('repo%3Aowner%2Frepo');
        req.flush({ items: [] });
      });

      it('should handle search without repo filter when isSearchAllGithub is true', () => {
        const searchText = 'javascript';
        service.searchIssueForRepoNoMap$(searchText, mockCfg, true).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Should not contain repo qualifier
        expect(req.request.url).not.toContain('repo%3A');
        expect(req.request.url).toContain('q=javascript');
        req.flush({ items: [] });
      });

      it('should properly encode complex GitHub search query from issue #4913', () => {
        const searchText = 'sort:updated state:open (author:@me OR assignee:@me)';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // All special characters should be properly encoded
        expect(req.request.url).toContain('sort%3Aupdated');
        expect(req.request.url).toContain('state%3Aopen');
        expect(req.request.url).toContain('%28'); // (
        expect(req.request.url).toContain('%29'); // )
        expect(req.request.url).toContain('%20OR%20');
        expect(req.request.url).toContain('%40me'); // @me
        req.flush({ items: [] });
      });

      it('should handle empty search text', () => {
        const searchText = '';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        expect(req.request.url).toContain('q=%2Brepo%3Aowner%2Frepo');
        req.flush({ items: [] });
      });

      it('should properly encode plus signs in search', () => {
        const searchText = 'C++ programming';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Plus signs should be encoded
        expect(req.request.url).toContain('C%2B%2B');
        req.flush({ items: [] });
      });

      it('should properly encode ampersands', () => {
        const searchText = 'R&D issues';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Ampersand should be encoded as %26
        expect(req.request.url).toContain('R%26D');
        req.flush({ items: [] });
      });

      it('should properly encode equals signs', () => {
        const searchText = 'variable=value';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Equals sign should be encoded as %3D
        expect(req.request.url).toContain('variable%3Dvalue');
        req.flush({ items: [] });
      });

      it('should properly encode question marks', () => {
        const searchText = 'what? why?';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Question mark should be encoded as %3F
        expect(req.request.url).toContain('what%3F');
        expect(req.request.url).toContain('why%3F');
        req.flush({ items: [] });
      });

      it('should properly encode brackets', () => {
        const searchText = 'array[index] object{key}';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Brackets should be encoded
        expect(req.request.url).toContain('%5B'); // [
        expect(req.request.url).toContain('%5D'); // ]
        expect(req.request.url).toContain('%7B'); // {
        expect(req.request.url).toContain('%7D'); // }
        req.flush({ items: [] });
      });

      it('should handle unicode characters', () => {
        const searchText = '日本語 emoji 😀';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // Unicode should be properly encoded
        expect(req.request.url).toContain('%E6%97%A5%E6%9C%AC%E8%AA%9E');
        expect(req.request.url).toContain('%F0%9F%98%80');
        req.flush({ items: [] });
      });

      it('should properly build query with plus separator between search and repo', () => {
        const searchText = 'test search';
        service.searchIssueForRepoNoMap$(searchText, mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        // The plus sign between search text and repo should be encoded as %2B
        const expectedQuery = 'q=test%20search%2Brepo%3Aowner%2Frepo';
        expect(req.request.url).toContain(expectedQuery);
        req.flush({ items: [] });
      });
    });

    describe('request headers', () => {
      it('should include authorization token when provided', () => {
        service.searchIssueForRepoNoMap$('test', mockCfg).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        expect(req.request.headers.get('Authorization')).toBe('token test-token');
        req.flush({ items: [] });
      });

      it('should not include authorization header when token is not provided', () => {
        const cfgWithoutToken = { ...mockCfg, token: null };
        service.searchIssueForRepoNoMap$('test', cfgWithoutToken).subscribe();

        const req = httpMock.expectOne((request) =>
          request.url.startsWith(`${GITHUB_API_BASE_URL}search/issues`),
        );

        expect(req.request.headers.has('Authorization')).toBeFalsy();
        req.flush({ items: [] });
      });
    });

    describe('error handling', () => {
      it('should handle missing repo configuration', () => {
        const invalidCfg = { ...mockCfg, repo: '' };

        expect(() => {
          service.searchIssueForRepoNoMap$('test', invalidCfg).subscribe();
        }).toThrowError('Github: Not enough settings');

        expect(snackService.open).toHaveBeenCalled();
      });
    });
  });
});
