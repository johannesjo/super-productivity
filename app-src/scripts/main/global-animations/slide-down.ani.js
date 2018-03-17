//(function() {
//  'use strict';
//
//  angular
//    .module('superProductivity')
//    .animation('.ani-slide-up-down', slideAnimation);
//
//  /* @ngInject */
//  function slideAnimation() {
//    // placeholder for later
//
//    return {
//      enter: function($el, doneFn) {
//        const el = $el[0];
//        const ch = el.clientHeight;
//        const sh = el.scrollHeight;
//        const noHeightSet = !el.style.height;
//        const isCollapsed = true;
//
//        el.style.maxHeight = (isCollapsed || noHeightSet ? sh : 0) + 'px';
//
//        console.log(el);
//        //$(el).slideIn(1000, doneFn);
//        //return $animateCss(el, {
//        //  event: 'enter',
//        //  structural: true,
//        //  addClass: 'maroon-setting',
//        //  from: { height: 0 },
//        //  to: { height: 200 }
//        //});
//
//        doneFn();
//      }
//    }
//  }
//}());
//
//
