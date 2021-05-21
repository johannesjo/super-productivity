// import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
// import { AppDataComplete } from '../sync/sync.model';
//
// let i: number = 0;
//
// const KEY_TO_REPLACE = [
//   'username',
//   'userName',
//   'password',
//   'token',
//   'notes',
//   'authCode',
//   'accessToken',
//   'host',
//   'gitlabBaseUrl',
//   'syncFilePath',
//   'title',
//   'originalImgPath',
//   'path',
//   'content',
// ];
//
// const maskString = (key: string, val: string, counter: number): string => {
//   if (KEY_TO_REPLACE.includes(key) && val.length > 0) {
//     return `${key}__${counter}`;
//   } else {
//     return val;
//   }
// };
//
// const recurse = (obj: any) => {
//   // eslint-disable-next-line guard-for-in
//   for (const key in obj) {
//     if (Object.prototype.hasOwnProperty.call(obj, key)) {
//       const val = obj[key];
//       if (Array.isArray(val)) {
//         val.forEach((arrVal) => {
//           if (typeof arrVal === 'object' && arrVal !== null) {
//             recurse(arrVal);
//           }
//         });
//       } else if (typeof val === 'object' && val !== null) {
//         recurse(val);
//       } else if (typeof val === 'string') {
//         obj[key] = maskString(key, val, i);
//       }
//     }
//     i++;
//   }
// };
//
// export const privacyExport = (d: AppDataComplete): string => {
//   const cpy = dirtyDeepCopy(d);
//   recurse(cpy);
//
//   return JSON.stringify(cpy);
// };
