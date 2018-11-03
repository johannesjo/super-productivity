import { SplitModule } from './split.module';

describe('SplitModule', () => {
  let splitModule: SplitModule;

  beforeEach(() => {
    splitModule = new SplitModule();
  });

  it('should create an instance', () => {
    expect(splitModule).toBeTruthy();
  });
});
