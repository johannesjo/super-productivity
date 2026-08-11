import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';
import { UserProfileStorageService } from './user-profile-storage.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { BackupService } from '../../op-log/backup/backup.service';
import { SnackService } from '../../core/snack/snack.service';
import { ProfileMetadata, UserProfile } from './user-profile.model';
import { LocalDraftService } from '../../core/draft/local-draft.service';
import { T } from '../../t.const';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { MatDialog } from '@angular/material/dialog';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let storage: jasmine.SpyObj<UserProfileStorageService>;
  let localDraft: jasmine.SpyObj<LocalDraftService>;
  let backup: jasmine.SpyObj<BackupService>;
  let bannerService: BannerService;

  const STORED_SNAPSHOT = { timestamp: 1, data: { task: { ids: ['stale'] } } };
  const LIVE_DATA = { timestamp: 2, data: { task: { ids: ['live'] } } };

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
      'loadProfileData',
    ]);
    storage.loadProfileMetadata.and.resolveTo(metadata);
    storage.deleteProfileData.and.resolveTo(undefined);
    storage.saveProfileMetadata.and.resolveTo(undefined);
    storage.loadProfileData.and.resolveTo(STORED_SNAPSHOT as any);

    const providerManager = { getActiveProvider: () => null };
    const snack = jasmine.createSpyObj('SnackService', ['open']);
    localDraft = jasmine.createSpyObj('LocalDraftService', ['deleteDraftsForProfile']);
    backup = jasmine.createSpyObj('BackupService', [
      'importCompleteBackup',
      'loadCompleteBackup',
    ]);
    backup.loadCompleteBackup.and.resolveTo(LIVE_DATA as any);

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: UserProfileStorageService, useValue: storage },
        { provide: SyncProviderManager, useValue: providerManager },
        { provide: BackupService, useValue: backup },
        { provide: SnackService, useValue: snack },
        { provide: LocalDraftService, useValue: localDraft },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        BannerService,
      ],
    });
    service = TestBed.inject(UserProfileService);
    bannerService = TestBed.inject(BannerService);
    (service as any)._metadata.set(metadata);
    service.profiles.set(metadata.profiles);
    service.activeProfile.set(profileA);
  });

  it('shows the removal warning with a shortcut to the export dialog', async () => {
    await service.initialize();

    const banner = bannerService.activeBanner();
    expect(banner?.id).toBe(BannerId.UserProfilesRemoval);
    expect(banner?.msg).toBe(T.USER_PROFILES.REMOVAL_WARNING);
    expect(banner?.action?.label).toBe(T.USER_PROFILES.MANAGE_PROFILES);
  });

  it('resolves the lazily imported management dialog', async () => {
    // The banner action goes through this: the dialog has to be imported lazily
    // because its component injects this service, so a static import would close
    // a cycle - and a broken path would only surface when a user clicks.
    await (service as any)._openManagementDialog();

    expect(TestBed.inject(MatDialog).open).toHaveBeenCalled();
  });

  it('never masks another banner while it sits there unread', async () => {
    // It opens at startup and only goes away when the user dismisses it, so any
    // priority it shared with another banner it would win on insertion order —
    // silently hiding the offline, update and sync-safety banners for good.
    await service.initialize();

    for (const id of Object.values(BannerId)) {
      if (id === BannerId.UserProfilesRemoval) {
        continue;
      }
      bannerService.open({ id, msg: id });
      expect(bannerService.activeBanner()?.id)
        .withContext(`${id} must outrank the removal warning`)
        .toBe(id);
      bannerService.dismiss(id);
    }
  });

  it('warns users who switched the feature off but still have profile data', async () => {
    // `initialize()` never runs for them, so this is their only notice.
    await service.warnAboutRemovalIfProfileDataExists();

    const banner = bannerService.activeBanner();
    expect(banner?.id).toBe(BannerId.UserProfilesRemoval);
    expect(banner?.msg).toBe(T.USER_PROFILES.REMOVAL_WARNING_DISABLED);
    // The management dialog reads signals `initialize()` never filled.
    expect(banner?.action).toBeUndefined();
  });

  it('does not warn when a lone default profile is stored', async () => {
    // Its snapshot mirrors the data the app loads anyway - nothing to rescue.
    storage.loadProfileMetadata.and.resolveTo({
      ...metadata,
      profiles: [profileA],
    });

    await service.warnAboutRemovalIfProfileDataExists();

    expect(bannerService.activeBanner()).toBeNull();
  });

  it('exports the live state for the active profile, not its stale snapshot', async () => {
    // The snapshot of the active profile is only written when switching away,
    // so exporting it would hand the user a backup missing everything they did
    // since - exactly the data this warning tells them to rescue.
    await service.exportProfile('profile-a');

    expect(backup.loadCompleteBackup).toHaveBeenCalledWith(true);
    expect(storage.loadProfileData).not.toHaveBeenCalled();
  });

  it('exports inactive profiles from their stored snapshot', async () => {
    await service.exportProfile('profile-b');

    expect(storage.loadProfileData).toHaveBeenCalledWith('profile-b');
    expect(backup.loadCompleteBackup).not.toHaveBeenCalled();
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
