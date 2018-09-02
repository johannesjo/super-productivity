import { AppStorageModule } from './app-storage.module';

describe('AppStorageModule', () => {
  let appStorageModule: AppStorageModule;

  beforeEach(() => {
    appStorageModule = new AppStorageModule();
  });

  it('should create an instance', () => {
    expect(appStorageModule).toBeTruthy();
  });
});
