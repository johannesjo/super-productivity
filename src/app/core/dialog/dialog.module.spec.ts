import { DialogModule } from './dialog.module';

describe('DialogModule', () => {
  let dialogModule: DialogModule;

  beforeEach(() => {
    dialogModule = new DialogModule();
  });

  it('should create an instance', () => {
    expect(dialogModule).toBeTruthy();
  });
});
