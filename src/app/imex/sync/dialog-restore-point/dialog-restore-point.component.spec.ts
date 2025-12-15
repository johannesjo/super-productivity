import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DialogRestorePointComponent } from './dialog-restore-point.component';
import { MatDialogRef } from '@angular/material/dialog';
import { SuperSyncRestoreService } from '../super-sync-restore.service';
import { TranslateModule } from '@ngx-translate/core';
import { RestorePoint } from '../../../pfapi/api/sync/sync-provider.interface';
import { T } from '../../../t.const';

describe('DialogRestorePointComponent', () => {
  let component: DialogRestorePointComponent;
  let fixture: ComponentFixture<DialogRestorePointComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogRestorePointComponent>>;
  let mockRestoreService: jasmine.SpyObj<SuperSyncRestoreService>;

  const mockRestorePoints: RestorePoint[] = [
    {
      serverSeq: 100,
      timestamp: Date.now() - 3600000,
      type: 'SYNC_IMPORT',
      clientId: 'client-1',
    },
    {
      serverSeq: 50,
      timestamp: Date.now() - 7200000,
      type: 'BACKUP_IMPORT',
      clientId: 'client-2',
    },
    {
      serverSeq: 25,
      timestamp: Date.now() - 14400000,
      type: 'REPAIR',
      clientId: 'client-1',
    },
  ];

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockRestoreService = jasmine.createSpyObj('SuperSyncRestoreService', [
      'getRestorePoints',
      'restoreToPoint',
    ]);

    // Default successful response
    mockRestoreService.getRestorePoints.and.returnValue(
      Promise.resolve(mockRestorePoints),
    );

    await TestBed.configureTestingModule({
      imports: [DialogRestorePointComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SuperSyncRestoreService, useValue: mockRestoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogRestorePointComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load restore points on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockRestoreService.getRestorePoints).toHaveBeenCalled();
      expect(component.restorePoints()).toEqual(mockRestorePoints);
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    }));

    it('should set error when loading fails', fakeAsync(() => {
      mockRestoreService.getRestorePoints.and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBe('Network error');
      expect(component.restorePoints()).toEqual([]);
    }));

    it('should set default error message when error has no message', fakeAsync(() => {
      mockRestoreService.getRestorePoints.and.returnValue(Promise.reject({}));

      fixture.detectChanges();
      tick();

      expect(component.error()).toBe('Failed to load restore points');
    }));

    it('should show loading state initially', () => {
      expect(component.isLoading()).toBe(true);
    });
  });

  describe('selectPoint', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should select a point when clicked', () => {
      component.selectPoint(mockRestorePoints[0]);

      expect(component.selectedPoint()).toEqual(mockRestorePoints[0]);
    });

    it('should deselect point when same point is clicked again', () => {
      component.selectPoint(mockRestorePoints[0]);
      expect(component.selectedPoint()).toEqual(mockRestorePoints[0]);

      component.selectPoint(mockRestorePoints[0]);
      expect(component.selectedPoint()).toBeNull();
    });

    it('should switch selection when different point is clicked', () => {
      component.selectPoint(mockRestorePoints[0]);
      expect(component.selectedPoint()).toEqual(mockRestorePoints[0]);

      component.selectPoint(mockRestorePoints[1]);
      expect(component.selectedPoint()).toEqual(mockRestorePoints[1]);
    });
  });

  describe('restore', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
      mockRestoreService.restoreToPoint.and.returnValue(Promise.resolve());
    }));

    it('should do nothing when no point is selected', fakeAsync(() => {
      component.selectedPoint.set(null);

      component.restore();
      tick();

      expect(mockRestoreService.restoreToPoint).not.toHaveBeenCalled();
    }));

    it('should call restoreToPoint and close dialog on success', fakeAsync(() => {
      component.selectPoint(mockRestorePoints[0]);

      component.restore();
      expect(component.isRestoring()).toBe(true);

      tick();

      expect(mockRestoreService.restoreToPoint).toHaveBeenCalledWith(100);
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    }));

    it('should set error and stop restoring on failure', fakeAsync(() => {
      component.selectPoint(mockRestorePoints[0]);
      mockRestoreService.restoreToPoint.and.returnValue(
        Promise.reject(new Error('Restore failed')),
      );

      component.restore();
      expect(component.isRestoring()).toBe(true);

      tick();

      expect(component.error()).toBe('Restore failed');
      expect(component.isRestoring()).toBe(false);
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    }));

    it('should use default error message when error has no message', fakeAsync(() => {
      component.selectPoint(mockRestorePoints[0]);
      mockRestoreService.restoreToPoint.and.returnValue(Promise.reject({}));

      component.restore();
      tick();

      expect(component.error()).toBe('Failed to restore');
    }));
  });

  describe('cancel', () => {
    it('should close dialog with false', () => {
      component.cancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });
  });

  describe('getTypeIcon', () => {
    it('should return cloud_download for SYNC_IMPORT', () => {
      expect(component.getTypeIcon('SYNC_IMPORT')).toBe('cloud_download');
    });

    it('should return backup for BACKUP_IMPORT', () => {
      expect(component.getTypeIcon('BACKUP_IMPORT')).toBe('backup');
    });

    it('should return build for REPAIR', () => {
      expect(component.getTypeIcon('REPAIR')).toBe('build');
    });

    it('should return history for unknown type', () => {
      expect(component.getTypeIcon('UNKNOWN' as any)).toBe('history');
    });
  });

  describe('getTypeLabel', () => {
    it('should return translation key for SYNC_IMPORT', () => {
      expect(component.getTypeLabel('SYNC_IMPORT')).toBe(
        T.F.SYNC.D_RESTORE.TYPE_SYNC_IMPORT,
      );
    });

    it('should return translation key for BACKUP_IMPORT', () => {
      expect(component.getTypeLabel('BACKUP_IMPORT')).toBe(
        T.F.SYNC.D_RESTORE.TYPE_BACKUP_IMPORT,
      );
    });

    it('should return translation key for REPAIR', () => {
      expect(component.getTypeLabel('REPAIR')).toBe(T.F.SYNC.D_RESTORE.TYPE_REPAIR);
    });

    it('should return type string for unknown type', () => {
      expect(component.getTypeLabel('CUSTOM' as any)).toBe('CUSTOM');
    });
  });
});
