import { TestBed } from '@angular/core/testing';
import { UserProfileStorageService } from './user-profile-storage.service';
import { OperationLogStoreService } from '../../op-log/persistence/operation-log-store.service';
import { ProfileMetadata } from './user-profile.model';

/**
 * The sync metadata loader is the seam LocalDraftService keys its drafts on
 * when profiles are disabled; everywhere else it is only ever hand-mocked, so
 * this spec pins the real localStorage contract.
 */
describe('UserProfileStorageService profile metadata', () => {
  let service: UserProfileStorageService;

  const METADATA: ProfileMetadata = {
    activeProfileId: 'p-persisted',
    profiles: [{ id: 'p-persisted', name: 'Persisted', createdAt: 1, lastUsedAt: 2 }],
    version: 1,
  };

  beforeEach(() => {
    localStorage.removeItem('sp_profile_meta');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OperationLogStoreService,
          useValue: jasmine.createSpyObj('OperationLogStoreService', [
            'loadProfileData',
            'saveProfileData',
            'deleteProfileData',
          ]),
        },
      ],
    });
    service = TestBed.inject(UserProfileStorageService);
  });

  afterEach(() => {
    localStorage.removeItem('sp_profile_meta');
  });

  it('loadProfileMetadataSync round-trips what saveProfileMetadata persisted', async () => {
    await service.saveProfileMetadata(METADATA);

    // Pin the storage location too: a renamed key would silently re-scope
    // every existing draft to the default profile.
    expect(localStorage.getItem('sp_profile_meta')).not.toBeNull();
    expect(service.loadProfileMetadataSync()).toEqual(METADATA);
  });

  it('returns null when nothing is stored', () => {
    expect(service.loadProfileMetadataSync()).toBeNull();
  });

  it('returns null instead of throwing for a corrupt stored value', () => {
    localStorage.setItem('sp_profile_meta', '{ not json');

    expect(service.loadProfileMetadataSync()).toBeNull();
  });

  it('the async variant returns the same result as the sync one', async () => {
    await service.saveProfileMetadata(METADATA);

    expect(await service.loadProfileMetadata()).toEqual(
      service.loadProfileMetadataSync(),
    );
  });
});
