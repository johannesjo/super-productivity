import { TestBed } from '@angular/core/testing';
import { SyncProviderService } from './sync-provider.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { CompressionService } from '../../core/compression/compression.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { Observable, of } from 'rxjs';
import { ReminderService } from '../../features/reminder/reminder.service';

describe('SyncProviderService', () => {
  let service: SyncProviderService;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let translateServiceMock: jasmine.SpyObj<TranslateService>;
  let compressionServiceMock: jasmine.SpyObj<CompressionService>;

  beforeEach(() => {
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    translateServiceMock = jasmine.createSpyObj('TranslateService', ['instant']);
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
});
