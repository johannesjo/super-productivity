import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidateStateService } from './validate-state.service';
import { RepairOperationService } from './repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { AppDataCompleteNew, PFAPI_MODEL_CFGS } from '../../../../pfapi/pfapi-config';
import { MenuTreeKind } from '../../../../features/menu-tree/store/menu-tree.model';
import { environment } from '../../../../../environments/environment';

describe('ValidateStateService', () => {
  let service: ValidateStateService;
  let mockRepairService: jasmine.SpyObj<RepairOperationService>;
  let mockStoreDelegateService: jasmine.SpyObj<PfapiStoreDelegateService>;

  const createEmptyState = (): AppDataCompleteNew => {
    const state: any = {};
    for (const key of Object.keys(PFAPI_MODEL_CFGS)) {
      state[key] = (PFAPI_MODEL_CFGS as any)[key].defaultData;
    }
    return state as AppDataCompleteNew;
  };

  beforeEach(() => {
    mockRepairService = jasmine.createSpyObj('RepairOperationService', [
      'createRepairOperation',
    ]);
    mockStoreDelegateService = jasmine.createSpyObj('PfapiStoreDelegateService', [
      'getAllSyncModelDataFromStore',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: RepairOperationService, useValue: mockRepairService },
        { provide: PfapiStoreDelegateService, useValue: mockStoreDelegateService },
      ],
    });
    service = TestBed.inject(ValidateStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle isRelatedModelDataValid throwing errors gracefully', () => {
    // Force non-production environment to ensure devError throws
    const originalEnvProduction = environment.production;
    (environment as any).production = false;

    try {
      const state = createEmptyState();

      // Introduce an orphaned project reference in menuTree
      // This triggers isRelatedModelDataValid -> devError -> throw Error
      state.menuTree = {
        ...state.menuTree,
        projectTree: [
          {
            id: 'NON_EXISTENT_PROJECT_ID',
            k: MenuTreeKind.PROJECT,
          },
        ],
      };

      // Should not throw
      const result = service.validateState(state);

      expect(result.isValid).toBeFalse();
      expect(result.crossModelError).toBeDefined();
      // The error message comes from devError/isRelatedModelDataValid
      expect(result.crossModelError).toContain('Orphaned project reference');
    } finally {
      (environment as any).production = originalEnvProduction;
    }
  });

  it('should repair orphaned menu tree nodes', () => {
    // Force non-production environment to ensure devError throws
    const originalEnvProduction = environment.production;
    (environment as any).production = false;

    try {
      const state = createEmptyState();

      // Introduce an orphaned project reference in menuTree
      state.menuTree = {
        ...state.menuTree,
        projectTree: [
          {
            id: 'NON_EXISTENT_PROJECT_ID',
            k: MenuTreeKind.PROJECT,
          },
        ],
      };

      // Should repair
      const result = service.validateAndRepair(state);

      expect(result.isValid).toBeTrue();
      expect(result.wasRepaired).toBeTrue();

      const repairedState = result.repairedState!;
      // The orphaned node should be gone
      expect(repairedState.menuTree.projectTree!.length).toBe(0);
    } finally {
      (environment as any).production = originalEnvProduction;
    }
  });
});
