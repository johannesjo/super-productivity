import { PagesModule } from './pages.module';

describe('PagesModule', () => {
  let pagesModule: PagesModule;

  beforeEach(() => {
    pagesModule = new PagesModule();
  });

  it('should create an instance', () => {
    expect(pagesModule).toBeTruthy();
  });
});
