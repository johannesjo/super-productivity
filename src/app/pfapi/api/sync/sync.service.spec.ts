// import { SyncService } from './sync.service';
// import { SyncProviderId } from '../pfapi.const';
// import { MiniObservable } from '../util/mini-observable';
// import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
//
// describe('SyncService', () => {
//   let service: SyncService<any>;
//   let mockModelControllers: any;
//   let mockPfapi: any;
//   let mockSyncProvider$: MiniObservable<any>;
//   let mockEncryptAndCompressCfg$: MiniObservable<any>;
//   let mockMetaModelCtrl: jasmine.SpyObj<MetaModelCtrl>;
//   let mockEncryptAndCompressHandler: any;
//   let mockSyncProvider: any;
//
//   beforeEach(() => {
//     // Setup mock model controllers
//     mockModelControllers = {
//       tasks: {
//         modelCfg: {
//           isMainFileModel: false,
//           transformBeforeUpload: jasmine
//             .createSpy('transformBeforeUpload')
//             .and.callFake((data) => data),
//           transformBeforeDownload: jasmine
//             .createSpy('transformBeforeDownload')
//             .and.callFake((data) => data),
//         },
//         save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
//       },
//       settings: {
//         modelCfg: {
//           isMainFileModel: true,
//           transformBeforeUpload: jasmine
//             .createSpy('transformBeforeUpload')
//             .and.callFake((data) => data),
//           transformBeforeDownload: jasmine
//             .createSpy('transformBeforeDownload')
//             .and.callFake((data) => data),
//         },
//         save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
//       },
//     };
//
//     // Setup mock PFAPI
//     mockPfapi = {
//       getAllSyncModelData: jasmine.createSpy('getAllSyncModelData').and.returnValue(
//         Promise.resolve({
//           tasks: { id: 'tasks-data' },
//           settings: { id: 'settings-data' },
//         }),
//       ),
//     };
//
//     // Setup sync provider observable
//     mockSyncProvider = {
//       id: SyncProviderId.Dropbox,
//       isReady: jasmine.createSpy('isReady').and.returnValue(Promise.resolve(true)),
//       downloadFile: jasmine.createSpy('downloadFile'),
//       uploadFile: jasmine.createSpy('uploadFile'),
//       removeFile: jasmine.createSpy('removeFile'),
//     };
//     mockSyncProvider$ = new MiniObservable(mockSyncProvider);
//
//     // Setup encrypt/compress config
//     mockEncryptAndCompressCfg$ = new MiniObservable({
//       isEncrypt: false,
//       isCompress: true,
//       encryptKey: 'test-key',
//     });
//
//     // Setup meta model controller
//     mockMetaModelCtrl = jasmine.createSpyObj('MetaModelCtrl', [
//       'loadClientId',
//       'loadMetaModel',
//       'saveMetaModel',
//     ]);
//     mockMetaModelCtrl.loadClientId.and.returnValue(Promise.resolve('test-client-id'));
//     mockMetaModelCtrl.loadMetaModel.and.returnValue(
//       Promise.resolve({
//         clientId: 'test-client-id',
//         revMap: { tasks: 'rev1', settings: 'rev2' },
//         lastSyncedRemoteRev: 'meta-rev-1',
//       }),
//     );
//
//     // Setup encryption handler
//     mockEncryptAndCompressHandler = {
//       compressAndEncrypt: jasmine
//         .createSpy('compressAndEncrypt')
//         .and.callFake(({ data }) => Promise.resolve(JSON.stringify(data))),
//       decompressAndDecrypt: jasmine
//         .createSpy('decompressAndDecrypt')
//         .and.callFake(({ dataStr }) =>
//           Promise.resolve({ data: JSON.parse(dataStr), version: 1 }),
//         ),
//     };
//
//     // Initialize service
//     service = new SyncService(
//       mockModelControllers,
//       mockPfapi,
//       mockSyncProvider$,
//       mockEncryptAndCompressCfg$,
//       mockMetaModelCtrl as any,
//       mockEncryptAndCompressHandler,
//     );
//   });
//
//   describe('initialization', () => {
//     it('should initialize with the correct dependencies', () => {
//       expect(service).toBeTruthy();
//       expect(service['m']).toBe(mockModelControllers);
//       expect(service['_pfapiMain']).toBe(mockPfapi);
//     });
//   });
//
//   // describe('sync status', () => {
//   //   it('should provide observable sync status', (done) => {
//   //     service.syncState$.subscribe((state) => {
//   //       expect(state).toBeDefined();
//   //       done();
//   //     });
//   //   });
//   // });
//   //
//   // describe('sync operations', () => {
//   //   beforeEach(() => {
//   //     mockSyncProvider.downloadFile.and.callFake((path, rev) => {
//   //       if (path === MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME) {
//   //         return Promise.resolve({
//   //           dataStr: JSON.stringify({
//   //             revMap: { tasks: 'rev1-remote', settings: 'rev2' },
//   //             mainModelData: { settings: { id: 'settings-remote' } },
//   //           }),
//   //           rev: 'meta-rev-2',
//   //         });
//   //       } else if (path.includes('tasks')) {
//   //         return Promise.resolve({
//   //           dataStr: JSON.stringify({ id: 'tasks-remote' }),
//   //           rev: 'tasks-rev-2',
//   //         });
//   //       }
//   //       throw new RemoteFileNotFoundAPIError(path);
//   //     });
//   //
//   //     mockSyncProvider.uploadFile.and.callFake((path, dataStr, revToMatch) => {
//   //       return Promise.resolve({ rev: `${path}-new-rev` });
//   //     });
//   //   });
//   //
//   //   it('should pull changes from remote', async () => {
//   //     const result = await service.sync();
//   //     expect(result.status).toBe(SyncStatus.Done);
//   //     expect(mockModelControllers.tasks.save).toHaveBeenCalled();
//   //   });
//   //
//   //   it('should handle no remote meta file', async () => {
//   //     mockSyncProvider.downloadFile.and.callFake(() => {
//   //       throw new RemoteFileNotFoundAPIError('meta');
//   //     });
//   //
//   //     const result = await service.sync();
//   //     expect(result.status).toBe(SyncStatus.NoRemoteMetaFileExists);
//   //   });
//   //
//   //   it('should handle lock files', async () => {
//   //     mockSyncProvider.downloadFile.and.callFake(() => {
//   //       return Promise.resolve({
//   //         dataStr: `${MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX}other-client`,
//   //         rev: 'lock-rev',
//   //       });
//   //     });
//   //
//   //     const result = await service.sync();
//   //     expect(result.status).toBe(SyncStatus.LockPresent);
//   //   });
//   // });
//   //
//   // describe('upload operations', () => {
//   //   beforeEach(() => {
//   //     // Setup for successful upload
//   //     mockMetaModelCtrl.loadMetaModel.and.returnValue(
//   //       Promise.resolve({
//   //         clientId: 'test-client-id',
//   //         revMap: { tasks: 'rev1-local', settings: 'rev2' },
//   //         lastSyncedRemoteRev: 'meta-rev-1',
//   //       }),
//   //     );
//   //
//   //     mockSyncProvider.uploadFile.and.returnValue(Promise.resolve({ rev: 'new-rev' }));
//   //     mockSyncProvider.downloadFile.and.returnValue(
//   //       Promise.resolve({
//   //         dataStr: JSON.stringify({
//   //           revMap: { tasks: 'rev1-remote', settings: 'rev2' },
//   //           mainModelData: { settings: { id: 'settings-remote' } },
//   //         }),
//   //         rev: 'meta-rev-remote',
//   //       }),
//   //     );
//   //   });
//   //
//   //   it('should upload local changes to remote', async () => {
//   //     const result = await service.uploadAllToRemote();
//   //
//   //     expect(result.status).toBe(SyncStatus.Done);
//   //     expect(mockSyncProvider.uploadFile).toHaveBeenCalled();
//   //     expect(mockMetaModelCtrl.saveMetaModel).toHaveBeenCalled();
//   //   });
//   //
//   //   it('should handle force upload', async () => {
//   //     const result = await service.uploadAllToRemote(true);
//   //
//   //     expect(result.status).toBe(SyncStatus.Done);
//   //     expect(mockSyncProvider.uploadFile).toHaveBeenCalled();
//   //     // Force upload should bypass rev checking
//   //     expect(mockSyncProvider.uploadFile.calls.argsFor(0)[3]).toBe(true);
//   //   });
//   // });
//   //
//   // describe('error handling', () => {
//   //   it('should handle RevMismatchForModelError', async () => {
//   //     mockSyncProvider.downloadFile.and.returnValue(
//   //       Promise.resolve({
//   //         dataStr: JSON.stringify({
//   //           revMap: { tasks: 'rev1-remote', settings: 'rev2' },
//   //           mainModelData: { settings: { id: 'settings-remote' } },
//   //         }),
//   //         rev: 'meta-rev-2',
//   //       }),
//   //     );
//   //
//   //     mockSyncProvider.uploadFile.and.callFake(() => {
//   //       throw new RevMismatchForModelError('Revision mismatch');
//   //     });
//   //
//   //     const result = await service.uploadAllToRemote();
//   //     expect(result.status).toBe(SyncStatus.Error);
//   //     expect(result.error instanceof RevMismatchForModelError).toBe(true);
//   //   });
//   //
//   //   it('should handle network errors', async () => {
//   //     mockSyncProvider.isReady.and.returnValue(Promise.resolve(false));
//   //
//   //     const result = await service.sync();
//   //     expect(result.status).toBe(SyncStatus.NoConnection);
//   //   });
//   //
//   //   it('should handle lock from local client', async () => {
//   //     mockSyncProvider.downloadFile.and.callFake(() => {
//   //       return Promise.resolve({
//   //         dataStr: `${MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX}test-client-id`,
//   //         rev: 'lock-rev',
//   //       });
//   //     });
//   //
//   //     const result = await service.sync();
//   //     expect(result.status).toBe(SyncStatus.LockFromLocalClient);
//   //   });
//   // });
//   //
//   // describe('model data handling', () => {
//   //   it('should correctly handle main file models', async () => {
//   //     const mainFileData = await service['_getMainFileModelDataForUpload']();
//   //
//   //     expect(mainFileData).toHaveProperty('settings');
//   //     expect(mainFileData).not.toHaveProperty('tasks');
//   //     expect(
//   //       mockModelControllers.settings.modelCfg.transformBeforeUpload,
//   //     ).toHaveBeenCalled();
//   //   });
//   //
//   //   it('should apply transformations when saving downloaded data', async () => {
//   //     mockSyncProvider.downloadFile.and.returnValue(
//   //       Promise.resolve({
//   //         dataStr: JSON.stringify({
//   //           revMap: { tasks: 'rev1', settings: 'rev2' },
//   //           mainModelData: { settings: { id: 'settings-transform-test' } },
//   //         }),
//   //         rev: 'meta-rev',
//   //       }),
//   //     );
//   //
//   //     await service.downloadAllFromRemote();
//   //
//   //     expect(
//   //       mockModelControllers.settings.modelCfg.transformBeforeDownload,
//   //     ).toHaveBeenCalled();
//   //     expect(mockModelControllers.settings.save).toHaveBeenCalled();
//   //   });
//   // });
//   //
//   // describe('complex operations with spies', () => {
//   //   it('should handle conflicts correctly', async () => {
//   //     // Spy on private methods
//   //     spyOn<any>(service, '_getModelIdsToUpdateFromRevMaps').and.returnValue({
//   //       toUpdate: ['tasks'],
//   //       toDelete: [],
//   //     });
//   //
//   //     mockSyncProvider.downloadFile.and.returnValue(
//   //       Promise.resolve({
//   //         dataStr: JSON.stringify({
//   //           revMap: { tasks: 'rev-conflict' },
//   //           mainModelData: {},
//   //         }),
//   //         rev: 'meta-rev',
//   //       }),
//   //     );
//   //
//   //     await service.sync();
//   //
//   //     // Verify conflict resolution behavior
//   //     expect(service['_getModelIdsToUpdateFromRevMaps']).toHaveBeenCalled();
//   //   });
//   // });
// });
