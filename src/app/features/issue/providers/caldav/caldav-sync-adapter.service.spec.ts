import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CaldavSyncAdapterService } from './caldav-sync-adapter.service';
import { CaldavClientService } from './caldav-client.service';
import { CaldavCfg } from './caldav.model';

const BASE_CFG: CaldavCfg = {
  isEnabled: true,
  caldavUrl: 'https://cal.example.com',
  resourceName: 'Personal',
  username: 'user',
  password: 'secret',
  categoryFilter: null,
};

describe('CaldavSyncAdapterService.deleteIssue', () => {
  let adapter: CaldavSyncAdapterService;
  let client: jasmine.SpyObj<CaldavClientService>;

  beforeEach(() => {
    client = jasmine.createSpyObj('CaldavClientService', ['deleteTask$']);
    client.deleteTask$.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        CaldavSyncAdapterService,
        { provide: CaldavClientService, useValue: client },
      ],
    });
    adapter = TestBed.inject(CaldavSyncAdapterService);
  });

  // The generic remote-delete path has no gate of its own (#10096): existing
  // providers saved without the key must never delete server data.
  it('does nothing for a provider saved without the setting', async () => {
    await adapter.deleteIssue('uid-1', BASE_CFG);
    await adapter.deleteIssue('uid-1', { ...BASE_CFG, twoWaySync: { isDone: 'both' } });

    expect(client.deleteTask$).not.toHaveBeenCalled();
  });

  it('does nothing when the setting is off', async () => {
    await adapter.deleteIssue('uid-1', {
      ...BASE_CFG,
      twoWaySync: { deleteOnServer: false },
    });

    expect(client.deleteTask$).not.toHaveBeenCalled();
  });

  it('deletes the VTODO when the user opted in', async () => {
    const cfg: CaldavCfg = { ...BASE_CFG, twoWaySync: { deleteOnServer: true } };

    await adapter.deleteIssue('uid-1', cfg);

    expect(client.deleteTask$).toHaveBeenCalledOnceWith(cfg, 'uid-1');
  });
});
