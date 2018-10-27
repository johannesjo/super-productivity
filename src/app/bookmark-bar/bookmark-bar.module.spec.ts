import { BookmarkBarModule } from './bookmark-bar.module';

describe('BookmarkBarModule', () => {
  let bookmarkBarModule: BookmarkBarModule;

  beforeEach(() => {
    bookmarkBarModule = new BookmarkBarModule();
  });

  it('should create an instance', () => {
    expect(bookmarkBarModule).toBeTruthy();
  });
});
