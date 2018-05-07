(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-slide-up-down', slideAnimation);

  const DUR_ENTER = 0.225;
  const DUR_LEAVE = 0.195;
  // $ani-standard-timing
  const EASE_ENTER = 'cubic-bezier(0, 0, .2, 1)';
  const EASE_LEAVE = 'cubic-bezier(.4, 0, 1, 1)';

  const animationSpeed = (isEnter, height) => {
    let baseDur = isEnter ? DUR_ENTER : DUR_LEAVE;

    if (height >= 450) {
      return baseDur * 1.25;
    } else if (height > 200 && height < 450) {
      return baseDur;
    } else {
      return baseDur;
    }
  };

  /* @ngInject */
  function slideAnimation($animateCss) {

    function show($el) {
      const el = $el[0];
      //const sh = el.scrollHeight;
      const height = el.offsetHeight;
      return $animateCss($el, {
        from: {
          height: '0',
          opacity: 0,
        },
        to: {
          height: height + 'px',
          opacity: 1,
        },
        duration: animationSpeed(height),
        easing: EASE_ENTER,
        cleanupStyles: true
      });
    }

    function hide($el) {
      const el = $el[0];
      //const sh = el.scrollHeight;
      const height = el.offsetHeight;
      return $animateCss($el, {
        from: {
          height: height + 'px',
          opacity: 1
        },
        to: {
          height: '0',
          opacity: 0
        },
        duration: animationSpeed(height),
        easing: EASE_LEAVE,
        cleanupStyles: true
      });
    }

    return {
      enter: show,
      leave: hide,

      // todo maybe check if it was the right class
      addClass: hide,
      removeClass: show,
    };
  }
}());


