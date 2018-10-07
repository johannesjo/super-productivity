import { PersistenceModule } from './persistence.module';

describe('PersistenceModule', () => {
  let persistenceModule: PersistenceModule;

  beforeEach(() => {
    persistenceModule = new PersistenceModule();
  });

  it('should create an instance', () => {
    expect(persistenceModule).toBeTruthy();
  });
});
