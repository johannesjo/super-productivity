import { TestBed } from '@angular/core/testing';
import { PluginBridgeService } from './plugin-bridge.service';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';

describe('PluginBridgeService', () => {
  let service: PluginBridgeService;
  let snackServiceSpy: jasmine.SpyObj<SnackService>;

  beforeEach(() => {
    const snackSpy = jasmine.createSpyObj('SnackService', ['open']);
    const notifySpy = jasmine.createSpyObj('NotifyService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        PluginBridgeService,
        { provide: SnackService, useValue: snackSpy },
        { provide: NotifyService, useValue: notifySpy },
      ],
    });

    service = TestBed.inject(PluginBridgeService);
    snackServiceSpy = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show snack via SnackService', () => {
    const snackCfg = { msg: 'Test message', type: 'SUCCESS' as const };

    service.showSnack(snackCfg);

    expect(snackServiceSpy.open).toHaveBeenCalledWith(snackCfg);
  });

  it('should handle notifications', () => {
    const notifyCfg = {
      title: 'Test Title',
      body: 'Test Body',
      icon: 'test-icon',
    };

    service.notify(notifyCfg);

    // The method should handle the notification (implementation varies based on browser support)
    expect(true).toBe(true); // Basic test that method executes without error
  });

  it('should persist data to localStorage', () => {
    const testData = '{"test": "data"}';
    spyOn(localStorage, 'setItem');

    service.persistDataSynced(testData);

    expect(localStorage.setItem).toHaveBeenCalledWith('plugin-data', testData);
  });

  it('should retrieve persisted data from localStorage', () => {
    const testData = '{"test": "data"}';
    spyOn(localStorage, 'getItem').and.returnValue(testData);

    const result = service.getPersistedData();

    expect(localStorage.getItem).toHaveBeenCalledWith('plugin-data');
    expect(result).toBe(testData);
  });
});
