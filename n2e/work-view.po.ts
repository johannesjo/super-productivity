// import {EnhancedPageObject} from 'nightwatch';
//
// const workViewPage: EnhancedPageObject = {
//   // can be string or function
//   url() {
//     return 'http://localhost:4200/';
//   },
//   elements: {
//     // shorthand, specifies selector
//     mySubmitButton: 'input[type=submit]',
//
//     // full
//     myTextInput: {
//       selector: 'input[type=text]',
//       locateStrategy: 'css selector'
//     }
//   },
//   commands: [
//     {
//       myCustomPause: function() {
//         this.api.pause(this.props.myPauseTime);
//       }
//     }
//   ],
//   // object version (best considered immutable)
//   props: {
//     myPauseTime: 1000
//   },
//
//   sections: {
//     myFooterSection: {
//       selector: '#my-footer',
//       locateStrategy: 'css selector',
//       elements: {
//         myLogo: {
//           selector: '.my-logo',
//           locateStrategy: 'css selector'
//         }
//       },
//       commands: [
//         {
//           myMoveToLogo: function() {
//             this.moveToElement('@myLogo', this.props.myLogoX, this.props.myLogoY);
//           }
//         }
//       ],
//       // function version (recommended)
//       props: function() {
//         return {
//           myLogoX: 10,
//           myLogoY: 10
//         };
//       },
//       sections: {
//         // additional, nested sections
//       }
//     }
//   }
// };
//
// module.exports = workViewPage;
