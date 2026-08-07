import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';
import { UserProfileStorageService } from './user-profile-storage.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { BackupService } from '../../op-log/backup/backup.service';
import { SnackService } from '../../core/snack/snack.service';
import { ProfileMetadata, UserProfile } from './user-profile.model';
import { LocalDraftService } from '../../core/draft/local-draft.service';
import { T } from '../../t.const';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let storage: jasmine.SpyObj<UserProfileStorageService>;
  let localDraft: jasmine.SpyObj<LocalDraftService>;
  let snack: jasmine.SpyObj<SnackService>;

  const profileA: UserProfile = {
    id: 'profile-a',
    name: 'A',
    createdAt: 0,
    lastUsedAt: 0,
  };
  const profileB: UserProfile = {
    id: 'profile-b',
    name: 'B',
    createdAt: 0,
    lastUsedAt: 0,
  };
  const metadata: ProfileMetadata = {
    activeProfileId: 'profile-a',
    profiles: [profileA, profileB],
    version: 1,
  };

  beforeEach(() => {
    storage = jasmine.createSpyObj('UserProfileStorageService', [
      'loadProfileMetadata',
      'saveProfileMetadata',
      'deleteProfileData',
    ]);
    storage.loadProfileMetadata.and.resolveTo(metadata);
    storage.deleteProfileData.and.resolveTo(undefined);
    storage.saveProfileMetadata.and.resolveTo(undefined);

    const providerManager = { getActiveProvider: () => null };
    snack = jasmine.createSpyObj('SnackService', ['open']);
    localDraft = jasmine.createSpyObj('LocalDraftService', ['deleteDraftsForProfile']);

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: UserProfileStorageService, useValue: storage },
        { provide: SyncProviderManager, useValue: providerManager },
        {
          provide: BackupService,
          useValue: jasmine.createSpyObj('BackupService', ['importCompleteBackup']),
        },
        { provide: SnackService, useValue: snack },
        { provide: LocalDraftService, useValue: localDraft },
      ],
    });
    service = TestBed.inject(UserProfileService);
    (service as any)._metadata.set(metadata);
    service.profiles.set(metadata.profiles);
    service.activeProfile.set(profileA);
  });

  it('keeps the next-release profile removal warning visible until dismissed', async () => {
    await service.initialize();

    expect(snack.open).toHaveBeenCalledWith({
      msg: T.USER_PROFILES.REMOVAL_WARNING,
      type: 'WARNING',
      config: { duration: 0 },
    });
  });

  it('deletes the profiles device-local drafts along with its data', async () => {
    // Drafts hold full note content and are never synced, so nothing else
    // reclaims them: without this call a deleted profile's notes would linger
    // on the device.
    await service.deleteProfile('profile-b');

    expect(storage.deleteProfileData).toHaveBeenCalledWith('profile-b');
    expect(localDraft.deleteDraftsForProfile).toHaveBeenCalledWith('profile-b');
  });

  it('does not touch drafts when the deletion is rejected', async () => {
    // profile-a is active, so this is refused before anything is removed.
    // Deleting drafts here would destroy the live profile's unsaved text.
    await expectAsync(service.deleteProfile('profile-a')).toBeRejected();

    expect(localDraft.deleteDraftsForProfile).not.toHaveBeenCalled();
  });
});
