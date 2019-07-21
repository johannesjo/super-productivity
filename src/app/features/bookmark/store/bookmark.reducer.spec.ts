// import {bookmarkReducer, initialBookmarkState} from './bookmark.reducer';
// import {ToggleBookmarks} from './bookmark.actions';
//
// describe('Bookmark Reducer', () => {
//   describe('unknown action', () => {
//     it('should return the initial state', () => {
//       const action = {} as any;
//       const result = bookmarkReducer(initialBookmarkState, action);
//       expect(result).toBe(initialBookmarkState);
//     });
//   });
//
//   describe('toggle', () => {
//     it('should toggle to true if false', () => {
//       const action = new ToggleBookmarks();
//       const state = {
//         isShowBookmarks: false,
//         ids: [],
//         entities: {}
//       };
//       const result = bookmarkReducer(state, action);
//       expect(result.isShowBookmarks).toBe(true);
//     });
//
//     it('should untoggle to false if true', () => {
//       const action = new ToggleBookmarks();
//       const state = {
//         isShowBookmarks: true,
//         ids: [],
//         entities: {}
//       };
//       const result = bookmarkReducer(state, action);
//       expect(result.isShowBookmarks).toBe(false);
//     });
//   });
// });
