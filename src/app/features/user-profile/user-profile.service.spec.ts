import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';
import { UserProfileStorageService } from './user-profile-storage.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { BackupService } from '../../op-log/backup/backup.service';
import { SnackService } from '../../core/snack/snack.service';
import { ProfileMetadata, UserProfile } from './user-profile.model';
import { LocalDraftService } from '../../core/draft/local-draft.service';

describe('UserProfileService switchProfile rollback (#8982)', () => {
  let service: UserProfileService;
  let storage: jasmine.SpyObj<UserProfileStorageService>;
  let backup: jasmine.SpyObj<BackupService>;
  let localDraft: jasmine.SpyObj<LocalDraftService>;

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
      'saveProfileData',
      'loadProfileData',
      'saveProfileMetadata',
      'deleteProfileData',
    ]);
    storage.deleteProfileData.and.resolveTo(undefined);
    storage.saveProfileData.and.resolveTo(undefined);
    storage.saveProfileMetadata.and.resolveTo(undefined);
    // Target profile has existing data, so switchProfile takes the import branch.
    storage.loadProfileData.and.resolveTo({ data: {} } as any);

    backup = jasmine.createSpyObj('BackupService', [
      'loadCompleteBackup',
      'importCompleteBackup',
    ]);
    backup.loadCompleteBackup.and.resolveTo({ data: {} } as any);
    // The target-dataset import fails AFTER the optimistic identity switch (steps
    // 4-5 already persisted/signalled B). This is the failure that used to leave
    // A's data live while identity pointed at B (#8982 review).
    backup.importCompleteBackup.and.rejectWith(new Error('import failed'));

    const providerManager = { getActiveProvider: () => null };
    const snack = jasmine.createSpyObj('SnackService', ['open']);
    localDraft = jasmine.createSpyObj('LocalDraftService', ['deleteDraftsForProfile']);
    localDraft.deleteDraftsForProfile.and.resolveTo(undefined);

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: UserProfileStorageService, useValue: storage },
        { provide: SyncProviderManager, useValue: providerManager },
        { provide: BackupService, useValue: backup },
        { provide: SnackService, useValue: snack },
        { provide: LocalDraftService, useValue: localDraft },
      ],
    });
    service = TestBed.inject(UserProfileService);
    (service as any)._metadata.set(metadata);
    service.profiles.set(metadata.profiles);
    service.activeProfile.set(profileA);
  });

  it('rolls the active profile identity back to A when the target import fails', async () => {
    await expectAsync(service.switchProfile('profile-b')).toBeRejected();

    // Without the rollback, activeProfile() stays B while A's data is still live,
    // so LocalDraftService (which keys off activeProfile()) would store A's edits
    // under B's namespace, hiding A's recovery copy.
    expect(service.activeProfile()?.id).toBe('profile-a');
  });

  it('re-persists profile A metadata after a failed switch', async () => {
    await expectAsync(service.switchProfile('profile-b')).toBeRejected();

    // Step 4 persisted B's metadata before the failed import; the catch must
    // restore A as the committed on-disk identity.
    expect(storage.saveProfileMetadata).toHaveBeenCalledWith(
      jasmine.objectContaining({ activeProfileId: 'profile-a' }),
    );
  });

  describe('deleteProfile', () => {
    it('deletes the profiles device-local drafts along with its data', async () => {
      // Drafts hold full note content and are never synced, so nothing else
      // reclaims them: without this call a deleted profile's notes would linger
      // on the device. This is a privacy claim and it had no test at all
      // (#8982 review).
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
});
