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
      template: require('./daily-agenda-d.html'),
      bindToController: true,
      controller: DailyAgendaCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };

  }

  /* @ngInject */
  function DailyAgendaCtrl($rootScope, $scope, $window) {
    let vm = this;
    const moment = $window.moment;
    const _ = $window._;

    const MIN_DURATION_LEFT_IN_MIN_FOR_UNDONE = 15;

    vm.dayStarts = moment().subtract(0, 'h').minutes(0).seconds(0).format('HH:mm');
    vm.dayEnds = '23:00';

    vm.calendarView = 'day';
    vm.viewDate = moment().toDate();
    vm.cellIsOpen = true;

    vm.toggleSubTasks = () => {
      mapTasksToEvents($rootScope.r.tasks);
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
      _.each(tasks, (task) => {
        if (vm.showSubTasks && task.subTasks) {
          _.each(task.subTasks, (subTask) => {
            let event = mapTaskToEvent(subTask, prevEvent);
            if (event) {
              events.push(event);
              prevEvent = event;
            }
          });
        } else {
          let event = mapTaskToEvent(task, prevEvent);
          if (event) {
            events.push(event);
            prevEvent = event;
          }
        }
      });
      vm.events = events;
    }

    const watcher = $rootScope.$watch('r.tasks', (tasks) => {
      mapTasksToEvents(tasks);
    });

    $scope.$on('$destroy', () => {
      // manually unbind
      watcher();
    });
  }

})();
