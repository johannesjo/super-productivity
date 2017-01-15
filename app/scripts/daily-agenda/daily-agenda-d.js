/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyAgenda
 * @description
 * # dailyAgenda
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('dailyAgenda', dailyAgenda);

  /* @ngInject */
  function dailyAgenda() {
    return {
      templateUrl: 'scripts/daily-agenda/daily-agenda-d.html',
      bindToController: true,
      controller: DailyAgendaCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };

  }

  /* @ngInject */
  function DailyAgendaCtrl($rootScope) {
    let vm = this;

    const MIN_DURATION_LEFT_IN_MIN_FOR_UNDONE = 15;

    vm.dayStarts = moment().subtract(0, 'h').minutes(0).seconds(0).format('HH:mm');
    vm.dayEnds = '23:00';

    console.log(vm.dayStarts, vm.dayEnds);
    vm.calendarView = 'day';
    vm.viewDate = moment().toDate();
    vm.cellIsOpen = true;

    vm.eventTimesChanged = function (event) {
      vm.viewDate = event.startsAt;
      alert.show('Dragged and dropped', event);
    };

    function calcEndsEnd(task, startsAtParameter) {
      let timeSpent;
      let timeEstimate = moment.duration(task.timeEstimate);
      let startsAt = moment(startsAtParameter);
      let taskDurationLeft;

      if (task.timeSpent) {
        timeSpent = moment.duration(task.timeSpent);
        if (timeSpent.asMinutes() > timeEstimate.asMinutes()) {
          taskDurationLeft = moment.duration({ minutes: MIN_DURATION_LEFT_IN_MIN_FOR_UNDONE });
        } else {
          taskDurationLeft = timeEstimate.subtract(timeSpent.asMinutes(), 'minutes');
        }
      } else {
        taskDurationLeft = timeEstimate;
      }

      return startsAt.add(taskDurationLeft.asMinutes(), 'minutes');
    }

    function mapTaskToEvent(task, prevEvent) {
      let event;
      if (task.timeEstimate && !task.isDone) {
        if (prevEvent) {
          event = {
            title: task.title,
            startsAt: moment(prevEvent.endsAt).seconds(0).milliseconds(0),
            draggable: true
          };
        } else {
          event = {
            title: task.title,
            startsAt: moment().add(0, 'minutes').seconds(0).milliseconds(0),
            draggable: true
          };
        }
        event.endsAt = calcEndsEnd(task, event.startsAt);

        event.startsAt = moment(event.startsAt).toDate();
        event.endsAt = moment(event.endsAt).toDate();
        return event;
      }
    }

    function mapTasksToEvents(tasks) {
      let events = [];
      let prevEvent = false;
      for (let i = 0; i < tasks.length; i++) {
        let event = mapTaskToEvent(tasks[i], prevEvent);
        if (event) {
          events.push(event);
          prevEvent = event;
        }
      }
      vm.events = events;
    }

    $rootScope.$watch('r.tasks', (tasks) => {
      mapTasksToEvents(tasks);
    });

  }

})();
