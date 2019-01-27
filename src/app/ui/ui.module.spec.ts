import { UiModule } from './ui.module';

describe('UiModule', () => {
  let uiModule: UiModule;

  beforeEach(() => {
    uiModule = new UiModule();
  });

  it('should create an instance', () => {
    expect(uiModule).toBeTruthy();
  });
});
