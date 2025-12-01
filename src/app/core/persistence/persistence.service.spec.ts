// import { TestBed } from '@angular/core/testing';
// import { SnackService } from '../snack/snack.service';
// import { DatabaseService } from './database.service';
// import { CompressionService } from '../compression/compression.service';
// import { createEmptyEntity } from '../../util/create-empty-entity';
// import { provideMockStore } from '@ngrx/store/testing';
// import { PfapiService } from '../../pfapi/pfapi.service';
//
// describe('PersistenceService', () => {
//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       providers: [
//         provideMockStore({ initialState: {} }),
//         {
//           provide: SnackService,
//           useValue: {
//             open: () => false,
//           },
//         },
//         {
//           provide: DatabaseService,
//           useValue: {
//             clearDatabase: () => false,
//             save: () => false,
//             remove: () => false,
//             load: () => false,
//           },
//         },
//         {
//           provide: CompressionService,
//           useValue: {
//             decompress: () => false,
//             compress: () => false,
//           },
//         },
//       ],
//     });
//   });
//
//   it('database update should trigger onAfterSave$', (done) => {
//     const service: PfapiService = TestBed.inject(PfapiService);
//     // once is required to fill up data
//     service.loadComplete().then(() => {
//       service.onAfterSave$.subscribe(({ data }) => {
//         expect(data).toEqual(createEmptyEntity());
//         done();
//       });
//       service.tag.saveState(createEmptyEntity(), { isSyncModelChange: true });
//     });
//   });
// });
