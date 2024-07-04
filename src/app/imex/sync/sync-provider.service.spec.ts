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
import { AppDataComplete, AppMainFileData } from './sync.model';

describe('SyncProviderService', () => {
  let service: SyncProviderService;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let translateServiceMock: jasmine.SpyObj<TranslateService>;
  let compressionServiceMock: jasmine.SpyObj<CompressionService>;
  let persistenceLocalServiceMock: jasmine.SpyObj<PersistenceLocalService>;
  let dataImportServiceMock: jasmine.SpyObj<DataImportService>;

  beforeEach(() => {
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    translateServiceMock = jasmine.createSpyObj('TranslateService', ['instant']);
    dataImportServiceMock = jasmine.createSpyObj('DataImportService', [
      'importCompleteSyncData',
    ]);
    persistenceLocalServiceMock = jasmine.createSpyObj('PersistenceLocalService', [
      'load',
      'save',
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
        { provide: DataImportService, useValue: dataImportServiceMock },
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
    it('should import main with local data if archive was not updated', async () => {
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
        }) as any,
      );
      await service['_importMainFileAppDataAndArchiveIfNecessary'](
        cp,
        mainFileData,
        localData,
        'localRev',
      );
      expect(dataImportServiceMock.importCompleteSyncData).toHaveBeenCalledWith(
        {
          MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
          lastLocalSyncModelChange: 111,
          taskArchive: 'localTaskArchive',
          archivedProjects: 'localArchivedProjects',
          lastArchiveUpdate: 999,
          archiveLastUpdate: 999,
        } as any,
        { isOmitLocalFields: true },
      );
    });

    it('should import main and also load and import remote archive if newer than local', async () => {
      const cp: SyncProviderServiceInterface = {
        id: SyncProvider.Dropbox,
        downloadFileData: () =>
          Promise.resolve({
            rev: 'remoteRev',
            dataStr: {
              taskArchive: 'taskArchiveREMOTE' as any,
              archivedProjects: 'archivedProjectsREMOTE' as any,
            } as any,
          }),
      } as Partial<SyncProviderServiceInterface> as SyncProviderServiceInterface;

      const mainFileData = {
        MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
        lastLocalSyncModelChange: 111,
        archiveLastUpdate: 2222,
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

      await service['_importMainFileAppDataAndArchiveIfNecessary'](
        cp,
        mainFileData,
        localData,
        'localRev',
      );

      expect(dataImportServiceMock.importCompleteSyncData).toHaveBeenCalledWith(
        {
          MAIN_FILE_DATA1: 'MAIN_FILE_DATA1',
          lastLocalSyncModelChange: 111,
          lastArchiveUpdate: 2222,
          archiveLastUpdate: 2222,
          taskArchive: 'taskArchiveREMOTE',
          archivedProjects: 'archivedProjectsREMOTE',
        } as any,
        { isOmitLocalFields: true },
      );
    });
  });
});
