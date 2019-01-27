import { RootStoreModule } from './root-store.module';

describe('RootStoreModule', () => {
  let rootStoreModule: RootStoreModule;

  beforeEach(() => {
    rootStoreModule = new RootStoreModule();
  });

  it('should create an instance', () => {
    expect(rootStoreModule).toBeTruthy();
  });
});
