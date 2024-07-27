import { TestBed } from '@angular/core/testing';
import { SyncProviderService } from './sync-provider.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { CompressionService } from '../../core/compression/compression.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { Observable, of } from 'rxjs';
import { ReminderService } from '../../features/reminder/reminder.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { PersistenceLocalService } from '../../core/persistence/persistence-local.service';
import { DataImportService } from './data-import.service';
import { AppDataComplete, AppMainFileData, LocalSyncMetaModel } from './sync.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { SnackService } from '../../core/snack/snack.service';
import { PersistenceService } from '../../core/persistence/persistence.service';

describe('SyncProviderService', () => {
  let service: SyncProviderService;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let translateServiceMock: jasmine.SpyObj<TranslateService>;
  let compressionServiceMock: jasmine.SpyObj<CompressionService>;
  let persistenceLocalServiceMock: jasmine.SpyObj<PersistenceLocalService>;
  let dataImportServiceMock: jasmine.SpyObj<DataImportService>;
  let snackServiceMock: jasmine.SpyObj<SnackService>;
  let persistenceServiceMock: jasmine.SpyObj<PersistenceService>;

  beforeEach(() => {
    snackServiceMock = jasmine.createSpyObj('SnackService', ['open']);
    snackServiceMock = jasmine.createSpyObj('SnackService', ['open']);
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    translateServiceMock = jasmine.createSpyObj('TranslateService', ['instant']);
    dataImportServiceMock = jasmine.createSpyObj('DataImportService', [
      'importCompleteSyncData',
    ]);
    persistenceServiceMock = jasmine.createSpyObj('PersistenceService', [
      'getValidCompleteData',
      'loadComplete',
    ]);
    persistenceLocalServiceMock = jasmine.createSpyObj('PersistenceLocalService', [
      'load',
      'save',
      'loadLastSyncModelChange',
      'loadLastArchiveChange',
    ]);
    compressionServiceMock = jasmine.createSpyObj('CompressionService', [
      'compressUTF16',
      'decompressUTF16',
    ]);

    TestBed.configureTestingModule({
      providers: [
        SyncProviderService,
        {
          provide: ReminderService,
          useClass: class MockReminderService {},
        },
        provideMockStore({
          initialState: {
            tasks: {},
            globalConfig: {
              sync: {},
            },
            workContext: {
              activeId: '123',
              entities: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '123': {
                  id: '123',
                  theme: 'dark',
                  taskIds: ['1', '2'],
                },
              },
            },
            /* your initial state here */
          },
        }),
        { provide: MatDialog, useValue: matDialogMock },
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: CompressionService, useValue: compressionServiceMock },
        { provide: PersistenceLocalService, useValue: persistenceLocalServiceMock },
        { provide: PersistenceService, useValue: persistenceServiceMock },
        { provide: DataImportService, useValue: dataImportServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        {
          provide: Actions,
          useValue: new Observable(),
        },
      ],
    });
    service = TestBed.inject(SyncProviderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open conflict dialog', (done) => {
    const dialogResult = of('USE_LOCAL'); // Simulate user selecting "USE_LOCAL"
    matDialogMock.open.and.returnValue({ afterClosed: () => dialogResult } as any);
    service['_openConflictDialog$']({ remote: 123, local: 456, lastSync: 789 }).subscribe(
      (result) => {
        expect(result).toEqual('USE_LOCAL');
        expect(matDialogMock.open.calls.count()).toBe(1);
        done();
      },
    );
  });

  describe('_importMainFileAppDataAndArchiveIfNecessary()', () => {
    it('should import main with localComplete data if archive was not updated', async () => {
      const cp: SyncProviderServiceInterface = {
        id: SyncProvider.Dropbox,
      } as Partial<SyncProviderServiceInterface> as SyncProviderServiceInterface;

      const mainFileData = {
        MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
        lastLocalSyncModelChange: 111,
        archiveLastUpdate: 999,
      } as Partial<AppMainFileData> as AppMainFileData;
      const localData = {
        taskArchive: 'localTaskArchive' as any,
        archivedProjects: 'localArchivedProjects' as any,
        lastArchiveUpdate: 999,
      } as Partial<AppDataComplete> as AppDataComplete;
      // compressionServiceMock.decompressUTF16.and.returnValue(data);
      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {},
        } as Partial<LocalSyncMetaModel> as LocalSyncMetaModel),
      );
      // cp.uploadFileData.and.returnValue(Promise.resolve('uploadFileReturnValueRev'));

      await service['_importMainFileAppDataAndArchiveIfNecessary']({
        cp,
        remoteMainFileData: mainFileData,
        localComplete: localData,
        mainFileRev: 'localRev',
      });
      expect(dataImportServiceMock.importCompleteSyncData).toHaveBeenCalledWith(
        {
          MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
          lastLocalSyncModelChange: 111,
          taskArchive: 'localTaskArchive',
          archivedProjects: 'localArchivedProjects',
          lastArchiveUpdate: 999,
        } as any,
        { isOmitLocalFields: true },
      );
    });

    it('should import main and also load and import remote archive if newer than localComplete', async () => {
      const cp: SyncProviderServiceInterface = {
        id: SyncProvider.Dropbox,
        downloadFileData: (syncTarget) =>
          Promise.resolve({
            rev: 'remoteRev_' + syncTarget,
            dataStr: {
              taskArchive: 'taskArchiveREMOTE' as any,
              archivedProjects: 'archivedProjectsREMOTE' as any,
            } as any,
          }),
      } as Partial<SyncProviderServiceInterface> as SyncProviderServiceInterface;

      const remoteMainFileData = {
        MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
        lastLocalSyncModelChange: 111,
        archiveLastUpdate: 2222,
        archiveRev: 'remoteRev_ARCHIVE',
      } as Partial<AppMainFileData> as AppMainFileData;
      const localData = {
        taskArchive: 'taskArchive' as any,
        archivedProjects: 'archivedProjects' as any,
        lastArchiveUpdate: 44,
      } as Partial<AppDataComplete> as AppDataComplete;

      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {
            taskArchive: 'taskArchiveREMOTE',
            archivedProjects: 'archivedProjectsREMOTE',
          },
        }) as any,
      );

      await service['_importMainFileAppDataAndArchiveIfNecessary']({
        cp,
        remoteMainFileData,
        localComplete: localData,
        mainFileRev: 'localRev',
      });

      expect(dataImportServiceMock.importCompleteSyncData).toHaveBeenCalledWith(
        {
          MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
          lastLocalSyncModelChange: 111,
          lastArchiveUpdate: 2222,
          taskArchive: 'taskArchiveREMOTE',
          archivedProjects: 'archivedProjectsREMOTE',
        } as any,
        { isOmitLocalFields: true },
      );
    });

    it('should throw an error if archive rev does not match archive rev in main file and dialog was clicked away', async () => {
      matDialogMock.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

      const cp: SyncProviderServiceInterface = {
        id: SyncProvider.Dropbox,
        downloadFileData: (syncTarget) =>
          Promise.resolve({
            rev: 'remoteRev_' + syncTarget,
            dataStr: {
              taskArchive: 'taskArchiveREMOTE' as any,
              archivedProjects: 'archivedProjectsREMOTE' as any,
            } as any,
          }),
      } as Partial<SyncProviderServiceInterface> as SyncProviderServiceInterface;

      const remoteMainFileData = {
        MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
        lastLocalSyncModelChange: 111,
        archiveLastUpdate: 2222,
        archiveRev: 'remoteRev_ARCHIVE_SOMETHING_ELSEEE',
      } as Partial<AppMainFileData> as AppMainFileData;
      const localData = {
        taskArchive: 'taskArchive' as any,
        archivedProjects: 'archivedProjects' as any,
        lastArchiveUpdate: 44,
      } as Partial<AppDataComplete> as AppDataComplete;

      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {
            taskArchive: 'taskArchiveREMOTE',
            archivedProjects: 'archivedProjectsREMOTE',
          },
        }) as any,
      );

      try {
        await service['_importMainFileAppDataAndArchiveIfNecessary']({
          cp,
          remoteMainFileData,
          localComplete: localData,
          mainFileRev: 'localRev',
        });
      } catch (e) {
        expect(e.toString()).toContain(
          'Remote archive rev does not match the one in remote main file',
        );
      }
      expect(dataImportServiceMock.importCompleteSyncData).not.toHaveBeenCalled();
    });
  });

  // it('should force upload if archive rev does not match archive rev in main file and force was chosen from dialog ', async () => {
  //   matDialogMock.open.and.returnValue({
  //     afterClosed: () => of('FORCE_UPDATE_REMOTE'),
  //   } as any);
  //   const localDataComplete = {
  //     ...createAppDataCompleteMock(),
  //     lastArchiveUpdate: 999,
  //     lastLocalSyncModelChange: 5555,
  //   } as Partial<AppDataComplete> as AppDataComplete;
  //
  //   persistenceServiceMock.getValidCompleteData.and.returnValue(
  //     Promise.resolve(localDataComplete),
  //   );
  //
  //   const cp: SyncProviderServiceInterface = {
  //     id: SyncProvider.Dropbox,
  //     downloadFileData: (syncTarget) =>
  //       Promise.resolve({
  //         rev: 'remoteRev_' + syncTarget,
  //         dataStr: {
  //           taskArchive: 'taskArchiveREMOTE' as any,
  //           archivedProjects: 'archivedProjectsREMOTE' as any,
  //         } as any,
  //       }),
  //   } as Partial<SyncProviderServiceInterface> as SyncProviderServiceInterface;
  //
  //   const remoteMainFileData = {
  //     MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
  //     lastLocalSyncModelChange: 111,
  //     archiveLastUpdate: 2222,
  //     archiveRev: 'remoteRev_ARCHIVE_SOMETHING_ELSEEE',
  //   } as Partial<AppMainFileData> as AppMainFileData;
  //   const localData = {
  //     taskArchive: 'taskArchive' as any,
  //     archivedProjects: 'archivedProjects' as any,
  //     lastArchiveUpdate: 44,
  //   } as Partial<AppDataComplete> as AppDataComplete;
  //
  //   persistenceLocalServiceMock.load.and.returnValue(
  //     Promise.resolve({
  //       [SyncProvider.Dropbox]: {
  //         taskArchive: 'taskArchiveREMOTE',
  //         archivedProjects: 'archivedProjectsREMOTE',
  //       },
  //     }) as any,
  //   );
  //
  //   try {
  //     await service['_importMainFileAppDataAndArchiveIfNecessary']({
  //       cp,
  //       remoteMainFileData,
  //       localComplete: localData,
  //       mainFileRev: 'localRev',
  //     });
  //   } catch (e) {
  //     expect(dataImportServiceMock.importCompleteSyncData).toHaveBeenCalled();
  //   }
  // });

  describe('_uploadAppData()', () => {
    let cp: jasmine.SpyObj<SyncProviderServiceInterface>;

    beforeEach(() => {
      cp = jasmine.createSpyObj('SyncProviderServiceInterface', ['uploadFileData'], {
        id: SyncProvider.Dropbox,
      });
    });

    it('should throw an error if localComplete data is invalid', async () => {
      const localDataComplete = {
        lastArchiveUpdate: 999,
      } as Partial<AppDataComplete> as AppDataComplete;

      try {
        await service['_uploadAppData']({ cp, localDataComplete });
      } catch (e) {
        expect(e.message).toBe('The data you are trying to upload is invalid');
      }
    });

    it('should upload main only if archive was not updated', async () => {
      const localDataComplete = {
        ...createAppDataCompleteMock(),
        lastArchiveUpdate: 999,
        lastLocalSyncModelChange: 5555,
      } as Partial<AppDataComplete> as AppDataComplete;

      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {
            rev: 'syncProviderRevMain',
            revTaskArchive: 'syncProviderRevArchive',
            lastSync: 2000,
          },
        } as Partial<LocalSyncMetaModel> as LocalSyncMetaModel),
      );
      cp.uploadFileData.and.returnValue(Promise.resolve('uploadFileReturnValueRev'));

      const { mainNoRevs } = service['_splitData'](localDataComplete);
      const expectedAppMainData: AppMainFileData = {
        ...mainNoRevs,
        archiveLastUpdate: 999,
        archiveRev: 'syncProviderRevArchive',
      };

      await service['_uploadAppData']({ cp, localDataComplete });
      expect(cp.uploadFileData.calls.all()[0].args).toEqual([
        'MAIN',
        JSON.stringify(expectedAppMainData),
        'syncProviderRevMain',
        false,
      ]);

      expect(cp.uploadFileData).toHaveBeenCalledTimes(1);
    });

    it('should upload main and archive if archive was updated', async () => {
      const localDataComplete = {
        ...createAppDataCompleteMock(),
        lastArchiveUpdate: 999,
        lastLocalSyncModelChange: 5555,
      } as Partial<AppDataComplete> as AppDataComplete;

      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {
            rev: 'syncProviderRevMain',
            revTaskArchive: 'syncProviderRevArchive',
            lastSync: 22,
          },
        } as Partial<LocalSyncMetaModel> as LocalSyncMetaModel),
      );

      const { mainNoRevs } = service['_splitData'](localDataComplete);

      cp.uploadFileData.and.returnValue(Promise.resolve('uploadFileReturnValueRev'));

      await service['_uploadAppData']({ cp, localDataComplete });

      expect(cp.uploadFileData).toHaveBeenCalledTimes(2);
      expect(cp.uploadFileData.calls.all()[0].args).toEqual([
        'ARCHIVE',
        '{"taskArchive":{"ids":[],"entities":{}},"archivedProjects":{}}',
        'syncProviderRevArchive',
        false,
      ]);
      expect(cp.uploadFileData.calls.all()[1].args).toEqual([
        'MAIN',
        JSON.stringify({
          ...mainNoRevs,
          archiveLastUpdate: 999,
          archiveRev: 'uploadFileReturnValueRev',
        }),
        'syncProviderRevMain',
        false,
      ]);
    });

    it('should retry if unable to upload main file and warn after failure', async () => {
      const localDataComplete = {
        ...createAppDataCompleteMock(),
        lastArchiveUpdate: 999,
        lastLocalSyncModelChange: 5555,
      } as Partial<AppDataComplete> as AppDataComplete;

      persistenceLocalServiceMock.load.and.returnValue(
        Promise.resolve({
          [SyncProvider.Dropbox]: {
            rev: 'syncProviderRevMain',
            revTaskArchive: 'syncProviderRevArchive',
            lastSync: 2000,
          },
        } as Partial<LocalSyncMetaModel> as LocalSyncMetaModel),
      );
      cp.uploadFileData.and.returnValue(Promise.reject('some remote error'));

      const { mainNoRevs } = service['_splitData'](localDataComplete);
      const expectedAppMainData: AppMainFileData = {
        ...mainNoRevs,
        archiveLastUpdate: 999,
        archiveRev: 'syncProviderRevArchive',
      };

      try {
        await service['_uploadAppData']({ cp, localDataComplete });
      } catch (e) {
        expect(cp.uploadFileData).toHaveBeenCalledWith(
          'MAIN',
          JSON.stringify(expectedAppMainData),
          'syncProviderRevMain',
          false,
        );
        expect(cp.uploadFileData).toHaveBeenCalledTimes(2);
        // NOTE: undefined is because of the translateService
        expect(e).toEqual(new Error('KNOWN_SYNC_ERROR_SUP_undefined'));
      }
    });
  });

  describe('_decompressAndDecryptDataIfNeeded()', () => {
    it('should remove prepended encryption and compression identifiere', async () => {
      const fakeAppData = {
        someKey: 'someVal',
      };
      const data = `SP_ENC_SP_CPR_${JSON.stringify(fakeAppData)}`;
      const result = await service['_decompressAndDecryptDataIfNeeded'](data);
      expect(result).toEqual(fakeAppData as any);
    });

    it('should remove prepended encryption and compression identifiere', async () => {
      const fakeAppData = {
        someKey: 'someVal',
      };
      const data = `SP_ENC_${JSON.stringify(fakeAppData)}`;
      const result = await service['_decompressAndDecryptDataIfNeeded'](data);
      expect(result).toEqual(fakeAppData as any);
    });
    it('should remove prepended encryption and compression identifiere', async () => {
      const fakeAppData = {
        someKey: 'someVal',
      };
      const data = `SP_CPR_${JSON.stringify(fakeAppData)}`;
      const result = await service['_decompressAndDecryptDataIfNeeded'](data);
      expect(result).toEqual(fakeAppData as any);
    });
  });
});
