import { SpeedDialMenuModule } from './speed-dial-menu.module';

describe('SpeedDialMenuModule', () => {
  let speedDialMenuModule: SpeedDialMenuModule;

  beforeEach(() => {
    speedDialMenuModule = new SpeedDialMenuModule();
  });

  it('should create an instance', () => {
    expect(speedDialMenuModule).toBeTruthy();
  });
});
