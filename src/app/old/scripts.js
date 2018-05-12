"use strict";
var _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(n) {
  return typeof n
} : function(n) {
  return n && "function" == typeof Symbol && n.constructor === Symbol && n !== Symbol.prototype ? "symbol" : typeof n
}, _createClass = function() {
  function i(n, t) {
    for (var e = 0; e < t.length; e++) {
      var i = t[e];
      i.enumerable = i.enumerable || !1, i.configurable = !0, "value" in i && (i.writable = !0), Object.defineProperty(n, i.key, i)
    }
  }

  return function(n, t, e) {
    return t && i(n.prototype, t), e && i(n, e), n
  }
}();

function _toConsumableArray(n) {
  if (Array.isArray(n)) {
    for (var t = 0, e = Array(n.length); t < n.length; t++) e[t] = n[t];
    return e
  }
  return Array.from(n)
}

function _classCallCheck(n, t) {
  if (!(n instanceof t)) throw new TypeError("Cannot call a class as a function")
}

!function() {
  function n() {
    console.log("RELOAD RIGHT AWAY"), !0 === window.confirm("Super Productivity has been updated to a new version. Reload the page to refresh the cache?") && window.location.reload(!0)
  }

  if (y.$inject = ["IS_ELECTRON", "GoogleDriveSync", "$mdDialog"], S.$inject = ["$rootScope", "AppStorage"], u.$inject = ["$rootScope", "Dialogs"], k.$inject = ["IS_ELECTRON", "$http", "Git", "VERSION", "$mdToast", "Util"], v.$inject = ["$rootScope", "$timeout"], f.$inject = ["Notifier"], T.$inject = ["IS_ELECTRON"], b.$inject = ["SimpleToast", "IS_ELECTRON"], g.$inject = ["IS_ELECTRON", "LocalSync"], h.$inject = ["IS_ELECTRON", "LocalSync"], l.$inject = ["$document", "Dialogs", "$rootScope", "CheckShortcutKeyCombo", "IS_ELECTRON", "$state", "AddTaskBarGlobal"], p.$inject = ["$document", "$window", "IS_ELECTRON"], c.$inject = ["TimeTracking"], m.$inject = ["$rootScope", "Git", "$interval", "GIT_UPDATE_POLL_INTERVAL"], d.$inject = ["$rootScope", "Jira", "IS_ELECTRON", "$interval", "JIRA_UPDATE_POLL_INTERVAL"], r.$inject = ["AppStorage"], e.$inject = ["$httpProvider", "$compileProvider"], i.$inject = ["angularPromiseButtonsProvider"], s.$inject = ["$qProvider"], o.$inject = ["markedProvider"], a.$inject = ["$mdThemingProvider", "THEMES"], window.applicationCache.addEventListener("updateready", n), window.applicationCache.status === window.applicationCache.UPDATEREADY && n(), "function" == typeof require) {
    window.isElectron = !0;
    var t = require("electron").ipcRenderer;
    window.ipcRenderer = t
  }

  function e(n, t) {
    n.useApplyAsync(!0), t.cssClassDirectivesEnabled(!1), t.commentDirectivesEnabled(!1)
  }

  function i(n) {
    n.extendConfig({
      spinnerTpl: '<div class="btn-spinner"></div>',
      disableBtn: !0,
      btnLoadingClass: "is-loading",
      minDuration: 100,
      priority: 100
    })
  }

  function o(n) {
    n.setRenderer({
      link: function(n, t, e) {
        return '<a href="' + n + '"' + (t ? ' title="' + t + '"' : " ") + 'target="_blank" external-link class="md-accent">' + e + "</a>"
      }
    })
  }

  function a(n, t) {
    n.theme("default").primaryPalette("blue");
    for (var e = t, i = 0; i < e.length; ++i) n.theme(e[i] + "-theme")
      .primaryPalette(e[i]), n.enableBrowserColor({
      theme: e[i] + "-theme",
      palette: "accent",
      hue: "400"
    }), n.theme(e[i] + "-dark").primaryPalette(e[i])
      .dark(), n.enableBrowserColor({ theme: e[i] + "-dark", palette: "accent", hue: "400" });
    n.alwaysWatchTheme(!0)
  }

  function s(n) {
    n.errorOnUnhandledRejections(!1)
  }

  function r(n) {
    n.loadLsDataToApp()
  }

  function l(n, t, e, i, o, a, s) {
    document.addEventListener("keydown", function(n) {
      "INPUT" !== n.target.tagName && "TEXTAREA" !== n.target.tagName && (i(n, e.r.keys.addNewTask) && (s.show(), e.$apply()), i(n, e.r.keys.openProjectNotes) && t("NOTES", void 0, !0), i(n, e.r.keys.openDistractionPanel) && t("DISTRACTIONS", void 0, !0), i(n, e.r.keys.showHelp) && t("HELP", { template: "PAGE" }, !0), i(n, e.r.keys.goToDailyPlanner) && a.go("daily-planner"), i(n, e.r.keys.goToWorkView) && a.go("work-view"), i(n, e.r.keys.goToDailyAgenda) && a.go("daily-agenda"), i(n, e.r.keys.goToSettings) && a.go("settings"), i(n, e.r.keys.goToFocusMode) && a.go("focus-view")), o && i(n, "Ctrl+Shift+J") && window.ipcRenderer.send("TOGGLE_DEV_TOOLS")
    });
    o && e.r.keys && e.r.keys.globalShowHide && window.ipcRenderer.send("REGISTER_GLOBAL_SHORTCUT", e.r.keys.globalShowHide)
  }

  function c(n) {
    n.init()
  }

  function d(n, t, e, i, o) {
    e && (t.isSufficientJiraSettings() && t.checkForUpdates(n.r.tasks), i(function() {
      t.isSufficientJiraSettings() && t.checkForUpdates(n.r.tasks)
    }, o))
  }

  function m(n, t, e, i) {
    n.r.git.projectDir && n.r.git.repo && t.checkAndUpdateTasks(n.r.tasks), e(function() {
      n.r.git.projectDir && n.r.git.repo && t.checkAndUpdateTasks(n.r.tasks)
    }, i)
  }

  function u(n, t) {
    n.r.uiHelper.isShowWelcomeDialog && t("WELCOME", void 0, !0)
  }

  function p(n, t, e) {
    if (e) {
      var a = require("electron").webFrame;
      t.Hamster(n[0]).wheel(function(n, t, e, i) {
        if (n.originalEvent && n.originalEvent.ctrlKey) {
          var o = a.getZoomFactor();
          1 === i ? a.setZoomFactor(o + .05) : -1 === i && a.setZoomFactor(o - .05)
        }
      })
    }
  }

  function g(n, t) {
    n && t.initBackupsIfEnabled()
  }

  function h(n, t) {
    n && t.initSyncIfEnabled()
  }

  function k(n, t, e, o, a, s) {
    if (n) {
      e.getLatestSpRelease().then(function(n) {
        var t = n && n.data, e = t && t.name;
        if (e && 0 < function(n, t) {
            for (var e = n.split("."), i = t.split("."), o = 0; o < 3; o++) {
              var a = Number(e[o]), s = Number(i[o]);
              if (s < a) return 1;
              if (a < s) return -1;
              if (!isNaN(a) && isNaN(s)) return 1;
              if (isNaN(a) && !isNaN(s)) return -1
            }
            return 0
          }(e, o)) {
          var i = a.simple()
            .textContent("There is a new Version of Super Productivity (" + e + ") available.")
            .action("Download").hideDelay(2e4).position("bottom");
          a.show(i).then(function(n) {
            "ok" === n && s.openExternalUrl("https://github.com/johannesjo/super-productivity/releases")
          }).catch(function() {
          })
        }
      })
    }
  }

  function v(i, n) {
    n(function() {
      var n = window.moment, t = n(), e = i.r.startedTimeToday;
      e && n(e).isSame(n(), "day") ? i.r.startedTimeToday = n(e) : i.r.startedTimeToday = t
    })
  }

  function f(t) {
    var e = "SP_MULTI_INSTANCE_KEY", i = "SP_MULTI_INSTANCE_SHUTDOWN_KEY", o = !1, n = function(n) {
      n.key === i ? o || (t({
        title: "Shutting additional instance",
        message: "To avoid trouble it's best to always run just one instance of Super Productivity.",
        sound: o = !0,
        wait: !0
      }), window.location.assign("https://github.com/johannesjo/super-productivity")) : n.key === e && (localStorage.setItem(i, "Something"), setTimeout(function() {
        localStorage.removeItem(i)
      }, 50))
    };
    window.addEventListener ? window.addEventListener("storage", n, !1) : window.attachEvent && window.attachEvent("onstorage", n), localStorage.setItem(e, Date.now())
  }

  function b(i, n) {
    n && window.ipcRenderer.on("ELECTRON_ERROR", function(n, t) {
      var e = t.error;
      "string" != typeof e && (e = "Please check the console!"), i("ERROR", "Electron Error: " + e), console.error("Electron Error: " + t.error), console.log("Stacktrace: ", t.stack)
    })
  }

  function y(n, t, e) {
    var i = "SHUTDOWN_NOW", o = function() {
      var n = e.confirm().title("Some error occurred while syncing")
        .textContent("\n        Some error occurred while syncing to Google Drive (check the console). Do you want to quit anyway?")
        .ok("Yes").cancel("No!");
      e.show(n).then(function() {
        window.ipcRenderer.send(i, {})
      })
    };
    n && window.ipcRenderer.on("ON_BEFORE_QUIT", function() {
      t.config.isAutoSyncToRemote ? t.saveForSyncIfEnabled().then(function() {
        window.ipcRenderer.send(i, {})
      }).catch(o) : window.ipcRenderer.send(i, {})
    })
  }

  function T(n) {
    n && window.ipcRenderer.send("APP_READY", {})
  }

  function S(n, t) {
    window.onbeforeunload = window.onunload = function() {
      if (n.r.lastActiveTime = new Date, t.saveToLs(), n.r.config && n.r.config.isConfirmBeforeExit) return "Are you sure you want to leave?"
    }
  }

  angular.module("superProductivity", ["ngAnimate", "ngAria", "ngResource", "ui.router", "ngMaterial", "ngMdIcons", "as.sortable", "angularMoment", "hc.marked", "mwl.calendar", "mdxUtil", "angularPromiseButtons"])
    .config(a).config(o).config(s).config(i).config(e).run(r).run(d).run(m).run(c).run(p).run(l)
    .run(h).run(g).run(b).run(T).run(f).run(v).run(k).run(u).run(S).run(function() {
    /Android/.test(navigator.appVersion) && window.addEventListener("resize", function() {
      ("INPUT" === document.activeElement.tagName || "TEXTAREA" === document.activeElement.tagName || document.activeElement.getAttribute("contenteditable")) && window.setTimeout(function() {
        document.activeElement.scrollIntoViewIfNeeded()
      }, 0)
    })
  }).run(y)
}(), function() {
  var n = function() {
    function a(n, t, e, i, o) {
      _classCallCheck(this, a), this.Git = n, this.Jira = t, this.$rootScope = e, this.$filter = i, this.Tasks = o, this.taskSuggestions = [], this.refreshRemoteTasks()
    }

    return a.$inject = ["Git", "Jira", "$rootScope", "$filter", "Tasks"], _createClass(a, [{
      key: "getFilteredTaskSuggestions",
      value: function(n) {
        return n ? this.$filter("filter")(this.taskSuggestions, n, !1, "title") : this.taskSuggestions
      }
    }, {
      key: "refreshRemoteTasks", value: function() {
        var t = this;
        this.taskSuggestions = [], this.Jira.isSufficientJiraSettings() && (this.Jira.checkForNewAndAddToBacklog(), this.Jira.getSuggestions()
          .then(function(n) {
            t.taskSuggestions = t.taskSuggestions.concat(t.Jira.transformIssues(n))
          })), this.Git.checkForNewAndAddToBacklog(), this.Git.isRepoConfigured() && this.$rootScope.r.git.isShowIssuesFromGit && this.Git.getIssueList()
          .then(function(n) {
            t.taskSuggestions = t.taskSuggestions.concat(n.data)
          })
      }
    }, {
      key: "addTask", value: function() {
        var t = this;
        this.newTask ? this.newTask.originalType && "GITHUB" === this.newTask.originalType && this.$rootScope.r.git.isShowIssuesFromGit ? this.Git.getCommentListForIssue(this.newTask.originalId)
          .then(function(n) {
            t.newTask.originalComments = n.data, t.Tasks.addToday(t.newTask), t.newTask = void 0, t.newTaskTitle = void 0
          }) : (this.Tasks.addToday(this.newTask), this.newTask = void 0, this.newTaskTitle = void 0) : this.newTaskTitle ? (this.Tasks.addToday({ title: this.newTaskTitle }), this.newTaskTitle = void 0) : this.onEmptySubmit && this.onEmptySubmit()
      }
    }]), a
  }();
  angular.module("superProductivity").component("addTaskBar", {
    templateUrl: "scripts/add-task-bar/add-task-bar-cp.html",
    controller: n,
    controllerAs: "vm",
    bindings: { onEmptySubmit: "&", onBlur: "&", newTaskTitle: "=?" }
  }), n.$$ngIsClass = !0
}(), function() {
  var n = function n(t, e) {
    _classCallCheck(this, n), this.model = t.model, t.setFocusEl(e)
  };
  n.$inject = ["AddTaskBarGlobal", "$element"], angular.module("superProductivity")
    .component("addTaskBarGlobal", {
      templateUrl: "scripts/add-task-bar/add-task-bar-global-cp.html",
      controller: n,
      controllerAs: "vm",
      bindToController: {}
    }), n.$$ngIsClass = !0
}(), function() {
  var n = function() {
    function i(n, t, e) {
      _classCallCheck(this, i), this.model = {}, this.Git = n, this.Jira = t, this.$rootScope = e
    }

    return i.$inject = ["Git", "Jira", "$rootScope"], _createClass(i, [{
      key: "setFocusEl",
      value: function(n) {
        this.focuesEl = n
      }
    }, {
      key: "show", value: function(n) {
        var t = this;
        this.model.newTaskTitle = "", this.model.isShowFromBottom = n, this.model.isShow = !this.model.isShow, this.focuesEl && setTimeout(function() {
          t.focuesEl.find("input").focus()
        })
      }
    }, {
      key: "hide", value: function() {
        this.model.isShow = !1
      }
    }]), i
  }();
  angular.module("superProductivity").service("AddTaskBarGlobal", n), n.$$ngIsClass = !0
}(), function() {
  function n() {
  }

  angular.module("superProductivity").directive("agendaAndHistory", function() {
    return {
      templateUrl: "scripts/agenda-and-history/agenda-and-history-d.html",
      bindToController: !0,
      controller: n,
      controllerAs: "vm",
      restrict: "E",
      scope: !0
    }
  })
}(), function() {
  function n(n, t, e) {
    var o = this, c = e.moment, a = e._, d = 15;

    function s(n, t) {
      var e, i, o, a, s, r, l = void 0;
      if (n.timeEstimate && !n.isDone) return (l = t ? {
        title: n.title,
        startsAt: c(t.endsAt).seconds(0).milliseconds(0),
        draggable: !0
      } : {
        title: n.title,
        startsAt: c().add(0, "minutes").seconds(0).milliseconds(0),
        draggable: !0
      }).endsAt = (e = n, i = l.startsAt, o = void 0, a = c.duration(e.timeEstimate), s = c(i), r = void 0, r = e.timeSpent ? (o = c.duration(e.timeSpent)).asMinutes() > a.asMinutes() ? c.duration({ minutes: d }) : a.subtract(o.asMinutes(), "minutes") : a, s.add(r.asMinutes(), "minutes")), l.startsAt = c(l.startsAt)
        .toDate(), l.endsAt = c(l.endsAt).toDate(), l
    }

    function i(n) {
      var e = [], i = !1;
      a.each(n, function(n) {
        if (o.showSubTasks && n.subTasks) a.each(n.subTasks, function(n) {
          var t = s(n, i);
          t && (e.push(t), i = t)
        }); else {
          var t = s(n, i);
          t && (e.push(t), i = t)
        }
      }), o.events = e
    }

    o.dayStarts = c().subtract(0, "h").minutes(0).seconds(0)
      .format("HH:mm"), o.dayEnds = "23:00", o.calendarView = "day", o.viewDate = c()
      .toDate(), o.cellIsOpen = !0, o.toggleSubTasks = function() {
      i(n.r.tasks)
    };
    var r = n.$watch("r.tasks", function(n) {
      i(n)
    });
    t.$on("$destroy", function() {
      r()
    })
  }

  n.$inject = ["$rootScope", "$scope", "$window"], angular.module("superProductivity")
    .directive("dailyAgenda", function() {
      return {
        templateUrl: "scripts/agenda-and-history/daily-agenda/daily-agenda-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(t, i, o, e, n) {
    var a = this;
    a.worklog = t.getCompleteWorkLog(), a.createTasksForDay = function(n) {
      var e = [], i = angular.copy(n);
      return _.each(i.entries, function(n) {
        var t = n.task;
        t.timeSpent = n.timeSpent, t.dateStr = i.dateStr, e.push(t)
      }), e
    }, a.createTasksForMonth = function(n) {
      var t = [], e = angular.copy(n);
      return _.each(e.entries, function(n) {
        t = t.concat(a.createTasksForDay(n))
      }), t
    }, a.exportData = function(n, t) {
      if ("MONTH" === n) {
        var e = a.createTasksForMonth(t);
        i("SIMPLE_TASK_SUMMARY", {
          settings: o.r.uiHelper.timeTrackingHistoryExportSettings,
          tasks: e,
          finishDayFn: !1
        }, !0)
      }
    }, [n.PROJECT_CHANGED, n.COMPLETE_DATA_RELOAD].forEach(function(n) {
      e.$on(n, function() {
        console.log("IAM"), a.worklog = t.getCompleteWorkLog()
      })
    })
  }

  n.$inject = ["Tasks", "Dialogs", "$rootScope", "$scope", "EV"], angular.module("superProductivity")
    .directive("timeTrackingHistory", function() {
      return {
        templateUrl: "scripts/agenda-and-history/time-tracking-history/time-tracking-history-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(i) {
    return {
      link: function(n, t) {
        var e = i(function() {
          var n = t.find("input");
          n.focus()
        }, 30);
        n.$on("$destroy", function() {
          i.cancel(e)
        })
      }, restrict: "A"
    }
  }

  n.$inject = ["$timeout"], angular.module("superProductivity")
    .directive("autofocusAutocomplete", n)
}(), function() {
  function n(n, t) {
    var e = this;
    t.attr("counter") && (e.isCounter = !0), n(function() {
      e.isInitiallyExpanded && (e.isExpanded = !0)
    }), e.toggleExpand = function() {
      e.isExpanded = !e.isExpanded, e.isExpanded ? t.addClass("is-expanded") : t.removeClass("is-expanded")
    }, e.execAction = function(n) {
      n.preventDefault(), n.stopPropagation(), e.btnAction()
    }
  }

  n.$inject = ["$timeout", "$element"], angular.module("superProductivity")
    .component("collapsible", {
      templateUrl: "scripts/collapsible/collapsible-d.html",
      bindToController: !0,
      controller: n,
      controllerAs: "vm",
      restrict: "AE",
      transclude: !0,
      bindings: {
        title: "@collapsibleTitle",
        icon: "@",
        isInitiallyExpanded: "@",
        btnAction: "&",
        btnIcon: "@",
        counter: "<"
      }
    })
}(), angular.module("superProductivity").constant("DEFAULT_THEME", "blue-theme")
  .constant("GOOGLE", {
    CLIENT_ID: "37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com",
    API_KEY: "AIzaSyBqr3r5B5QGb_drLTK8_q9HW7YUez83Bik"
  })
  .constant("GLOBAL_LS_FIELDS", ["currentProject", "projects", "keys", "isShowWelcomeDialog", "config", "keys", "googleDriveSync", "googleTokens", "lastActiveTime"])
  .constant("ON_DEMAND_LS_FIELDS", ["doneBacklogTasks"])
  .constant("TMP_FIELDS", ["$$hashKey", "$$mdSelectId", "bodyClass", "$$applyAsyncQueue", "$$asyncQueue", "$$childHead", "$$childTail", "$$destroyed", "$$isolateBindings", "$$listenerCount", "$$listeners", "$$nextSibling", "$$phase", "$$postDigestQueue", "$$prevSibling", "$$watchers", "$$watchersCount", "$id", "$parent", "$root", "$state"])
  .constant("ON_DEMAND_LS_FIELDS_FOR_PROJECT", ["data"]).constant("EV", {
    UPDATE_CURRENT_TASK: "UPDATE_CURRENT_TASK",
    IS_IDLE: "IS_IDLE",
    IS_BUSY: "IS_BUSY",
    IPC_EVENT_POMODORO_UPDATE: "IPC_EVENT_POMODORO_UPDATE",
    PROJECT_CHANGED: "PROJECT_CHANGED",
    COMPLETE_DATA_RELOAD: "COMPLETE_DATA_RELOAD"
  }).constant("LS_DEFAULTS", {
    note: void 0,
    tomorrowsNote: void 0,
    theme: void 0,
    currentTask: void 0,
    lastActiveTaskTask: void 0,
    lastActiveTime: void 0,
    startedTimeToday: void 0,
    currentProject: void 0,
    currentSession: {
      isTimeSheetExported: !1,
      timeWorkedWithoutBreak: void 0,
      pomodoro: { status: void 0, isOnBreak: !1, currentCycle: 0, currentSessionTime: void 0 }
    },
    googleTokens: { accessToken: void 0, refreshToken: void 0, expiresAt: void 0 },
    googleDriveSync: { backupDocId: void 0, lastLocalUpdate: void 0, lastSyncToRemote: void 0 },
    tasks: [],
    backlogTasks: [],
    doneBacklogTasks: [],
    distractions: [],
    projects: [],
    globalLinks: [],
    git: {
      isShowIssuesFromGit: !1,
      isAutoImportToBacklog: !1,
      repo: "",
      projectDir: void 0,
      prPrefix: "Check PR: "
    },
    keys: {
      globalShowHide: "Ctrl+Shift+X",
      goToDailyPlanner: "p",
      goToWorkView: "w",
      goToFocusMode: "F",
      goToDailyAgenda: "",
      goToSettings: "",
      addNewTask: "*",
      showHelp: "?",
      openProjectNotes: "N",
      openDistractionPanel: "D",
      taskEditTitle: "e",
      taskToggleNotes: "n",
      taskOpenEstimationDialog: "t",
      taskToggleDone: "d",
      taskAddSubTask: "+",
      taskDelete: "Delete",
      taskOpenOriginalLink: "o",
      selectPreviousTask: "k",
      selectNextTask: "j",
      moveTaskUp: "Ctrl+Shift+ArrowUp",
      moveTaskDown: "Ctrl+Shift+ArrowDown",
      moveToBacklog: "B",
      moveToTodaysTasks: "T",
      expandSubTasks: "",
      collapseSubTasks: "",
      togglePlay: "y"
    },
    config: {
      googleDriveSync: {
        isEnabled: !1,
        isAutoLogin: !1,
        isLoadRemoteDataOnStartup: !1,
        isAutoSyncToRemote: !1,
        isNotifyOnSync: !0,
        syncFileName: "SUPER_PRODUCTIVITY_SYNC.json",
        syncInterval: moment.duration(1, "minutes")
      },
      automaticBackups: {
        isEnabled: !1,
        path: "~/backup-{date}.json",
        intervalInSeconds: 6,
        isSyncEnabled: !1,
        syncPath: "~/sync.json"
      },
      pomodoro: {
        isEnabled: !0,
        duration: moment.duration(45, "minutes"),
        breakDuration: moment.duration(5, "minutes"),
        longerBreakDuration: moment.duration(15, "minutes"),
        cyclesBeforeLongerBreak: 4,
        isStopTrackingOnBreak: !0,
        isStopTrackingOnLongBreak: !0,
        isShowDistractionsOnBreak: !0,
        isManualContinue: !1,
        isPlaySound: !0,
        isGoToWorkView: !1
      },
      isNotifyWhenTimeEstimateExceeded: !1,
      isBlockFinishDayUntilTimeTimeTracked: !1,
      isConfirmBeforeExit: !1,
      isShowTimeWorkedWithoutBreak: !1,
      isTakeABreakEnabled: !1,
      takeABreakMinWorkingTime: void 0,
      isAutoStartNextTask: !0,
      isEnableIdleTimeTracking: !0,
      minIdleTime: moment.duration(5, "minutes"),
      isShortSyntaxEnabled: !0,
      takeABreakMessage: "Take a break! You have been working for ${duration} without one. Go away from the computer! Take a short walk! Makes you more productive in the long run!"
    },
    uiHelper: {
      isShowWelcomeDialog: !0,
      isShowBookmarkBar: !1,
      dailyTaskExportSettings: {
        separateBy: ", ",
        separateFieldsBy: "",
        isUseNewLine: !1,
        isListSubTasks: !0,
        isListDoneOnly: !1,
        isWorkedOnTodayOnly: !0,
        showTitle: !0,
        showTime: !1,
        showDate: !1
      },
      timeSheetExportSettings: {
        spreadsheetId: void 0,
        isAutoLogin: !1,
        isAutoFocusEmpty: !1,
        isRoundWorkTimeUp: void 0,
        roundStartTimeTo: void 0,
        roundEndTimeTo: void 0,
        roundWorkTimeTo: void 0,
        defaultValues: ["AASDAS"]
      },
      timeTrackingHistoryExportSettings: {
        separateBy: "",
        separateFieldsBy: ";",
        isUseNewLine: !0,
        isListSubTasks: !0,
        isListDoneOnly: !1,
        isWorkedOnTodayOnly: !0,
        showTitle: !0,
        showTimeSpent: !0,
        isTimeSpentAsMilliseconds: !0,
        showDate: !1
      },
      csvExportSettings: {
        separateBy: "",
        separateFieldsBy: ";",
        isUseNewLine: !0,
        isListSubTasks: !0,
        isListDoneOnly: !1,
        isWorkedOnTodayOnly: !0,
        showTitle: !0,
        showTimeSpent: !0,
        isTimeSpentAsMilliseconds: !0,
        showDate: !1
      },
      dailyAgenda: { showSubTasks: !0 }
    },
    jiraSettings: {
      isJiraEnabled: !1,
      isFirstLogin: !0,
      isWorklogEnabled: !0,
      isAutoWorklog: !1,
      isCheckToReAssignTicketOnTaskStart: !0,
      isUpdateIssueFromLocal: !1,
      isAddWorklogOnSubTaskDone: !0,
      defaultTransitionInProgress: void 0,
      defaultTransitionDone: void 0,
      jqlQuery: "assignee = currentUser() AND resolution = Unresolved ORDER BY updatedDate DESC",
      isEnabledAutoAdd: !0,
      jqlQueryAutoAdd: "assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved ORDER BY updatedDate DESC",
      userName: void 0,
      password: void 0,
      host: void 0,
      isTransitionIssuesEnabled: !0,
      transitions: { OPEN: "ALWAYS_ASK", IN_PROGRESS: "ALWAYS_ASK", DONE: "ALWAYS_ASK" },
      userToAssignOnDone: void 0
    }
  }).constant("SAVE_APP_STORAGE_POLL_INTERVAL", 1e3).constant("BACKUP_POLL_INTERVAL", 6e4)
  .constant("REQUEST_TIMEOUT", 15e3).constant("WORKLOG_DATE_STR_FORMAT", "YYYY-MM-DD")
  .constant("JIRA_UPDATE_POLL_INTERVAL", 3e5).constant("GIT_UPDATE_POLL_INTERVAL", 3e5)
  .constant("TRACKING_INTERVAL", 1e3).constant("IS_ELECTRON", void 0 !== window.ipcRenderer)
  .constant("IS_EXTENSION", "IS_ENABLED" === window.localStorage.getItem("SUPER_PRODUCTIVITY_CHROME_EXTENSION"))
  .constant("THEMES", ["red", "pink", "purple", "deep-purple", "indigo", "blue", "light-blue", "cyan", "teal", "green", "light-green", "lime", "yellow", "amber", "orange", "deep-orange", "brown", "grey", "blue-grey"]), function() {
  function n(n, t, e, i, o, a, s, r, l, c, d, m, u, p) {
    var g = this, h = this;
    h.init = function() {
      h.limitBacklogTo = 3, h.backlogTasks = o.getBacklog(), h.isRemoteTasks = n && l.isSufficientJiraSettings() || t.r.git.isAutoImportToBacklog
    }, h.init(), h.done = function() {
      h.currentTask ? r.go("work-view") : s("TASK_SELECTION").then(function() {
        r.go("work-view")
      })
    }, h.onEmptySubmit = function() {
      0 < t.r.tasks.length && g.done()
    }, h.deleteBacklog = function() {
      var n = m.confirm().title("Would you like to delete all backlog tasks?")
        .textContent("All tasks will be deleted locally. Remote tasks can be re-imported but local tasks will be lost forever.")
        .ariaLabel("Delete Backlog").ok("Please do it!").cancel("Better not");
      m.show(n).then(function() {
        o.clearBacklog(), h.backlogTasks = o.getBacklog()
      })
    };
    var k = p(function() {
      h.totaleEstimate = a.calcTotalEstimate(t.r.tasks), h.totaleEstimateBacklog = a.calcTotalEstimate(t.r.backlogTasks)
    }, 500);
    i.$on("$destroy", function() {
      k && p.cancel(k)
    }), [u.PROJECT_CHANGED, u.COMPLETE_DATA_RELOAD].forEach(function(n) {
      i.$on(n, function() {
        h.init()
      })
    })
  }

  n.$inject = ["IS_ELECTRON", "$rootScope", "$window", "$scope", "Tasks", "TasksUtil", "Dialogs", "$state", "Jira", "$filter", "Git", "$mdDialog", "EV", "$interval"], angular.module("superProductivity")
    .directive("dailyPlanner", function() {
      return {
        templateUrl: "scripts/daily-planner/daily-planner-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(n, t, e, i, o, a, s, r, l, c, d, m, u) {
    var p = 500, g = void 0, h = this;

    function k(n) {
      h.showSuccessAnimation = !0, g = l(function() {
        n && n()
      }, p)
    }

    h.IS_ELECTRON = r, h.todayStr = e.getTodayStr(), h.doneTasks = t.getDoneToday(), h.totalTimeSpentTasks = t.getTotalTimeWorkedOnTasksToday(), h.totalTimeSpentToday = t.getTimeWorkedToday(), n.r.git && n.r.git.projectDir && s.get(n.r.git.projectDir)
      .then(function(n) {
        h.commitLog = n
      }), h.showExportModal = function() {
      o("SIMPLE_TASK_SUMMARY", {
        settings: n.r.uiHelper.dailyTaskExportSettings,
        finishDayFn: h.finishDay,
        tasks: t.getToday()
      }, !0)
    }, h.showTimeSheetExportModal = function() {
      o("TIME_SHEET_EXPORT", {
        settings: n.r.uiHelper.dailyTaskExportSettings,
        finishDayFn: h.finishDay,
        tasks: t.getToday()
      }, !0)
    }, h.finishDay = function() {
      n.r.tomorrowsNote = h.tomorrowsNote, t.finishDay(h.clearDoneTasks, h.moveUnfinishedToBacklog), d.saveToLs(), !r && m.config && m.config.isAutoSyncToRemote && (u("CUSTOM", "Syncing Data to Google Drive.", "file_upload"), m.saveTo()), r ? i.show(i.confirm()
        .clickOutsideToClose(!1).title("All Done! Shutting down now..")
        .textContent("You work is done. Time to go home!").ariaLabel("Alert Shutdown")
        .ok("Aye aye! Shutdown!").cancel("No, just clear the tasks")).then(function() {
        k(function() {
          window.ipcRenderer.send("SHUTDOWN")
        })
      }, function() {
        k(function() {
          a.go("daily-planner")
        })
      }) : k(function() {
        a.go("daily-planner")
      })
    }, c.$on("$destroy", function() {
      g && l.cancel(g)
    })
  }

  n.$inject = ["$rootScope", "Tasks", "TasksUtil", "$mdDialog", "Dialogs", "$state", "GitLog", "IS_ELECTRON", "$timeout", "$scope", "AppStorage", "GoogleDriveSync", "SimpleToast"], angular.module("superProductivity")
    .directive("dailySummary", function() {
      return {
        templateUrl: "scripts/daily-summary/daily-summary-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(n, t, e) {
    var i = this;
    i.task = {}, i.theme = e, i.addTask = function() {
      i.isAddToBacklog ? t.addNewToTopOfBacklog(i.task) : t.addToday(i.task), n.hide()
    }, i.cancel = function() {
      n.hide()
    }
  }

  n.$inject = ["$mdDialog", "Tasks", "theme"], angular.module("superProductivity")
    .controller("AddTaskCtrl", n)
}(), function() {
  function n(t, e, i, n, o, a) {
    var s = this;
    s.IS_ELECTRON = n, s.IS_EXTENSION = o, s.task = {}, s.projectSettings = {}, s.projectSettings.theme = a.r.theme, s.createProject = function(n) {
      e.createNew(n.title, s.projectSettings), i("SUCCESS", 'You created the project "' + n.title + '"'), t.hide()
    }, s.cancel = function() {
      t.hide()
    }
  }

  n.$inject = ["$mdDialog", "Projects", "SimpleToast", "IS_ELECTRON", "IS_EXTENSION", "$rootScope"], angular.module("superProductivity")
    .controller("CreateProjectCtrl", n)
}(), angular.module("superProductivity").constant("DIALOGS", {
  DEFAULTS: {
    clickOutsideToClose: !0,
    controllerAs: "vm",
    bindToController: !0
  },
  WELCOME: { controller: "WelcomeCtrl", templateUrl: "scripts/dialogs/welcome/welcome-c.html" },
  WAS_IDLE: { controller: "WasIdleCtrl", templateUrl: "scripts/dialogs/was-idle/was-idle-c.html" },
  ADD_TASK: { controller: "AddTaskCtrl", templateUrl: "scripts/dialogs/add-task/add-task-c.html" },
  TASK_SELECTION: {
    controller: "TaskSelectionCtrl",
    templateUrl: "scripts/dialogs/task-selection/task-selection-c.html"
  },
  TIME_ESTIMATE: {
    controller: "TimeEstimateCtrl",
    templateUrl: "scripts/dialogs/time-estimate/time-estimate-c.html"
  },
  CREATE_PROJECT: {
    controller: "CreateProjectCtrl",
    templateUrl: "scripts/dialogs/create-project/create-project-c.html"
  },
  NOTES: { controller: "NotesCtrl", templateUrl: "scripts/dialogs/notes/notes-c.html" },
  DISTRACTIONS: {
    controller: "DistractionsCtrl",
    templateUrl: "scripts/dialogs/distractions/distractions-c.html"
  },
  SIMPLE_TASK_SUMMARY: {
    controller: "SimpleTaskSummaryCtrl",
    templateUrl: "scripts/dialogs/simple-task-summary/simple-task-summary-c.html"
  },
  HELP: { controller: "HelpCtrl", templateUrl: "scripts/dialogs/help/help-c.html" },
  JIRA_SET_STATUS: {
    controller: "JiraSetStatusCtrl",
    templateUrl: "scripts/dialogs/jira-set-status/jira-set-status-c.html"
  },
  JIRA_ADD_WORKLOG: {
    controller: "JiraAddWorklogCtrl",
    templateUrl: "scripts/dialogs/jira-add-worklog/jira-add-worklog-c.html"
  },
  JIRA_ASSIGN_TICKET: {
    controller: "JiraAssignTicketCtrl",
    templateUrl: "scripts/dialogs/jira-assign-ticket/jira-assign-ticket-c.html"
  },
  EDIT_GLOBAL_LINK: {
    controller: "EditGlobalLinkCtrl",
    templateUrl: "scripts/dialogs/edit-global-link/edit-global-link-c.html"
  },
  POMODORO_BREAK: {
    controller: "PomodoroBreakCtrl",
    templateUrl: "scripts/dialogs/pomodoro-break/pomodoro-break-c.html"
  },
  TIME_SHEET_EXPORT: {
    controller: "TimeSheetExportCtrl",
    templateUrl: "scripts/dialogs/time-sheet-export/time-sheet-export-c.html"
  }
}), function() {
  function n(u, p, g, h, k) {
    var v = [];

    function f() {
      v.shift()
    }

    return function(n, t, e) {
      var i, o, a, s, r, l, c, d = g.defer(),
        m = (i = n, o = t, a = angular.copy(p.DEFAULTS), s = angular.extend(a, p[i]), o || (o = {}), o = angular.extend(o, { theme: k.r.theme }), s = angular.extend(s, {
          locals: o,
          parent: angular.element(h[0].body)
        }));
      return r = m, l = d, c = e, v.push({
        obj: r,
        wrapperPromise: l,
        isNoQueue: c
      }), 1 === v.length && function t() {
        var e = v[0];
        e && (e.isNoQueue ? (f(), t(), u.show(e.obj).then(function(n) {
          e.wrapperPromise.resolve(n)
        }, function(n) {
          e.wrapperPromise.reject(n)
        }).catch(function(n) {
          e.wrapperPromise.reject(n)
        })) : u.show(e.obj).then(function(n) {
          e.wrapperPromise.resolve(n), f(), t()
        }, function(n) {
          e.wrapperPromise.reject(n), f(), t()
        }).catch(function(n) {
          e.wrapperPromise.reject(n), f(), t()
        }))
      }(), d.promise
    }
  }

  n.$inject = ["$mdDialog", "DIALOGS", "$q", "$document", "$rootScope"], angular.module("superProductivity")
    .service("Dialogs", n)
}(), function() {
  function n(n, t, e, i) {
    var o = this;
    o.r = t.r, o.theme = i, o.isOpen = !1, o.close = function() {
      o.newDistraction = "", o.isOpen = !1
    }, o.onKeydown = function(n) {
      n.ctrlKey && 13 === n.keyCode && o.saveDistraction(), 27 === n.keyCode && o.close()
    }, o.saveDistraction = function() {
      0 < o.newDistraction.length && t.r.distractions.push(o.newDistraction), e("SUCCESS", "Distraction saved for later"), n.hide()
    }, this.cancel = function() {
      n.cancel()
    }
  }

  n.$inject = ["$mdDialog", "$rootScope", "SimpleToast", "theme"], angular.module("superProductivity")
    .controller("DistractionsCtrl", n)
}(), function() {
  n.$inject = ["$mdDialog", "theme", "link", "isNew", "task", "Tasks", "GlobalLinkList", "$filter", "Uid", "IS_ELECTRON"];
  var m = ["3d_rotation", "ac_unit", "access_alarm", "access_alarms", "access_time", "accessibility", "accessible", "account_balance", "account_balance_wallet", "account_box", "account_child", "account_circle", "adb", "add", "add_a_photo", "add_alarm", "add_alert", "add_box", "add_circle", "add_circle_outline", "add_location", "add_shopping_cart", "add_to_photos", "add_to_queue", "adjust", "airline_seat_angled", "airline_seat_flat", "airline_seat_individual_suite", "airline_seat_legroom_extra", "airline_seat_legroom_normal", "airline_seat_legroom_reduced", "airline_seat_recline_extra", "airline_seat_recline_normal", "airplanemode_inactive", "airplanemode_on", "airplay", "airport_shuttle", "alarm", "alarm_add", "alarm_off", "alarm_on", "album", "all_inclusive", "all_out", "amazon", "android", "announcement", "apple", "apps", "archive", "arrow_back", "arrow_downward", "arrow_drop_down", "arrow_drop_down_circle", "arrow_drop_up", "arrow_forward", "arrow_upwards", "art_track", "aspect_ratio", "assessment", "assignment", "assignment_ind", "assignment_late", "assignment_return", "assignment_returned", "assignment_turned_in", "assistant_photo", "attach_file", "attach_money", "attachment", "audiotrack", "autorenew", "av_timer", "backspace", "backup", "battery_20", "battery_30", "battery_50", "battery_60", "battery_80", "battery_90", "battery_alert", "battery_charging_20", "battery_charging_30", "battery_charging_50", "battery_charging_60", "battery_charging_80", "battery_charging_90", "battery_charging_full", "battery_full", "battery_std", "battery_unknown", "beach_access", "beenhere", "block", "bluetooth", "bluetooth_audio", "bluetooth_connected", "bluetooth_disabled", "bluetooth_searching", "blur_circular", "blur_linear", "blur_off", "blur_on", "book", "bookmark", "bookmark_outline", "border_all", "border_bottom", "border_clear", "border_color", "border_horizontal", "border_inner", "border_left", "border_outer", "border_right", "border_style", "border_top", "border_vertical", "branding_watermark", "brightness_1", "brightness_2", "brightness_3", "brightness_4", "brightness_5", "brightness_6", "brightness_7", "brightness_auto", "brightness_high", "brightness_low", "brightness_medium", "broken_image", "brush", "bubble_chart", "bug_report", "build", "burst_mode", "business", "business_center", "cached", "cake", "call", "call_end", "call_made", "call_merge", "call_missed", "call_missed_outgoing", "call_received", "call_split", "call_to_action", "camera", "camera_alt", "camera_enhanced", "camera_front", "camera_rear", "camera_roll", "cancel", "card_giftcard", "card_membership", "card_travel", "casino", "cast", "cast_connected", "center_focus_strong", "center_focus_weak", "change_history", "chat", "chat_bubble", "chat_bubble_outline", "check", "check_box", "check_box_outline_blank", "check_circle", "chevron_left", "chevron_right", "child_care", "child_friedly", "chrome_reader_mode", "class", "clear", "clear_all", "close", "closed_caption", "cloud", "cloud_circle", "cloud_done", "cloud_download", "cloud_off", "cloud_queue", "cloud_upload", "code", "collections", "collections_bookmark", "color_lens", "colorize", "comment", "compare", "compare_arrows", "computer", "confirmation_number", "contact_mail", "contact_phone", "contacts", "content_copy", "content_cut", "content_paste", "control_point", "control_point_duplicate", "copyright", "create", "create_new_folder", "credit_card", "crop", "crop_16_9", "crop_3_2", "crop_5_4", "crop_7_5", "crop_din", "crop_free", "crop_landscape", "crop_original", "crop_portrait", "crop_rotate", "crop_square", "dashboard", "data_usage", "date_range", "dehaze", "delete", "delete_forever", "delete_sweep", "description", "desktop_mac", "desktop_windows", "details", "developer_dashboard", "developer_mode", "device_hub", "devices", "devices_other", "dialer_sip", "dialpad", "directions", "directions_bike", "directions_bus", "directions_car", "directions_ferry", "directions_subway", "directions_train", "directions_transit", "directions_walk", "disc_full", "dns", "do_not_disturb", "do_not_disturb_alt", "do_not_disturb_off", "do_not_disturb_on", "dock", "domain", "done", "done_all", "donut_large", "donut_small", "drafts", "drag_handle", "drive_eta", "dvr", "edit", "edit_location", "eject", "email", "enhanced_encryption", "equalizer", "error", "error_outline", "euro_symbol", "ev_station", "event", "event_available", "event_busy", "event_note", "event_seat", "exit_to_app", "expand_less", "expand_more", "explicit", "explore", "exposure", "exposure_neg_1", "exposure_neg_2", "exposure_plus_1", "exposure_plus_2", "exposure_zero", "extension", "face", "facebook", "facebook-box", "facebook-messenger", "fast_forward", "fast_rewind", "favorite", "favorite_border", "featured_play_list", "featured_video", "feedback", "fiber_manual_record", "fibre_dvr", "fibre_new", "fibre_pin", "fibre_smart_record", "file_download", "file_upload", "filter", "filter_1", "filter_2", "filter_3", "filter_4", "filter_5", "filter_6", "filter_7", "filter_8", "filter_9", "filter_9_plus", "filter_b_and_w", "filter_center_focus", "filter_drama", "filter_frames", "filter_hdr", "filter_list", "filter_none", "filter_tilt_shift", "filter_vintage", "find_in_page", "find_replace", "fingerprint", "first_page", "fitness_center", "flag", "flare", "flash_auto", "flash_off", "flash_on", "flight", "flight_land", "flight_takeoff", "flip", "flip_to_back", "flip_to_front", "folder", "folder_open", "folder_shared", "folder_special", "font_download", "format_align_center", "format_align_justify", "format_align_left", "format_align_right", "format_bold", "format_clear", "format_color_fill", "format_color_reset", "format_color_text", "format_indent_decrease", "format_indent_increase", "format_italic", "format_line_spacing", "format_list_bulleted", "format_list_numbered", "format_paint", "format_quote", "format_shapes", "format_size", "format_strikethrough", "format_textdirection_l_to_r", "format_textdirection_r_to_l", "format_underline", "forum", "forward", "forward_10", "forward_30", "forward_5", "free_breakfast", "fullscreen", "fullscreen_exit", "functions", "g_translate", "gamepad", "games", "gavel", "gesture", "get_app", "gif", "github-box", "github-circle", "golf_course", "google-plus", "google-plus-box", "gps_fixed", "gps_not_fixed", "gps_off", "grade", "gradient", "grain", "graphic_eq", "grid_off", "grid_on", "group", "group_add", "group_work", "hangouts", "hd", "hdr_off", "hdr_on", "hdr_strong", "hdr_weak", "headset", "headset_mic", "healing", "hearing", "help", "help_outline", "high_quality", "highlight", "highlight_off", "history", "home", "hot_tub", "hotel", "hourglass_empty", "hourglass_full", "http", "https", "image", "image_aspect_ratio", "import_contacts", "import_export", "important_devices", "inbox", "indeterminate_check_box", "info", "info_outline", "input", "insert_chart", "insert_comment", "insert_drive_file", "insert_emoticon", "insert_invitation", "insert_link", "insert_photo", "invert_colors", "invert_colors_off", "iso", "keyboard", "keyboard_arrow_down", "keyboard_arrow_left", "keyboard_arrow_right", "keyboard_arrow_up", "keyboard_backspace", "keyboard_capslock", "keyboard_hide", "keyboard_return", "keyboard_tab", "keyboard_voice", "kitchen", "label", "label_outline", "landscape", "language", "laptop", "laptop_chromebook", "laptop_mac", "laptop_windows", "last_page", "launch", "layers", "layers_clear", "leak_add", "leak_remove", "lens", "lightbulb_outline", "line_style", "line_weight", "linear_scale", "link", "linked_camera", "linkedin", "linkedin-box", "list", "live_help", "live_tv", "local_activity", "local_airport", "local_atm", "local_bar", "local_cafe", "local_car_wash", "local_convenience_store", "local_dining", "local_drink", "local_florist", "local_gas_station", "local_grocery_store", "local_hospital", "local_hotel", "local_laundry_service", "local_library", "local_mall", "local_movies", "local_offer", "local_parking", "local_pharmacy", "local_phone", "local_pizza", "local_play", "local_post_office", "local_print_shop", "local_restaurant", "local_see", "local_shipping", "local_taxi", "location_city", "location_disabled", "location_off", "location_on", "location_searching", "lock", "lock_open", "lock_outline", "login", "logout", "looks", "looks_3", "looks_4", "looks_5", "looks_6", "looks_one", "looks_two", "loop", "loupe", "low_priority", "loyalty", "mail", "mail_outline", "map", "markunread", "markunread_mailbox", "memory", "menu", "merge_type", "message", "mic", "mic_none", "mic_off", "mms", "mode_comment", "mode_edit", "monetization_on", "money_off", "monochrome_photos", "mood", "mood_bad", "more", "more_horiz", "more_vert", "motorcycle", "mouse", "move_to_inbox", "movie", "movie_creation", "movie_filter", "multiline_chart", "music_note", "music_video", "my_library_add", "my_library_books", "my_library_music", "my_location", "nature", "nature_people", "navigate_before", "navigate_next", "navigation", "near_me", "network_cell", "network_check", "network_locked", "network_wifi", "new_releases", "next_week", "nfc", "no_encryption", "no_sim", "not_interested", "note", "note_add", "notifications", "notifications_active", "notifications_none", "notifications_off", "notifications_paused", "now_wallpaper", "now_widgets", "office", "offline_pin", "ondemand_video", "opacity", "open_in_browser", "open_in_new", "open_with", "pages", "pageview", "palette", "pan_tool", "panorama", "panorama_fisheye", "panorama_horizontal", "panorama_vertical", "panorama_wide_angle", "party_mode", "pause", "pause_circle_filled", "pause_circle_outline", "payment", "people", "people_outline", "perm_camera_mic", "perm_contact_calendar", "perm_data_setting", "perm_device_information", "perm_identity", "perm_media", "perm_phone_msg", "perm_scan_wifi", "person", "person_add", "person_outline", "person_pin", "person_pin_circle", "personal_video", "pets", "phone", "phone_android", "phone_bluetooth_speaker", "phone_forwarded", "phone_in_talk", "phone_iphone", "phone_locked", "phone_missed", "phone_paused", "phonelink", "phonelink_erase", "phonelink_lock", "phonelink_off", "phonelink_ring", "phonelink_setup", "photo", "photo_album", "photo_camera", "photo_filter", "photo_library", "photo_size_select_actual", "photo_size_select_large", "photo_size_select_small", "picture_as_pdf", "picture_in_picture", "picture_in_picture_alt", "pie_chart", "pie_chart_outline", "pin_drop", "place", "play_arrow", "play_circle_fill", "play_circle_outline", "play_for_work", "playlist_add", "playlist_add_check", "playlist_play", "plus_one", "poll", "polymer", "pool", "portable_wifi_off", "portrait", "power", "power_input", "power_settings_new", "pregnant_woman", "present_to_all", "print", "priority_high", "public", "publish", "query_builder", "question_answer", "queue", "queue_music", "queue_play_next", "radio", "radio_button_checked", "radio_button_unchecked", "rate_review", "receipt", "recent_actors", "record_voice_over", "redeem", "redo", "refresh", "remove", "remove_circle", "remove_circle_outline", "remove_from_queue", "remove_red_eye", "remove_shopping_cart", "reorder", "repeat", "repeat_one", "replay", "replay_10", "replay_30", "replay_5", "reply", "reply_all", "report", "report_problem", "restaurant", "restaurant_menu", "restore", "restore_page", "ring_volume", "room", "room_service", "rotate_90_degrees_ccw", "rotate_left", "rotate_right", "rounded_corner", "router", "rowing", "rss_feed", "rv_hookup", "satellite", "save", "scanner", "schedule", "school", "screen_lock_landscape", "screen_lock_portrait", "screen_lock_rotation", "screen_rotation", "screen_share", "sd_card", "sd_storage", "search", "security", "select_all", "send", "sentiment_dissatisfied", "sentiment_neutral", "sentiment_satisfied", "sentiment_very_dissatisfied", "sentiment_very_satisfied", "settings", "settings_applications", "settings_backup_restore", "settings_bluetooth", "settings_brightness", "settings_cell", "settings_ethernet", "settings_input_antenna", "settings_input_component", "settings_input_composite", "settings_input_hdmi", "settings_input_svideo", "settings_overscan", "settings_phone", "settings_power", "settings_remote", "settings_system_daydream", "settings_voice", "share", "shop", "shop_two", "shopping_basket", "shopping_cart", "short_text", "show_chart", "shuffle", "signal_cellular_0_bar", "signal_cellular_1_bar", "signal_cellular_2_bar", "signal_cellular_3_bar", "signal_cellular_4_bar", "signal_cellular_connected_no_internet_0_bar", "signal_cellular_connected_no_internet_1_bar", "signal_cellular_connected_no_internet_2_bar", "signal_cellular_connected_no_internet_3_bar", "signal_cellular_connected_no_internet_4_bar", "signal_cellular_no_sim", "signal_cellular_null", "signal_cellular_off", "signal_wifi_0_bar", "signal_wifi_1_bar", "signal_wifi_2_bar", "signal_wifi_3_bar", "signal_wifi_4_bar", "signal_wifi_4_bar_lock", "signal_wifi_off", "sim_card", "sim_card_alert", "skip_next", "skip_previous", "slideshow", "slow_motion_video", "smartphone", "smoke_free", "smoke_rooms", "sms", "sms_failed", "snooze", "sort", "sort_by_alpha", "spa", "space_bar", "speaker", "speaker_group", "speaker_notes", "speaker_notes_off", "spellcheck", "star", "star_border", "star_half", "star_rate", "stars", "stay_current_landscape", "stay_current_portrait", "stay_primary_landscape", "stay_primary_portrait", "stop", "stop_screen_share", "storage", "store", "store_mall_directory", "straighten", "streetview", "strikethrough_s", "style", "subdirectory_arrow_left", "subdirectory_arrow_right", "subject", "subscriptions", "subtitles", "subway", "supervisor_account", "surround_sound", "swap_calls", "swap_horiz", "swap_vert", "swap_vertial_circle", "switch_camera", "switch_video", "sync", "sync_disabled", "sync_problem", "system_update", "system_update_alt", "tab", "tab_unselected", "tablet", "tablet_android", "tablet_mac", "tag_faces", "tap_and_play", "terrain", "text_fields", "text_format", "textsms", "texture", "theaters", "thumb_down", "thumb_up", "thumbs_up_down", "time_to_leave", "timelapse", "timeline", "timer", "timer_10", "timer_3", "timer_off", "title", "toc", "today", "toll", "tonality", "touch_app", "toys", "track_changes", "traffic", "train", "tram", "transfer_within_a_station", "transform", "translate", "trending_down", "trending_flat", "trending_up", "tune", "turned_in", "turned_in_not", "tv", "twitter", "unarchive", "undo", "update", "usb", "verified_user", "vertical_align_bottom", "vertical_align_center", "vertical_align_top", "vibration", "video_call", "video_label", "video_library", "videocam", "videocam_off", "vidiogame_asset", "view_agenda", "view_array", "view_carousel", "view_column", "view_comfy", "view_compact", "view_day", "view_headline", "view_list", "view_module", "view_quilt", "view_stream", "view_week", "vignette", "visibility", "visibility_off", "voice_chat", "voicemail", "volume_down", "volume_mute", "volume_off", "volume_up", "vpn_key", "vpn_lock", "wallpaper", "warning", "watch", "watch_later", "wb_auto", "wb_cloudy", "wb_incandescent", "wb_irradescent", "wb_sunny", "wc", "web", "web_asset", "weekend", "whatsapp", "whatshot", "wifi", "wifi_lock", "wifi_tethering", "windows", "work", "wrap_text", "youtube_searched_for", "zoom_in", "zoom_out", "zoom_out_map"];

  function n(n, t, e, i, o, a, s, r, l, c) {
    var d = this;
    d.editOrAddStr = i ? "Add" : "Edit", d.getGlobalOrTaskStr = function() {
      return d.selectedTask ? "link to task" : "global link"
    }, d.isNew = i, d.IS_ELECTRON = c, d.customIcons = m, d.theme = t, d.linkCopy = angular.copy(e) || {}, d.tasks = a.getTodayAndBacklog(), o && (d.selectedTask = o), d.types = [{
      type: "LINK",
      title: "Link (opens in browser)"
    }, { type: "IMG", title: "Image (shown as thumbnail)" }], c ? (d.types.push({
      type: "FILE",
      title: "File (opened by default system app)"
    }), d.types.push({
      type: "COMMAND",
      title: "Command (custom shell command)"
    }), d.linkCopy.type || (d.linkCopy.type = "LINK")) : d.linkCopy.type = "LINK", d.saveGlobalLink = function() {
      "LINK" !== d.linkCopy.type || d.linkCopy.path.match(/(https?|ftp|file):\/\//) || (d.linkCopy.path = "http://" + d.linkCopy.path), d.linkCopy.id || (d.linkCopy.id = l()), i ? d.selectedTask ? a.addLocalAttachment(d.selectedTask, d.linkCopy) : s.addItem(d.linkCopy) : angular.extend(e, d.linkCopy), n.hide()
    }, d.cancel = function() {
      n.hide()
    }, d.getFilteredIconSuggestions = function(n) {
      return n ? r("filter")(d.customIcons, n, !1) : d.customIcons
    }, d.getFilteredTasks = function(n) {
      return n ? r("filter")(d.tasks, n, !1) : d.tasks
    }
  }

  angular.module("superProductivity").controller("EditGlobalLinkCtrl", n)
}(), function() {
  function n(n, t, e, i, o, a, s) {
    var r = this;
    r.task = {}, r.theme = t, r.IS_ELECTRON = i, r.VERSION = s, r.keys = a.r.keys, r.helpTpl = "PAGE" === o ? "scripts/dialogs/help/help-" + e.current.name + ".html" : "scripts/dialogs/help/help-" + o + ".html", r.cancel = function() {
      n.hide()
    }, r.exampleTask = {
      title: "Example task",
      timeSpent: moment.duration(1, "hour"),
      timeEstimate: moment.duration(2, "hour"),
      progress: 50,
      showNotes: !0,
      isUpdated: !0,
      originalComments: [{
        author: "admin",
        body: "yes comments from Jira are shown too <3"
      }, { author: "otherguy", body: "really? that could be useful!" }],
      originalChangelog: [{
        author: "Some Author",
        created: moment(),
        items: [{ field: "jiraField", toString: "Changed to value" }]
      }],
      originalAttachment: ["Attachment loaded from jira"],
      status: "IN_PROGRESS",
      originalStatus: { name: "In Progress" },
      notes: "**Some example notes**\n      \n      * supports markdown\n      * list item\n      * click to edit\n      ",
      localAttachments: [{
        title: "Some link attached by you via drag and drop",
        path: "http://external.url",
        type: "LINK"
      }]
    }, r.exampleTasks = [{ title: "Example task" }], r.globalLinks = [{
      type: "LINK",
      title: "Some link"
    }, {
      type: "LINK",
      title: "Interesting google stuff",
      path: "http://google.com/"
    }], i && (r.globalLinks.push({
      type: "FILE",
      title: "Some file opened in default system application"
    }), r.globalLinks.push({ type: "COMMAND", title: "Even custom commands can be executed" }))
  }

  n.$inject = ["$mdDialog", "theme", "$state", "IS_ELECTRON", "template", "$rootScope", "VERSION"], angular.module("superProductivity")
    .controller("HelpCtrl", n)
}(), function() {
  function n(n, t, e, i, o) {
    var a = this, s = e.moment;
    a.theme = o, a.taskCopy = angular.copy(t), a.taskCopy.started = s(t.started).milliseconds(0)
      .seconds(0)
      .toDate(), a.isUpdateLocalTaskSettings = !1, a.comment = i, a.addWorklog = function() {
      n.hide({
        originalKey: a.taskCopy.originalKey,
        started: s(a.taskCopy.started),
        timeSpent: s.duration(a.taskCopy.timeSpent),
        comment: a.comment
      })
    }, a.cancel = function() {
      n.cancel()
    }
  }

  n.$inject = ["$mdDialog", "task", "$window", "comment", "theme"], angular.module("superProductivity")
    .controller("JiraAddWorklogCtrl", n)
}(), function() {
  function n(n, t, e, i, o) {
    this.theme = e, this.task = t, this.assignTicket = function() {
      i.updateAssignee(t, o.r.jiraSettings.userName).then(n.hide, n.cancel), n.hide()
    }, this.cancel = function() {
      n.cancel()
    }
  }

  n.$inject = ["$mdDialog", "task", "theme", "Jira", "$rootScope"], angular.module("superProductivity")
    .controller("JiraAssignTicketCtrl", n)
}(), function() {
  function n(e, i, o, a, n, s, t, r) {
    var l = this;
    l.theme = t, l.transitions = o, l.task = i, l.localType = a, l.chosenTransitionIndex = n._.findIndex(l.transitions, function(n) {
      return n.name === (l.task.originalStatus && l.task.originalStatus.name)
    }), l.userQuery = function(n) {
      return r.searchUsers(n).then(function(n) {
        var t = [];
        return _.each(n.response, function(n) {
          return t.push(n.key)
        }), t
      })
    }, l.updateTask = function(n) {
      var t = l.transitions[n];
      l.saveAsDefaultAction && (s.r.jiraSettings.transitions || (s.r.jiraSettings.transitions = {}), s.r.jiraSettings.transitions[a] = t.id, s.r.jiraSettings.allTransitions = o), l.userToAssign ? (r.updateAssignee(i, l.userToAssign)
        .then(e.hide), e.hide()) : e.hide(t)
    }, l.cancel = function() {
      e.cancel()
    }
  }

  n.$inject = ["$mdDialog", "task", "transitions", "localType", "$window", "$rootScope", "theme", "Jira"], angular.module("superProductivity")
    .controller("JiraSetStatusCtrl", n)
}(), function() {
  function n(n, t, e) {
    t.r.note || (t.r.note = "Write some notes"), this.r = t.r, this.theme = e, this.cancel = function() {
      n.hide()
    }
  }

  n.$inject = ["$mdDialog", "$rootScope", "theme"], angular.module("superProductivity")
    .controller("NotesCtrl", n)
}(), function() {
  function n(n, t, e, i, o, a, s, r, l, c) {
    var d = this;
    if (this.r = t.r, this.theme = e, this.pomodoroData = i, this.isShowDistractionsOnBreak = o.isShowDistractionsOnBreak, this.isBreakDone = !1, r && window.ipcRenderer.send("SHOW_OR_FOCUS"), this.pomodoroData.currentSessionTime) {
      var m = this.pomodoroData.currentSessionTime - 100;
      m < 0 && (m = 0), this.timeout = s(function() {
        d.isBreakDone = !0, o.isManualContinue ? (r && window.ipcRenderer.send("SHOW_OR_FOCUS"), c({
          title: "Pomodoro break ended",
          sound: !0,
          wait: !0
        }), d.pomodoroData.currentSessionTime = 0, l.pause()) : n.hide()
      }, m)
    }
    this.cancel = function() {
      n.hide()
    }, this.continue = function() {
      n.hide(!0)
    }, a.$on("$destroy", function() {
      d.timeout && s.cancel(d.timeout)
    })
  }

  n.$inject = ["$mdDialog", "$rootScope", "theme", "pomodoroData", "pomodoroConfig", "$scope", "$timeout", "IS_ELECTRON", "PomodoroButton", "Notifier"], angular.module("superProductivity")
    .controller("PomodoroBreakCtrl", n)
}(), function() {
  function n(n, t, e, r, i, o, a, s, l) {
    var c = this;

    function d(n) {
      var t = "";
      return c.options.showDate && n.dateStr && (t += n.dateStr), c.options.showTitle && (0 < t.length && (t += c.options.separateFieldsBy), t += n.title), c.options.showTimeSpent && (0 < t.length && (t += c.options.separateFieldsBy), c.options.isTimeSpentAsMilliseconds ? t += n.timeSpent.asMilliseconds() : t += o.toString(n.timeSpent)), t += c.options.separateBy
    }

    function m(n) {
      var t = "";
      if (n) for (var e = 0; e < n.length; e++) {
        var i = n[e];
        if (c.options.isListDoneOnly && !i.isDone || c.options.isWorkedOnTodayOnly && !r.isWorkedOnToday(i) || (t += d(i), c.options.isUseNewLine && (t += "\n")), c.options.isListSubTasks && i.subTasks && 0 < i.subTasks.length) for (var o = 0; o < i.subTasks.length; o++) {
          var a = i.subTasks[o];
          c.options.isListDoneOnly && !a.isDone || c.options.isWorkedOnTodayOnly && !r.isWorkedOnToday(a) || (t += d(a), c.options.isUseNewLine && (t += "\n"))
        }
      }
      if (t = t.substring(0, t.length - c.options.separateBy.length), c.options.isUseNewLine && (t = t.substring(0, t.length - "\n".length)), c.options.regExToRemove) {
        c.isInvalidRegEx = !1;
        try {
          var s = new RegExp(c.options.regExToRemove, "g");
          t = t.replace(s, "")
        } catch (n) {
          c.isInvalidRegEx = !0
        }
      }
      return t
    }

    c.theme = s, new window.Clipboard("#clipboard-btn").on("success", function(n) {
      a("SUCCESS", "Copied to clipboard"), n.clearSelection()
    }), c.options = e, c.finishDayFn = l, c.options.separateBy || (c.options.separateBy = ""), c.options.separateFieldsBy || (c.options.separateFieldsBy = ""), c.tasksTxt = m(t), i.$watch("vm.options", function() {
      c.tasksTxt = m(t)
    }, !0), c.submit = function() {
      n.hide()
    }, c.cancel = function() {
      n.hide()
    }
  }

  n.$inject = ["$mdDialog", "tasks", "settings", "TasksUtil", "$scope", "ParseDuration", "SimpleToast", "theme", "finishDayFn"], angular.module("superProductivity")
    .controller("SimpleTaskSummaryCtrl", n)
}(), function() {
  function n(n, t, e, i) {
    var o = this;
    o.theme = e, o.undoneTasks = t.getUndoneToday(!0), o.undoneTasks && 0 !== o.undoneTasks.length || (o.isShowTaskCreationForm = !0, o.newTask = {}), o.submit = function() {
      o.isShowTaskCreationForm ? o.selectedTask = t.addToday(o.newTask) : o.selectedTask || (o.selectedTask = o.undoneTasks[0]), t.updateCurrent(o.selectedTask), o.selectedTask ? n.hide(o.selectedTask) : n.cancel()
    }, o.cancel = function() {
      n.cancel()
    }, o.getFilteredUndoneTasks = function(n) {
      return n ? i("filter")(o.undoneTasks, n, !1) : o.undoneTasks
    }
  }

  n.$inject = ["$mdDialog", "Tasks", "theme", "$filter"], angular.module("superProductivity")
    .controller("TaskSelectionCtrl", n)
}(), function() {
  function n(t, e, i, o, n, a, s) {
    var r = this;
    r.theme = a;
    var l = n.moment;
    r.todayStr = o.getTodayStr(), r.task = e, r.timeEstimate = e.timeEstimate && l.duration(e.timeEstimate), r.showAddForAnotherDayForm = !1, e.timeSpentOnDay || (e.timeSpentOnDay = {}), r.timeSpentOnDayCopy = angular.copy(e.timeSpentOnDay), r.timeSpentOnDayCopy[r.todayStr] || (r.timeSpentOnDayCopy[r.todayStr] = void 0), r.deleteValue = function(n) {
      delete r.timeSpentOnDayCopy[n]
    }, r.addNewEntry = function(n) {
      var t = o.formatToWorklogDateStr(n.date);
      r.timeSpentOnDayCopy[t] = angular.copy(n.timeSpent), n.timeSpent = void 0, n.date = void 0, r.showAddForAnotherDayForm = !1
    }, r.submit = function(n) {
      i.updateEstimate(e, n), i.updateTimeSpentOnDay(e, r.timeSpentOnDayCopy), t.hide()
    }, r.cancel = function() {
      t.cancel()
    };
    var c = function() {
      var n = o.calcTotalTimeSpentOnTask({ timeSpentOnDay: r.timeSpentOnDayCopy });
      n && (r.timeSpentOnOtherDaysTotal = window.moment.duration(n)
        .subtract(r.timeSpentOnDayCopy[r.todayStr])), r.timeSpentOnOtherDaysTotal && 0 === r.timeSpentOnOtherDaysTotal._milliseconds && (r.timeSpentOnOtherDaysTotal = void 0), r.progress = o.calcProgress({
        timeSpent: n,
        timeEstimate: r.timeEstimate
      })
    };
    c();
    var d = s.$watch("vm.timeSpentOnDayCopy", c, !0), m = s.$watch("vm.timeEstimate", c, !0);
    s.$on("$destroy", function() {
      d(), m()
    })
  }

  n.$inject = ["$mdDialog", "task", "Tasks", "TasksUtil", "$window", "theme", "$scope"], angular.module("superProductivity")
    .controller("TimeEstimateCtrl", n)
}(), function() {
  function n(n, t, e, i, o, a, s, r, l, p, g) {
    var h = this;

    function k(n, t, e) {
      var i = void 0;
      switch (t) {
        case"QUARTER":
          return i = 15 * Math.round(n.minute() / 15), e && (i = 15 * Math.ceil(n.minute() / 15)), n.minute(i)
            .second(0);
        case"HALF":
          return i = 30 * Math.round(n.minute() / 30), e && (i = 30 * Math.ceil(n.minute() / 30)), n.minute(i)
            .second(0);
        case"HOUR":
          return i = 60 * Math.round(n.minute() / 60), e && (i = 60 * Math.ceil(n.minute() / 60)), n.minute(i)
            .second(0);
        default:
          return n
      }
    }

    h.theme = r, h.opts = p.r.uiHelper.timeSheetExportSettings, h.GoogleApi = l, h.actualValues = [], h.roundTimeOptions = [{
      id: "QUARTER",
      title: "full quarters"
    }, { id: "HALF", title: "full half hours" }, {
      id: "HOUR",
      title: "full hours"
    }], h.cancel = function() {
      n.hide()
    }, h.login = function() {
      return h.isLoading = !0, l.login().then(function() {
        h.isLoading = !1
      })
    }, h.readSpreadsheet = function() {
      return h.isLoading = !0, h.headings = void 0, l.getSpreadsheetHeadingsAndLastRow(h.opts.spreadsheetId)
        .then(function(n) {
          h.headings = n.headings, h.lastRow = n.lastRow, h.updateDefaults(), h.isLoading = !1
        })
    }, h.logout = function() {
      return h.isLoading = !0, l.logout().then(function() {
        h.isLoading = !1
      })
    }, h.save = function() {
      h.isLoading = !0;
      !function(n, t) {
        if (n.length !== t.length) return !1;
        for (var e = n.length; e--;) if (n[e] !== t[e]) return !1;
        return !0
      }(h.actualValues, h.lastRow) ? l.appendRow(h.opts.spreadsheetId, h.actualValues)
        .then(function() {
          s("SUCCESS", "Row successfully appended"), n.hide(), p.r.currentSession.isTimeSheetExported = !0, h.isLoading = !1
        }) : s("CUSTOM", "Current values and the last saved row have equal values, that is probably not what you want.")
    }, h.updateDefaults = function() {
      h.opts.defaultValues.forEach(function(n, t) {
        h.actualValues[t] = function(n) {
          if (!n) return;
          var t = n.trim();
          if (t.match(/\{date:/)) return e = t.replace("{date:", "").replace("}", "")
            .trim(), window.moment().format(e);
          var e;
          switch (t) {
            case"{startTime}":
              return m = p.r.startedTimeToday, u = h.opts.roundStartTimeTo, k(m, u).format("HH:mm");
            case"{currentTime}":
              return c = window.moment(), d = h.opts.roundEndTimeTo, k(c, d).format("HH:mm");
            case"{date}":
              return window.moment().format("MM/DD/YYYY");
            case"{taskTitles}":
              return r = g.getToday(), l = "", r.forEach(function(n) {
                l += n.title + ", "
              }), l.substring(0, l.length - 2);
            case"{subTaskTitles}":
              return a = g.getToday(), s = "", a.forEach(function(n) {
                n.subTasks ? n.subTasks.forEach(function(n) {
                  s += n.title + ", "
                }) : s += n.title + ", "
              }), s.substring(0, s.length - 2);
            case"{totalTime}":
              return i = g.getTimeWorkedToday(), o = h.opts.roundWorkTimeTo, function(n, t, e) {
                var i = void 0;
                switch (t) {
                  case"QUARTER":
                    return i = 15 * Math.round(n.asMinutes() / 15), e && (i = 15 * Math.ceil(n.asMinutes() / 15)), window.moment.duration({ minutes: i });
                  case"HALF":
                    return i = 30 * Math.round(n.asMinutes() / 30), e && (i = 30 * Math.ceil(n.asMinutes() / 30)), window.moment.duration({ minutes: i });
                  case"HOUR":
                    return i = 60 * Math.round(n.asMinutes() / 60), e && (i = 60 * Math.ceil(n.asMinutes() / 60)), window.moment.duration({ minutes: i });
                  default:
                    return n
                }
              }(i, o, h.opts.isRoundWorkTimeUp).format("HH:mm");
            default:
              return t
          }
          var i, o;
          var a, s;
          var r, l;
          var c, d;
          var m, u
        }(n)
      })
    }, h.opts.isAutoLogin && h.login().then(function() {
      h.opts.spreadsheetId && h.readSpreadsheet()
    }).then(function() {
      h.updateDefaults()
    })
  }

  n.$inject = ["$mdDialog", "tasks", "settings", "TasksUtil", "$scope", "ParseDuration", "SimpleToast", "theme", "GoogleApi", "$rootScope", "Tasks"], angular.module("superProductivity")
    .controller("TimeSheetExportCtrl", n)
}(), function() {
  function n(t, n, e, i, o, a, s, r, l, c, d) {
    var m = this;
    m.theme = r;
    var u = a;
    m.idleTime = o.moment.duration(u, "milliseconds")
      .format("hh:mm:ss"), m.undoneTasks = i.getUndoneToday(!0), m.selectedTask = n.r.currentTask || n.r.lastActiveTaskTask || void 0, m.isShowTrackButResetTakeABreakTimer = d.isEnabled(), m.trackIdleToTask = function(n) {
      n && d.resetCounter(), m.selectedTask && m.selectedTask.id && (i.addTimeSpent(m.selectedTask, u), i.updateCurrent(m.selectedTask), t.hide())
    }, m.getFilteredUndoneTasks = function(n) {
      return n ? l("filter")(m.undoneTasks, n, !1) : m.undoneTasks
    }, m.cancel = function() {
      t.cancel()
    };
    var p = moment(), g = c(function() {
      var n = moment();
      u = moment.duration(n.diff(p)).add(a)
        .asMilliseconds(), m.idleTime = o.moment.duration(u, "milliseconds").format("hh:mm:ss")
    }, 1e3);
    e.$on("$destroy", function() {
      c.cancel(g)
    })
  }

  n.$inject = ["$mdDialog", "$rootScope", "$scope", "Tasks", "$window", "initialIdleTime", "minIdleTimeInMs", "theme", "$filter", "$interval", "TakeABreakReminder"], angular.module("superProductivity")
    .controller("WasIdleCtrl", n)
}(), function() {
  function n(t, e, n, i, o) {
    var a = this;
    a.theme = i, a.IS_ELECTRON = n, a.isShowDialogAgain = e.r.uiHelper.isShowWelcomeDialog, a.hideDialogChange = function(n) {
      e.r.uiHelper.isShowWelcomeDialog = !n
    }, a.cancel = function() {
      t.cancel()
    }, a.openHelp = function(n) {
      n.preventDefault(), t.cancel(), o("HELP", { template: "PAGE" })
    }
  }

  n.$inject = ["$mdDialog", "$rootScope", "IS_ELECTRON", "theme", "Dialogs"], angular.module("superProductivity")
    .controller("WelcomeCtrl", n)
}(), function() {
  var n = function n(t) {
    _classCallCheck(this, n), this.r = t.r
  };
  n.$inject = ["$rootScope"], angular.module("superProductivity").component("distractionList", {
    templateUrl: "scripts/distraction-list/distraction-list-cp.html",
    controller: n,
    controllerAs: "$ctrl",
    bindToController: {}
  }), n.$$ngIsClass = !0
}(), function() {
  function n(t, e, i, n) {
    var o = this;
    o.doneBacklogTasks = i.getDoneBacklog();
    var a = t.$watch("vm.doneBacklogTasks", function(n) {
      o.totalTimeSpent = e.calcTotalTimeSpent(n)
    }, !0);
    t.$on("$destroy", a), [n.PROJECT_CHANGED, n.COMPLETE_DATA_RELOAD].forEach(function(n) {
      t.$on(n, function() {
        o.doneBacklogTasks = i.getDoneBacklog()
      })
    }), o.restoreTask = function(n) {
      i.moveTaskFromDoneBackLogToToday(n), o.doneBacklogTasks = i.getDoneBacklog()
    }
  }

  n.$inject = ["$scope", "TasksUtil", "Tasks", "EV"], angular.module("superProductivity")
    .directive("doneTasksBacklog", function() {
      return {
        templateUrl: "scripts/done-tasks-backlog/done-tasks-backlog-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(n, i) {
    return {
      bindToController: !0, controllerAs: "vm", link: function(n, e) {
        e.on("click", function() {
          i.saveToLs();
          var n = i.getCompleteBackupData(),
            t = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(n));
          e[0].setAttribute("href", t), e[0].setAttribute("download", "super-productivity-backup.json")
        })
      }, restrict: "A"
    }
  }

  n.$inject = ["$rootScope", "AppStorage"], angular.module("superProductivity")
    .directive("downloadBackup", n)
}(), function() {
  var n = function() {
    function a(n, t, e, i) {
      _classCallCheck(this, a);
      var o = t[0];
      this.el = o, this.$scope = e, this.minutesBefore = 0, this.dots = void 0, this.uid = "duration-input-slider" + i()
    }

    return a.$inject = ["ParseDuration", "$element", "$scope", "Uid"], _createClass(a, [{
      key: "onChangeValue",
      value: function() {
        this.setRotationFromValue()
      }
    }, {
      key: "$onInit", value: function() {
        var d = this;
        this.circle = this.el.querySelector(".handle-wrapper"), this.startHandler = function(n) {
          "LABEL" !== n.target.tagName && "INPUT" !== n.target.tagName ? (d.el.addEventListener("mousemove", d.moveHandler), document.addEventListener("mouseup", d.endHandler), d.el.addEventListener("touchmove", d.moveHandler), document.addEventListener("touchend", d.endHandler), d.el.classList.add("is-dragging")) : d.endHandler()
        }, this.moveHandler = function(n) {
          if (("click" !== n.type || "LABEL" !== n.target.tagName) && "INPUT" !== n.target.tagName) {
            n.preventDefault();
            var t = d.circle.offsetWidth / 2, e = d.circle.offsetHeight / 2, i = void 0, o = void 0;
            if ("touchmove" === n.type) {
              var a = n.target.getBoundingClientRect();
              i = n.targetTouches[0].pageX - a.left, o = n.targetTouches[0].pageY - a.top
            } else i = n.offsetX, o = n.offsetY;
            var s = i - t, r = -1 * (o - e), l = Math.atan2(r, s) * (180 / Math.PI),
              c = parseInt(90 - l, 10);
            d.setValueFromRotation(c)
          }
        }, this.endHandler = function() {
          d.el.classList.remove("is-dragging"), d.el.removeEventListener("mousemove", d.moveHandler), document.removeEventListener("mouseup", d.endHandler), d.el.removeEventListener("touchmove", d.moveHandler), document.removeEventListener("touchend", d.endHandler)
        }, this.el.addEventListener("mousedown", this.startHandler), this.el.addEventListener("touchstart", this.startHandler), this.el.addEventListener("click", this.moveHandler), this.setRotationFromValue()
      }
    }, {
      key: "$onDestroy", value: function() {
        this.el.removeEventListener("mousedown", this.startHandler), this.el.removeEventListener("mousemove", this.moveHandler), document.removeEventListener("mouseup", this.endHandler), this.el.removeEventListener("touchstart", this.startHandler), this.el.removeEventListener("touchmove", this.moveHandler), document.removeEventListener("touchend", this.endHandler)
      }
    }, {
      key: "setCircleRotation", value: function(n) {
        this.circle.style.transform = "rotate(" + n + "deg)"
      }
    }, {
      key: "setDots", value: function(n) {
        12 < n && (n = 12), this.dots = new Array(n)
      }
    }, {
      key: "setValueFromRotation", value: function(n) {
        var t = this, e = void 0;
        e = 0 <= n ? n / 360 * 60 : (n + 360) / 360 * 60, e = parseInt(e, 10);
        var i = Math.floor(moment.duration(this.ngModel).asHours()), o = e - this.minutesBefore;
        40 < o ? i-- : 40 < -1 * o && i++, i < 0 ? (e = i = 0, this.setCircleRotation(0)) : this.setCircleRotation(n), this.minutesBefore = e, this.setDots(i), this.$scope.$evalAsync(function() {
          t.ngModel = moment.duration({ hours: i, minutes: e })
        })
      }
    }, {
      key: "setRotationFromValue", value: function() {
        var n = moment.duration(this.ngModel), t = n.minutes();
        this.setDots(Math.floor(n.asHours()));
        var e = 360 * t / 60;
        this.minutesBefore = t, this.setCircleRotation(e)
      }
    }]), a
  }();
  angular.module("superProductivity").component("durationInputSlider", {
    templateUrl: "scripts/duration-input-slider/duration-input-slider-cp.html",
    controller: n,
    controllerAs: "$ctrl",
    bindings: { ngModel: "=", label: "@" },
    require: { $ngModelCtrl: "^ngModel" }
  }), n.$$ngIsClass = !0
}(), function() {
  function s(n) {
    return n.replace(/<\/?[^`]+?\/?>/gim, "\n").replace(/\n/gim, "").replace(/&nbsp;/gim, "").trim()
  }

  n.$inject = ["EDIT_ON_CLICK_TOGGLE_EV"], angular.module("superProductivity")
    .constant("EDIT_ON_CLICK_TOGGLE_EV", "EDIT_ON_CLICK_TOGGLE_EV").directive("editOnClick", n);
  var r = void 0;

  function n(n) {
    return r = n, {
      restrict: "A",
      require: "ngModel",
      scope: { editOnClickEvId: "<", editOnClickOnEditFinished: "&" },
      link: t
    }
  }

  function t(i, o, n, t) {
    var a = void 0;

    function e() {
      var n = o.html();
      n = s(n), t.$setViewValue(n)
    }

    i.$evalAsync(function() {
      a = s(o.html())
    }), o[0].getAttribute("contenteditable") || o[0].setAttribute("contenteditable", !0), t.$render = function() {
      var n = t.$viewValue || "";
      n = s(n), o.html(n)
    }, o.bind("input", function() {
      i.$evalAsync(e)
    }), o.bind("blur", function(n) {
      i.$evalAsync(e), function(n) {
        window.getSelection ? window.getSelection()
          .removeAllRanges() : document.selection && document.selection.empty();
        var t = o.html(), e = a !== t;
        angular.isFunction(i.editOnClickOnEditFinished) && i.editOnClickOnEditFinished({
          isChanged: e,
          newVal: t,
          $taskEl: o[0].closest(".task"),
          event: n
        }), a = t
      }(n)
    }), o[0].addEventListener("keydown", function(n) {
      n.stopPropagation(), 13 !== n.keyCode && 27 !== n.keyCode || (n.preventDefault(), setTimeout(function() {
        o.blur()
      }))
    }), o[0].addEventListener("keypress", function(n) {
      13 === n.keyCode && (n.preventDefault(), setTimeout(function() {
        o.blur()
      }))
    }), o[0].onpaste = function(n) {
      n.stopPropagation(), n.preventDefault();
      var t = n.clipboardData.getData("text/plain").trim();
      !function(n, t) {
        var e = window.getSelection(), i = e.anchorOffset, o = e.focusOffset, a = n.innerText,
          s = (a.substring(0, i) + t + a.substring(o, a.length)).trim();
        n.innerText = s;
        var r = document.createRange();
        r.setStart(n.childNodes[0], i + t.length), r.collapse(!0);
        var l = window.getSelection();
        l.removeAllRanges(), l.addRange(r)
      }(o[0], t), i.$evalAsync(e)
    }, i.$on(r, function(n, t) {
      t === i.editOnClickEvId && setTimeout(function() {
        o.focus(), document.execCommand("selectAll", !1, null)
      })
    })
  }
}(), function() {
  function i(n) {
    var t = n.getBoundingClientRect(), e = document.body, i = document.documentElement,
      o = window.pageYOffset || i.scrollTop || e.scrollTop,
      a = window.pageXOffset || i.scrollLeft || e.scrollLeft, s = i.clientTop || e.clientTop || 0,
      r = i.clientLeft || e.clientLeft || 0, l = t.top + o - s, c = t.left + a - r;
    return { top: Math.round(l), left: Math.round(c) }
  }

  var n = function() {
    function e(n) {
      var t = this;
      _classCallCheck(this, e), this.lightboxParentEl = angular.element(document.body), this.$el = n, this.imageEl = this.$el[0], n.bind("click", function() {
        t.showImg()
      })
    }

    return e.$inject = ["$element"], _createClass(e, [{
      key: "hideImg", value: function() {
        var n = this;
        this.$enlargedImgWrapperEl.removeClass("ani-enter"), this.$enlargedImgWrapperEl.addClass("ani-remove"), this.setCoordsForImageAni(), this.$enlargedImgWrapperEl.on("transitionend", function() {
          n.$enlargedImgWrapperEl.remove(), n.imageEl.setAttribute("style", "visibility: visible")
        })
      }
    }, {
      key: "setCoordsForImageAni", value: function() {
        var n = i(this.imageEl), t = i(this.newImageEl);
        this.newImageEl.setAttribute("style", "transform: translate3d(" + (n.left - t.left - this.imageEl.width) + "px, " + (n.top - t.top - this.imageEl.height) + "px, 0) scale(0.3)")
      }
    }, {
      key: "showImg", value: function() {
        var n = this, t = this.htmlToElement('<div class="enlarged-image-wrapper"></div>');
        this.newImageEl = this.htmlToElement('<img src="' + this.enlargeImage + '" class="enlarged-image">'), t.append(this.newImageEl), this.$enlargedImgWrapperEl = angular.element(t), this.lightboxParentEl.append(this.$enlargedImgWrapperEl), this.setCoordsForImageAni(), setTimeout(function() {
          n.$enlargedImgWrapperEl.addClass("ani-enter")
        }, 10), this.$enlargedImgWrapperEl.bind("click", function() {
          n.hideImg()
        }), this.imageEl.setAttribute("style", "visibility: hidden")
      }
    }, {
      key: "htmlToElement", value: function(n) {
        var t = document.createElement("template");
        return n = n.trim(), t.innerHTML = n, t.content.firstChild
      }
    }]), e
  }();
  angular.module("superProductivity").directive("enlargeImage", function() {
    return {
      bindToController: { enlargeImage: "<" },
      controller: n,
      controllerAs: "$ctrl",
      restrict: "A",
      scope: !0
    }
  }), n.$$ngIsClass = !0
}(), function() {
  function n(a, t, s) {
    return {
      link: function(n, i, o) {
        t && i.on("click", function(n) {
          if (n.preventDefault(), o.type && "LINK" !== o.type) {
            if ("FILE" === o.type) {
              var t = require("electron").shell;
              t.openItem(o.href)
            } else if ("COMMAND" === o.type) {
              var e = require("child_process").exec;
              s("CUSTOM", 'Running "' + o.href + '".', "laptop_windows"), e(o.href, function(n) {
                n && s("ERROR", '"' + o.href + ": " + n)
              })
            }
          } else a.openExternalUrl(i.attr("href"))
        })
      }, restrict: "A", scope: {}
    }
  }

  n.$inject = ["Util", "IS_ELECTRON", "SimpleToast"], angular.module("superProductivity")
    .directive("externalLink", n)
}(), function() {
  var n = function() {
    function s(n, t, e, i, o, a) {
      _classCallCheck(this, s), this.Tasks = i, this.SimpleToast = o, this.PomodoroButton = t, this.$state = a, this.pomodoroSvc = t, this.r = n.r, this.setTaskData(), this.setCurrentTask(), this.handleAllDoneIfNeeded()
    }

    return s.$inject = ["$rootScope", "PomodoroButton", "Notifier", "Tasks", "SimpleToast", "$state"], _createClass(s, [{
      key: "togglePlayPomodoro",
      value: function() {
        this.PomodoroButton.toggle()
      }
    }, {
      key: "toggleMarkAsCurrentTask", value: function() {
        this.Tasks.getCurrent() ? this.Tasks.updateCurrent(void 0) : this.Tasks.updateCurrent(this.task)
      }
    }, {
      key: "setCurrentTask", value: function() {
        this.currentTask = this.Tasks.getCurrent()
      }
    }, {
      key: "setTaskData", value: function() {
        var n = this;
        this.task = this.Tasks.getCurrent() || this.Tasks.getLastCurrent(), this.task ? this.task.parentId ? this.parentTitle = this.Tasks.getById(this.task.parentId).title : this.parentTitle = void 0 : this.Tasks.startLastTaskOrOpenDialog()
          .then(function() {
            n.setTaskData(), n.setCurrentTask()
          })
      }
    }, {
      key: "handleAllDoneIfNeeded", value: function() {
        var n = this;
        this.task && this.task.isDone && this.Tasks.startLastTaskOrOpenDialog().then(function() {
          n.setTaskData(), n.setCurrentTask()
        })
      }
    }, {
      key: "markAsDone", value: function() {
        this.Tasks.markAsDone(this.task), this.setTaskData(), this.handleAllDoneIfNeeded()
      }
    }]), s
  }();
  angular.module("superProductivity").component("focusView", {
    templateUrl: "scripts/focus-view/focus-view-cp.html",
    controller: n,
    controllerAs: "vm",
    bindToController: {}
  }), n.$$ngIsClass = !0
}(), function() {
  var n = function() {
    function l(n, t, e, i, o, a, s) {
      var r = this;
      _classCallCheck(this, l), this.Dialogs = i, this.GlobalLinkList = n, this.Tasks = o, this.$scope = e, t[0].ondragover = t[0].ondrop = function(n) {
        n.preventDefault()
      }, t[0].ondrop = function(n) {
        var t = r.GlobalLinkList.createLinkFromDrop(n);
        r.handleLinkInput(t, n)
      }, t[0].onpaste = function(n) {
        var t = r.GlobalLinkList.createLinkFromPaste(n);
        r.handleLinkInput(t, n, !0)
      }, e.$on(s.PROJECT_CHANGED, function() {
        a.r.uiHelper.isShowBookmarkBar = !1
      })
    }

    return l.$inject = ["GlobalLinkList", "$document", "$scope", "Dialogs", "Tasks", "$rootScope", "EV"], _createClass(l, [{
      key: "handleLinkInput",
      value: function(n, t, e) {
        if ("INPUT" !== t.target.tagName && "TEXTAREA" !== t.target.tagName && (!t.target.getAttribute("contenteditable") || !e) && n && n.path) {
          var i = t.target.closest("focus-view"), o = t.target.closest(".task"),
            a = t.target.closest("inline-markdown"), s = n.path.match(/jpg|png/);
          if (console.log(i, o), i) {
            var r = this.Tasks.getCurrent() || this.Tasks.getLastCurrent();
            a && s ? this.handleImageDrop(n, r) : this.openEditDialog(n, !0, r)
          } else if (o) {
            var l = angular.element(o).scope().modelValue;
            a && s ? this.handleImageDrop(n, l) : this.openEditDialog(n, !0, l)
          } else this.openEditDialog(n, !0);
          t.preventDefault(), t.stopPropagation(), this.$scope.$evalAsync()
        }
      }
    }, {
      key: "handleImageDrop", value: function(n, t) {
        t.notes = t.notes + '<img src="' + n.path + '" style="max-width: 100%;">'
      }
    }, {
      key: "openEditDialog", value: function(n, t, e) {
        this.Dialogs("EDIT_GLOBAL_LINK", { link: n, isNew: t, task: e }, !0)
      }
    }, {
      key: "addLink", value: function() {
        this.openEditDialog(void 0, !0)
      }
    }, {
      key: "remove", value: function(n) {
        this.globalLinks.splice(n, 1)
      }
    }]), l
  }();
  angular.module("superProductivity").component("globalLinkList", {
    templateUrl: "scripts/global-link-list/global-link-list-cp.html",
    bindToController: !0,
    controller: n,
    controllerAs: "$ctrl",
    bindings: { globalLinks: "=", isToggled: "=" }
  })
}(), function() {
  var i = "FILE", o = "LINK", n = function() {
    function e(n, t) {
      _classCallCheck(this, e), this.ls = n.r, this.SimpleToast = t
    }

    return e.$inject = ["$rootScope", "SimpleToast"], _createClass(e, [{
      key: "createLinkFromDrop",
      value: function(n) {
        var t = n.dataTransfer.getData("text");
        return t ? this.createTextLink(t) : n.dataTransfer ? this.createFileLink(n.dataTransfer) : void 0
      }
    }, {
      key: "createLinkFromPaste", value: function(n) {
        var t = n.clipboardData.getData("text/plain");
        if (t) return this.createTextLink(t)
      }
    }, {
      key: "createTextLink", value: function(n) {
        if (n && !n.match(/\n/)) {
          var t = n;
          return t.match(/^http/) || (t = "//" + t), {
            title: this.constructor.baseName(n),
            path: t,
            type: o
          }
        }
      }
    }, {
      key: "createFileLink", value: function(n) {
        var t = n.files[0].path;
        if (t) return { title: this.constructor.baseName(t), path: t, type: i }
      }
    }, {
      key: "addItem", value: function(n) {
        n && (this.ls.globalLinks.push(n), this.SimpleToast("SUCCESS", '"' + n.title + '" added to global link dashboard'))
      }
    }], [{
      key: "baseName", value: function(n) {
        var t = n.trim(), e = void 0;
        if ("/" === t[t.length - 1]) {
          var i = t.substring(0, t.length - 2);
          e = i.substring(i.lastIndexOf("/") + 1)
        } else e = t.substring(t.lastIndexOf("/") + 1);
        return -1 !== e.lastIndexOf(".") && (e = e.substring(0, e.lastIndexOf("."))), e
      }
    }]), e
  }();
  angular.module("superProductivity").service("GlobalLinkList", n), n.$$ngIsClass = !0
}(), function() {
  function n() {
  }

  angular.module("superProductivity").directive("helpSection", function() {
    return {
      templateUrl: "scripts/help-section/help-section-d.html",
      bindToController: !0,
      controller: n,
      controllerAs: "vm",
      transclude: !0,
      restrict: "E",
      scope: {}
    }
  })
}(), function() {
  function n(n) {
    this.deleteHint = function() {
      n.r.tomorrowsNote && delete n.r.tomorrowsNote
    }
  }

  n.$inject = ["$rootScope"], angular.module("superProductivity").directive("hint", function() {
    return {
      templateUrl: "scripts/hint/hint-d.html",
      bindToController: !0,
      controller: n,
      controllerAs: "vm",
      restrict: "E",
      scope: !0
    }
  })
}(), function() {
  function n(t, i, n, e) {
    var o = this, a = void 0, s = void 0, r = void 0, l = void 0, c = i.children(),
      d = function(n) {
        10 === n.keyCode && n.ctrlKey && o.untoggleShowEdit()
      };

    function m() {
      if (n) {
        var e = require("electron").shell;
        i.find("a").on("click", function(n) {
          var t = angular.element(n.target).attr("href");
          /^https?:\/\//i.test(t) || (t = "http://" + t), n.preventDefault(), e.openExternal(t)
        })
      }
    }

    function u(n) {
      n.stopPropagation(), 27 === n.keyCode && o.untoggleShowEdit()
    }

    n && (a = t(function() {
      m()
    })), o.toggleShowEdit = function(n) {
      n && "A" !== n.target.tagName && (o.showEdit = !0, r = o.ngModel || "", l = t(function() {
        (s = angular.element(i.find("textarea")))[0].value = r, s[0].focus(), s.on("keypress", d), s.on("keydown", u), s.on("$destroy", function() {
          s.off("keypress", d), s.off("keydown", u)
        })
      })), c.addClass("is-editing")
    }, o.toggleEditLock = function(n) {
      o.isLocked = !o.isLocked, o.isLocked ? (n.preventDefault(), n.stopPropagation()) : o.untoggleShowEdit()
    }, o.untoggleShowEdit = function() {
      r = s[0].value, o.isLocked || (o.showEdit = !1, m(), o.resizeToFit(), c.removeClass("is-editing"));
      var n = r !== o.ngModel;
      n && (o.ngModel = r), angular.isFunction(o.onEditFinished) && o.onEditFinished({
        newVal: o.ngModel,
        isChanged: n
      })
    }, o.resizeToFit = function() {
      t(function() {
        var n = angular.element(i.find("marked-preview")), t = angular.element(i.find("div")[0]);
        n.css("height", "auto"), t.css("height", n[0].offsetHeight + "px"), n.css("height", "")
      })
    }, o.resizeToFit(), e.$on("$destroy", function() {
      a && t.cancel(a), l && t.cancel(l)
    })
  }

  n.$inject = ["$timeout", "$element", "IS_ELECTRON", "$scope"], angular.module("superProductivity")
    .directive("inlineMarkdown", function() {
      return {
        templateUrl: "scripts/inline-markdown/inline-markdown-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { ngModel: "=", onEditFinished: "&" }
      }
    })
}(), function() {
  function n(r) {
    return {
      bindToController: !0, controllerAs: "vm", link: function(n, t, a, s) {
        s.$parsers.push(function(n) {
          var t = r.fromString(n), e = !!t;
          if (s.$setValidity("inputDuration", !!t), !e && "optional" === a.inputDuration && n.trim().length <= 1 && (e = !0, t = void 0), t && a.minDuration) {
            var i = r.fromString(a.minDuration), o = t.asMilliseconds() >= i.asMilliseconds();
            s.$setValidity("inputDurationMin", o), e = o
          }
          return e ? t : void 0
        }), s.$formatters.push(function(n) {
          return r.toString(n)
        })
      }, restrict: "A", require: "ngModel"
    }
  }

  n.$inject = ["ParseDuration"], angular.module("superProductivity").directive("inputDuration", n)
}(), function() {
  function n(t) {
    return {
      link: function(e, i, o) {
        var n = t(o.ngModel), a = n.assign, s = n(e);
        i.on("keydown", function(n) {
          if (9 !== n.keyCode && "Tab" !== n.key) {
            if (n.preventDefault(), n.stopPropagation(), 27 === n.keyCode || "Escape" === n.key) a(e, s), i.blur(); else if (13 === n.keyCode || "Enter" === n.key) i.blur(); else {
              if (16 === n.keyCode || 17 === n.keyCode || 18 === n.keyCode) return;
              if (o.omitKeyboardKeyInputControlKeys) a(e, n.key); else {
                var t = "";
                n.ctrlKey && (t += "Ctrl+"), n.altKey && (t += "Alt+"), n.shiftKey && (t += "Shift+"), n.metaKey && (t += "Meta+"), "Meta" === n.key ? a(e, "") : a(e, t + n.key)
              }
            }
            e.$apply()
          }
        })
      }, restrict: "A"
    }
  }

  n.$inject = ["$parse"], angular.module("superProductivity").directive("keyboardKeyInput", n)
}(), function() {
  function o(n, t, e, i, o) {
    var a, s, r, l, c, d, m, u = e.mdxThemeColors, p = e.$rootScope.r.theme, g = "default",
      h = "primary";
    (angular.forEach(i.split(" "), function(n, t) {
      0 === t && "default" === n ? p = n : !{
        primary: "primary",
        accent: "accent",
        warn: "warn",
        background: "background"
      }[n] ? !{
        default: "default",
        "hue-1": "hue-1",
        "hue-2": "hue-2",
        "hue-3": "hue-3"
      }[n] ? {
        50: "50",
        100: "100",
        200: "200",
        300: "300",
        400: "400",
        500: "500",
        600: "600",
        700: "700",
        800: "800",
        A100: "A100",
        A200: "A200",
        A400: "A400",
        A700: "A700"
      }[n] && (a = n) : g = n : h = n
    }), (s = u._THEMES[p]) && (l = s.colors[h]) && (a || (a = l.hues[g]), r = u._PALETTES[l.name][a])) ? n.css(t, "rgb(" + r.value[0] + "," + r.value[1] + "," + r.value[2] + ")") : (c = "%s='%s' bad or missing attributes", d = o, m = i, console.error(c, d, m), console.log('  usage %s="[theme] intention [hue]"', d), console.log("    acceptable intentions : primary,accent,warn,background"), console.log("    acceptable hues       : default,hue-1,hue-2,hue-3"))
  }

  angular.module("mdxUtil", ["ngMaterial"]).directive("mdxPaintFg", ["mdx", function(i) {
    return {
      restrict: "A", link: function(n, t, e) {
        o(t, "color", i, e.mdxPaintFg, "mdx-paint-fg")
      }
    }
  }]).directive("mdxPaintBg", ["mdx", function(i) {
    return {
      restrict: "A", link: function(n, t, e) {
        o(t, "background-color", i, e.mdxPaintBg, "mdx-paint-bg")
      }
    }
  }]).directive("mdxPaintBorder", ["mdx", function(i) {
    return {
      restrict: "A", link: function(n, t, e) {
        o(t, "border-color", i, e.mdxPaintBorder, "mdx-paint-border")
      }
    }
  }]).directive("mdxPaintSvg", ["mdx", function(i) {
    return {
      restrict: "A", link: function(n, t, e) {
        o(t, "fill", i, e.mdxPaintSvg, "mdx-paint-svg")
      }
    }
  }]).provider("mdx", ["$mdThemingProvider", function(t) {
    return {
      $get: ["$rootScope", function(n) {
        return { mdxThemeColors: t, $rootScope: n }
      }]
    }
  }])
}(), function() {
  n.$inject = ["$animateCss"], angular.module("superProductivity")
    .animation(".ani-crawl-in-out", n);
  var i = .225, o = .195, a = "cubic-bezier(0, 0, .2, 1)", s = "cubic-bezier(.4, 0, 1, 1)";

  function n(e) {
    return {
      enter: function(n) {
        var t = n[0].offsetHeight;
        return e(n, {
          from: { maxHeight: "0", transform: "scaleY(0)" },
          to: { maxHeight: t + "px", transform: "scale(1)" },
          duration: i,
          easing: a,
          cleanupStyles: !0
        })
      }, leave: function(n) {
        var t = n[0].offsetHeight;
        return e(n, {
          from: { maxHeight: t + "px", transform: "scale(1)" },
          to: { maxHeight: "0", transform: "scale(0)" },
          duration: o,
          easing: s,
          cleanupStyles: !0
        })
      }
    }
  }
}(), function() {
  n.$inject = ["$animateCss"], angular.module("superProductivity")
    .animation(".ani-expand-collapse", n);
  var i = "cubic-bezier(.4, 0, .2, 1)", o = "cubic-bezier(.4, 0, .2, 1)", a = function(n, t) {
    var e = n ? .225 : .195;
    return 800 < t ? 2 * e : 600 < t ? 1.8 * e : 500 < t ? 1.6 * e : 400 < t ? 1.4 * e : 300 < t ? 1.2 * e : 100 < t ? e : .8 * e
  };

  function n(e) {
    function n(n) {
      var t = n[0].offsetHeight;
      return e(n, {
        from: { height: "0" },
        to: { height: t + "px" },
        duration: a(!0, t),
        easing: i,
        cleanupStyles: !0
      })
    }

    function t(n) {
      var t = n[0].offsetHeight;
      return e(n, {
        from: { height: t + "px" },
        to: { height: "0" },
        duration: a(!1, t),
        easing: o,
        cleanupStyles: !0
      })
    }

    return { enter: n, leave: t, addClass: t, removeClass: n }
  }
}(), function() {
  n.$inject = ["$animateCss"], angular.module("superProductivity")
    .animation(".ani-slide-up-down", n);
  var i = "cubic-bezier(0, 0, .2, 1)", o = "cubic-bezier(.4, 0, 1, 1)", a = function(n, t) {
    var e = n ? .225 : .195;
    return 800 < t ? 2 * e : 600 < t ? 1.8 * e : 500 < t ? 1.6 * e : 400 < t ? 1.4 * e : 300 < t ? 1.2 * e : 100 < t ? e : .8 * e
  };

  function n(e) {
    function n(n) {
      var t = n[0].offsetHeight;
      return e(n, {
        from: { marginTop: "-" + t + "px" },
        to: { marginTop: "0" },
        duration: a(!0, t),
        easing: i,
        cleanupStyles: !0
      })
    }

    function t(n) {
      var t = n[0].offsetHeight;
      return e(n, {
        from: { marginTop: "0" },
        to: { marginTop: "-" + t + "px" },
        duration: a(!1, t),
        easing: o,
        cleanupStyles: !0
      })
    }

    return { enter: n, leave: t, addClass: t, removeClass: n }
  }
}(), function() {
  function n(o) {
    return function(n, t) {
      if (!n) return "-";
      var e = "", i = 0;
      return angular.isObject(n) || (n = o.moment.duration(n)), t ? (n._data.days && (i = n._data.hours + 24 * n._data.days), n._data.hours && (e += n._data.hours + i + " hours "), n._data.minutes && (e += n._data.minutes + " minutes ")) : (n._data.days && (i = n._data.hours + 24 * n._data.days), n._data.hours && (e += n._data.hours + i + "h "), n._data.minutes && (e += n._data.minutes + "m ")), 0 === e.length && (e = "-"), e.trim()
    }
  }

  n.$inject = ["$window"], angular.module("superProductivity").filter("duration", n)
}(), function() {
  angular.module("superProductivity").filter("numberToMonth", function() {
    return function(n) {
      return t[parseInt(n, 10) - 1]
    }
  });
  var t = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
}(), function() {
  var i = "ngStorage-", n = function() {
    function m(n, t, e, i, o, a, s, r, l, c, d) {
      _classCallCheck(this, m), this.PROJECTS_KEY = "projects", this.DONE_BACKLOG_TASKS_KEY = "doneBacklogTasks", this.LS_DEFAULTS = n, this.TMP_FIELDS = e, this.SAVE_APP_STORAGE_POLL_INTERVAL = t, this.ON_DEMAND_LS_FIELDS = a, this.ON_DEMAND_LS_FIELDS_FOR_PROJECT = s, this.IS_ELECTRON = r, this.EV = c, this.$rootScope = o, this.$injector = d, this.SimpleToast = l, this.$interval = i, this.serializer = angular.toJson, this.deserializer = angular.fromJson, this.setupPollingForSavingCurrentState()
    }

    return m.$inject = ["LS_DEFAULTS", "SAVE_APP_STORAGE_POLL_INTERVAL", "TMP_FIELDS", "$interval", "$rootScope", "ON_DEMAND_LS_FIELDS", "ON_DEMAND_LS_FIELDS_FOR_PROJECT", "IS_ELECTRON", "SimpleToast", "EV", "$injector"], _createClass(m, [{
      key: "getCompleteBackupData",
      value: function() {
        var n = angular.copy(this.getCurrentAppState());
        return n[this.PROJECTS_KEY] = this.getProjects(), n[this.DONE_BACKLOG_TASKS_KEY] = this.getDoneBacklogTasks(), n
      }
    }, {
      key: "setupPollingForSavingCurrentState", value: function() {
        var n = this;
        this.updateLsInterval = this.$interval(function() {
          n.saveToLs()
        }, this.SAVE_APP_STORAGE_POLL_INTERVAL)
      }
    }, {
      key: "getCurrentAppState", value: function() {
        var n = {};
        for (var t in this.LS_DEFAULTS) {
          var e = -1 === this.TMP_FIELDS.indexOf(t), i = -1 === this.ON_DEMAND_LS_FIELDS.indexOf(t),
            o = t !== this.PROJECTS_KEY;
          this.LS_DEFAULTS.hasOwnProperty(t) && i && e && o && (n[t] = this.$rootScope.r[t])
        }
        return n
      }
    }, {
      key: "getDoneBacklogTasks", value: function() {
        var n = this.getProjects();
        return n && this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id ? _.find(n, ["id", this.$rootScope.r.currentProject.id]).data[this.DONE_BACKLOG_TASKS_KEY] : this.getLsItem(this.DONE_BACKLOG_TASKS_KEY)
      }
    }, {
      key: "saveDoneBacklogTasks", value: function(n) {
        if (Array.isArray(n)) {
          var t = this.getProjects();
          if (t && this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id) _.find(t, ["id", this.$rootScope.r.currentProject.id]).data[this.DONE_BACKLOG_TASKS_KEY] = n, this.saveProjects(t); else this.saveLsItem(n, this.DONE_BACKLOG_TASKS_KEY)
        }
      }
    }, {
      key: "saveToLs", value: function() {
        var n = this.getCurrentAppState();
        for (var t in n) this.saveLsItem(n[t], t)
      }
    }, {
      key: "loadLsDataToApp", value: function() {
        var n = this.$injector.get("Projects"), t = this.$injector.get("InitGlobalModels");
        this.$rootScope.r = this.getCurrentLsWithReducedProjects(), n.getAndUpdateCurrent(), t()
      }
    }, {
      key: "importData", value: function(n) {
        var e = this;
        this.SimpleToast("CUSTOM", "Data updated from the outside. Updating...", "update");
        try {
          this.updateLsInterval && this.$interval.cancel(this.updateLsInterval), _.forOwn(n, function(n, t) {
            e.saveLsItem(n, t)
          }), this.loadLsDataToApp(), this.$rootScope.$broadcast(this.EV.COMPLETE_DATA_RELOAD), this.SimpleToast("SUCCESS", "Successfully imported data.")
        } catch (n) {
          console.error(n), this.SimpleToast("ERROR", "Something went wrong importing your data.")
        }
      }
    }, {
      key: "getProjects", value: function() {
        return this.getLsItem(this.PROJECTS_KEY)
      }
    }, {
      key: "saveProjects", value: function(n) {
        this.saveLsItem(n, this.PROJECTS_KEY)
      }
    }, {
      key: "getLsItem", value: function(n) {
        var t = window.localStorage.getItem(i + n);
        if (t) return this.deserializer(t)
      }
    }, {
      key: "saveLsItem", value: function(n, t) {
        var e = n ? this.serializer(n) : "";
        window.localStorage.setItem(i + t, e)
      }
    }, {
      key: "makeProjectsSimple", value: function(n) {
        var i = this;
        return _.each(n, function(e) {
          _.forOwn(e, function(n, t) {
            -1 !== i.ON_DEMAND_LS_FIELDS_FOR_PROJECT.indexOf(t) && delete e[t]
          })
        }), n
      }
    }, {
      key: "getDefaultsForDeepObject", value: function(e, i) {
        var o = this;
        if (!i) return e;
        var n = Object.keys(i), a = {};
        return n.forEach(function(n) {
          var t = e[n];
          void 0 === t ? a[n] = i[n] : null === t || "object" !== (void 0 === t ? "undefined" : _typeof(t)) || Array.isArray(t) ? a[n] = e[n] : a[n] = o.getDefaultsForDeepObject(t, i[n])
        }), a
      }
    }, {
      key: "getCurrentLsWithReducedProjects", value: function() {
        var i = this, o = {};
        return Object.keys(this.LS_DEFAULTS).forEach(function(n) {
          var t = i.getLsItem(n);
          if (void 0 === t) o[n] = i.LS_DEFAULTS[n]; else if (null === t || "object" !== (void 0 === t ? "undefined" : _typeof(t)) || Array.isArray(t) ? o[n] = t : o[n] = i.getDefaultsForDeepObject(t, i.LS_DEFAULTS[n]), n === i.PROJECTS_KEY) {
            var e = o[n];
            i.makeProjectsSimple(e)
          }
        }), o
      }
    }]), m
  }();
  angular.module("superProductivity").service("AppStorage", n), n.$$ngIsClass = !0
}(), angular.module("superProductivity").service("CheckShortcutKeyCombo", function() {
  return function(n, t) {
    if (t) {
      var e = !0, i = t.split("+"), o = i[i.length - 1], a = angular.copy(i);
      return a.splice(-1, 1), e = (e = (e = (e = (e = e && (-1 === a.indexOf("Ctrl") || !0 === n.ctrlKey)) && (-1 === a.indexOf("Alt") || !0 === n.altKey)) && (-1 === a.indexOf("Shift") || !0 === n.shiftKey)) && (-1 === a.indexOf("Meta") || !0 === n.metaKey)) && n.key === o
    }
  }
}), function() {
  var n = function() {
    function o(n, t, e, i) {
      _classCallCheck(this, o), this.$mdToast = n, this.Notifier = t, this.$rootScope = e, this.$timeout = i, this.currentToastPromise = void 0, this.notificationTimeout = void 0, this.isNotificationTimeoutRunning = !1
    }

    return o.$inject = ["$mdToast", "Notifier", "$rootScope", "$timeout"], _createClass(o, [{
      key: "checkTaskAndNotify",
      value: function(n) {
        this.isEnabled() && n.timeEstimate && n.timeSpent && moment.duration(n.timeSpent)
          .asMinutes() > moment.duration(n.timeEstimate).asMinutes() && this.notify(n)
      }
    }, {
      key: "isEnabled", value: function() {
        return this.$rootScope.r.config && this.$rootScope.r.config.isNotifyWhenTimeEstimateExceeded
      }
    }, {
      key: "isToastOpen", value: function() {
        return this.currentToastPromise && 0 === this.currentToastPromise.$$state.status
      }
    }, {
      key: "reInitNotificationTimeout", value: function() {
        var n = this;
        this.notificationTimeout && this.$timeout.cancel(this.notificationTimeout), this.isNotificationTimeoutRunning = !0, this.notificationTimeout = this.$timeout(function() {
          n.isNotificationTimeoutRunning = !1
        }, 6e4)
      }
    }, {
      key: "notify", value: function(t) {
        if (!this.isToastOpen() && !this.isNotificationTimeoutRunning) {
          this.reInitNotificationTimeout();
          var n = 'You exceeded your estimated time for "' + t.title + '".',
            e = this.$mdToast.simple().textContent(n).action("Add 1/2 hour").hideDelay(1e4)
              .position("bottom");
          this.currentToastPromise = this.$mdToast.show(e).then(function(n) {
            "ok" === n && (t.timeEstimate = moment.duration(t.timeEstimate), t.timeEstimate.add(moment.duration({ minutes: 30 })))
          }), this.Notifier({ title: "Time estimate exceeded!", message: n, sound: !0, wait: !0 })
        }
      }
    }]), o
  }();
  angular.module("superProductivity").service("EstimateExceededChecker", n), n.$$ngIsClass = !0
}(), function() {
  function n(n) {
    n.decorator("$exceptionHandler", ["$delegate", "$injector", function(e, i) {
      return function(n, t) {
        i.get("SimpleToast")("ERROR", "Unknown Error: " + n), e(n, t)
      }
    }])
  }

  n.$inject = ["$provide"], angular.module("superProductivity").config(n)
}(), function() {
  var i = window, n = function() {
    function e(n) {
      var t = this;
      _classCallCheck(this, e), this.isInterfaceReady = !1, this.SimpleToast = n, i.addEventListener("SP_EXTENSION_READY", function() {
        t.isInterfaceReady || t.SimpleToast("SUCCESS", "Super Productivity Extension found and loaded."), t.isInterfaceReady = !0
      })
    }

    return e.$inject = ["SimpleToast"], _createClass(e, [{
      key: "addEventListener",
      value: function(n, t) {
        i.addEventListener(n, function(n) {
          t(n, n.detail)
        })
      }
    }, {
      key: "dispatchEvent", value: function(n, t) {
        var e = new CustomEvent(n, { detail: t });
        this.isInterfaceReady ? i.dispatchEvent(e) : setTimeout(function() {
          i.dispatchEvent(e)
        }, 2e3)
      }
    }]), e
  }();
  angular.module("superProductivity").service("ExtensionInterface", n), n.$$ngIsClass = !0
}(), function() {
  function n(i, o, a, s) {
    var r = this;
    this.requestsLog = {}, s && window.ipcRenderer.on("GIT_LOG_RESPONSE", function(n, t) {
      t.requestId && (!t || t.error ? r.requestsLog[t.requestId].reject(t) : r.requestsLog[t.requestId].resolve(t.stdout), delete r.requestsLog[t.requestId])
    }), this.get = function(n) {
      if (s && a.r.git && a.r.git.projectDir) {
        var t = o(), e = i.defer();
        return r.requestsLog[t] = e, window.ipcRenderer.send("GIT_LOG", {
          requestId: t,
          cwd: n
        }), e.promise
      }
      return i.when(null)
    }
  }

  n.$inject = ["$q", "Uid", "$rootScope", "IS_ELECTRON"], angular.module("superProductivity")
    .service("GitLog", n)
}(), function() {
  function n(t, n, i, o, l, c) {
    var d = this, e = "GITHUB", a = "https://api.github.com/", s = this;

    function r(n) {
      var t = void 0;
      return "string" == typeof n && (n = angular.fromJson(n)), t = n.pull_request ? s.getSettings().prPrefix + " #" + n.number + ": " + n.title : "#" + n.number + " " + n.title, {
        originalId: n.number,
        originalType: e,
        originalLink: n.html_url,
        originalStatus: n.state,
        originalUpdated: moment(n.updated_at),
        title: t,
        notes: n.body
      }
    }

    function m(n) {
      "string" == typeof n && (n = angular.fromJson(n));
      var t = [];
      return n.forEach(function(n) {
        t.push(r(n))
      }), t
    }

    function u(n) {
      "string" == typeof n && (n = angular.fromJson(n));
      var t = [];
      return n.forEach(function(n) {
        t.push({ author: n.user.login, body: n.body, created: n.created_at })
      }), t
    }

    function p(n, t, e, i) {
      return { author: e, items: [{ field: n, toString: t }], created: i }
    }

    this.isGitTask = function(n) {
      return n && n.originalId && n.originalType === e
    }, this.isRepoConfigured = function() {
      var n = d.getSettings();
      return n && n.repo && "" !== n.repo.trim()
    }, this.getSettings = function() {
      return n.r && n.r.git
    }, this.getLatestSpRelease = function() {
      return t.get("https://api.github.com/repos/johannesjo/super-productivity/releases/latest")
    }, this.getIssueList = function() {
      return d.isRepoConfigured() ? t.get(a + "repos/" + d.getSettings().repo + "/issues", { transformResponse: [m] }) : o.reject()
    }, this.getCommentListForIssue = function(n) {
      return d.isRepoConfigured() ? t.get(a + "repos/" + d.getSettings().repo + "/issues/" + n + "/comments", { transformResponse: [u] }) : o.reject()
    }, this.getIssueById = function(n) {
      return d.isRepoConfigured() ? t.get(a + "repos/" + d.getSettings().repo + "/issues/" + n, { transformResponse: [r] }) : o.reject()
    }, this.checkAndUpdateTasks = function(n) {
      if (!d.isRepoConfigured()) return o.reject();
      var t = i.get("TasksUtil"), e = o.defer();
      return t.flattenTasks(n, d.isGitTask, d.isGitTask).reduce(function(n, r) {
        return n.then(function() {
          return d.getIssueById(r.originalId).then(function(n) {
            var t, e, i, o, a = n.data, s = moment(r.originalUpdated);
            s && moment(a.originalUpdated)
              .isAfter(s) && (r.originalChangelog || (r.originalChangelog = []), r.originalChangelog = (i = r, o = [], (e = a).title !== i.title && o.push(p("title", e.title)), e.notes !== i.notes && o.push(p("description", e.notes)), o), angular.extend(r, a), r.isUpdated = !0, (t = a) && (l({
              title: "Git Update",
              message: '"' + t.title + '" => has been updated as it was updated on Git.',
              sound: !0,
              wait: !0
            }), c('"' + t.title + '" => has been updated as it was updated on Git.')), d.getCommentListForIssue(r.originalId)
              .then(function(n) {
                var t = n.data;
                t.length !== r.originalComments.length && (r.originalChangelog || (r.originalChangelog = []), r.originalChangelog.push(p("new comment added"))), r.originalComments = t
              }))
          }, e.reject)
        })
      }, Promise.resolve()).then(function() {
        e.resolve()
      }), e.promise
    }, this.checkForNewAndAddToBacklog = function() {
      var e = i.get("Tasks");
      d.isRepoConfigured() && n.r.git.isAutoImportToBacklog && d.getIssueList().then(function(n) {
        var t = n.data;
        _.each(t, function(n) {
          if (!e.isTaskWithOriginalIdExistant(n.originalId)) {
            var t = e.createTask(n);
            e.addNewToTopOfBacklog(t, !0)
          }
        })
      })
    }
  }

  n.$inject = ["$http", "$rootScope", "$injector", "$q", "Notifier", "SimpleToast"], angular.module("superProductivity")
    .service("Git", n)
}(), function() {
  var n = ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    a = "id,title,mimeType,userPermission,editable,modifiedDate,shared,createdDate,fileSize",
    s = function() {
      this.boundary = Math.random().toString(36)
        .slice(2), this.mimeType = 'multipart/mixed; boundary="' + this.boundary + '"', this.parts = [], this.body = null
    };
  s.prototype.append = function(n, t) {
    if (null !== this.body) throw new Error("Builder has already been finalized.");
    return this.parts.push("\r\n--", this.boundary, "\r\n", "Content-Type: ", n, "\r\n\r\n", t), this
  }, s.prototype.finish = function() {
    if (0 === this.parts.length) throw new Error("No parts have been added.");
    return null === this.body && (this.parts.push("\r\n--", this.boundary, "--"), this.body = this.parts.join("")), {
      type: this.mimeType,
      body: this.body
    }
  };
  var t = function() {
    function l(n, t, e, i, o, a, s, r) {
      _classCallCheck(this, l), this.$q = t, this.$http = i, this.$log = r, this.$rootScope = o, this.GOOGLE = n, this.IS_ELECTRON = e, this.SimpleToast = s, this.$mdToast = a, this.data = this.$rootScope.r.googleTokens, this.isLoggedIn = !1
    }

    return l.$inject = ["GOOGLE", "$q", "IS_ELECTRON", "$http", "$rootScope", "$mdToast", "SimpleToast", "$log"], _createClass(l, [{
      key: "initClientLibraryIfNotDone",
      value: function() {
        var n = this, t = this.$q.defer();
        return this.loadLib(function() {
          window.gapi.load("client:auth2", function() {
            n.initClient().then(function() {
              var n = window.gapi.auth2.getAuthInstance().currentUser.get();
              t.resolve(n)
            })
          })
        }), t.promise
      }
    }, {
      key: "loadJs", value: function(n, t) {
        var e = this, i = document.createElement("script");
        i.setAttribute("src", n), i.setAttribute("type", "text/javascript"), this.isScriptLoaded = !1;
        var o = function() {
          e.isScriptLoaded || (e.isScriptLoaded = !0, t && t())
        };
        i.onload = o.bind(e), i.onreadystatechange = o.bind(e), document.getElementsByTagName("head")[0].appendChild(i)
      }
    }, {
      key: "loadLib", value: function(n) {
        this.loadJs("https://apis.google.com/js/api.js", n)
      }
    }, {
      key: "initClient", value: function() {
        return window.gapi.client.init({
          apiKey: this.GOOGLE.API_KEY,
          clientId: this.GOOGLE.CLIENT_ID,
          discoveryDocs: n,
          scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive"
        })
      }
    }, {
      key: "login", value: function() {
        var o = this,
          n = !this.data.expiresAt || window.moment().valueOf() + 3e4 > this.data.expiresAt;
        return n && (this.data.accessToken = void 0), this.data.accessToken && !n ? (this.isLoggedIn = !0, new Promise(function(n) {
          return n()
        })) : this.IS_ELECTRON ? (window.ipcRenderer.send("TRIGGER_GOOGLE_AUTH"), new Promise(function(i, n) {
          window.ipcRenderer.on("GOOGLE_AUTH_TOKEN", function(n, t) {
            var e = t.access_token;
            o.data.accessToken = e, o.data.expiresAt = 1e3 * t.expires_in + window.moment()
              .valueOf(), o.isLoggedIn = !0, o.SimpleToast("SUCCESS", "GoogleApi: Login successful"), i()
          }), window.ipcRenderer.on("GOOGLE_AUTH_TOKEN_ERROR", n)
        })) : this.initClientLibraryIfNotDone().then(function(n) {
          if (!(n && n.Zi && n.Zi.access_token)) return window.gapi.auth2.getAuthInstance().signIn()
            .then(function(n) {
              console.log(n), o.isLoggedIn = !0, o.saveToken(n), o.SimpleToast("SUCCESS", "GoogleApi: Login successful")
            });
          o.isLoggedIn = !0, o.saveToken(n), o.SimpleToast("SUCCESS", "GoogleApi: Login successful")
        })
      }
    }, {
      key: "saveToken", value: function(n) {
        this.data.accessToken = n.Zi.access_token, this.data.expiresAt = n.Zi.expires_at
      }
    }, {
      key: "logout", value: function() {
        return this.isLoggedIn = !1, this.data.accessToken = void 0, this.data.expiresAt = void 0, this.data.refreshToken = void 0, this.IS_ELECTRON ? new Promise(function(n) {
          n()
        }) : window.gapi ? window.gapi.auth2.getAuthInstance().signOut() : new Promise(function(n) {
          n()
        })
      }
    }, {
      key: "appendRow", value: function(n, t) {
        return this.requestWrapper(this.$http({
          method: "POST",
          url: "https://sheets.googleapis.com/v4/spreadsheets/" + n + "/values/A1:Z99:append",
          params: {
            key: this.GOOGLE.API_KEY,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: "USER_ENTERED"
          },
          headers: { Authorization: "Bearer " + this.data.accessToken },
          data: { values: [t] }
        }))
      }
    }, {
      key: "getSpreadsheetData", value: function(n, t) {
        return this.requestWrapper(this.$http({
          method: "GET",
          url: "https://sheets.googleapis.com/v4/spreadsheets/" + n + "/values/" + t,
          params: { key: this.GOOGLE.API_KEY },
          headers: { Authorization: "Bearer " + this.data.accessToken }
        }))
      }
    }, {
      key: "getSpreadsheetHeadingsAndLastRow", value: function(n) {
        var e = this, i = this.$q.defer();
        return this.getSpreadsheetData(n, "A1:Z99").then(function(n) {
          var t = n.result || n.data;
          t.values && t.values[0] ? i.resolve({
            headings: t.values[0],
            lastRow: t.values[t.values.length - 1]
          }) : (i.reject("No data found"), e.handleError("No data found"))
        }), this.requestWrapper(i.promise)
      }
    }, {
      key: "getFileInfo", value: function(n) {
        return n ? this.requestWrapper(this.$http({
          method: "GET",
          url: "https://content.googleapis.com/drive/v2/files/" + encodeURIComponent(n),
          params: { key: this.GOOGLE.API_KEY, supportsTeamDrives: !0, fields: a },
          headers: { Authorization: "Bearer " + this.data.accessToken }
        })) : (this.SimpleToast("ERROR", "GoogleApi: No file id specified"), this.$q.reject("No file id given"))
      }
    }, {
      key: "findFile", value: function(n) {
        return n ? this.requestWrapper(this.$http({
          method: "GET",
          url: "https://content.googleapis.com/drive/v2/files",
          params: { key: this.GOOGLE.API_KEY, q: "title='" + n + "' and trashed=false" },
          headers: { Authorization: "Bearer " + this.data.accessToken }
        })) : (this.SimpleToast("ERROR", "GoogleApi: No file name specified"), this.$q.reject("No file name given"))
      }
    }, {
      key: "loadFile", value: function(n) {
        var t = this;
        if (!n) return this.SimpleToast("ERROR", "GoogleApi: No file id specified"), this.$q.reject("No file id given");
        var e = this.getFileInfo(n), i = this.requestWrapper(this.$http({
          method: "GET",
          url: "https://content.googleapis.com/drive/v2/files/" + encodeURIComponent(n),
          params: { key: this.GOOGLE.API_KEY, supportsTeamDrives: !0, alt: "media" },
          headers: { Authorization: "Bearer " + this.data.accessToken }
        }));
        return this.$q.all([this.$q.when(e), this.$q.when(i)]).then(function(n) {
          return t.$q.when({ backup: n[1].data, meta: n[0].data })
        })
      }
    }, {
      key: "saveFile", value: function(n) {
        var t = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {};
        angular.isString(n) || (n = JSON.stringify(n));
        var e = void 0, i = void 0;
        t.id ? (e = "/upload/drive/v2/files/" + encodeURIComponent(t.id), i = "PUT") : (e = "/upload/drive/v2/files/", i = "POST"), t.mimeType || (t.mimeType = "application/json");
        var o = (new s).append("application/json", JSON.stringify(t)).append(t.mimeType, n)
          .finish();
        return this.requestWrapper(this.$http({
          method: i,
          url: "https://content.googleapis.com" + e,
          params: {
            key: this.GOOGLE.API_KEY,
            uploadType: "multipart",
            supportsTeamDrives: !0,
            fields: a
          },
          headers: { Authorization: "Bearer " + this.data.accessToken, "Content-Type": o.type },
          data: o.body
        }))
      }
    }, {
      key: "handleUnAuthenticated", value: function(n) {
        this.$log.error(n), this.logout();
        this.$mdToast.show({
          hideDelay: 2e4,
          controller: ["$scope", "$mdToast", "GoogleApi", function(n, t, e) {
            n.login = function() {
              e.login(), t.hide()
            }
          }],
          template: '\n<md-toast>\n  <div class="md-toast-content">\n    <div class="icon-wrapper">\n      <ng-md-icon icon="error" style="fill:#e15d63"></ng-md-icon>\n    </div>\n    <div class="toast-text">GoogleApi: Failed to authenticate please try logging in again!</div> \n    <md-button ng-click="login()">Login</md-button>\n  </div>\n</md-toast>'
        })
      }
    }, {
      key: "handleError", value: function(n) {
        var t = "";
        return "string" == typeof n ? t = n : n && n.data && n.data.error && (t = n.data.error.message), t && (t = ": " + t), this.$log.error(n), n && 401 === n.status ? this.handleUnAuthenticated(n) : (this.$log.error(n), this.SimpleToast("ERROR", "GoogleApi Error" + t)), this.$q.reject()
      }
    }, {
      key: "requestWrapper", value: function(n) {
        var t = this, e = this.$q.defer();
        return n.then(function(n) {
          n && n.status < 300 ? e.resolve(n) : n ? n && 300 <= n.status ? t.handleError(n) : n && 401 === n.status ? (t.handleUnAuthenticated(n), e.reject(n)) : e.resolve(n) : (t.handleError("No response body"), e.reject(n))
        }).catch(function(n) {
          t.handleError(n), e.reject(n)
        }), e.promise
      }
    }]), l
  }();
  angular.module("superProductivity").service("GoogleApi", t), t.$$ngIsClass = !0
}(), function() {
  var n = function() {
    function c(n, t, e, i, o, a, s, r) {
      var l = this;
      _classCallCheck(this, c), this.AppStorage = n, this.GoogleApi = t, this.$rootScope = e, this.SimpleToast = i, this.$mdDialog = o, this.$mdToast = a, this.$interval = r, this.$q = s, this.data = this.$rootScope.r.googleDriveSync, this.config = this.$rootScope.r.config.googleDriveSync, this.config.isEnabled && this.config.isAutoLogin && t.login()
        .then(function() {
          l.config.isAutoSyncToRemote && l.resetAutoSyncToRemoteInterval(), l.config.isLoadRemoteDataOnStartup && l._checkForInitialUpdate()
        })
    }

    return c.$inject = ["AppStorage", "GoogleApi", "$rootScope", "SimpleToast", "$mdDialog", "$mdToast", "$q", "$interval"], _createClass(c, [{
      key: "_log",
      value: function() {
        var n;
        (n = console).log.apply(n, [this.constructor.name + ":"].concat(Array.prototype.slice.call(arguments)))
      }
    }, {
      key: "_import", value: function(n) {
        var t = n.backup, e = n.meta;
        t.googleDriveSync.lastLocalUpdate = this.data.lastLocalUpdate = e.modifiedDate, t.googleDriveSync.lastSyncToRemote = this.data.lastSyncToRemote = e.modifiedDate, t.lastActiveTime = new Date, this.AppStorage.importData(t)
      }
    }, {
      key: "_isNewerThan", value: function(n, t) {
        var e = new Date(n), i = new Date(t);
        return e.getTime() > i.getTime()
      }
    }, {
      key: "_isCurrentPromisePending", value: function() {
        return this.currentPromise && 0 === this.currentPromise.$$state.status
      }
    }, {
      key: "_getLocalAppData", value: function() {
        return this.AppStorage.getCompleteBackupData()
      }
    }, {
      key: "_formatDate", value: function(n) {
        return window.moment(n).format("DD-MM-YYYY * hh:mm:ss")
      }
    }, {
      key: "_checkForInitialUpdate", value: function() {
        var o = this;
        return this.currentPromise = this.GoogleApi.getFileInfo(this.data.backupDocId)
          .then(function(n) {
            var t = n.data.modifiedDate;
            if (o._log(o._formatDate(t), " > ", o._formatDate(o.data.lastLocalUpdate), o._isNewerThan(t, o.data.lastLocalUpdate)), o._isNewerThan(t, o.data.lastLocalUpdate)) {
              o.SimpleToast("CUSTOM", "There is a remote update! Downloading...", "file_upload"), o._log("HAS CHANGED, TRYING TO UPDATE");
              var e = o.$rootScope.r.lastActiveTime, i = o._isNewerThan(t, e);
              o._log("Skipping Dialog", i), o.loadFrom(i, !0)
            }
          }), this.currentPromise
      }
    }, {
      key: "_showAsyncToast", value: function(t, n) {
        this.$mdToast.show({
          hideDelay: t ? 15e3 : 5e3,
          controller: ["$mdToast", function(n) {
            t && t.then(n.hide, n.hide)
          }],
          template: '\n<md-toast>\n  <div class="md-toast-content" flex>\n    <div class="icon-wrapper">\n      <ng-md-icon icon="file_upload"></ng-md-icon>\n    </div>\n    <div class="toast-text">' + n + '</div>\n    <md-progress-linear md-mode="indeterminate"\n      style="position: absolute; top: 0; left: 0;"></md-progress-linear>\n  </div>\n</md-toast>'
        })
      }
    }, {
      key: "_confirmSaveDialog", value: function(n) {
        return this.$mdDialog.show({
          template: '\n<md-dialog>\n  <md-dialog-content>\n    <div class="md-dialog-content">\n      <h2 class="md-title" style="margin-top: 0">Overwrite unsaved data on Google Drive?</h2>\n      <p>There seem to be some changes on Google Drive, that you don\\\'t have locally. Do you want to overwrite them anyway?</p>\n      <table> \n        <tr>\n          <td>Last modification of remote data:</td>\n          <td> ' + this._formatDate(n) + "</td>\n        </tr>\n        <tr>\n          <td>Last sync to remote from this app instance:</td>\n          <td> " + this._formatDate(this.data.lastSyncToRemote) + '</td>\n        </tr>\n      </table>\n    </div>\n  </md-dialog-content>\n\n  <md-dialog-actions>\n    <md-button ng-click="saveToRemote()" class="md-primary">\n      Please do it!\n    </md-button>\n    <md-button ng-click="loadFromRemote()" class="md-primary">\n      Load remote data instead\n    </md-button>\n    <md-button ng-click="cancel()" class="md-primary">\n      Abort\n    </md-button>\n  </md-dialog-actions>\n</md-dialog>',
          controller: ["$mdDialog", "$scope", "GoogleDriveSync", function(n, t, e) {
            t.saveToRemote = function() {
              n.hide()
            }, t.loadFromRemote = function() {
              n.cancel(), setTimeout(function() {
                e.loadFrom()
              }, 100)
            }, t.cancel = function() {
              n.cancel()
            }
          }]
        })
      }
    }, {
      key: "_confirmLoadDialog", value: function(n) {
        var t = this.$mdDialog.confirm().title("Update from Google Drive Backup")
          .textContent("\n        Overwrite unsaved local changes? All data will be lost forever. \n        -- Last modification of remote data: " + this._formatDate(n))
          .ok("Please do it!").cancel("No");
        return this.$mdDialog.show(t)
      }
    }, {
      key: "_confirmUsingExistingFileDialog", value: function(n) {
        var t = this.$mdDialog.confirm().title('Use existing file "' + n + '" as sync file?')
          .textContent("\n        We found a file with the name you specified. Do you want to use it as your sync file? If not please change the Sync file name.")
          .ok("Please do it!").cancel("Abort");
        return this.$mdDialog.show(t)
      }
    }, {
      key: "_confirmSaveNewFile", value: function(n) {
        var t = this.$mdDialog.confirm().title('Create "' + n + '" as sync file on Google Drive?')
          .textContent("\n        No file with the name you specified was found. Do you want to create it?")
          .ok("Please do it!").cancel("Abort");
        return this.$mdDialog.show(t)
      }
    }, {
      key: "_save", value: function() {
        var t = this, n = this._getLocalAppData();
        return this.GoogleApi.saveFile(n, {
          title: this.config.syncFileName,
          id: this.data.backupDocId,
          editable: !0
        }).then(function(n) {
          t.data.backupDocId = n.data.id, t.data.lastSyncToRemote = n.data.modifiedDate, t.data.lastLocalUpdate = n.data.modifiedDate, t.AppStorage.saveToLs()
        })
      }
    }, {
      key: "_load", value: function() {
        var t = this;
        return this.config.syncFileName ? this.GoogleApi.loadFile(this.data.backupDocId)
          .then(function(n) {
            return t.$q.when(n)
          }) : this.$q.reject("No file name specified")
      }
    }, {
      key: "resetAutoSyncToRemoteInterval", value: function() {
        var n = this;
        if (this.cancelAutoSyncToRemoteIntervalIfSet(), this.config.isAutoSyncToRemote && this.config.isEnabled) {
          var t = window.moment.duration(this.config.syncInterval).asMilliseconds();
          t < 5e3 ? this._log("Interval too low") : this.autoSyncInterval = this.$interval(function() {
            n.saveForSyncIfEnabled()
          }, t)
        }
      }
    }, {
      key: "cancelAutoSyncToRemoteIntervalIfSet", value: function() {
        this.autoSyncInterval && this.$interval.cancel(this.autoSyncInterval)
      }
    }, {
      key: "changeSyncFileName", value: function(e) {
        var i = this, o = this.$q.defer();
        return this.GoogleApi.findFile(e).then(function(n) {
          var t = n.data.items;
          t && 0 !== t.length ? 1 < t.length ? (i.SimpleToast("ERROR", 'Multiple files with the name "' + e + '" found. Please delete all but one or choose a different name.'), o.reject()) : 1 === t.length && i._confirmUsingExistingFileDialog(e)
            .then(function() {
              var n = t[0];
              i.data.backupDocId = n.id, i.config.syncFileName = e, o.resolve(i.data.backupDocId)
            }, o.reject) : i._confirmSaveNewFile(e).then(function() {
            i.config.syncFileName = e, i.data.backupDocId = void 0, i._save().then(o.resolve)
          }, o.reject)
        }), o.promise
      }
    }, {
      key: "saveForSyncIfEnabled", value: function() {
        if (!this.config.isAutoSyncToRemote || !this.config.isEnabled) return this.$q.resolve();
        if (this._isCurrentPromisePending()) return this._log("SYNC OMITTED because of promise", this.currentPromise, this.currentPromise.$$state.status), this.$q.reject();
        this._log("SYNC");
        var n = this.saveTo();
        return this.config.isNotifyOnSync && this._showAsyncToast(n, "Syncing to google drive"), n
      }
    }, {
      key: "saveTo", value: function() {
        var e = this;
        if (this._isCurrentPromisePending()) return this._log("saveTo omitted because is in progress", this.currentPromise, this.currentPromise.$$state.status), this.$q.reject("Something in progress");
        var i = this.$q.defer();
        return this.currentPromise = i.promise, this.data.backupDocId ? this.GoogleApi.getFileInfo(this.data.backupDocId)
          .then(function(n) {
            var t = n.data.modifiedDate;
            e._isNewerThan(t, e.data.lastSyncToRemote) ? e._confirmSaveDialog(t).then(function() {
              e._save().then(i.resolve)
            }, i.reject) : e._save().then(i.resolve)
          })
          .catch(i.reject) : (this.config.syncFileName || (this.config.syncFileName = "SUPER_PRODUCTIVITY_SYNC.json"), this.changeSyncFileName(this.config.syncFileName)
          .then(function() {
            e._save().then(i.resolve)
          }, i.reject)), i.promise
      }
    }, {
      key: "loadFrom", value: function() {
        var e = this, n = 0 < arguments.length && void 0 !== arguments[0] && arguments[0];
        if (!(1 < arguments.length && void 0 !== arguments[1] && arguments[1]) && this._isCurrentPromisePending()) return this._log("loadFrom omitted because is in progress", this.currentPromise, this.currentPromise.$$state.status), this.$q.reject("Something in progress");
        var i = this.$q.defer();
        return this.currentPromise = i.promise, n ? this._load().then(function(n) {
          e._import(n), i.resolve(n)
        }, i.reject) : this._load().then(function(n) {
          var t = n.meta.modifiedDate;
          e._confirmLoadDialog(t).then(function() {
            e._import(n), i.resolve(n)
          }, i.reject)
        }, i.reject), i.promise
      }
    }]), c
  }();
  angular.module("superProductivity").service("GoogleDriveSync", n), n.$$ngIsClass = !0
}(), function() {
  function n(n, t, e, i, o, a) {
    return function() {
      t.$state = e, t.r.currentTask = t.r.currentTask = i.getCurrent(), t.r.currentTask && i.updateCurrent(t.r.currentTask), t.r.currentSession = angular.copy(a.currentSession), t.r.theme = t.r.theme = t.r.theme || n, t.r.theme && -1 < t.r.theme.indexOf("dark") ? t.r.bodyClass = "dark-theme" : t.r.bodyClass = "", t.r.uiHelper.dailyTaskExportSettings || (t.r.uiHelper.dailyTaskExportSettings = {}), t.r.uiHelper.timeTrackingHistoryExportSettings || (t.r.uiHelper.timeTrackingHistoryExportSettings = {}), t.r.uiHelper.csvExportSettings || (t.r.uiHelper.csvExportSettings = {}), o.reInit()
    }
  }

  n.$inject = ["DEFAULT_THEME", "$rootScope", "$state", "Tasks", "PomodoroButton", "LS_DEFAULTS"], angular.module("superProductivity")
    .service("InitGlobalModels", n)
}(), function() {
  var v = "JIRA_RESPONSE", a = "YYYY-MM-DDTHH:mm:ss.SSZZ", t = "JIRA",
    o = ["assignee", "summary", "description", "timeestimate", "timespent", "status", "attachment", "comment", "updated"],
    n = function() {
      function k(n, t, e, i, o, a, s, r, l, c, d, m, u, p) {
        _classCallCheck(this, k), this.requestsLog = {}, this.IS_ELECTRON = n, this.IS_EXTENSION = t, this.Uid = i, this.$q = o, this.$rootScope = a, this.Dialogs = s, this.Notifier = r, this.$injector = l, this.$timeout = c, this.REQUEST_TIMEOUT = d, this.$log = m, this.SimpleToast = e, this.$window = u, this.ExtensionInterface = p;
        var g = this, h = function(n) {
          if (n.requestId && g.requestsLog[n.requestId]) {
            var t = g.requestsLog[n.requestId];
            g.$timeout.cancel(t.timeout), !n || n.error ? (g.$log.log("FRONTEND_REQUEST", t), g.$log.log("RESPONSE", n), g.SimpleToast("ERROR", "Jira Request failed: " + t.clientRequest.apiMethod + " – " + (n && n.error)), t.defer.reject(n)) : (console.log("JIRA_RESPONSE", n), t.defer.resolve(n)), delete g.requestsLog[n.requestId]
          }
        };
        n ? window.ipcRenderer.on(v, function(n, t) {
          h(t)
        }) : t && this.ExtensionInterface.addEventListener("SP_JIRA_RESPONSE", function(n, t) {
          h(t)
        })
      }

      return k.$inject = ["IS_ELECTRON", "IS_EXTENSION", "SimpleToast", "Uid", "$q", "$rootScope", "Dialogs", "Notifier", "$injector", "$timeout", "REQUEST_TIMEOUT", "$log", "$window", "ExtensionInterface"], _createClass(k, [{
        key: "sendRequest",
        value: function(n) {
          var t = this;
          n.requestId = this.Uid();
          var e = this.$q.defer();
          return this.requestsLog[n.requestId] = {
            defer: e,
            requestMethod: n.apiMethod,
            clientRequest: n,
            timeout: this.$timeout(function() {
              t.SimpleToast("ERROR", "Jira Request timed out for " + n.apiMethod), delete t.requestsLog[n.requestId]
            }, this.REQUEST_TIMEOUT)
          }, this.IS_ELECTRON ? window.ipcRenderer.send("JIRA", n) : this.IS_EXTENSION && this.ExtensionInterface.dispatchEvent("SP_JIRA_REQUEST", n), e.promise
        }
      }, {
        key: "updateTaskWithIssue", value: function(e, n) {
          var t = this.mapIssue(n);
          _.forOwn(t, function(n, t) {
            null === n && e.hasOwnProperty(t) ? delete e[t] : e[t] = n
          })
        }
      }, {
        key: "_makeIssueLink", value: function(n) {
          var t = this.$rootScope.r.jiraSettings.host + "/browse/" + n;
          return t.match(/(^[^:]+):\/\//) || (t = "https://" + t), t
        }
      }, {
        key: "mapIssue", value: function(n) {
          return {
            title: n.key + " " + n.fields.summary,
            notes: n.fields.description,
            originalType: t,
            originalKey: n.key,
            originalAssigneeKey: n.fields.assignee && n.fields.assignee.key.toString(),
            originalComments: k.mapComments(n),
            originalId: n.id,
            originalUpdated: n.fields.updated,
            originalStatus: n.fields.status,
            originalAttachment: k.mapAttachments(n),
            originalLink: this._makeIssueLink(n.key),
            originalEstimate: n.fields.timeestimate && moment.duration({ seconds: n.fields.timeestimate }),
            originalTimeSpent: n.fields.timespent && moment.duration({ seconds: n.fields.timespent })
          }
        }
      }, {
        key: "isSufficientJiraSettings", value: function(n) {
          return n || (n = this.$rootScope.r.jiraSettings), n && n.isJiraEnabled && !!n.host && !!n.userName && !!n.password && (this.IS_ELECTRON || this.IS_EXTENSION)
        }
      }, {
        key: "transformIssues", value: function(n) {
          if (n) {
            for (var t = n.response, e = [], i = 0; i < t.issues.length; i++) {
              var o = t.issues[i];
              e.push(this.mapIssue(o))
            }
            return e
          }
        }
      }, {
        key: "preCheck", value: function(n) {
          return this.IS_ELECTRON || this.IS_EXTENSION ? this.IS_ELECTRON && !this.isSufficientJiraSettings() ? this.$q.reject("Jira: Insufficient settings.") : n && !k.isJiraTask(n) ? (this.SimpleToast("ERROR", "Jira Request failed: Not a real JIRA issue."), this.$q.reject("Jira: Not a real JIRA issue.")) : !this.$window.navigator.onLine && (this.SimpleToast("ERROR", "Not connected to the Internet."), this.$q.reject("Not connected to the Internet.")) : this.$q.reject("Jira: Not a in electron or extension context")
        }
      }, {
        key: "setUpdatedToNow", value: function(n) {
          n.originalUpdated = moment().format(a)
        }
      }, {
        key: "_addWorklog", value: function(n, t, e, i) {
          if (n && t && t.toISOString && e && e.asSeconds) {
            var o = {
              config: this.$rootScope.r.jiraSettings,
              apiMethod: "addWorklog",
              arguments: [n, { started: t.format(a), timeSpentSeconds: e.asSeconds(), comment: i }]
            };
            return this.sendRequest(o)
          }
          return this.SimpleToast("ERROR", "Jira: Not enough parameters for worklog."), this.$q.reject("Jira: Not enough parameters for worklog.")
        }
      }, {
        key: "searchUsers", value: function(n) {
          var t = this.preCheck();
          if (t) return t;
          var e = {
            config: this.$rootScope.r.jiraSettings,
            apiMethod: "searchUsers",
            arguments: [{ username: n }]
          };
          return this.sendRequest(e)
        }
      }, {
        key: "getTransitionsForIssue", value: function(n) {
          var t = this.preCheck(n);
          if (t) return t;
          var e = {
            config: this.$rootScope.r.jiraSettings,
            apiMethod: "listTransitions",
            arguments: [n.originalKey]
          };
          return this.sendRequest(e)
        }
      }, {
        key: "getAutoAddedIssues", value: function() {
          var t = this, e = this.$q.defer(), n = { maxResults: 100, fields: o };
          if (this.isSufficientJiraSettings() && this.$rootScope.r.jiraSettings.jqlQueryAutoAdd) {
            var i = {
              config: this.$rootScope.r.jiraSettings,
              apiMethod: "searchJira",
              arguments: [this.$rootScope.r.jiraSettings.jqlQueryAutoAdd, n]
            };
            this.sendRequest(i).then(function(n) {
              e.resolve(t.transformIssues(n))
            }, e.reject)
          } else this.SimpleToast("ERROR", "Jira: Insufficient settings. Please define a jqlQuery for auto adding issues"), e.reject("Jira: Insufficient settings");
          return e.promise
        }
      }, {
        key: "updateStatus", value: function(e, i) {
          var o = this, n = this.preCheck(e);
          if (n) return n;
          var a = this.$q.defer();
          if (this.$rootScope.r.jiraSettings.isTransitionIssuesEnabled) {
            if (this.$rootScope.r.jiraSettings.transitions && this.$rootScope.r.jiraSettings.transitions[i] && "ALWAYS_ASK" !== this.$rootScope.r.jiraSettings.transitions[i]) "DO_NOT" === this.$rootScope.r.jiraSettings.transitions[i] ? a.reject("DO_NOT chosen") : e.status !== i ? this.transitionIssue(e, { id: this.$rootScope.r.jiraSettings.transitions[i] }, i)
              .then(a.resolve, a.reject) : a.resolve("NO NEED TO UPDATE"); else this.getTransitionsForIssue(e)
              .then(function(n) {
                var t = n.response.transitions;
                o.Dialogs("JIRA_SET_STATUS", { transitions: t, task: e, localType: i })
                  .then(function(n) {
                    o.transitionIssue(e, n, i).then(a.resolve, a.reject)
                  }, a.reject)
              }, a.reject);
            return a.promise
          }
          a.resolve()
        }
      }, {
        key: "updateIssueDescription", value: function(n) {
          var t = this, e = this.preCheck(n);
          if (e) return e;
          if (this.$rootScope.r.jiraSettings.isUpdateIssueFromLocal) {
            if (angular.isString(n.notes)) {
              var i = {
                config: this.$rootScope.r.jiraSettings,
                apiMethod: "updateIssue",
                arguments: [n.originalKey, { fields: { description: n.notes } }]
              };
              return this.sendRequest(i).then(function() {
                t.setUpdatedToNow(n), t.SimpleToast("SUCCESS", "Jira: Description updated for " + n.originalKey)
              })
            }
            return this.SimpleToast("ERROR", "Jira: Not enough parameters for updateIssueDescription."), this.$q.reject("Jira: Not enough parameters for updateIssueDescription.")
          }
          return this.$q.reject("Jira: jiraSettings.isUpdateIssueFromLocal is deactivated")
        }
      }, {
        key: "updateAssignee", value: function(n, t) {
          var e = this, i = this.preCheck(n);
          if (i) return i;
          if (t) {
            var o = {
              config: this.$rootScope.r.jiraSettings,
              apiMethod: "updateIssue",
              arguments: [n.originalKey, { fields: { assignee: { name: t } } }]
            };
            return this.sendRequest(o).then(function() {
              n.originalAssigneeKey = t, e.SimpleToast("SUCCESS", 'Jira: Assignee set to "' + t + '" for ' + n.originalKey)
            })
          }
          return this.SimpleToast("ERROR", "Jira: Not enough parameters for updateAssignee."), this.$q.reject("Jira: Not enough parameters for updateAssignee.")
        }
      }, {
        key: "checkUpdatesForTicket", value: function(i, o) {
          var a = this, n = this.preCheck(i);
          if (n) return n;
          var s = this.$q.defer(), t = {
            config: this.$rootScope.r.jiraSettings,
            apiMethod: "findIssue",
            arguments: [i.originalKey, "changelog"]
          };
          return this.sendRequest(t).then(function(n) {
            var t = n.response, e = i.originalUpdated && moment(i.originalUpdated).add(1, "second");
            e && moment(t.fields.updated)
              .isAfter(e) ? (o || (k.mapAndAddChangelogToTask(i, t), i.isUpdated = !0), a.updateTaskWithIssue(i, t), s.resolve(i)) : s.resolve(!1)
          }, s.reject), s.promise
        }
      }, {
        key: "addWorklog", value: function(n) {
          var t = this, e = this.preCheck();
          if (e) return e;
          var i = this, o = this.$injector.get("Tasks"), a = this.$q.defer(), s = void 0,
            r = angular.copy(n), l = void 0;

          function c(n) {
            i.SimpleToast("SUCCESS", "Jira: Updated worklog for " + r.originalKey + " by " + parseInt(s.asMinutes(), 10) + "m."), i.setUpdatedToNow(r), a.resolve(n)
          }

          if (this.$rootScope.r.jiraSettings.isWorklogEnabled) {
            if (this.$rootScope.r.jiraSettings.isAddWorklogOnSubTaskDone) if (r.parentId) {
              var d = angular.copy(o.getById(r.parentId));
              k.isJiraTask(d) && (l = r.title, d.title = d.originalKey + ": " + r.title, d.timeSpent = r.timeSpent, d.started = r.started, r = d)
            } else if (r.subTasks && 0 < r.subTasks.length) return this.$q.when("Jira Add Worklog: No Update require because we use sub tasks.");
            k.isJiraTask(r) ? this.checkUpdatesForTicket(r).then(function() {
              t.$rootScope.r.jiraSettings.isAutoWorklog ? (s = r.timeSpent, t._addWorklog(r.originalKey, moment(r.started), r.timeSpent)
                .then(c, a.reject)) : t.Dialogs("JIRA_ADD_WORKLOG", { task: r, comment: l })
                .then(function(n) {
                  s = n.timeSpent, t._addWorklog(n.originalKey, n.started, n.timeSpent, n.comment)
                    .then(c, a.reject)
                }, a.reject)
            }, a.reject) : a.reject("Jira: Task or Parent Task are no Jira Tasks.")
          }
          return a.promise
        }
      }, {
        key: "transitionIssue", value: function(t, e, i) {
          var o = this, n = this.preCheck();
          if (n) return n;
          var a = this.$q.defer(), s = this;

          function r(n) {
            e.name || (e = _.find(s.$rootScope.r.jiraSettings.allTransitions, function(n) {
              return n.id === e.id
            })), t.status = i, t.originalStatus = e, s.setUpdatedToNow(t), s.SimpleToast("SUCCESS", 'Jira: Updated task status to "' + e.name + '"'), a.resolve(n)
          }

          return this.checkUpdatesForTicket(t).then(function() {
            var n = {
              config: o.$rootScope.r.jiraSettings,
              apiMethod: "transitionIssue",
              arguments: [t.originalId, { transition: { id: e.id } }]
            };
            o.sendRequest(n).then(r, a.reject)
          }), a.promise
        }
      }, {
        key: "getSuggestions", value: function() {
          var n = this.preCheck();
          if (n) return n;
          var t = { maxResults: 100, fields: o };
          if (this.$rootScope.r.jiraSettings.jqlQuery) {
            var e = {
              config: this.$rootScope.r.jiraSettings,
              apiMethod: "searchJira",
              arguments: [this.$rootScope.r.jiraSettings.jqlQuery, t]
            };
            return this.sendRequest(e)
          }
          return this.SimpleToast("ERROR", "Jira: Insufficient settings. Please define a jqlQuery"), this.$q.reject("Jira: Insufficient jqlQuery")
        }
      }, {
        key: "checkForNewAndAddToBacklog", value: function() {
          var e = this.$injector.get("Tasks");
          this.isSufficientJiraSettings() && this.$rootScope.r.jiraSettings.isEnabledAutoAdd && this.getAutoAddedIssues()
            .then(function(n) {
              _.each(n, function(n) {
                if (!e.isTaskWithOriginalIdExistant(n.originalId)) {
                  var t = e.createTask(n);
                  e.addNewToTopOfBacklog(t, !0)
                }
              })
            })
        }
      }, {
        key: "checkForUpdates", value: function(n) {
          var e = this, t = this.$injector.get("TasksUtil"), i = this.$q.defer();
          return t.flattenTasks(n, k.isJiraTask, k.isJiraTask).reduce(function(n, t) {
            return n.then(function() {
              return e.checkUpdatesForTicket(t).then(function(n) {
                e.taskIsUpdatedHandler(n, t)
              }, i.reject)
            })
          }, Promise.resolve()).then(function() {
            i.resolve()
          }), i.promise
        }
      }, {
        key: "taskIsUpdatedHandler", value: function(n, t) {
          if (t || (t = n), t && t.originalAssigneeKey && t.originalAssigneeKey !== this.$rootScope.r.jiraSettings.userName && !t.isDone) {
            var e = '"' + t.originalKey + '" is assigned to "' + t.originalAssigneeKey + '".';
            this.Notifier({
              title: "Jira issue " + t.originalKey + " is assigned to another user",
              message: e,
              sound: !0,
              wait: !0
            }), this.SimpleToast("WARNING", e)
          }
          if (n) {
            var i = '"' + t.originalKey + '" => has been updated as it was updated on Jira.';
            this.Notifier({
              title: "Jira Update",
              message: i,
              sound: !0,
              wait: !0
            }), this.SimpleToast("CUSTOM", i, "update")
          }
        }
      }, {
        key: "checkUpdatesForTaskOrParent", value: function(t, n) {
          var e = this, i = !1, o = this.$injector.get("Tasks"), a = this.$q.defer();
          if (t) {
            if (!t.originalKey && t.parentId) {
              var s = o.getById(t.parentId);
              s.originalKey && (t = s)
            }
            k.isJiraTask(t) && (this.checkUpdatesForTicket(t, n).then(function(n) {
              e.taskIsUpdatedHandler(n, t), n ? a.resolve(n) : a.resolve(t)
            }, function() {
              a.resolve(t)
            }), i = !0)
          }
          return i || a.resolve(t), a.promise
        }
      }], [{
        key: "mapComments", value: function(n) {
          return n.fields.comment && n.fields.comment.comments && n.fields.comment.comments.map(function(n) {
            return { author: n.author.name, body: n.body }
          })
        }
      }, {
        key: "mapAttachments", value: function(n) {
          return n.fields.attachment && n.fields.attachment.map(function(n) {
            return n.content
          })
        }
      }, {
        key: "mapAndAddChangelogToTask", value: function(n, t) {
          var e = void 0;
          if (t && t.changelog) {
            e = [];
            var i = t.changelog;
            if (i.histories) for (var o = n.originalUpdated && moment(n.originalUpdated)
              .add(1, "second"), a = 0; a < i.histories.length; a++) {
              var s = i.histories[a], r = moment(s.created);
              o && r.isAfter(o) && e.push({
                author: s.author.displayName,
                items: s.items,
                created: r
              })
            }
          }
          return n.originalChangelog = e
        }
      }, {
        key: "isJiraTask", value: function(n) {
          return n && n.originalType === t
        }
      }]), k
    }();
  n.$$ngIsClass = !0, angular.module("superProductivity").service("Jira", n)
}(), function() {
  var n = function() {
    function o(n, t, e, i) {
      _classCallCheck(this, o), this.$rootScope = n, this.IS_ELECTRON = t, this.$interval = e, this.AppStorage = i, t && (this.fs = require("fs"), this.os = require("os"), this.path = require("path"))
    }

    return o.$inject = ["$rootScope", "IS_ELECTRON", "$interval", "AppStorage"], _createClass(o, [{
      key: "addHome",
      value: function(n) {
        var t, e = n.split(this.path.sep);
        return "~" === e[0] && (e[0] = this.os.homedir()), (t = this.path).join.apply(t, _toConsumableArray(e))
      }
    }, {
      key: "initBackupsIfEnabled", value: function() {
        var e = this;
        if (this.IS_ELECTRON && this.$rootScope.r.config.automaticBackups && this.$rootScope.r.config.automaticBackups.isEnabled) {
          var n = 1e3 * parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10);
          this.$interval(function() {
            if (e.$rootScope.r.config.automaticBackups && e.$rootScope.r.config.automaticBackups.isEnabled && 0 !== parseInt(e.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) && e.$rootScope.r.config.automaticBackups.path && 0 !== e.$rootScope.r.config.automaticBackups.path.trim().length) {
              var n = window.moment(),
                t = e.$rootScope.r.config.automaticBackups.path.replace("{date}", n.format("YYYY-MM-DD"))
                  .replace("{unix}", n.format("x"));
              e.saveToFileSystem(t)
            }
          }, n)
        }
      }
    }, {
      key: "loadFromFileSystem", value: function(n) {
        if (this.fs.existsSync(this.addHome(n))) {
          var t = JSON.parse(this.fs.readFileSync(this.addHome(n), "utf-8"));
          this.AppStorage.importData(t)
        }
      }
    }, {
      key: "initSyncIfEnabled", value: function() {
        var e = this;
        if (this.IS_ELECTRON && this.$rootScope.r.config.automaticBackups && this.$rootScope.r.config.automaticBackups.isSyncEnabled) {
          var n = this.$rootScope.r.config.automaticBackups.syncPath;
          this.loadFromFileSystem(n), this.fs.watchFile(this.addHome(this.$rootScope.r.config.automaticBackups.syncPath), function(n) {
            if ((n && n.ctime && moment(n.ctime)).isAfter(moment(e.lastSyncSaveChangedTime))) {
              var t = e.$rootScope.r.config.automaticBackups.syncPath;
              e.loadFromFileSystem(t)
            }
          }), this.reInitLocalSyncInterval()
        }
      }
    }, {
      key: "clearLocalSyncIntervalIfSet", value: function() {
        this.localSyncInterval || this.$interval.cancel(this.localSyncInterval)
      }
    }, {
      key: "saveToFileSystem", value: function(t, e, i) {
        var n = this.AppStorage.getCompleteBackupData();
        this.fs.writeFile(this.addHome(t), JSON.stringify(n), { flag: "w" }, function(n) {
          n ? console.error(n) : (i ? console.log("Sync saved to " + t + " completed") : console.log("Backup to " + t + " completed"), e && e())
        })
      }
    }, {
      key: "reInitLocalSyncInterval", value: function() {
        var e = this;
        this.clearLocalSyncIntervalIfSet();
        this.localSyncInterval = this.$interval(function() {
          if (e.$rootScope.r.config.automaticBackups && e.$rootScope.r.config.automaticBackups.isSyncEnabled && 0 !== parseInt(e.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) && e.$rootScope.r.config.automaticBackups.syncPath && 0 !== e.$rootScope.r.config.automaticBackups.syncPath.trim().length) {
            var t = e.$rootScope.r.config.automaticBackups.syncPath;
            e.saveToFileSystem(t, function() {
              var n = e.fs.statSync(e.addHome(t));
              e.lastSyncSaveChangedTime = n.ctime
            }, !0)
          }
        }, 1e4)
      }
    }]), o
  }();
  angular.module("superProductivity").service("LocalSync", n), n.$$ngIsClass = !0
}(), function() {
  function n(e) {
    function n() {
      return !!Notification
    }

    function i() {
      return n() && "granted" === Notification.permission
    }

    function o() {
      return "serviceWorker" in navigator
    }

    var a = "./service-workers/notifications.js";
    return e || (o() ? (Notification.requestPermission(), navigator.serviceWorker.register(a)) : i() || Notification.requestPermission()), function(t) {
      if (e) window.ipcRenderer.send("NOTIFY", t); else if (o()) navigator.serviceWorker.getRegistration(a)
        .then(function(n) {
          n.showNotification(t.title, {
            body: t.message,
            icon: t.icon || "img/icon_128x128-with-pad.png",
            vibrate: [100, 50, 100],
            data: { dateOfArrival: Date.now(), primaryKey: 1 }
          })
        }); else if (i()) {
        var n = new Notification(t.title, {
          icon: t.icon || "img/icon_128x128-with-pad.png",
          body: t.message
        });
        n.onclick = function() {
          n.close()
        }, setTimeout(function() {
          n.close()
        }, t.time || 1e4)
      }
    }
  }

  n.$inject = ["IS_ELECTRON"], angular.module("superProductivity").service("Notifier", n)
}(), function() {
  function n(n) {
    var r = n.moment, l = n._;
    this.fromString = function(n) {
      var i = void 0, o = void 0, a = void 0, s = void 0, t = void 0, e = n.split(" ");
      return l.each(e, function(n) {
        if (0 < n.length) {
          var t = n.slice(-1), e = parseInt(n.slice(0, n.length - 1));
          "s" === t && (s = e), "m" === t && (a = e), "h" === t && (o = e), "d" === t && (i = e)
        }
      }), (s || a || o || i || !1) && 0 < (t = r.duration({
        days: i,
        hours: o,
        minutes: a,
        seconds: s
      })).asSeconds() ? t : void 0
    }, this.toString = function(n) {
      var t = angular.copy(n);
      if (t) if ("object" === (void 0 === t ? "undefined" : _typeof(t)) && ("duration" in t || "_milliseconds" in t)) {
        var e = t.duration && t.duration()._data || t._data, i = parseInt(e.days, 10),
          o = parseInt(e.hours, 10), a = parseInt(e.minutes, 10), s = parseInt(e.seconds, 10);
        t = "", t += 0 < i && i + "d " || "", t += 0 < o && o + "h " || "", t += 0 < a && a + "m " || "", t = (t += 0 < s && s + "s " || "").trim()
      } else t.replace && "P0D" === (t = (t = (t = (t = (t = t.replace("PT", "")).toLowerCase(t)).replace(/(d|h|m|s)/g, "$1 ")).replace(/\.\d+/g, "")).trim()) && (t = "");
      return t
    }
  }

  n.$inject = ["$window"], angular.module("superProductivity").service("ParseDuration", n)
}(), function() {
  function n(e, a, s, r, l, c, d, m, n, u) {
    var p = this, g = d.concat(n);
    this.getList = function() {
      return a.r.projects
    }, this.getListWithLsData = function() {
      return u.getProjects()
    }, this.getAndUpdateCurrent = function() {
      var n = void 0;
      return !a.r.currentProject && 0 < a.r.projects.length && (a.r.currentProject = a.r.projects[0]), a.r.currentProject ? (n = r._.find(a.r.projects, function(n) {
        return a.r.currentProject.id === n.id
      }), a.r.currentProject = n) : a.r.currentProject
    }, this.getWithLsDataById = function(n) {
      var t = p.getListWithLsData();
      return _.find(t, ["id", n])
    }, this.getById = function(n) {
      var t = p.getListWithLsData();
      return _.find(t, ["id", n])
    }, this.updateProjectTitle = function(t, n) {
      var e = p.getListWithLsData();
      r._.find(e, function(n) {
        return n.id === t
      }).title = n, u.saveProjects(e)
    }, this.updateProjectData = function(t, n) {
      var e = p.getListWithLsData();
      r._.find(e, function(n) {
        return n.id === t
      }).data = r._.omit(n, g), u.saveProjects(e)
    }, this.createNewFromCurrent = function(n) {
      var t = p.getListWithLsData();
      t && 0 < t.length ? l("ERROR", "ERROR: There is already a project") : p.createNew(n, a.r)
    }, this.remove = function(t) {
      var n = p.getListWithLsData(), e = n.findIndex(function(n) {
        return n.id === t.id
      });
      n.splice(e, 1), u.saveProjects(n), l("SUCCESS", t.title + " deleted!");
      var i = a.r.projects.findIndex(function(n) {
        return n.id === t.id
      });
      a.r.projects.splice(i, 1)
    }, this.createNew = function(n, t) {
      if (n && angular.isObject(t)) {
        t = r._.omit(t, g);
        var e = { title: n, id: s(), data: {} };
        for (var i in p.updateNewFields(e), t) e.data[i] = t[i];
        a.r.projects.push(e);
        var o = p.getListWithLsData() || [];
        o.push(e), u.saveProjects(o), p.changeCurrent(e)
      }
    }, this.updateNewFields = function(n) {
      if (n) for (var t in e) e.hasOwnProperty(t) && !n.data.hasOwnProperty(t) && -1 === g.indexOf(t) && (n.data[t] = e[t])
    }, this.removeOmittedFields = function(n) {
      if (n) for (var t in n.data) n.data.hasOwnProperty(t) && -1 < g.indexOf(t) && delete n.data[t]
    }, this.changeCurrent = function(n) {
      var t = c.get("InitGlobalModels"), e = angular.copy(a.r.currentProject),
        i = p.getWithLsDataById(n.id);
      if (i && i.id && e && e.id !== i.id) {
        var o = angular.element(document.body);
        o.addClass("is-project-changing"), setTimeout(function() {
          o.removeClass("is-project-changing")
        }), e && e.id && p.updateProjectData(e.id, a.r), p.updateNewFields(i), p.removeOmittedFields(i), _.forOwn(a.r, function(n, t) {
          angular.isFunction(n) || -1 !== d.indexOf(t) || delete a.r[t]
        }), _.forOwn(i.data, function(n, t) {
          i.data.hasOwnProperty(t) && (a.r[t] = i.data[t])
        }), a.r.currentProject = i, t(), l("SUCCESS", 'Switched to project "' + i.title + '"'), a.$broadcast(m.PROJECT_CHANGED)
      }
    }
  }

  n.$inject = ["LS_DEFAULTS", "$rootScope", "Uid", "$window", "SimpleToast", "$injector", "GLOBAL_LS_FIELDS", "EV", "TMP_FIELDS", "AppStorage"], angular.module("superProductivity")
    .service("Projects", n)
}(), function() {
  function n(e, i) {
    var o = / t[0-9]+(m|h|d)+ *$/i;
    return function(n) {
      if (i.r.config && i.r.config.isShortSyntaxEnabled && !n.subTasks) {
        var t = o.exec(n.title);
        t && (n.timeEstimate = e.fromString(t[0].replace(" t", "")), n.title = n.title.replace(t[0], ""))
      }
      return n
    }
  }

  n.$inject = ["ParseDuration", "$rootScope"], angular.module("superProductivity")
    .service("ShortSyntax", n)
}(), function() {
  n.$inject = ["$mdToast"];
  var r = 10;

  function n(s) {
    return function(n, t, e, i) {
      if (angular.isString(e) && (i = e, e = 4e3), t) {
        var o = void 0;
        if (-1 < ["SUCCESS", "ERROR", "WARNING", "INFO", "CUSTOM"].indexOf(n)) {
          var a = n;
          n = t, t = a
        }
        switch (t) {
          case"SUCCESS":
            i = i || "check_circle", o = "#4fa758";
            break;
          case"WARNING":
            i = i || "warning", o = "#e1e048";
            break;
          case"ERROR":
            i = i || "error", o = "#e15d63";
            break;
          case"CUSTOM":
            break;
          default:
            i = i || "info"
        }
        setTimeout(function() {
          s.show({
            template: '\n<md-toast>\n  <div class="md-toast-content">\n    <div class="icon-wrapper">\n      <ng-md-icon icon="' + i + '" ' + (o && 'style="fill:' + o + '"') + '></ng-md-icon>\n    </div> \n    <div class="toast-text">' + n + "</div>\n  </div>          \n</md-toast>\n          ",
            hideDelay: e || 4e3
          })
        }, r)
      } else setTimeout(function() {
        s.show(s.simple().textContent(n).capsule(!1).hideDelay(e || 4e3).position("bottom"))
      }, r)
    }
  }

  angular.module("superProductivity").service("SimpleToast", n)
}(), function() {
  function n(o, a, s, r, n) {
    var l = this;
    this.isShown = !0;
    var c = void 0;
    this.isEnabled = function() {
      return o.r.config && o.r.config.isTakeABreakEnabled
    }, this.resetCounter = function() {
      l.lastCounterValBeforeReset = o.r.currentSession.timeWorkedWithoutBreak, o.r.currentSession.timeWorkedWithoutBreak = void 0
    };
    var d = !(this.resetResetCounter = function() {
      o.r.currentSession.timeWorkedWithoutBreak = l.lastCounterValBeforeReset, l.lastCounterValBeforeReset = void 0
    });
    this.notificationTimeout = function() {
      return d || (d = !0, n(function() {
        d = !1
      }, 3e4)), d
    }, this.update = function(n, t) {
      if (l.isEnabled() && (o.r.currentSession || (o.r.currentSession = {}), o.r.currentSession.timeWorkedWithoutBreak ? (o.r.currentSession.timeWorkedWithoutBreak = moment.duration(o.r.currentSession.timeWorkedWithoutBreak), o.r.currentSession.timeWorkedWithoutBreak.add(moment.duration({ milliseconds: n }))) : o.r.currentSession.timeWorkedWithoutBreak = moment.duration(n), moment.duration(o.r.config.takeABreakMinWorkingTime)
          .asSeconds() < o.r.currentSession.timeWorkedWithoutBreak.asSeconds())) {
        if (t) return;
        if (l.isShown && !d) {
          l.notificationTimeout();
          var e = r.toString(o.r.currentSession.timeWorkedWithoutBreak),
            i = o.r.config && o.r.config.takeABreakMessage && o.r.config.takeABreakMessage.replace(/\$\{duration\}/gi, e);
          c = s.simple().textContent(i).action("I already did!").hideDelay(3e4)
            .position("bottom"), s.show(c).then(function(n) {
            "ok" === n && (o.r.currentSession.timeWorkedWithoutBreak = void 0)
          }), a({ title: "Take a break!", message: i, sound: !0, wait: !0 })
        }
      }
    }
  }

  n.$inject = ["$rootScope", "Notifier", "$mdToast", "ParseDuration", "$timeout"], angular.module("superProductivity")
    .service("TakeABreakReminder", n)
}(), function() {
  var k = "TASK_MARK_AS_DONE", v = "TASK_START", f = "TASK_PAUSE", n = function() {
    function h(n, t, e, i, o, a, s, r, l, c, d, m, u) {
      var p = this;
      if (_classCallCheck(this, h), this.EV = m, this.$rootScope = t, this.$q = u, this.Uid = n, this.$rootScope = t, this.Dialogs = e, this.ShortSyntax = a, this.TasksUtil = s, this.IS_ELECTRON = i, this.IS_EXTENSION = o, this.SimpleToast = c, this.Jira = r, this.AppStorage = d, i) {
        var g = this;
        window.ipcRenderer.on(k, function() {
          var n = p.getLastActiveIfStartable();
          g.$rootScope.r.currentTask ? (g.markAsDone(g.$rootScope.r.currentTask), g.$rootScope.$apply()) : n && (g.markAsDone(n), g.$rootScope.$apply())
        }), window.ipcRenderer.on(v, function() {
          var n = p.getLastActiveIfStartable();
          !g.$rootScope.r.currentTask && n ? (g.updateCurrent(n), g.$rootScope.$apply()) : g.startLastTaskOrOpenDialog()
        }), window.ipcRenderer.on(f, function() {
          g.$rootScope.r.currentTask && (g.updateCurrent(void 0), g.$rootScope.$apply())
        })
      }
    }

    return h.$inject = ["Uid", "$rootScope", "Dialogs", "IS_ELECTRON", "IS_EXTENSION", "ShortSyntax", "TasksUtil", "Jira", "TakeABreakReminder", "SimpleToast", "AppStorage", "EV", "$q"], _createClass(h, [{
      key: "getCurrent",
      value: function() {
        var e = this, n = void 0, i = void 0;
        return this.$rootScope.r.currentTask && (n = _.find(this.$rootScope.r.tasks, function(n) {
          if (n.subTasks && 0 < n.subTasks.length) {
            var t = _.find(n.subTasks, { id: e.$rootScope.r.currentTask.id });
            t && (i = t)
          }
          return n.id === e.$rootScope.r.currentTask.id
        }), this.$rootScope.r.currentTask = n || i), this.$rootScope.r.currentTask
      }
    }, {
      key: "isInTodaysList", value: function(e) {
        var i = void 0;
        return !(!e || !e.id) && !!(_.find(this.$rootScope.r.tasks, function(n) {
          if (n.subTasks && 0 < n.subTasks.length) {
            var t = _.find(n.subTasks, { id: e.id });
            t && (i = t)
          }
          return n.id === e.id
        }) || i)
      }
    }, {
      key: "getLastCurrent", value: function() {
        return this.$rootScope.r.lastActiveTaskTask
      }
    }, {
      key: "getLastActiveIfStartable", value: function() {
        var n = this.$rootScope.r.lastActiveTaskTask;
        return this.isInTodaysList(n) && !n.isDone ? n : void 0
      }
    }, {
      key: "setLastCurrent", value: function(n) {
        this.$rootScope.r.lastActiveTaskTask = n
      }
    }, {
      key: "getById", value: function(n) {
        var t = this.getDoneBacklog();
        return _.find(this.$rootScope.r.tasks, ["id", n]) || _.find(this.$rootScope.r.backlogTasks, ["id", n]) || _.find(t, ["id", n])
      }
    }, {
      key: "isTaskWithOriginalIdExistant", value: function(n) {
        var t = this.TasksUtil.flattenTasks(this.getAllTasks());
        return !!_.find(t, ["originalId", n])
      }
    }, {
      key: "getBacklog", value: function() {
        return this.TasksUtil.checkDupes(this.$rootScope.r.backlogTasks), this.TasksUtil.convertDurationStringsToMomentForList(this.$rootScope.r.backlogTasks), this.$rootScope.r.backlogTasks
      }
    }, {
      key: "getDoneBacklog", value: function() {
        var n = this.AppStorage.getDoneBacklogTasks();
        return this.TasksUtil.checkDupes(n), this.TasksUtil.convertDurationStringsToMomentForList(n), n
      }
    }, {
      key: "getToday", value: function() {
        return this.TasksUtil.checkDupes(this.$rootScope.r.tasks), this.TasksUtil.convertDurationStringsToMomentForList(this.$rootScope.r.tasks), this.$rootScope.r.tasks
      }
    }, {
      key: "getTodayAndBacklog", value: function() {
        var n = this.getToday(), t = this.getBacklog();
        return _.concat(n, t)
      }
    }, {
      key: "getAllTasks", value: function() {
        var n = this.getToday(), t = this.getBacklog(), e = this.getDoneBacklog();
        return _.concat(n, t, e)
      }
    }, {
      key: "getCompleteWorkLog", value: function() {
        var r = this, n = this.TasksUtil.flattenTasks(this.getAllTasks()), l = {};
        return _.each(n, function(s) {
          s.timeSpentOnDay && _.forOwn(s.timeSpentOnDay, function(n, t) {
            if (s.timeSpentOnDay[t]) {
              var e = t.split("-"), i = parseInt(e[0], 10), o = parseInt(e[1], 10),
                a = parseInt(e[2], 10);
              l[i] || (l[i] = {
                timeSpent: moment.duration(),
                entries: {}
              }), l[i].entries[o] || (l[i].entries[o] = {
                timeSpent: moment.duration(),
                entries: {}
              }), l[i].entries[o].entries[a] || (l[i].entries[o].entries[a] = {
                timeSpent: moment.duration(),
                entries: [],
                dateStr: t,
                id: r.Uid()
              }), l[i].entries[o].entries[a].timeSpent = l[i].entries[o].entries[a].timeSpent.add(s.timeSpentOnDay[t]), l[i].entries[o].entries[a].entries.push({
                task: s,
                timeSpent: moment.duration(s.timeSpentOnDay[t])
              })
            }
          })
        }), _.forOwn(l, function(n, t) {
          var e = l[t];
          _.forOwn(e.entries, function(n, t) {
            var i = e.entries[t];
            _.forOwn(i.entries, function(n, t) {
              var e = i.entries[t];
              i.timeSpent = i.timeSpent.add(e.timeSpent)
            }), e.timeSpent = e.timeSpent.add(i.timeSpent)
          })
        }), l
      }
    }, {
      key: "getUndoneToday", value: function(n) {
        return n ? this.TasksUtil.flattenTasks(this.$rootScope.r.tasks, function(n) {
          return n && !n.isDone
        }, function(n) {
          return !n.isDone
        }) : _.filter(this.$rootScope.r.tasks, function(n) {
          return n && !n.isDone
        })
      }
    }, {
      key: "getDoneToday", value: function() {
        return _.filter(this.$rootScope.r.tasks, function(n) {
          return n && n.isDone
        })
      }
    }, {
      key: "getTotalTimeWorkedOnTasksToday", value: function() {
        var n = this.getToday(), t = moment.duration();
        return n && _.each(n, function(n) {
          t.add(n.timeSpent)
        }), t
      }
    }, {
      key: "getTimeWorkedToday", value: function() {
        var n = this.getToday(), t = this.TasksUtil.getTodayStr(), e = void 0;
        return 0 < n.length && (e = moment.duration(), _.each(n, function(n) {
          n.subTasks && 0 < n.subTasks.length ? _.each(n.subTasks, function(n) {
            n.timeSpentOnDay && n.timeSpentOnDay[t] && e.add(n.timeSpentOnDay[t])
          }) : n.timeSpentOnDay && n.timeSpentOnDay[t] && e.add(n.timeSpentOnDay[t])
        })), e
      }
    }, {
      key: "addToday", value: function(n) {
        if (n && n.title) {
          var t = this.$rootScope.r.currentTask;
          if (t) {
            var e = this.$rootScope.r.tasks.findIndex(function(n) {
              return n.id === t.id
            });
            this.$rootScope.r.tasks.splice(e + 1, 0, this.createTask(n))
          } else this.$rootScope.r.tasks.unshift(this.createTask(n));
          return this.$rootScope.r.tasks[0]
        }
      }
    }, {
      key: "createTask", value: function(n) {
        var t = {
          title: n.title,
          id: this.Uid(),
          created: moment(),
          notes: angular.isString(n.notes) && 0 < n.notes.trim().length && n.notes,
          parentId: n.parentId,
          timeEstimate: n.timeEstimate || n.originalEstimate,
          timeSpent: n.timeSpent || n.originalTimeSpent,
          originalId: n.originalId,
          originalKey: n.originalKey,
          originalType: n.originalType,
          originalAssigneeKey: n.originalAssigneeKey,
          originalLink: n.originalLink,
          originalStatus: n.originalStatus,
          originalEstimate: n.originalEstimate,
          originalTimeSpent: n.originalTimeSpent,
          originalAttachment: n.originalAttachment,
          originalComments: n.originalComments,
          originalUpdated: n.originalUpdated
        };
        if (!t.title || "" === t.title.trim() && t.parentId) {
          var e = this.getById(t.parentId);
          e.subTasks && 0 !== e.subTasks.length || (t.timeSpent = e.timeSpent, t.timeSpentOnDay = e.timeSpentOnDay, t.timeEstimate = e.timeEstimate)
        }
        return t.progress = this.TasksUtil.calcProgress(n), this.ShortSyntax(t)
      }
    }, {
      key: "markAsDone", value: function(n) {
        var t = this, e = this.getCurrent(), i = e && e.id === n.id,
          o = n.parentId && this.getById(n.parentId);
        this.updateCurrent(void 0), n.isDone = !0, n.doneDate = window.moment(), (this.IS_ELECTRON || this.IS_EXTENSION) && (this.TasksUtil.isJiraTask(n) ? this.Jira.addWorklog(n)
          .then(function() {
            t.Jira.updateStatus(n, "DONE")
          }, function() {
            t.Jira.updateStatus(n, "DONE")
          }) : this.TasksUtil.isJiraTask(o) && this.Jira.addWorklog(n)), i && this.selectNextTask(n)
      }
    }, {
      key: "updateCurrent", value: function(n, t) {
        var e = this, i = this.TasksUtil.isTaskChanged(n, this.$rootScope.r.currentTask), o = this;

        function a(n) {
          i && o.TasksUtil.isJiraTask(n) && o.Jira.updateStatus(n, "IN_PROGRESS")
        }

        if (n) {
          if (n.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(n), i && this.SimpleToast("CUSTOM", 'Started task "' + n.title + '"', "play_circle_outline"), (this.IS_ELECTRON || this.IS_EXTENSION) && !t) {
            var s = n.parentId && this.getById(n.parentId);
            if (this.Jira.isSufficientJiraSettings() && (this.TasksUtil.isJiraTask(n) || this.TasksUtil.isJiraTask(s))) {
              var r = n;
              !this.TasksUtil.isJiraTask(n) && this.TasksUtil.isJiraTask(s) && (r = s), this.Jira.checkUpdatesForTaskOrParent(n)
                .then(function() {
                  !e.$rootScope.r.jiraSettings.isCheckToReAssignTicketOnTaskStart || r.originalAssigneeKey && r.originalAssigneeKey === e.$rootScope.r.jiraSettings.userName ? a(r) : e.Dialogs("JIRA_ASSIGN_TICKET", { task: r })
                    .then(function() {
                      a(r)
                    }, function() {
                      e.updateCurrent(void 0)
                    })
                })
            }
          }
          n && (this.$rootScope.r.lastActiveTaskTask = n)
        }
        this.IS_ELECTRON && window.ipcRenderer.send("CHANGED_CURRENT_TASK", {
          current: n,
          lastActiveTask: this.$rootScope.r.lastActiveTaskTask
        }), this.$rootScope.r.currentTask = n, this.$rootScope.$broadcast(this.EV.UPDATE_CURRENT_TASK, {
          task: n,
          isCallFromTimeTracking: t
        })
      }
    }, {
      key: "removeTimeSpent", value: function(n, t) {
        var e = this.TasksUtil.getTodayStr(), i = void 0, o = void 0, a = void 0;
        return i = t.asMilliseconds ? t.asMilliseconds() : t, n.timeSpentOnDay || (n.timeSpentOnDay = {}), n.timeSpentOnDay[e] && ((o = moment.duration(n.timeSpentOnDay[e])).subtract(i, "milliseconds"), 0 < o.asSeconds() ? n.timeSpentOnDay[e] = o : delete n.timeSpentOnDay[e]), n.parentId && ((a = this.getById(n.parentId)).timeSpentOnDay = this.TasksUtil.mergeTotalTimeSpentOnDayFrom(a.subTasks), a.progress = this.TasksUtil.calcProgress(a)), n.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(n), n.progress = this.TasksUtil.calcProgress(n), n
      }
    }, {
      key: "addTimeSpent", value: function(n, t) {
        var e = this.TasksUtil.getTodayStr(), i = void 0, o = void 0, a = void 0;
        return o = t.asMilliseconds ? t.asMilliseconds() : t, n.started || (n.started = moment()), n.timeSpentOnDay || (n.timeSpentOnDay = {}), n.timeSpentOnDay[e] ? (i = moment.duration(n.timeSpentOnDay[e])).add(moment.duration({ milliseconds: o })) : i = moment.duration({ milliseconds: o }), n.timeSpentOnDay[e] = i, n.lastWorkedOn = moment(), n.parentId && ((a = this.getById(n.parentId)).started || (a.started = moment()), a.timeSpentOnDay = this.TasksUtil.mergeTotalTimeSpentOnDayFrom(a.subTasks), a.lastWorkedOn = moment(), a.progress = this.TasksUtil.calcProgress(a)), n.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(n), n.progress = this.TasksUtil.calcProgress(n), n
      }
    }, {
      key: "updateEstimate", value: function(n, t) {
        if (n.timeEstimate = t, n.progress = this.TasksUtil.calcProgress(n), n.parentId) {
          var e = this.getById(n.parentId);
          e.progress = this.TasksUtil.calcProgress(e)
        }
      }
    }, {
      key: "updateTimeSpentOnDay", value: function(n, i) {
        if (!angular.isObject(i)) throw"timeSpentOnDay should be an object";
        var o = moment.duration();
        _.forOwn(i, function(n, t) {
          if (i[t]) {
            var e = moment.duration(i[t]);
            e.asSeconds() < 1 ? delete i[t] : o.add(e)
          } else delete i[t]
        }), n.timeSpentOnDay = i, n.timeSpent = o, n.progress = this.TasksUtil.calcProgress(n)
      }
    }, {
      key: "updateToday", value: function(n) {
        this.$rootScope.r.tasks = n
      }
    }, {
      key: "updateBacklog", value: function(n) {
        this.$rootScope.r.backlogTasks = n
      }
    }, {
      key: "addNewToTopOfBacklog", value: function(n, t) {
        n && n.title && (this.$rootScope.r.backlogTasks.unshift(this.createTask(n)), t ? this.SimpleToast("CUSTOM", 'Task "' + n.title + '" imported and added to backlog.', "import_export") : this.SimpleToast("SUCCESS", 'Task "' + n.title + '" created and added to backlog.'))
      }
    }, {
      key: "moveTask", value: function(n, t, e) {
        var i = _.findIndex(t, ["id", n.id]);
        0 <= i && (t.splice(i, 1), e.unshift(n))
      }
    }, {
      key: "moveTaskFromDoneBackLogToToday", value: function(n) {
        n.isDone = !1;
        var t = this.getDoneBacklog();
        this.moveTask(n, t, this.$rootScope.r.tasks), this.AppStorage.saveDoneBacklogTasks(t), this.SimpleToast("SUCCESS", 'Restored task "' + n.title + '" from done backlog.')
      }
    }, {
      key: "moveTaskFromBackLogToToday", value: function(n) {
        this.moveTask(n, this.$rootScope.r.backlogTasks, this.$rootScope.r.tasks)
      }
    }, {
      key: "moveTaskFromTodayToBackLog", value: function(n) {
        this.moveTask(n, this.$rootScope.r.tasks, this.$rootScope.r.backlogTasks)
      }
    }, {
      key: "addTasksToTopOfBacklog", value: function(n) {
        this.$rootScope.r.backlogTasks = n.concat(this.$rootScope.r.backlogTasks)
      }
    }, {
      key: "updateDoneBacklog", value: function(n) {
        this.AppStorage.saveDoneBacklogTasks(n)
      }
    }, {
      key: "clearBacklog", value: function() {
        this.$rootScope.r.backlogTasks = [], this.AppStorage.saveDoneBacklogTasks([]), this.SimpleToast("SUCCESS", "Backlog deleted!")
      }
    }, {
      key: "addDoneTasksToDoneBacklog", value: function() {
        var n = this.getDoneToday().slice(0), t = this.getDoneBacklog(), e = n.concat(t);
        this.AppStorage.saveDoneBacklogTasks(e)
      }
    }, {
      key: "finishDay", value: function(n, t) {
        n && (this.addDoneTasksToDoneBacklog(), this.updateToday(this.getUndoneToday())), t && (this.addTasksToTopOfBacklog(this.getUndoneToday()), n ? this.updateToday([]) : this.updateToday(this.getDoneToday())), this.updateCurrent(void 0)
      }
    }, {
      key: "startLastTaskOrOpenDialog", value: function() {
        var n = this.$q.defer();
        if (this.getCurrent()) n.resolve(); else {
          var t = this.getLastActiveIfStartable();
          t ? (this.updateCurrent(t), n.resolve(t)) : this.Dialogs("TASK_SELECTION").then(n.resolve)
            .catch(n.reject)
        }
        return n.promise
      }
    }, {
      key: "selectNextTask", value: function(n) {
        if (this.$rootScope.r.config.isAutoStartNextTask && n && n.isDone) if (n.parentId) {
          var t = this.getById(n.parentId);
          t.subTasks && t.subTasks.length && this.updateCurrent(_.find(t.subTasks, function(n) {
            return !n.isDone
          }))
        } else {
          var e = this.getUndoneToday();
          e && 0 !== e.length && this.updateCurrent(this.TasksUtil.getNextUndone(e))
        }
      }
    }, {
      key: "collapseNotes", value: function(n) {
        n.forEach(function(n) {
          delete n.showNotes, n.subTasks && n.subTasks.forEach(function(n) {
            delete n.showNotes
          })
        })
      }
    }, {
      key: "collapseSubTasks", value: function(n) {
        var t = this;
        n.forEach(function(n) {
          n.subTasks && 0 < n.subTasks.length ? t.$rootScope.r.currentTask && n.subTasks.find(function(n) {
            return t.$rootScope.r.currentTask.id === n.id
          }) || (n.isHideSubTasks = !0) : n.isHideSubTasks && delete n.isHideSubTasks
        })
      }
    }, {
      key: "addLocalAttachment", value: function(n, t) {
        n.localAttachments || (n.localAttachments = []), n.localAttachments.push(t), this.SimpleToast("SUCCESS", '"' + t.title + '" added to "' + n.title + '"')
      }
    }]), h
  }();
  n.$$ngIsClass = !0, angular.module("superProductivity").service("Tasks", n)
}(), function() {
  function n(s, t, r) {
    function e() {
      return moment().format(t)
    }

    function i(e) {
      e.timeSpent && (e.timeSpent = moment.duration(e.timeSpent)), e.timeEstimate && (e.timeEstimate = moment.duration(e.timeEstimate)), e.timeSpentOnDay && _.forOwn(e.timeSpentOnDay, function(n, t) {
        e.timeSpentOnDay[t] = moment.duration(e.timeSpentOnDay[t])
      })
    }

    function o(n) {
      var t = moment.duration();
      if (n) if (n.timeSpent && n.timeEstimate) {
        var e = moment.duration(n.timeSpent).asMilliseconds(),
          i = moment.duration(n.timeEstimate).asMilliseconds();
        e < i && t.add(moment.duration({ milliseconds: i - e }))
      } else n.timeEstimate && t.add(n.timeEstimate);
      return t
    }

    return {
      getNextUndone: function(n) {
        var t = void 0;
        return _.each(n, function(n) {
          if (t) return !1;
          if (n.subTasks && n.subTasks.length) _.each(n.subTasks, function(n) {
            if (!n.isDone) return t = n, !1
          }); else if (!n.isDone) return t = n, !1
        }), t
      }, isTaskChanged: function(n, t) {
        return (n && n.id) !== (t && t.id) && !(!n && !t)
      }, calcProgress: function(n) {
        var t = void 0;
        return n && n.timeSpent && n.timeEstimate && (t = parseInt(moment.duration(n.timeSpent)
          .format("ss") / moment.duration(n.timeEstimate).format("ss") * 100, 10)), t
      }, isJiraTask: function(n) {
        return n && n.originalKey
      }, checkDupes: function(n) {
        if (n) {
          !function(n) {
            for (var t = n.length; t--;) n[t] || n.splice(t, 1)
          }(n);
          var e = n.map(function(n) {
            return n && n.id
          }), i = [], t = e.some(function(n, t) {
            return e.indexOf(n) !== t && i.push(n), e.indexOf(n) !== t
          });
          if (i.length) {
            var o = _.find(n, function(n) {
              return -1 < i.indexOf(n.id)
            });
            r.info("DUPE", o);
            var a = _.findIndex(n, function(n) {
              return -1 < i.indexOf(n.id)
            });
            n.splice(a, 1), s("ERROR", "!!! Dupes detected in data for the ids: " + i.join(", ") + '. First task title is "' + o.title + '" !!!', 6e4)
          }
          return t
        }
      }, calcTotalEstimate: function(n) {
        var t = void 0;
        return angular.isArray(n) && 0 < n.length && (t = moment.duration(), _.each(n, function(n) {
          n.subTasks && 0 < n.subTasks.length ? _.each(n.subTasks, function(n) {
            t.add(n.timeEstimate)
          }) : t.add(n.timeEstimate)
        })), t
      }, calcTotalTimeSpent: function(n) {
        var t = void 0;
        return angular.isArray(n) && 0 < n.length && (t = moment.duration(), _.each(n, function(n) {
          n && n.timeSpent && t.add(moment.duration(n.timeSpent))
        })), t
      }, calcTotalTimeSpentOnDay: function(n, t) {
        var e = void 0;
        return angular.isArray(n) && 0 < n.length && (e = moment.duration(), _.each(n, function(n) {
          n && n.timeSpentOnDay && n.timeSpentOnDay[t] && e.add(n.timeSpentOnDay[t])
        })), e
      }, mergeTotalTimeSpentOnDayFrom: function(n) {
        var i = {};
        return angular.isArray(n) && 0 < n.length && _.each(n, function(e) {
          e && e.timeSpentOnDay && _.forOwn(e.timeSpentOnDay, function(n, t) {
            i[t] || (i[t] = moment.duration()), i[t].add(e.timeSpentOnDay[t])
          })
        }), i
      }, calcTotalTimeSpentOnTask: function(e) {
        var i = moment.duration();
        if (e) return _.forOwn(e.timeSpentOnDay, function(n, t) {
          e.timeSpentOnDay[t] && i.add(moment.duration(e.timeSpentOnDay[t]).asSeconds(), "s")
        }), 0 < i.asMinutes() ? i : void 0
      }, calcRemainingTime: function(n) {
        var t = void 0;
        return angular.isArray(n) && 0 < n.length && (t = moment.duration(), _.each(n, function(n) {
          n.subTasks && 0 < n.subTasks.length ? _.each(n.subTasks, function(n) {
            n.isDone || t.add(o(n))
          }) : n.isDone || t.add(o(n))
        })), t
      }, calcRemainingTimeForTask: o, getTodayStr: e, flattenTasks: function(n, t, e) {
        var i = [];
        return _.each(n, function(n) {
          n && (n.subTasks && 0 < n.subTasks.length ? _.each(n.subTasks, function(n) {
            angular.isFunction(e) ? e(n) && i.push(n) : i.push(n)
          }) : angular.isFunction(t) ? t(n) && i.push(n) : i.push(n))
        }), i
      }, isWorkedOnToday: function(n) {
        var t = e();
        return n && n.timeSpentOnDay && n.timeSpentOnDay[t]
      }, formatToWorklogDateStr: function(n) {
        if (n) return moment(n).format(t)
      }, convertDurationStringsToMoment: i, convertDurationStringsToMomentForList: function(n) {
        n && _.each(n, function(n) {
          i(n), n.subTasks && 0 < n.subTasks.length && _.each(n.subTasks, i)
        })
      }
    }
  }

  n.$inject = ["SimpleToast", "WORKLOG_DATE_STR_FORMAT", "$log"], angular.module("superProductivity")
    .factory("TasksUtil", n)
}(), function() {
  var n = "IDLE_TIME", t = function() {
    function m(n, t, e, i, o, a, s, r, l, c, d) {
      _classCallCheck(this, m), this.$rootScope = n, this.$interval = l, this.Tasks = t, this.Dialogs = e, this.TakeABreakReminder = i, this.ExtensionInterface = c, this.EstimateExceededChecker = d, this.TRACKING_INTERVAL = o, this.IS_ELECTRON = a, this.IS_EXTENSION = s, this.EV = r
    }

    return m.$inject = ["$rootScope", "Tasks", "Dialogs", "TakeABreakReminder", "TRACKING_INTERVAL", "IS_ELECTRON", "IS_EXTENSION", "EV", "$interval", "ExtensionInterface", "EstimateExceededChecker"], _createClass(m, [{
      key: "init",
      value: function() {
        this.initPoll(), this.IS_ELECTRON && this.handleIdleElectron(), this.IS_EXTENSION && this.handleIdleExtension()
      }
    }, {
      key: "initPoll", value: function() {
        var e = this, i = moment();
        this.$interval(function() {
          if (e.$rootScope.r.currentTask) {
            var n = moment(), t = moment.duration(n.diff(i)).asMilliseconds();
            !e.isIdle && t <= 6e4 && (e.Tasks.addTimeSpent(e.$rootScope.r.currentTask, t), e.EstimateExceededChecker.checkTaskAndNotify(e.$rootScope.r.currentTask)), i = moment(), e.IS_ELECTRON && window.ipcRenderer.send("CHANGED_CURRENT_TASK", {
              current: e.$rootScope.r.currentTask,
              lastActiveTask: e.Tasks.getLastActiveIfStartable()
            }), (e.IS_ELECTRON || e.IS_EXTENSION) && (e.isIdle || e.TakeABreakReminder.update(t, e.isIdle))
          } else i = moment()
        }, this.TRACKING_INTERVAL)
      }
    }, {
      key: "handleIdleExtension", value: function() {
        var e = this;
        this.ExtensionInterface.addEventListener(n, function(n, t) {
          e.handleIdle(t)
        })
      }
    }, {
      key: "handleIdleElectron", value: function() {
        var e = this;
        window.ipcRenderer.on(n, function(n, t) {
          e.handleIdle(t)
        })
      }
    }, {
      key: "handleIdle", value: function(n) {
        var t = this;
        if (this.$rootScope.r.config.isEnableIdleTimeTracking) {
          var e = moment.duration(this.$rootScope.r.config.minIdleTime).asMilliseconds();
          e < n ? (this.isIdle = !0, this.$rootScope.$broadcast(this.EV.IS_IDLE), this.TakeABreakReminder.isShown = !1, this.isIdleDialogOpen || (this.isIdleDialogOpen = !0, this.Dialogs("WAS_IDLE", {
            initialIdleTime: n,
            minIdleTimeInMs: e
          }).then(function() {
            t.TakeABreakReminder.isShown = !0, t.isIdleDialogOpen = !1
          }, function() {
            t.TakeABreakReminder.resetCounter(), t.TakeABreakReminder.isShown = !0, t.isIdleDialogOpen = !1
          }))) : (this.isIdle = !1, this.$rootScope.$broadcast(this.EV.IS_BUSY))
        } else this.isIdle = !1
      }
    }]), m
  }();
  angular.module("superProductivity").service("TimeTracking", t), t.$$ngIsClass = !0
}(), angular.module("superProductivity").service("Uid", function() {
  return function() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(n) {
      var t = 16 * Math.random() | 0, e = "x" == n ? t : 3 & t | 8;
      return e.toString(16)
    })
  }
}), function() {
  var n = function() {
    function e(n, t) {
      _classCallCheck(this, e), this.IS_ELECTRON = n, this.$window = t
    }

    return e.$inject = ["IS_ELECTRON", "$window"], _createClass(e, [{
      key: "openExternalUrl",
      value: function(n) {
        var t = n.replace("https://https://", "https://").replace("http://http://", "http://");
        this.IS_ELECTRON ? require("electron").shell
          .openExternal(t) : this.$window.open(t, "_blank").focus()
      }
    }]), e
  }();
  n.$$ngIsClass = !0, angular.module("superProductivity").service("Util", n)
}(), function() {
  function n(n, t) {
    this.lastActiveTaskTask = void 0, this.allProjects = t.getList(), this.openMenu = function(n, t) {
      n(t)
    }, this.openHelp = function() {
      n("HELP", { template: "PAGE" })
    }, this.changeProject = function(n) {
      t.changeCurrent(n)
    }
  }

  n.$inject = ["Dialogs", "Projects"], angular.module("superProductivity")
    .directive("mainHeader", function() {
      return {
        templateUrl: "scripts/main-header/main-header-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  var n = function() {
    function e(n, t) {
      _classCallCheck(this, e), this.svc = n, this.$state = t
    }

    return e.$inject = ["PomodoroButton", "$state"], _createClass(e, [{
      key: "play",
      value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.svc.play(), this.isOpen = !1
      }
    }, {
      key: "pause", value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.svc.pause(), this.isOpen = !1
      }
    }, {
      key: "stop", value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.svc.stop(), this.isOpen = !1
      }
    }, {
      key: "toggle", value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.svc.toggle(), this.isOpen = !1
      }
    }, {
      key: "skipBreak", value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.svc.skipBreak()
      }
    }, {
      key: "focusMode", value: function(n) {
        n.preventDefault(), n.stopPropagation(), this.$state.go("focus-view")
      }
    }]), e
  }();
  angular.module("superProductivity").component("pomodoroButton", {
    templateUrl: "scripts/pomodoro-button/pomodoro-button-cp.html",
    controller: n,
    controllerAs: "$ctrl",
    bindToController: {}
  }), n.$$ngIsClass = !0
}(), function() {
  var i = "PLAY", o = "MANUAL_PAUSE", n = function() {
    function u(n, t, e, i, o, a, s, r, l, c, d, m) {
      _classCallCheck(this, u), this.LS_DEFAULTS = s, this.IS_ELECTRON = l, this.EV = r, this.$rootScope = n, this.$interval = t, this.$state = d, this.$q = e, this.Dialogs = i, this.SimpleToast = a, this.Tasks = o, this.TakeABreakReminder = m, this.Notifier = c, this.initListeners()
    }

    return u.$inject = ["$rootScope", "$interval", "$q", "Dialogs", "Tasks", "SimpleToast", "LS_DEFAULTS", "EV", "IS_ELECTRON", "Notifier", "$state", "TakeABreakReminder"], _createClass(u, [{
      key: "reInit",
      value: function() {
        this.data = this.$rootScope.r.currentSession.pomodoro, this.config = this.$rootScope.r.config.pomodoro, this.config || (this.config = this.$rootScope.r.config.pomodoro = angular.copy(this.LS_DEFAULTS.config.pomodoro)), this.initSession()
      }
    }, {
      key: "initListeners", value: function() {
        var e = this;
        this.IS_ELECTRON && this.$rootScope.$on(this.EV.IS_IDLE, function() {
          e.config && !e.config.isEnabled || e.data.status !== o && e.pause()
        }), this.$rootScope.$on(this.EV.UPDATE_CURRENT_TASK, function(n, t) {
          e.config && !e.config.isEnabled || e.data && (e.data.isOnBreak ? t.task && (e.config.isStopTrackingOnBreak && e.isOnShortBreak() || e.config.isStopTrackingOnLongBreak && e.isOnLongBreak()) && (e.SimpleToast("WARNING", "You're on (pomodoro) break, the task will be started afterwards."), e.Tasks.updateCurrent(void 0)) : t.task && e.data.status !== i ? e.play() : t.task || e.data.status === o || e.pause())
        })
      }
    }, {
      key: "initSession", value: function() {
        this.config.isEnabled && this.Tasks.updateCurrent(void 0), this.data.status = o, this.data.currentSessionTime = 0, this.data.currentCycle = 1, this.data.isOnBreak = !1, this.setSessionTimerTime()
      }
    }, {
      key: "play", value: function() {
        var n = this;
        this.Tasks.startLastTaskOrOpenDialog().then(function() {
          n.start(), n.config.isGoToWorkView && n.$state.go("work-view")
        })
      }
    }, {
      key: "start", value: function() {
        this.initTimer(), this.data.status = i
      }
    }, {
      key: "toggle", value: function() {
        this.data.status === i ? this.pause() : this.play()
      }
    }, {
      key: "pause", value: function() {
        this.data.status = o, this.$interval.cancel(this.timer), this.Tasks.updateCurrent(void 0)
      }
    }, {
      key: "stop", value: function() {
        this.data.status = o, this.$interval.cancel(this.timer), this.Tasks.setLastCurrent(void 0), this.initSession()
      }
    }, {
      key: "sessionDone", value: function() {
        var t = this;
        this.playSessionDoneSound(), this.data.isOnBreak = !this.data.isOnBreak, this.data.isOnBreak ? (this.TakeABreakReminder.resetCounter(), this.Notifier({ title: "Pomodoro break #" + this.data.currentCycle + " started." }), this.dialog = this.Dialogs("POMODORO_BREAK", {
          pomodoroData: this.data,
          pomodoroConfig: this.config
        }).then(function(n) {
          n && t.skipBreak()
        }), (this.config.isStopTrackingOnBreak && this.isOnShortBreak() || this.config.isStopTrackingOnLongBreak && this.isOnLongBreak()) && this.Tasks.updateCurrent(void 0)) : (this.data.currentCycle++, this.Tasks.startLastTaskOrOpenDialog()
          .then(function(n) {
            t.Notifier({
              title: "Pomodoro session #" + t.data.currentCycle + " started",
              message: n && "Working on >>  " + n.title
            })
          })), this.setSessionTimerTime()
      }
    }, {
      key: "skipBreak", value: function() {
        this.sessionDone(), this.TakeABreakReminder.resetResetCounter()
      }
    }, {
      key: "setSessionTimerTime", value: function() {
        this.isOnLongBreak() ? this.data.currentSessionTime = moment.duration(this.config.longerBreakDuration)
          .asMilliseconds() : this.isOnShortBreak() ? this.data.currentSessionTime = moment.duration(this.config.breakDuration)
          .asMilliseconds() : this.data.currentSessionTime = moment.duration(this.config.duration)
          .asMilliseconds(), this.data.currentSessionInitialTime = this.data.currentSessionTime
      }
    }, {
      key: "initTimer", value: function() {
        var n = this;
        this.timer && this.$interval.cancel(this.timer), this.timer = this.$interval(function() {
          n.tick()
        }, 1e3)
      }
    }, {
      key: "tick", value: function() {
        this.data.currentSessionTime -= 1e3, this.data.currentSessionTime <= 0 && this.sessionDone(), this.IS_ELECTRON && this.sendUpdateToRemoteInterface()
      }
    }, {
      key: "isOnLongBreak", value: function() {
        return this.data.isOnBreak && this.data.currentCycle % this.config.cyclesBeforeLongerBreak == 0
      }
    }, {
      key: "isOnShortBreak", value: function() {
        return this.data.isOnBreak && this.data.currentCycle % this.config.cyclesBeforeLongerBreak != 0
      }
    }, {
      key: "playSessionDoneSound", value: function() {
        this.config.isPlaySound && new Audio("snd/positive.ogg").play()
      }
    }, {
      key: "sendUpdateToRemoteInterface", value: function() {
        this.IS_ELECTRON && window.ipcRenderer.send(this.EV.IPC_EVENT_POMODORO_UPDATE, {
          isOnBreak: this.data.isOnBreak,
          currentSessionTime: this.data.currentSessionTime,
          currentSessionInitialTime: this.data.currentSessionInitialTime
        })
      }
    }]), u
  }();
  angular.module("superProductivity").service("PomodoroButton", n), n.$$ngIsClass = !0
}(), function() {
  var n = function() {
    function t(n) {
      _classCallCheck(this, t), this.$el = n
    }

    return t.$inject = ["$element"], _createClass(t, [{
      key: "progress", set: function(n) {
        this._progress = 100 < n ? 100 : n, 1 < this._progress ? (this.$el[0].style.visibility = "visible", this.$el[0].style.width = this._progress + "%") : this.$el[0].style.visibility = "hidden"
      }, get: function() {
        return this._progress
      }
    }]), t
  }();
  angular.module("superProductivity").component("progressBar", {
    controller: n,
    bindings: { progress: "=progress" }
  }), n.$$ngIsClass = !0
}(), function() {
  function n(n, t, e) {
    var i = this;
    this.isOpen = !1, this.selectedMode = "md-fling", t(function() {
      i.isOpen = !0, t(function() {
        i.isOpen = !1
      })
    }), this.openNotepad = function() {
      n("NOTES"), i.isOpen = !1
    }, this.openDistractionPanel = function() {
      n("DISTRACTIONS"), i.isOpen = !1
    }, this.openHelp = function() {
      n("HELP", { template: "PAGE" }), i.isOpen = !1
    }, this.openAddTask = function() {
      e.show(!0), i.isOpen = !1
    }
  }

  n.$inject = ["Dialogs", "$timeout", "AddTaskBarGlobal"], angular.module("superProductivity")
    .directive("quickAccessMenu", function() {
      return {
        templateUrl: "scripts/quick-access-menu/quick-access-menu-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}(), function() {
  function n(n, t) {
    t.otherwise("/"), n.state("daily-planner", {
      url: "/",
      template: "<daily-planner></daily-planner>"
    }).state("work-view", { url: "/work-view", template: "<work-view></work-view>" })
      .state("settings", {
        url: "/settings",
        controller: "SettingsCtrl",
        controllerAs: "vm",
        templateUrl: "scripts/routes/settings/settings-c.html"
      }).state("daily-summary", {
        url: "/daily-summary",
        template: "<daily-summary></daily-summary>"
      }).state("done-tasks-backlog", {
        url: "/done-tasks-backlog",
        template: "<done-tasks-backlog></done-tasks-backlog>"
      }).state("focus-view", { url: "/focus-view", template: "<focus-view></focus-view>" })
      .state("agenda-and-history", {
        url: "/agenda-and-history",
        template: "<agenda-and-history></agenda-and-history>"
      }).state("time-tracking-history", {
        parent: "agenda-and-history",
        url: "/time-tracking-history",
        template: "<time-tracking-history></time-tracking-history>"
      }).state("daily-agenda", {
        parent: "agenda-and-history",
        url: "/daily-agenda",
        template: "<daily-agenda></daily-agenda>"
      })
  }

  n.$inject = ["$stateProvider", "$urlRouterProvider"], angular.module("superProductivity")
    .config(n)
}(), function() {
  function n(n, t, e, i, o, a) {
    var s = this, r = t._;

    function l() {
      s.allProjects = i.getList(), s.selectedCurrentProject = n.r.currentProject
    }

    s.IS_ELECTRON = o, l();
    var c = [];
    [a.PROJECT_CHANGED, a.COMPLETE_DATA_RELOAD].forEach(function(n) {
      e.$on(n, function() {
        l()
      })
    }), e.$on("$destroy", function() {
      r.each(c, function(n) {
        n()
      })
    })
  }

  n.$inject = ["$rootScope", "$window", "$scope", "Projects", "IS_ELECTRON", "EV"], angular.module("superProductivity")
    .controller("SettingsCtrl", n)
}(), function() {
  function n(e, n, t, i, o, a) {
    var s = this;
    s.IS_ELECTRON = n, a(function() {
      s.tmpSyncFile = s.settings.googleDriveSync.syncFileName
    }), s.importSettings = function(n) {
      var t = JSON.parse(n);
      e.importData(t)
    }, s.backupNow = function() {
      return i.saveTo().then(function() {
        o("SUCCESS", "Google Drive: Successfully saved backup")
      })
    }, s.loadRemoteData = function() {
      return i.loadFrom()
    }, s.login = function() {
      return t.login()
    }, s.logout = function() {
      return t.logout()
    }, s.onGoogleDriveSyncToggle = function(n) {
      n ? i.resetAutoSyncToRemoteInterval() : i.cancelAutoSyncToRemoteIntervalIfSet()
    }, s.onLocalSyncToggle = function(n) {
      n ? e.resetAutoSyncToRemoteInterval() : e.cancelAutoSyncToRemoteIntervalIfSet()
    }, s.resetSync = function() {
      i.resetAutoSyncToRemoteInterval()
    }, s.changeSyncFileName = function(n) {
      i.changeSyncFileName(n)
    }, s.GoogleApi = t
  }

  n.$inject = ["AppStorage", "IS_ELECTRON", "GoogleApi", "GoogleDriveSync", "SimpleToast", "$timeout"], angular.module("superProductivity")
    .directive("backupSettings", function() {
      return {
        templateUrl: "scripts/settings/backup-settings/backup-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { settings: "=" }
      }
    })
}(), function() {
  function n(n) {
    this.IS_ELECTRON = n
  }

  n.$inject = ["IS_ELECTRON"], angular.module("superProductivity")
    .directive("gitSettings", function() {
      return {
        templateUrl: "scripts/settings/git-settings/git-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { settings: "=" }
      }
    })
}(), function() {
  function n(t, e, i, o, n, a, s) {
    var r = this;
    r.IS_ELECTRON = n, r.IS_EXTENSION = a, r.hasJiraSupport = n || a, r.taskSuggestions = [], t.isSufficientJiraSettings(r.settings) && t.getSuggestions()
      .then(function(n) {
        r.taskSuggestions = r.taskSuggestions.concat(t.transformIssues(n))
      }), r.onTransitionExampleTaskSelected = function(n) {
      e("SUCCESS", "Jira Config: Example task selected!"), t.getTransitionsForIssue(n)
        .then(function(n) {
          r.settings.allTransitions = n.response.transitions
        })
    }, r.getFilteredTaskSuggestions = function(n) {
      return n ? s("filter")(r.taskSuggestions, n, !1, "title") : r.taskSuggestions
    }, r.testJiraCredentials = function() {
      var n = void 0;
      t.isSufficientJiraSettings(r.settings) ? t.getSuggestions().then(function(n) {
        r.taskSuggestions = r.taskSuggestions.concat(t.transformIssues(n)), e("SUCCESS", "Connection successful!")
      }, function() {
        n = i(function() {
          e("ERROR", "Connection timed out!")
        }, 3e3)
      }) : e("ERROR", "Insuffcient settings!"), o.$on("$destroy", function() {
        n && i.cancel(n)
      })
    }
  }

  n.$inject = ["Jira", "SimpleToast", "$timeout", "$scope", "IS_ELECTRON", "IS_EXTENSION", "$filter"], angular.module("superProductivity")
    .directive("jiraSettings", function() {
      return {
        templateUrl: "scripts/settings/jira-settings/jira-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { settings: "=" }
      }
    })
}(), function() {
  function n(t, n) {
    var e = this;
    e.IS_ELECTRON = t, e.registerGlobalShortcut = function(n) {
      t && window.ipcRenderer.send("REGISTER_GLOBAL_SHORTCUT", n)
    }, e.resetAllShortcuts = function() {
      e.keys = n.keys
    }
  }

  n.$inject = ["IS_ELECTRON", "LS_DEFAULTS"], angular.module("superProductivity")
    .directive("keyboardSettings", function() {
      return {
        templateUrl: "scripts/settings/keyboard-settings/keyboard-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { keys: "=" }
      }
    })
}(), function() {
  function n(n, t) {
    this.isIdleTimeAvailable = n || t
  }

  n.$inject = ["IS_ELECTRON", "IS_EXTENSION"], angular.module("superProductivity")
    .directive("miscSettings", function() {
      return {
        templateUrl: "scripts/settings/misc-settings/misc-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { settings: "=" }
      }
    })
}(), function() {
  function n(n, t) {
    this.IS_ELECTRON = n, this.onIsEnabledChange = function(n) {
      n || t.stop()
    }
  }

  n.$inject = ["IS_ELECTRON", "PomodoroButton"], angular.module("superProductivity")
    .directive("pomodoroSettings", function() {
      return {
        templateUrl: "scripts/settings/pomodoro-settings/pomodoro-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { settings: "=" }
      }
    })
}(), function() {
  function n(e, n, i, o, a) {
    var t = this;
    t.createNewProjectFromCurrent = function(n) {
      e.createNewFromCurrent(n), i("SUCCESS", 'Project "' + n + '" successfully saved'), e.getAndUpdateCurrent()
    }, t.createNewProject = function() {
      n("CREATE_PROJECT")
    }, t.updateProjectTitle = function(n, t) {
      e.updateProjectTitle(n, t)
    }, t.deleteProject = function(n) {
      if (n.id === a.r.currentProject.id) i("ERROR", "Cannot delete " + n.title + " as it is the current project!"); else {
        var t = o.confirm().title("Would you like to delete " + n.title + "?")
          .textContent("All tasks and settings will be lost forever.").ariaLabel("Delete Project")
          .ok("Please do it!").cancel("Better not");
        o.show(t).then(function() {
          e.remove(n)
        })
      }
    }, t.changeProject = function(n) {
      e.changeCurrent(n)
    }
  }

  n.$inject = ["Projects", "Dialogs", "SimpleToast", "$mdDialog", "$rootScope"], angular.module("superProductivity")
    .directive("projectSettings", function() {
      return {
        templateUrl: "scripts/settings/project-settings/project-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { allProjects: "=", selectedCurrentProject: "=" }
      }
    })
}(), function() {
  function n(t, n, e, i, o) {
    var a = this;

    function s() {
      t.$evalAsync(function() {
        a.currentTheme = a.currentTheme || e, a.isDarkTheme = a.currentTheme && -1 < a.currentTheme.indexOf("dark"), a.selectedTheme = a.currentTheme && a.currentTheme.replace("-theme", "")
          .replace("-dark", "")
      })
    }

    a.themes = n, s();
    var r = [];
    r.push(t.$watch("vm.selectedTheme", function(n) {
      n && (a.isDarkTheme ? a.currentTheme = n + "-dark" : !1 === a.isDarkTheme && (a.currentTheme = n + "-theme"), a.isBoxed || (i.r.theme = a.currentTheme))
    })), r.push(t.$watch("vm.isDarkTheme", function(n) {
      a.currentTheme && (n ? (a.currentTheme = a.currentTheme.replace("-theme", "-dark"), a.isCurrentProjectTheme && (a.isBoxed || (i.r.bodyClass = "dark-theme"))) : !1 === n && (a.currentTheme = a.currentTheme.replace("-dark", "-theme"), a.isCurrentProjectTheme && (a.isBoxed || (i.r.bodyClass = ""))), a.isCurrentProjectTheme && a.currentTheme.currentProject && a.currentTheme.currentProject.data && (a.currentTheme.currentProject.data.theme = a.currentTheme), a.isBoxed || (i.r.theme = a.currentTheme))
    })), [o.PROJECT_CHANGED, o.COMPLETE_DATA_RELOAD].forEach(function(n) {
      t.$on(n, function() {
        a.currentTheme = i.r.theme, s()
      })
    }), t.$on("$destroy", function() {
      _.each(r, function(n) {
        n()
      })
    })
  }

  n.$inject = ["$scope", "THEMES", "DEFAULT_THEME", "$rootScope", "EV"], angular.module("superProductivity")
    .directive("themeSettings", function() {
      return {
        templateUrl: "scripts/settings/theme-settings/theme-settings-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { currentTheme: "=", isCurrentProjectTheme: "@", isBoxed: "<" }
      }
    })
}(), function() {
  function n(n, t, e) {
    var i = this;
    n.$watch("vm.task.subTasks", function(n) {
      angular.isArray(n) && (i.task.timeEstimate = e.calcTotalEstimate(n), i.task.timeSpent = e.calcTotalTimeSpent(n), i.task.timeSpentOnDay = e.mergeTotalTimeSpentOnDayFrom(n))
    }, !0), n.$on("$destroy", function() {
      i.task.subTasks && 0 !== i.task.subTasks.length || (i.task.timeEstimate = i.task.mainTaskTimeEstimate, i.task.timeSpent = i.task.mainTaskTimeSpent, i.task.timeSpentOnDay = i.task.mainTaskTimeSpentOnDay)
    })
  }

  n.$inject = ["$scope", "Tasks", "TasksUtil"], angular.module("superProductivity")
    .directive("subTaskList", function() {
      return {
        templateUrl: "scripts/sub-task-list/sub-task-list-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: { task: "=", currentTaskId: "<", allowTaskSelection: "@" }
      }
    })
}(), function() {
  var t = "$ctrl";
  var n = function() {
    function p(n, t, e, i, o, a, s, r, l, c, d, m, u) {
      _classCallCheck(this, p), this.Dialogs = n, this.$mdToast = e, this.$timeout = i, this.Tasks = o, this.EDIT_ON_CLICK_TOGGLE_EV = a, this.$scope = s, this.ShortSyntax = r, this.$element = l, this.$animate = u, this.Jira = c, this.$rootScope = t, this.lastFocusedTaskEl = void 0, this.checkKeyCombo = d, this.Util = m, this.boundHandleKeyDown = this.handleKeyDown.bind(this), this.boundFocusLastTaskEl = this.focusLastFocusedTaskEl.bind(this), this.$element[0].addEventListener("keydown", this.boundHandleKeyDown)
    }

    return p.$inject = ["Dialogs", "$rootScope", "$mdToast", "$timeout", "Tasks", "EDIT_ON_CLICK_TOGGLE_EV", "$scope", "ShortSyntax", "$element", "Jira", "CheckShortcutKeyCombo", "Util", "$animate"], _createClass(p, [{
      key: "$onDestroy",
      value: function() {
        this.$timeout.cancel(this.animationReadyTimeout), this.$timeout.cancel(this.isEnteringDoneTimeout), this.$timeout.cancel(this.selectCurrentTaskTimeout), this.$element[0].removeEventListener("keydown", this.boundHandleKeyDown)
      }
    }, {
      key: "$onInit", value: function() {
        var i = this;

        function o(n) {
          return n.$parent[t].parentTask
        }

        this.$animate.enabled(this.$element, !1), this.$element.addClass("is-initial-entering"), this.animationReadyTimeout = this.$timeout(function() {
          i.$element.addClass("is-initial-entering-done"), i.$animate.enabled(i.$element, !0)
        }, 400), this.isEnteringDoneTimeout = this.$timeout(function() {
          i.$element.removeClass("is-initial-entering")
        }, 2e3), this.dragControlListeners = {
          accept: function(n, t) {
            if (i.disableDropInto) return !1;
            var e = n.itemScope.task;
            return !(e.subTasks && 0 < e.subTasks.length && o(t))
          }, itemMoved: function(n) {
            var t = n.dest.sortableScope.modelValue[n.dest.index], e = o(n.dest.sortableScope);
            e ? t.parentId = e.id : angular.isUndefined(t.parentId) || delete t.parentId, angular.isFunction(this.onItemMoved) && this.onItemMoved({
              currentlyMovedTask: t,
              parentTask: e,
              $event: n
            })
          }, orderChanged: function(n) {
            angular.isFunction(this.onOrderChanged) && this.onOrderChanged({ $event: n })
          }, allowDuplicates: !1, containment: "#board"
        }
      }
    }, {
      key: "focusPreviousInListOrParent", value: function(n) {
        var t = angular.element(this.$element.children().children()), e = void 0;
        1 < t.length ? e = t.length === n + 1 ? angular.element(t[n - 1]) : angular.element(t[n + 1]) : this.parentTask && (e = angular.element(this.$element.parent())
          .parent()), e && e.focus()
      }
    }, {
      key: "focusTaskEl", value: function(n, t) {
        t && function(n) {
          if (n) {
            var t = !!n.getAttribute("contenteditable"),
              e = "INPUT" === n.tagName || "TEXTAREA" === n.tagName;
            return t || e
          }
          return !1
        }(t.relatedTarget) || n && n.focus()
      }
    }, {
      key: "focusLastFocusedTaskEl", value: function() {
        this.lastFocusedTaskEl && this.focusTaskEl(this.lastFocusedTaskEl)
      }
    }, {
      key: "focusCurrentTask", value: function() {
        this.selectCurrentTaskTimeout && this.$timeout.cancel(this.selectCurrentTaskTimeout), this.selectCurrentTaskTimeout = this.$timeout(function() {
          var n = document.querySelectorAll(".task.is-current");
          n && n[0] && n[0].focus()
        })
      }
    }, {
      key: "estimateTime", value: function(n) {
        this.Dialogs("TIME_ESTIMATE", { task: n })
          .then(this.boundFocusLastTaskEl, this.boundFocusLastTaskEl)
      }
    }, {
      key: "deleteTask", value: function(t, e) {
        var i = this, o = angular.copy(t);
        e || 0 === e || (e = _.findIndex(this.tasks, function(n) {
          return n.id === t.id
        })), this.tasks.splice(e, 1), this.focusPreviousInListOrParent(e), this.$rootScope.r.currentTask && this.$rootScope.r.currentTask.id === t.id && this.Tasks.updateCurrent(void 0), this.$mdToast.show({
          hideDelay: 2e4,
          controller: ["$scope", "$mdToast", function(n, t) {
            n.undo = function() {
              t.hide("UNDO")
            }
          }],
          template: '\n<md-toast>\n  <div class="md-toast-content">\n    <div class="icon-wrapper">\n      <ng-md-icon icon="delete_forever"\n                  style="fill:#e11826"></ng-md-icon>\n    </div>\n\n    <div class="toast-text">You deleted "' + t.title + '"</div>\n    <md-button class=""\n               ng-click="undo()">\n      <ng-md-icon icon="undo"></ng-md-icon>\n      UNDO</md-button>\n  </div>\n</md-toast>'
        }).then(function(n) {
          "UNDO" === n && i.tasks.splice(e, 0, o)
        }).catch(function() {
        })
      }
    }, {
      key: "onChangeTitle", value: function(n, t, e) {
        t && e && (n.title = e, this.ShortSyntax(n))
      }
    }, {
      key: "onTaskNotesEditFinished", value: function(n, t, e) {
        e.originalKey && t && (e.notes = n, this.Jira.updateIssueDescription(e)), this.focusLastFocusedTaskEl()
      }
    }, {
      key: "onTaskDoneChanged", value: function(n) {
        n.isDone && this.Tasks.markAsDone(n), angular.isFunction(this.onTaskDoneChangedCallback) && this.onTaskDoneChangedCallback({
          task: n,
          taskList: this.tasks
        })
      }
    }, {
      key: "focusPrevTask", value: function(n) {
        var t = document.querySelectorAll(".task"),
          e = t[Array.prototype.indexOf.call(t, n[0]) - 1] || t[0];
        null === e.offsetParent && this.focusPrevTask([e]), e.focus()
      }
    }, {
      key: "focusNextTask", value: function(n) {
        var t = document.querySelectorAll(".task"),
          e = t[Array.prototype.indexOf.call(t, n[0]) + 1] || n[0];
        null === e.offsetParent && this.focusNextTask([e]), e.focus()
      }
    }, {
      key: "onFocus", value: function(n) {
        var t = n.currentTarget || n.srcElement || n.originalTarget;
        t = angular.element(t), this.lastFocusedTaskEl = t
      }
    }, {
      key: "handleKeyDown", value: function(n) {
        var t = this, e = n.srcElement;
        (e = angular.element(e))[0].classList.contains("task") || (e = angular.element(e[0].closest(".task")));
        var i = !1, o = e.scope().modelValue, a = this.$rootScope.r.keys,
          s = !1 === n.shiftKey && !1 === n.ctrlKey, r = function() {
            return _.findIndex(t.tasks, function(n) {
              return n.id === o.id
            })
          };
        if ((this.checkKeyCombo(n, a.taskEditTitle) || "Enter" === n.key) && (i = !0, this.$scope.$broadcast(this.EDIT_ON_CLICK_TOGGLE_EV, o.id)), this.checkKeyCombo(n, a.taskToggleNotes) && (i = !0, o.showNotes = !o.showNotes, o.showNotes && this.$timeout(function() {
            e.find("marked-preview").focus()
          })), this.checkKeyCombo(n, a.taskOpenEstimationDialog) && (i = !0, this.estimateTime(o)), this.checkKeyCombo(n, a.taskToggleDone) && (i = !0, o.isDone = !o.isDone, this.onTaskDoneChanged(o)), this.checkKeyCombo(n, a.taskAddSubTask) && (i = !0, this.addSubTask(o)), this.checkKeyCombo(n, a.moveToBacklog) && (i = !0, this.Tasks.moveTaskFromTodayToBackLog(o)), this.checkKeyCombo(n, a.taskOpenOriginalLink) && (i = !0, this.Util.openExternalUrl(o.originalLink)), this.checkKeyCombo(n, a.togglePlay) && (i = !0, this.expandSubTasks(o), this.togglePlay(o)), this.checkKeyCombo(n, a.taskDelete) && (i = !0, this.deleteTask(o)), this.checkKeyCombo(n, a.moveToTodaysTasks) && (i = !0, this.Tasks.moveTaskFromBackLogToToday(o)), (s && 38 === n.keyCode || this.checkKeyCombo(n, a.selectPreviousTask)) && (i = !0, this.focusPrevTask(e)), (s && 40 === n.keyCode || this.checkKeyCombo(n, a.selectNextTask)) && (i = !0, this.focusNextTask(e)), (39 === n.keyCode || this.checkKeyCombo(n, a.expandSubTasks)) && (i = !0, (o.subTasks && 0 < o.subTasks.length && !1 === o.isHideSubTasks || this.parentTask) && this.focusNextTask(e), this.expandSubTasks(o)), (37 === n.keyCode || this.checkKeyCombo(n, a.collapseSubTasks)) && (i = !0, o.subTasks && 0 < o.subTasks.length && this.collapseSubTasks(o), this.parentTask && this.focusPrevTask(e)), this.checkKeyCombo(n, a.moveTaskUp)) {
          i = !0;
          var l = r();
          0 < l && (p.moveItem(this.tasks, l, l - 1), this.$timeout(function() {
            e.focus()
          }))
        }
        if (this.checkKeyCombo(n, a.moveTaskDown)) {
          i = !0;
          var c = r();
          c < this.tasks.length - 1 && p.moveItem(this.tasks, c, c + 1)
        }
        i && (n.preventDefault(), n.stopPropagation(), this.$scope.$apply())
      }
    }, {
      key: "expandSubTasks", value: function(n) {
        n.subTasks && 0 < n.subTasks.length && (n.isHideSubTasks = !1)
      }
    }, {
      key: "collapseSubTasks", value: function(n) {
        var t = this;
        n.subTasks && 0 < n.subTasks.length && (!!n.subTasks.find(function(n) {
          return t.currentTaskId === n.id
        }) || (n.isHideSubTasks = !0))
      }
    }, {
      key: "addSubTask", value: function(n) {
        var t = this;
        if (this.parentTask && (n = this.parentTask), this.expandSubTasks(n), !n.isDone) {
          n.subTasks || (n.subTasks = [], n.mainTaskTimeEstimate = n.timeEstimate, n.mainTaskTimeSpent = n.timeSpent, n.mainTaskTimeSpentOnDay = n.timeSpentOnDay);
          var e = this.Tasks.createTask({ title: "", parentId: n.id });
          n.subTasks.push(e), this.$timeout(function() {
            t.$scope.$broadcast(t.EDIT_ON_CLICK_TOGGLE_EV, e.id)
          }), this.currentTaskId === n.id && this.Tasks.updateCurrent(e)
        }
      }
    }, {
      key: "addLocalAttachment", value: function(n) {
        this.Dialogs("EDIT_GLOBAL_LINK", { link: {}, isNew: !0, task: n }, !0)
      }
    }, {
      key: "togglePlay", value: function(n) {
        if (n.isDone && (n.isDone = !1), this.currentTaskId === n.id) this.Tasks.updateCurrent(void 0); else if (n.subTasks && 0 < n.subTasks.length) {
          var t = n.subTasks.find(function(n) {
            return !n.isDone
          });
          t && this.Tasks.updateCurrent(t)
        } else this.Tasks.updateCurrent(n);
        this.currentTaskId && this.focusCurrentTask()
      }
    }], [{
      key: "moveItem", value: function(n, t, e) {
        n.splice(e, 0, n.splice(t, 1)[0])
      }
    }]), p
  }();
  n.$$ngIsClass = !0, angular.module("superProductivity").controller("TaskListCtrl", n)
    .component("taskList", {
      templateUrl: "scripts/task-list/task-list-d.html",
      bindToController: !0,
      controller: "TaskListCtrl",
      controllerAs: t,
      bindings: {
        tasks: "=",
        currentTaskId: "<",
        limitTo: "@",
        filter: "<",
        isSubTasksDisabled: "@",
        allowTaskSelection: "@",
        disableDropInto: "@",
        onItemMoved: "&",
        onOrderChanged: "&",
        onTaskDoneChangedCallback: "&onTaskDoneChanged",
        parentTask: "=",
        isHideControls: "<"
      }
    })
}(), function() {
  var n = function() {
    function n() {
      _classCallCheck(this, n)
    }

    return _createClass(n, [{
      key: "removeLink", value: function(t) {
        var n = this.localLinks.findIndex(function(n) {
          return n === t
        });
        this.localLinks.splice(n, 1)
      }
    }]), n
  }();
  angular.module("superProductivity").component("taskLocalLinks", {
    templateUrl: "scripts/task-local-links/task-local-links-cp.html",
    controller: n,
    bindToController: !0,
    controllerAs: "$ctrl",
    bindings: { localLinks: "=" }
  })
}(), angular.module("superProductivity").directive("textToFileDownload", function() {
  return {
    link: function(e, i) {
      i.on("click", function() {
        var n = e.fileName || moment().format("DD-MM-YYYY") + "-tasks.txt",
          t = "data:text/plain;charset=utf-8," + encodeURIComponent(e.textToFileDownload);
        i[0].setAttribute("href", t), i[0].setAttribute("download", n)
      })
    }, restrict: "A", scope: { textToFileDownload: "=", fileName: "@" }
  }
}), angular.module("superProductivity").run(["$templateCache", function(n) {
  n.put("scripts/add-task-bar/add-task-bar-cp.html", '<form ng-submit="vm.addTask()"\n      layout="row"\n      class="add-task-form">\n\n  <md-autocomplete\n    tabindex="1"\n    ng-blur="vm.onBlur && vm.onBlur()"\n    md-selected-item="vm.newTask"\n    md-search-text="vm.newTaskTitle"\n    md-items="task in vm.getFilteredTaskSuggestions(vm.newTaskTitle)"\n    md-item-text="task.title"\n    md-min-length="2"\n    autofocus-autocomplete\n    placeholder="Select or create a task">\n    <md-item-template>\n          <span md-highlight-text="vm.newTaskTitle"\n                md-highlight-flags="i">{{task.title}}</span>\n    </md-item-template>\n    \x3c!--<md-not-found>--\x3e\n      \x3c!--<i>Create task</i> "{{vm.newTaskTitle}}"--\x3e\n    \x3c!--</md-not-found>--\x3e\n  </md-autocomplete>\n</form>\n'), n.put("scripts/add-task-bar/add-task-bar-global-cp.html", '<div class="add-task-bar-wrapper"\n     md-whiteframe="14"\n     ng-show="vm.model.isShow"\n     mdx-paint-border="primary">\n  <ng-md-icon icon="playlist_add"\n              size="32"\n              class="highlight-add-task-icon"></ng-md-icon>\n  <add-task-bar on-blur="vm.model.isShow=false"\n                new-task-title="vm.model.newTaskTitle"\n                on-empty-submit="vm.model.isShow=false;"></add-task-bar>\n</div>\n\n'), n.put("scripts/agenda-and-history/agenda-and-history-d.html", '<md-toolbar class="md-primary md-hue-2">\n  <div class="md-toolbar-tools">\n    <a ui-sref-active="md-raised md-primary md-hue-1"\n       ui-sref="daily-agenda"\n       class="md-button"\n       flex>\n      <ng-md-icon icon="event"></ng-md-icon>\n      Daily Agenda\n    </a>\n    <a ui-sref-active="md-raised md-primary md-hue-1"\n       ui-sref="time-tracking-history"\n       class="md-button"\n       flex>\n      <ng-md-icon icon="history"></ng-md-icon>\n      Time Tracking History\n    </a>\n  </div>\n</md-toolbar>\n\n<div ui-view\n     class="content"></div>\n'), n.put("scripts/collapsible/collapsible-d.html", '<div class="collapsible-title md-caption"\n     ng-click="vm.toggleExpand();">\n  <ng-md-icon class="collapsible-expand-icon"\n              icon="expand_more"></ng-md-icon>\n  <span ng-bind=":: vm.title"></span>\n  <span ng-if="vm.isCounter">(<span ng-bind="vm.counter||0"></span>)</span>\n  <ng-md-icon ng-if="vm.icon"\n              class="collapsible-icon"\n              icon="{{::vm.icon}}"></ng-md-icon>\n  <md-button ng-if="::vm.btnIcon"\n             aria-label="Button action"\n             class="md-icon-button"\n             ng-click="vm.execAction($event)">\n    <ng-md-icon icon="{{::vm.btnIcon}}"></ng-md-icon>\n  </md-button>\n</div>\n<div class="collapsible-panel ani-expand-collapse"\n     ng-if="vm.isExpanded"\n     ng-transclude></div>\n'), n.put("scripts/daily-planner/daily-planner-d.html", '<div class="daily-planner">\n  <h2 class="md-headline">\n    <ng-md-icon icon="border_color"></ng-md-icon>\n    Plan your day!\n  </h2>\n\n  <div flex="100"\n       layout="row"\n       class="add-task-bar-wrapper">\n    <ng-md-icon icon="playlist_add"\n                size="32"\n                class="highlight-add-task-icon"></ng-md-icon>\n    <add-task-bar on-empty-submit="vm.onEmptySubmit()"></add-task-bar>\n  </div>\n\n  <div class="done"\n       ng-show="r.tasks.length >0"\n       layout="row"\n       layout-sm="column"\n       layout-align="center center">\n    <md-button class="md-raised md-primary"\n               ng-click="vm.done()">\n      <ng-md-icon icon="playlist_play"></ng-md-icon>\n      All done! Let\'s get to work!\n    </md-button>\n  </div>\n\n  <div class="gt-md-2-col">\n    <section>\n      <h2 class="md-title">\n        <ng-md-icon icon="playlist_play"></ng-md-icon>\n        Tasks for today\n        <span ng-show="vm.totaleEstimate.asSeconds()> 0">\n          ~<span ng-bind="vm.totaleEstimate|duration"></span>\n        </span>\n      </h2>\n\n      <p ng-if="!r.tasks.length"\n         class="no-tasks-info">\n        You currently have no tasks. Create one!\n      </p>\n      <task-list tasks="r.tasks"\n                 class="todays-tasks"\n                 current-task-id="r.currentTask.id"></task-list>\n    </section>\n\n\n    <section>\n      <h2 class="md-title">\n        <ng-md-icon icon="my_library_books"></ng-md-icon>\n        Task Backlog\n        <span ng-show="vm.totaleEstimateBacklog.asSeconds()> 0">\n          ~<span ng-bind="vm.totaleEstimateBacklog|duration"></span>\n        </span>\n      </h2>\n\n      <p ng-if="!vm.backlogTasks.length"\n         class="no-tasks-info">\n        You have currently no tasks in the backlog.\n      </p>\n\n      <md-input-container class="md-block search"\n                          ng-show="vm.backlogTasks.length > 1"\n                          flex-gt-sm>\n        <label>Search Backlog</label>\n        <input type="text"\n               ng-model="vm.search">\n      </md-input-container>\n\n      <task-list tasks="vm.backlogTasks"\n                 class="backlog-tasks"\n                 filter="vm.search"\n                 limit-to="{{vm.limitBacklogTo}}"></task-list>\n\n\n      <div class="backlog-buttons">\n        <md-button class="md-primary"\n                   ng-click="vm.limitBacklogTo = false"\n                   ng-hide="vm.limitBacklogTo === false || vm.backlogTasks.length <=vm.limitBacklogTo ||vm.backlogTasks.length ===0">\n          <ng-md-icon icon="remove_red_eye"></ng-md-icon>\n          Show All <span ng-bind="vm.backlogTasks.length"></span> Items in Backlog\n        </md-button>\n\n        <md-button class="md-primary"\n                   ui-sref="done-tasks-backlog">\n          <ng-md-icon icon="list"></ng-md-icon>\n          Go to Done Backlog\n        </md-button>\n\n        <md-button class="md-primary"\n                   ng-if="vm.isRemoteTasks"\n                   ng-click="vm.refreshRemoteTasks()">\n          <ng-md-icon icon="refresh"></ng-md-icon>\n          Refresh\n        </md-button>\n\n        <md-button class="md-primary md-warn"\n                   ng-click="vm.deleteBacklog()">\n          <ng-md-icon icon="delete"></ng-md-icon>\n          Clear Backlog\n        </md-button>\n      </div>\n    </section>\n  </div>\n</div>\n\n'), n.put("scripts/daily-summary/daily-summary-d.html", '<div layout-align="center center">\n  <md-button class="md-raised md-accent"\n             aria-label="Work View"\n             ui-sref="work-view">\n    <md-tooltip md-direction="bottom">\n      Go back to work view\n    </md-tooltip>\n    <ng-md-icon icon="chevron_left"></ng-md-icon>\n    Wait I forgot something!\n    <ng-md-icon icon="playlist_play"></ng-md-icon>\n  </md-button>\n</div>\n\n<h2>Done for today! Take a moment to celebrate!</h2>\n<div class="daily-summary-summary">\n  <p>\n    <ng-md-icon icon="check"></ng-md-icon>\n    Tasks completed: <strong><span ng-bind="vm.doneTasks.length"></span>/<span ng-bind="r.tasks.length"></span></strong>\n  </p>\n  <p>\n    <ng-md-icon icon="timer"></ng-md-icon>\n    Total time spent on today\'s task: <strong ng-bind="vm.totalTimeSpentTasks|duration"></strong></p>\n  <p>\n    <ng-md-icon icon="timer"></ng-md-icon>\n    Total time spent today: <strong ng-bind="vm.totalTimeSpentToday|duration"></strong></p>\n</div>\n\n\n<collapsible collapsible-title="Tasks worked on today"\n             icon="playlist_play"\n             class="daily-summary-collapsible">\n  <table class="task-summary-table">\n    <tr>\n      <th>Title</th>\n      <th>Sub-Tasks</th>\n      <th>Time spent today</th>\n      <th>Time spent total</th>\n      <th>Time esti.</th>\n      <th></th>\n    </tr>\n\n    <tr ng-repeat="task in r.tasks"\n        ng-class="{\'is-done\': task.isDone}">\n      <td ng-bind="task.title"></td>\n      <td>\n        <span ng-repeat="task in task.subTasks"><span ng-bind="task.title"></span>: <span ng-bind="task.timeSpentOnDay[vm.todayStr]|duration"></span><br></span>\n      </td>\n      <td ng-bind="task.timeSpentOnDay[vm.todayStr] |duration"></td>\n      <td ng-bind="task.timeSpent |duration"></td>\n      <td ng-bind="task.timeEstimate |duration"></td>\n      <td>\n        <ng-md-icon icon="check"\n                    ng-show="task.isDone"\n                    style="fill:green;"\n                    aria-label="checkmark"></ng-md-icon>\n      </td>\n    </tr>\n  </table>\n</collapsible>\n\n<section class="distractions"\n         ng-if="r.distractions.length > 0">\n  <distraction-list></distraction-list>\n</section>\n\n\n<collapsible collapsible-title="Todays commits"\n             class="commits"\n             ng-if="vm.commitLog"\n             class="daily-summary-collapsible">\n\n\n  <h2 class="md-title">Todays commits</h2>\n  <pre><code ng-bind="::vm.commitLog"></code></pre>\n</collapsible>\n\n<collapsible collapsible-title="Make a note for tomorrow"\n             icon="speaker_notes"\n             class="daily-summary-collapsible">\n  <p>This is meant to be a takeaway to be even more productive and happy tomorrow. E.g.: What did you learn today? What do you want to do better/smarter tomorrow? What do you want to achieve and why?</p>\n  <p>Think a second and reflect on the day.</p>\n\n  <md-input-container class="md-block"\n                      flex-gt-sm>\n    <label>Your personal tomorrow\'s note</label>\n    <textarea ng-model="vm.tomorrowsNote"\n              md-auto-focus\n              rows="4"></textarea>\n  </md-input-container>\n</collapsible>\n\n\n<section class="daily-summary-actions">\n  <div layout="row"\n       layout-wrap=""\n       layout-align="center center">\n    <md-button class="md-raised md-primary"\n               ng-click="vm.showExportModal()">\n      <ng-md-icon icon="call_made"></ng-md-icon>\n      <ng-md-icon icon="playlist_play"></ng-md-icon>\n      Export Task List\n    </md-button>\n\n    <md-button class="md-raised md-primary"\n               ng-class="{\'md-accent\':r.config.isBlockFinishDayUntilTimeTimeTracked && !r.currentSession.isTimeSheetExported}"\n               ng-click="vm.showTimeSheetExportModal()">\n      <ng-md-icon icon="call_made"></ng-md-icon>\n      <ng-md-icon icon="timer"></ng-md-icon>\n      Export To Time Sheet\n    </md-button>\n    <md-button class="md-raised md-primary"\n               ng-disabled="r.config.isBlockFinishDayUntilTimeTimeTracked && !r.currentSession.isTimeSheetExported"\n               ng-click="vm.finishDay()">\n      <ng-md-icon icon="wb_sunny"></ng-md-icon>\n      <span>Save and go home</span>\n    </md-button>\n  </div>\n  <div layout-wrap\n       layout-sm="row"\n       class="finish-day-opts"\n       layout-align="center center"\n       layout-gt-sm="row">\n    <md-checkbox ng-init="vm.clearDoneTasks = true;"\n                 ng-model="vm.clearDoneTasks"\n                 aria-label="Clear done tasks">\n      Clear done tasks (Move to Done-Backlog)\n    </md-checkbox>\n    <md-checkbox ng-model="vm.moveUnfinishedToBacklog"\n                 aria-label="Move unfinished tasks to backlog">\n      Move unfinished tasks back to backlog\n    </md-checkbox>\n  </div>\n\n  <div class="success-animation-wrapper"\n       ng-show="vm.showSuccessAnimation">\n    <ng-md-icon icon="wb_sunny"\n                size="128"></ng-md-icon>\n    <div class="unicorn-wrapper">\n      <img src="img/unicorn.png"\n           class="unicorn">\n    </div>\n  </div>\n</section>'), n.put("scripts/distraction-list/distraction-list-cp.html", '<div ng-if=" $ctrl.r.distractions.length >0">\n  <h2 class="md-title">\n    <ng-md-icon icon="flash_on"></ng-md-icon>\n    Your distractions for today\n  </h2>\n  <ul>\n    <li ng-repeat="distraction in $ctrl.r.distractions track by $index"\n        ng-bind="distraction"></li>\n  </ul>\n  <md-button class="md-raised"\n             ng-click="$ctrl.r.distractions=[]">\n    <ng-md-icon icon="delete"></ng-md-icon>\n    Delete distractions\n  </md-button>\n</div>'), n.put("scripts/done-tasks-backlog/done-tasks-backlog-d.html", '<h2 class="md-title">Done Tasks Backlog</h2>\n<p> This is just here to admire yourself.</p>\n<p>You spent <strong ng-bind="vm.totalTimeSpent|duration"></strong> on all those tasks.</p>\n\n<table class="task-summary-table"\n       md-whiteframe="2">\n  <tr>\n    <th>Title</th>\n    <th>Sub-Tasks</th>\n    <th>Time spent</th>\n    <th>Time esti.</th>\n    <th></th>\n  </tr>\n\n  <tr ng-repeat="task in vm.doneBacklogTasks"\n      ng-class="{\'is-done\': task.isDone}">\n    <td ng-bind="task.title"></td>\n    <td>\n      <span ng-repeat="task in task.subTasks"><span ng-bind="task.title"></span>: <span ng-bind="task.timeSpent|duration"></span><br></span>\n    </td>\n    <td ng-bind="task.timeSpent |duration"></td>\n    <td ng-bind="task.timeEstimate |duration"></td>\n    <td>\n      <md-button class="md-icon-button"\n                 aria-label="Copy back to todays tasks"\n                 title="Copy back to todays tasks"\n                 ng-click="vm.restoreTask(task)">\n        <ng-md-icon icon="settings_backup_restore"></ng-md-icon>\n      </md-button>\n      <ng-md-icon icon="check"\n                  ng-show="task.isDone"\n                  style="fill:green;"\n                  aria-label="checkmark"></ng-md-icon>\n    </td>\n  </tr>\n</table>'), n.put("scripts/duration-input-slider/duration-input-slider-cp.html", '<div class="circle"\n     mdx-paint-bg="primary">\n  <div class="inner-circle"></div>\n  <div class="dots">\n    <div class="dot"\n         mdx-paint-bg="hue-3"\n         ng-repeat="hour in $ctrl.dots track by $index"></div>\n  </div>\n  <div class="handle-wrapper">\n    <div class="handle"></div>\n  </div>\n  <div class="value-wrapper">\n    <label for="{{::$ctrl.uid}}"\n           ng-if="$ctrl.label"\n           ng-bind="$ctrl.label"></label>\n    <input type="text"\n           input-duration="optional"\n           class="value"\n           id="{{::$ctrl.uid}}"\n           placeholder="click to edit"\n           spellcheck="false"\n           ng-change="$ctrl.onChangeValue();"\n           ng-model="$ctrl.ngModel">\n  </div>\n</div>'), n.put("scripts/edit-on-click/edit-on-click-d.html", '<form ng-if="vm.showEdit"\n      class="edit-on-click-form"\n      ng-submit="vm.finishEdit();"\n      md-whiteframe="3">\n  <input type="text"\n         ng-blur="vm.finishEdit();"\n         tabindex="2">\n</form>\n<div class="text edit-on-click-text"\n     tabindex="2"\n     ng-click="vm.toggleShowEdit()"\n     ng-bind="vm.editOnClick">\n</div>\n'), n.put("scripts/focus-view/focus-view-cp.html", '<div class="focus-view">\n  <div class="wrapper">\n\n    <md-button ng-if="vm.pomodoroSvc.config.isEnabled"\n               class="md-icon-button md-raised"\n               aria-label="play/pause"\n               tabindex="2"\n               ng-class="{\'md-accent\':vm.pomodoroSvc.data.status===\'PLAY\'}"\n               ng-click="vm.togglePlayPomodoro()">\n      <ng-md-icon icon="play_arrow"\n                  ng-if="!vm.pomodoroSvc.data.isOnBreak && vm.pomodoroSvc.data.status===\'PLAY\'"></ng-md-icon>\n      <ng-md-icon icon="pause"\n                  ng-if="vm.pomodoroSvc.data.status===\'MANUAL_PAUSE\'"></ng-md-icon>\n      <ng-md-icon icon="free_breakfast"\n                  ng-if="vm.pomodoroSvc.data.isOnBreak && vm.pomodoroSvc.data.status!==\'MANUAL_PAUSE\'"></ng-md-icon>\n\n      <md-tooltip md-direction="bottom">Start/Pause working</md-tooltip>\n    </md-button>\n    <div ng-if="vm.pomodoroSvc.config.isEnabled"\n         class="timer"\n         ng-class="{\'is-pause\':vm.pomodoroSvc.data.status!==\'PLAY\'}"\n         ng-bind="(vm.pomodoroSvc.data.currentSessionTime | date:\'mm:ss\')"></div>\n\n\n    <md-button ng-if="!vm.pomodoroSvc.config.isEnabled"\n               class="md-icon-button md-raised"\n               aria-label="play/pause"\n               tabindex="2"\n               ng-class="{\'md-accent\': vm.r.currentTask}"\n               ng-click="vm.toggleMarkAsCurrentTask()">\n      <ng-md-icon icon="play_arrow"\n                  ng-if="!vm.r.currentTask"></ng-md-icon>\n      <ng-md-icon icon="pause"\n                  ng-if="vm.r.currentTask"></ng-md-icon>\n\n      <md-tooltip md-direction="bottom">Start/Pause working</md-tooltip>\n    </md-button>\n\n    <md-button class="md-icon-button md-raised md-primary btn-link"\n               aria-label="link"\n               tabindex="2"\n               target="_blank"\n               ng-if="::vm.task.originalLink"\n               external-link\n               ng-href="{{ ::vm.task.originalLink }}">\n      <ng-md-icon icon="{{vm.task.originalType ===\'GITHUB\' ? \'github-circle\':\'explore\'}}"\n                  aria-label="link"></ng-md-icon>\n      <md-tooltip md-direction="bottom">Go to issue page</md-tooltip>\n    </md-button>\n\n    <md-button class="md-icon-button md-raised md-primary"\n               tabindex="2"\n               aria-label="Mark as done and start next task"\n               ng-click="vm.markAsDone()">\n      <ng-md-icon icon="check"\n                  aria-label="Mark as done and start next task"></ng-md-icon>\n      <md-tooltip md-direction="bottom">Mark as done and start next task</md-tooltip>\n    </md-button>\n  </div>\n\n  <div class="task"\n       ng-class="{\'is-current\':vm.r.currentTask}">\n    <h3 class="parent-title"\n        ng-bind="vm.parentTitle"\n        ng-if="vm.parentTitle"></h3>\n    <h2 edit-on-click\n        contenteditable="true"\n        ng-model="vm.task.title"\n        ng-class="{\'is-done\':vm.task.isDone}"\n        class="title"></h2>\n    <md-progress-linear md-mode="determinate"\n                        value="{{vm.task.progress}}"></md-progress-linear>\n    <div class="time"\n         ng-bind="(vm.task.timeSpent|duration) +\' / \' + (vm.task.timeEstimate|duration)"></div>\n\n    <section class="notes">\n      <div class="md-headline"\n           ng-bind="vm.task.originalId ? \'Description\': \'Notes\'"></div>\n      <inline-markdown ng-model="vm.task.notes"\n                       md-whiteframe="4"\n                       on-edit-finished="vm.onTaskNotesEditFinished(newVal, isChanged, vm.task)"></inline-markdown>\n    </section>\n\n    <section ng-if="vm.task.localAttachments && vm.task.localAttachments.length">\n      <collapsible collapsible-title="Local attachments and links"\n                   is-initially-expanded="\'true\'">\n        <task-local-links local-links="vm.task.localAttachments"></task-local-links>\n      </collapsible>\n    </section>\n\n    <section ng-if="vm.task.originalAssigneeKey"\n             class="assignee">\n      <div class="md-caption">Assignee: <span ng-bind="vm.task.originalAssigneeKey"></span></div>\n    </section>\n\n    <section ng-if="vm.task.originalAttachment.length > 0">\n      <collapsible collapsible-title="Attachments ({{ ::vm.task.originalAttachment.length }})"\n                   is-initially-expanded="\'true\'">\n        <ul class="attachments">\n          <li ng-repeat="attachment in vm.task.originalAttachment">\n            <a href="{{ ::attachment}}"\n               external-link\n               target="_blank"\n               class="md-accent">{{ ::attachment}}</a>\n            <a href="{{ ::attachment}}"\n               download="{{ ::attachment}}"\n               class="md-accent">\n              <ng-md-icon icon="file_download"\n                          aria-label="download file directly"></ng-md-icon>\n            </a>\n          </li>\n        </ul>\n      </collapsible>\n    </section>\n\n    <section ng-if="vm.task.originalComments.length > 0">\n      <collapsible collapsible-title="Comments ({{:: vm.task.originalComments.length }})"\n                   is-initially-expanded="\'true\'">\n        <md-divider></md-divider>\n        <ul class="comments">\n          <li ng-repeat="comment in vm.task.originalComments"\n              class="comment">\n            <strong class="author">[<span ng-bind="::comment.author"></span>]: </strong>\n            <span marked="comment.body"></span>\n          </li>\n        </ul>\n      </collapsible>\n    </section>\n  </div>\n</div>\n'), n.put("scripts/global-link-list/global-link-list-cp.html", '<div class="global-link-list-outer ani-slide-up-down"\n     ng-if="$ctrl.isToggled">\n  <div class="global-link-list-inner">\n    <div class="global-link">\n      <md-button class="md-raised md-icon-button md-primary md-hue-3"\n                 md-whiteframe="1"\n                 ng-click="$ctrl.addLink()"\n                 tabindex="1"\n                 aria-label="add global link">\n        <ng-md-icon icon="add"></ng-md-icon>\n      </md-button>\n    </div>\n\n    <div class="msg"\n         ng-if="!$ctrl.globalLinks.length">You have no project bookmarks. Add one via drag and drop or by clicking on the \'+\' icon.\n    </div>\n\n    <div class="global-link"\n         ng-repeat="link in $ctrl.globalLinks"\n         draggable="false">\n      <md-button external-link\n                 class="md-raised md-primary md-hue-2"\n                 href="{{link.path}}"\n                 type="{{link.type}}"\n                 md-whiteframe="1"\n                 target="_blank"\n                 tabindex="1"\n                 draggable="false"\n                 aria-label="open global link">\n        <div>\n          <ng-md-icon icon="link"\n                      ng-if="!link.customIcon && link.type === \'LINK\'"\n                      aria-label="Open link"></ng-md-icon>\n          <ng-md-icon icon="insert_drive_file"\n                      ng-if="!link.customIcon && link.type === \'FILE\'"\n                      aria-label="Open file"></ng-md-icon>\n          <ng-md-icon icon="laptop_windows"\n                      ng-if="!link.customIcon && link.type === \'COMMAND\'"\n                      aria-label="Exec command"></ng-md-icon>\n          <ng-md-icon icon="{{link.customIcon}}"\n                      ng-if="link.customIcon"\n                      aria-label="Open"></ng-md-icon>\n\n          <span ng-bind="link.title"></span>\n        </div>\n      </md-button>\n\n      <div class="controls">\n        <md-button class="md-icon-button md-raised md-primary md-hue-3 edit-button"\n                   aria-label="open edit dialog"\n                   ng-click="$ctrl.openEditDialog(link)">\n          <ng-md-icon icon="edit"></ng-md-icon>\n        </md-button>\n        <md-button class="md-icon-button md-raised md-warn md-hue-3 trash-button"\n                   ng-click="$ctrl.remove($index)"\n                   aria-label="remove link">\n          <ng-md-icon icon="delete_forever"></ng-md-icon>\n        </md-button>\n      </div>\n    </div>\n  </div>\n</div>'), n.put("scripts/help-section/help-section-d.html", '<md-button class="md-icon-button help-btn md-raised"\n           aria-label="Show Help for section"\n           ng-click="vm.isShowHelp =!vm.isShowHelp;">\n  <ng-md-icon icon="{{vm.isShowHelp ? \'close\':\'help_outline\'}}"></ng-md-icon>\n</md-button>\n\n<div class="help-text ani-expand-collapse"\n     ng-if="vm.isShowHelp">\n  <div class="help-icon-wrapper">\n    <ng-md-icon icon="help_outline"></ng-md-icon>\n  </div>\n  <ng-transclude></ng-transclude>\n  <div class="help-icon-wrapper">\n    <ng-md-icon icon="help_outline"></ng-md-icon>\n  </div>\n</div>\n\n'), n.put("scripts/hint/hint-d.html", '<md-card class="hint"\n         ng-show="r.tomorrowsNote">\n  <md-card-title>\n    <md-card-title-text>\n      <span class="md-title">Yesterday\'s note for today</span>\n    </md-card-title-text>\n  </md-card-title>\n  <md-card-content>\n    <p ng-bind="r.tomorrowsNote"></p>\n  </md-card-content>\n  <md-card-actions layout="row"\n                   layout-align="end center">\n    <md-button ng-click="vm.deleteHint()">Remove</md-button>\n  </md-card-actions>\n</md-card>\n'), n.put("scripts/inline-markdown/inline-markdown-d.html", '<div class="markdown-wrapper">\n  <div ng-if="vm.showEdit"\n       class="edit-container">\n    <textarea ng-model-options="{ debounce: 30 }"\n              ng-blur="vm.untoggleShowEdit()"\n              class="md-body-1 markdown-unparsed"\n              rows="5"></textarea>\n    <md-button class="md-icon-button lock-edit-btn"\n               aria-label="Lock edit mode"\n               ng-mousedown="vm.toggleEditLock($event)">\n      <ng-md-icon icon="{{vm.isLocked ? \'lock_outline\':\'lock_open\'}}"></ng-md-icon>\n    </md-button>\n  </div>\n\n  <marked-preview marked="vm.ngModel"\n                  ng-show="!vm.showEdit"\n                  ng-click="vm.toggleShowEdit($event)"\n                  ng-focus="vm.toggleShowEdit($event)"\n                  class="md-body-1 markdown-parsed"></marked-preview>\n</div>\n'), n.put("scripts/main-header/main-header-d.html", '<md-toolbar md-whiteframe="3">\n  <div class="md-toolbar-tools">\n    <md-button class="md-icon-button sp-icon"\n               aria-label="Home"\n               ui-sref="daily-planner">\n      <md-icon md-svg-src="img/ico.svg"\n               aria-label="logo"></md-icon>\n    </md-button>\n\n    <md-menu ng-if="r.currentProject"\n             md-offset="0 42">\n      <md-button aria-label="Switch project"\n                 title="Switch project"\n                 ng-bind="r.currentProject.title"\n                 class="project-switcher-btn"\n                 ng-click="vm.openMenu($mdMenu.open, $event)">\n      </md-button>\n      <md-menu-content width="4">\n        <md-menu-item ng-repeat="project in vm.allProjects">\n          <md-button ng-click="vm.changeProject(project)"\n                     aria-label="Change project"\n                     ng-bind="project.title">\n          </md-button>\n        </md-menu-item>\n      </md-menu-content>\n    </md-menu>\n\n    <span flex></span>\n\n    <nav class="nav">\n      <md-button class="md-icon-button"\n                 aria-label="Daily Planner"\n                 md-no-ink\n                 ui-sref-active="md-raised"\n                 ui-sref="daily-planner"\n                 title="Go to daily planer">\n        <ng-md-icon icon="border_color"></ng-md-icon>\n      </md-button>\n\n      <md-button class="md-icon-button"\n                 aria-label="Work View"\n                 md-no-ink\n                 ui-sref-active="md-raised"\n                 ng-if="$state.current.name!==\'daily-summary\'"\n                 ui-sref="work-view"\n                 title="Go to work view">\n        <ng-md-icon icon="playlist_play"></ng-md-icon>\n      </md-button>\n\n      <md-button class="md-icon-button"\n                 aria-label="Daily Summary"\n                 ng-if="$state.current.name===\'daily-summary\'"\n                 md-no-ink\n                 ui-sref-active="md-raised"\n                 ui-sref="daily-summary"\n                 title="Finish your day / Go to summary">\n        <ng-md-icon icon="done_all"></ng-md-icon>\n      </md-button>\n\n      <md-button class="md-icon-button"\n                 aria-label="Daily Agenda / Tracking History"\n                 md-no-ink\n                 ui-sref-active="md-raised"\n                 ui-sref="daily-agenda"\n                 title="Go to daily agenda / Tracking history">\n        <ng-md-icon icon="today"></ng-md-icon>\n      </md-button>\n\n      <pomodoro-button ng-if="r.config.pomodoro.isEnabled"></pomodoro-button>\n    </nav>\n\n    <md-button class="md-icon-button show-bookmarks-btn md-raised md-primary"\n               aria-label="Show Help for section"\n               ng-class="{\'is-open\':r.uiHelper.isShowBookmarkBar}"\n               ng-click="r.uiHelper.isShowBookmarkBar=!r.uiHelper.isShowBookmarkBar;">\n      <ng-md-icon icon="bookmark"></ng-md-icon>\n    </md-button>\n  </div>\n</md-toolbar>\n'), n.put("scripts/pomodoro-button/pomodoro-button-cp.html", '<md-fab-speed-dial md-direction="down"\n                   md-open="$ctrl.isOpen"\n                   class="md-scale"\n                   ng-class="$ctrl.svc.data.status"\n                   ng-click="$ctrl.toggle($event)"\n                   ng-mouseenter="$ctrl.isOpen=true"\n                   ng-mouseleave="$ctrl.isOpen=false">\n  <md-fab-trigger>\n    <md-button class="md-icon-button md-raised timer-btn"\n               md-no-ink\n               ng-class="{\'md-accent\':$ctrl.svc.data.status==\'PLAY\'}"\n               aria-label="Open Pomodoro Actions">\n      <ng-md-icon icon="play_arrow"\n                  ng-if="!$ctrl.svc.data.isOnBreak && $ctrl.svc.data.status===\'PLAY\'"></ng-md-icon>\n      <ng-md-icon icon="pause"\n                  ng-if="$ctrl.svc.data.status===\'MANUAL_PAUSE\'"></ng-md-icon>\n      <ng-md-icon icon="free_breakfast"\n                  ng-if="$ctrl.svc.data.isOnBreak && $ctrl.svc.data.status!==\'MANUAL_PAUSE\'"></ng-md-icon>\n      <span class="timer-btn-text"\n            md-whiteframe="2"\n            ng-bind="($ctrl.svc.data.currentSessionTime | date:\'mm:ss\')"></span>\n    </md-button>\n  </md-fab-trigger>\n  <md-fab-actions>\n    <md-button class="md-fab md-raised md-mini"\n               ng-click="$ctrl.play($event)"\n               aria-label="Play Pomodoro Session"\n               ng-if="$ctrl.svc.data.status!==\'PLAY\'">\n      <ng-md-icon icon="play_arrow"></ng-md-icon>\n    </md-button>\n    <md-button class="md-fab md-raised md-mini"\n               ng-click="$ctrl.pause($event)"\n               aria-label="Pause Pomodoro Session"\n               ng-if="$ctrl.svc.data.status===\'PLAY\'">\n      <ng-md-icon icon="pause"></ng-md-icon>\n    </md-button>\n    <md-button class="md-fab md-raised md-mini"\n               ng-click="$ctrl.stop($event)"\n               aria-label="Stop Pomodoro Session">\n      <ng-md-icon icon="stop"></ng-md-icon>\n    </md-button>\n    <md-button ng-if="$ctrl.svc.data.isOnBreak"\n               class="md-fab md-raised md-mini"\n               ng-click="$ctrl.skipBreak($event)"\n               aria-label="Stop Pomodoro Session">\n      <ng-md-icon icon="skip_next"></ng-md-icon>\n    </md-button>\n    <md-button class="md-fab md-raised md-mini"\n               ng-click="$ctrl.focusMode($event)"\n               aria-label="Stop Pomodoro Session">\n      <ng-md-icon icon="my_location"></ng-md-icon>\n    </md-button>\n  </md-fab-actions>\n</md-fab-speed-dial>\n\n'), n.put("scripts/quick-access-menu/quick-access-menu-d.html", '<md-fab-speed-dial md-open="vm.isOpen"\n                   md-direction="up"\n                   ng-class="vm.selectedMode"\n                   ng-mouseenter="vm.isOpen=true"\n                   ng-mouseleave="vm.isOpen=false">\n  <md-fab-trigger>\n    <md-button aria-label="menu"\n               class="md-fab md-accent">\n      <ng-md-icon icon="navigation"></ng-md-icon>\n    </md-button>\n  </md-fab-trigger>\n\n  <md-fab-actions>\n    <md-button class="md-fab md-raised md-mini md-primary"\n               aria-label="Add Task"\n               title="Add task"\n               ng-click="vm.openAddTask()">\n      <ng-md-icon icon="add"></ng-md-icon>\n    </md-button>\n    <md-button aria-label="Notepad"\n               ng-click="vm.openNotepad()"\n               class="md-fab md-raised md-mini md-primary">\n      <ng-md-icon icon="speaker_notes"></ng-md-icon>\n    </md-button>\n    <md-button aria-label="Distractions"\n               ng-click="vm.openDistractionPanel()"\n               class="md-fab md-raised md-mini md-primary">\n      <ng-md-icon icon="flash_on"></ng-md-icon>\n    </md-button>\n    <md-button class="md-fab md-raised md-mini md-primary"\n               aria-label="Settings"\n               ui-sref="settings"\n               title="Go to settings">\n      <ng-md-icon icon="settings"></ng-md-icon>\n    </md-button>\n\n    <md-button class="md-fab md-raised md-mini md-primary"\n               aria-label="Help"\n               ng-click="vm.openHelp();"\n               title="Open help for current view">\n      <ng-md-icon icon="help_outline"></ng-md-icon>\n    </md-button>\n\n  </md-fab-actions>\n</md-fab-speed-dial>'), n.put("scripts/sub-task-list/sub-task-list-d.html", '<md-button ng-click="vm.task.isHideSubTasks=!vm.task.isHideSubTasks"\n           class="md-icon-button collapse-sub-tasks-btn"\n           aria-label="expand/collapse sub tasks"\n           md-whiteframe="1">\n  <ng-md-icon icon="add"\n              aria-label="show sub tasks"\n              ng-show="vm.task.isHideSubTasks"></ng-md-icon>\n  <ng-md-icon icon="remove"\n              aria-label="hide sub tasks"\n              ng-show="!vm.task.isHideSubTasks"></ng-md-icon>\n</md-button>\n<task-list tasks="vm.task.subTasks"\n           class="ani-expand-collapse"\n           ng-show="!vm.task.isHideSubTasks"\n           allow-task-selection="{{vm.allowTaskSelection}}"\n           current-task-id="vm.currentTaskId"\n           is-sub-tasks-disabled="true"\n           parent-task="vm.task"></task-list>'), n.put("scripts/task-list/task-list-d.html", '<div class="task-list"\n     as-sortable="$ctrl.dragControlListeners"\n     ng-class="{ \'is-hide-controls\': $ctrl.isHideControls}"\n     ng-model="$ctrl.tasks">\n  <div class="task"\n       as-sortable-item\n       ng-class="{\n      \'is-current\': $ctrl.currentTaskId === task.id,\n      \'is-done\':task.isDone\n      }"\n       ng-repeat="task in $ctrl.tasks|limitTo:$ctrl.limitTo|filter:$ctrl.filter track by task.id"\n       tabindex="1"\n       ng-focus="$ctrl.onFocus($event)">\n\n    <div class="inner-wrapper">\n\n      <div class="first-line">\n        <div class="title-bar-wrapper">\n          <button class="ico-btn update-indicator-btn"\n                  aria-label="is updated"\n                  tabindex="2"\n                  ng-click="task.showNotes = !task.showNotes;"\n                  ng-if="task.isUpdated">\n            <md-tooltip>\n              Click to show updates\n            </md-tooltip>\n            <ng-md-icon class="update update-icon"\n                        icon="update"></ng-md-icon>\n          </button>\n\n\n          <ng-md-icon class="handle"\n                      as-sortable-item-handle\n                      icon="drag_handle"></ng-md-icon>\n\n          <button class="ico-btn play-btn"\n                  aria-label="mark as current"\n                  tabindex="2"\n                  ng-click="$ctrl.togglePlay(task)"\n                  ng-if="!task.isDone && $ctrl.allowTaskSelection && !task.subTasks.length">\n\n            <ng-md-icon icon="{{$ctrl.currentTaskId === task.id ? \'pause\':\'play_arrow\'}}"\n                        aria-label="mark as current"></ng-md-icon>\n          </button>\n\n          <a class="ico-btn original-link-btn"\n             aria-label="link"\n             tabindex="2"\n             target="_blank"\n             external-link\n             ng-if="::task.originalLink"\n             ng-href="{{ ::task.originalLink }}">\n\n            <ng-md-icon icon="explore"\n                        ng-if="::task.originalType !==\'GITHUB\'"\n                        aria-label="link"></ng-md-icon>\n            <ng-md-icon icon="github-circle"\n                        ng-if="::task.originalType ===\'GITHUB\'"\n                        aria-label="link"></ng-md-icon>\n          </a>\n\n          <div class="task-title"\n               tabindex="2"\n               contenteditable="true"\n               edit-on-click-on-edit-finished="$ctrl.focusTaskEl($taskEl, event); $ctrl.onChangeTitle(task, isChanged, newVal);"\n               edit-on-click-ev-id="task.id"\n               edit-on-click\n               ng-model="task.title"></div>\n        </div>\n\n        <div class="time">\n          <span ng-if="task.subTasks.length>0">∑</span>\n          <span ng-bind="(task.timeSpent|duration) +\' / \' + (task.timeEstimate|duration)"></span>\n          <button class="ico-btn"\n                  tabindex="2"\n                  ng-if="!(task.subTasks.length>0)"\n                  aria-label="time estimation"\n                  ng-click="$ctrl.estimateTime(task)">\n\n            <ng-md-icon icon="access_time"\n                        aria-label="time estimation"></ng-md-icon>\n          </button>\n        </div>\n\n        <div class="controls">\n          <button class="ico-btn"\n                  aria-label="add sub task"\n                  ng-if="!$ctrl.isSubTasksDisabled&&!task.isDone"\n                  tabindex="2"\n                  ng-click="$ctrl.addSubTask(task, $event);">\n\n            <ng-md-icon icon="playlist_add"\n                        aria-label="add sub task"></ng-md-icon>\n          </button>\n          <button class="ico-btn show-notes-btn"\n                  aria-label="notes"\n                  tabindex="2"\n                  ng-class="{\'is-active\':task.showNotes}"\n                  ng-click="task.showNotes=!task.showNotes">\n\n            <ng-md-icon icon="{{(task.notes||task.originalKey) ?\'insert_comment\': \'mode_comment\'}}"\n                        aria-label="notes"></ng-md-icon>\n          </button>\n          <button class="ico-btn delete-btn"\n                  aria-label="delete"\n                  tabindex="2"\n                  ng-click="$ctrl.deleteTask(task, $index)">\n\n            <ng-md-icon icon="delete_forever"\n                        class="delete-icon"\n                        aria-label="delete"></ng-md-icon>\n          </button>\n          <button ng-click="task.isDone= !task.isDone; $ctrl.onTaskDoneChanged(task)"\n                  class="ico-btn mark-as-done-btn"\n                  tabindex="2"\n                  aria-label="un-/mark as done">\n            <ng-md-icon icon="{{(task.isDone?\'undo\':\'check\')}}"></ng-md-icon>\n          </button>\n        </div>\n      </div>\n\n      <progress-bar progress="task.progress"\n                    mdx-paint-bg="primary"></progress-bar>\n\n\n      <div class="notes ani-expand-collapse"\n           ng-if="task.showNotes===true">\n\n        <section ng-if="task.isUpdated;">\n          <div class="md-caption">\n            Changes since last update\n          </div>\n\n          <ul class="changelog">\n            <li ng-repeat="changelogEntry in task.originalChangelog">\n              <div ng-if="::changelogEntry.author">\n                <em>[<span ng-bind="::changelogEntry.author"></span>]\n                  <span ng-bind="::changelogEntry.created| amDateFormat:\'Y.MM.DD HH:mm\'"></span></em>\n              </div>\n              <div ng-repeat="change in changelogEntry.items">\n                <strong ng-bind="::change.field"></strong>\n                <span ng-if="change.toString.length"><em>changed to:</em> <span ng-bind="::change.toString"></span></span></span>\n              </div>\n            </li>\n          </ul>\n          <md-button class="md-raised"\n                  ng-click="task.isUpdated=false;task.originalChangelog=undefined;task.showNotes=false">\n            <ng-md-icon icon="delete"></ng-md-icon>\n            Hide changes\n          </md-button>\n        </section>\n\n        <section>\n          <div class="md-caption"\n               ng-bind="task.originalId ? \'Description\': \'Notes\'"></div>\n          <div class="actual-notes-wrapper">\n            <inline-markdown ng-model="task.notes"\n                             on-edit-finished="$ctrl.onTaskNotesEditFinished(newVal, isChanged, task)"></inline-markdown>\n          </div>\n        </section>\n\n        <section ng-if="task.status.length > 0 || task.originalStatus.length > 0"\n                 class="status">\n          <div class="md-caption">Status: <span ng-bind="task.originalStatus.name || task.originalStatus"></span>\n            <ng-md-icon icon="arrow_forward"\n                        ng-if="task.status.length > 0 "\n                        aria-label="arrow forward"></ng-md-icon>\n            <span ng-bind="task.status"></span>\n          </div>\n        </section>\n\n        <section ng-if="task.originalAssigneeKey"\n                 class="assignee">\n          <div class="md-caption">Assignee: <span ng-bind="task.originalAssigneeKey"></span></div>\n        </section>\n\n        <section ng-if="task.originalAttachment.length > 0">\n          <collapsible collapsible-title="Attachments ({{ ::task.originalAttachment.length }})">\n            <ul class="attachments">\n              <li ng-repeat="attachment in task.originalAttachment">\n                <a href="{{ ::attachment}}"\n                   external-link\n                   target="_blank"\n                   class="md-accent">{{ ::attachment}}</a>\n                <a href="{{ ::attachment}}"\n                   download="{{ ::attachment}}"\n                   class="md-accent">\n                  <ng-md-icon icon="file_download"\n                              aria-label="download file directly"></ng-md-icon>\n                </a>\n              </li>\n            </ul>\n          </collapsible>\n        </section>\n\n        <section ng-if="task.originalComments.length > 0">\n          <collapsible collapsible-title="Comments ({{:: task.originalComments.length }})">\n            <md-divider></md-divider>\n            <ul class="comments">\n              <li ng-repeat="comment in task.originalComments"\n                  class="comment">\n                <strong class="author">[<span ng-bind="::comment.author"></span>]: </strong>\n                <span marked="comment.body"></span>\n              </li>\n            </ul>\n          </collapsible>\n        </section>\n\n        <section>\n          <collapsible collapsible-title="Local attachments and links"\n                       counter="task.localAttachments.length"\n                       btn-action="$ctrl.addLocalAttachment(task)"\n                       btn-icon="add">\n            <task-local-links local-links="task.localAttachments"></task-local-links>\n          </collapsible>\n        </section>\n      </div>\n\n      <sub-task-list ng-if="task.subTasks.length > 0"\n                     allow-task-selection="{{$ctrl.allowTaskSelection}}"\n                     current-task-id="$ctrl.currentTaskId"\n                     task="task"></sub-task-list>\n    </div>\n  </div>\n</div>\n'), n.put("scripts/task-local-links/task-local-links-cp.html", '<ul class="attachments">\n  \x3c!-- images --\x3e\n  <li ng-repeat="link in $ctrl.localLinks |filter:{type:\'IMG\'} track by $index"\n      class="thumbnail-box">\n\n    <img src="{{::link.path}}"\n         enlarge-image="link.path">\n\n    <div class="status-line">\n      <md-button class="md-icon-button md-raised md-warn trash-button"\n                 ng-click="$ctrl.removeLink(link)"\n                 aria-label="remove link">\n        <ng-md-icon icon="delete_forever"\n                    size="22"></ng-md-icon>\n      </md-button>\n\n      <a external-link\n         class="md-accent"\n         href="{{::link.path}}"\n         type="{{::link.type}}"\n         target="_blank"\n         tabindex="1"\n         draggable="false"\n         aria-label="open global link">\n        <div>\n          <span ng-bind="link.title"></span>\n        </div>\n      </a>\n    </div>\n  </li>\n\n  \x3c!-- non images --\x3e\n  <li ng-repeat="link in $ctrl.localLinks |filter:{type:\'!IMG\'} track by $index"\n      class="normal-link">\n    <a external-link\n       class="md-accent"\n       href="{{::link.path}}"\n       type="{{::link.type}}"\n       target="_blank"\n       tabindex="1"\n       draggable="false"\n       aria-label="open global link">\n      <div>\n        <ng-md-icon icon="link"\n                    ng-if="!link.customIcon && link.type === \'LINK\'"\n                    aria-label="Open link"></ng-md-icon>\n        <ng-md-icon icon="short_text"\n                    ng-if="!link.customIcon && link.type === \'TEXT\'"\n                    aria-label="Open text"></ng-md-icon>\n        <ng-md-icon icon="insert_drive_file"\n                    ng-if="!link.customIcon && link.type === \'FILE\'"\n                    aria-label="Open file"></ng-md-icon>\n        <ng-md-icon icon="{{::link.customIcon}}"\n                    ng-if="link.customIcon"\n                    aria-label="Open"></ng-md-icon>\n\n        <span ng-bind="link.title"></span>\n      </div>\n    </a>\n\n    <md-button class="md-icon-button md-raised md-warn trash-button"\n               ng-click="$ctrl.removeLink(link)"\n               aria-label="remove link">\n      <ng-md-icon icon="delete_forever"\n                  size="22"></ng-md-icon>\n    </md-button>\n  </li>\n</ul>'), n.put("scripts/work-view/work-view-d.html", '<header class="work-view-header">\n  <div class="status-bar">\n    <div class="item"><span class="label">Working today:</span>\n      <span class="no-wrap">\n      <strong ng-bind="vm.totalTimeWorkedToday|duration"></strong>\n      <ng-md-icon icon="timer"\n                  aria-label="timer icon"></ng-md-icon>\n      </span>\n    </div>\n\n    <div class="item">\n      <span class="label">Estimate remaining:</span>\n      <span class="no-wrap">\n      ~<strong ng-bind="vm.totalEstimationRemaining|duration"></strong>\n      <ng-md-icon icon="timer"></ng-md-icon>\n      </span>\n    </div>\n\n    <div class="item"\n         ng-if="vm.config.isShowTimeWorkedWithoutBreak">\n      <span class="label">Without break: </span>\n      <span class="no-wrap">\n        <strong ng-bind="vm.session.timeWorkedWithoutBreak|duration"></strong><ng-md-icon icon="timer"></ng-md-icon>\n      </span>\n    </div>\n    <md-button ng-click="vm.isHideControls = !(vm.isHideControls);"\n               class="md-icon-button md-primary"\n               aria-label="collapse sub tasks and notes">\n      <ng-md-icon icon="vertical_align_center"\n                  class="hide-controls-icon"></ng-md-icon>\n    </md-button>\n\n    <md-button ng-click="vm.collapseAllNotesAndSubTasks()"\n               class="md-icon-button md-primary"\n               aria-label="collapse sub tasks and notes">\n      <ng-md-icon icon="vertical_align_center"></ng-md-icon>\n    </md-button>\n  </div>\n</header>\n\n<section class="work-view-tasks work-view-tasks--undone">\n  <p ng-if="!vm.tasksUndone.length">You currently have no undone tasks.</p>\n\n  <task-list tasks="vm.tasksUndone"\n             class="undone-tasks"\n             current-task-id="r.currentTask.id"\n             is-hide-controls="vm.isHideControls"\n             on-task-done-changed="vm.onTaskDoneChangedUndoneList(task)"\n             allow-task-selection="true"></task-list>\n</section>\n\n<md-button ng-click="vm.openAddTask()"\n           class="md-primary md-raised">\n  <ng-md-icon icon="add"></ng-md-icon>\n  Add new Task\n</md-button>\n\n\n<md-button ui-sref="daily-summary"\n           class="md-primary md-raised">\n  <ng-md-icon icon="done_all"></ng-md-icon>\n  Finish your work day\n</md-button>\n\n\n<h2 class="md-title">\n  <ng-md-icon icon="playlist_add_check"></ng-md-icon>\n  Done Tasks\n</h2>\n\n<section class="work-view-tasks work-view-tasks--done">\n  <p ng-if="!vm.tasksDone.length">You currently have no done tasks.</p>\n\n  <task-list tasks="vm.tasksDone"\n             class="done-tasks"\n             is-hide-controls="vm.isHideControls"\n             on-task-done-changed="vm.onTaskDoneChangedDoneList(task)"\n             current-task-id="r.currentTask.id"></task-list>\n</section>\n\n\n'), n.put("scripts/agenda-and-history/daily-agenda/daily-agenda-d.html", '<script type="text/ng-template"\n        id="calendarDayView">\n  <div class="cal-day-box">\n    <div class="cal-day-panel clearfix"\n         ng-style="{height: vm.dayViewHeight + \'px\', minWidth: vm.viewWidth + \'px\'}">\n      <mwl-calendar-hour-list\n        day-view-start="vm.dayViewStart"\n        day-view-end="vm.dayViewEnd"\n        day-view-split="vm.dayViewSplit"\n        on-timespan-click="vm.onTimespanClick"\n        on-date-range-select="vm.onDateRangeSelect"\n        on-event-times-changed="vm.onEventTimesChanged"\n        view-date="vm.viewDate"\n        custom-template-urls="vm.customTemplateUrls"\n        template-scope="vm.templateScope"\n        cell-modifier="vm.cellModifier">\n      </mwl-calendar-hour-list>\n\n      <div class="pull-left day-event day-highlight"\n           ng-repeat="dayEvent in vm.nonAllDayEvents track by dayEvent.event.calendarEventId"\n           ng-class="dayEvent.event.cssClass"\n           ng-style="{\n        top: dayEvent.top - 1 + \'px\',\n        left: dayEvent.left + 60 + \'px\',\n        height: dayEvent.height + \'px\',\n        width: dayEvent.width + \'px\',\n        backgroundColor: dayEvent.event.color.secondary,\n        borderColor: dayEvent.event.color.primary\n      }"\n           mwl-draggable="dayEvent.event.draggable === true"\n           axis="\'xy\'"\n           snap-grid="{y: vm.dayViewEventChunkSize || 30, x: 50}"\n           on-drag="vm.eventDragged(dayEvent.event, y / 30)"\n           on-drag-end="vm.eventDragComplete(dayEvent.event, y / 30)"\n           mwl-resizable="dayEvent.event.resizable === true && dayEvent.event.endsAt"\n           resize-edges="{top: true, bottom: true}"\n           on-resize="vm.eventResized(dayEvent.event, edge, y / 30)"\n           on-resize-end="vm.eventResizeComplete(dayEvent.event, edge, y / 30)"\n           uib-tooltip-html="vm.calendarEventTitle.dayViewTooltip(dayEvent.event) | calendarTrustAsHtml"\n           tooltip-append-to-body="true">\n\n      <span class="cal-hours">\n        <span ng-show="dayEvent.top == 0"><span ng-bind="(dayEvent.event.tempStartsAt || dayEvent.event.startsAt) | calendarDate:\'day\':true"></span>, </span>\n        <span ng-bind="(dayEvent.event.tempStartsAt || dayEvent.event.startsAt) | calendarDate:\'time\':true"></span>\n      </span>\n        <span class="event-item md-caption">\n          \x3c!--<span class="event-item"--\x3e\n          \x3c!--ng-click="vm.onEventClick({calendarEvent: dayEvent.event})">--\x3e\n          <span ng-bind-html="vm.calendarEventTitle.dayView(dayEvent.event) | calendarTrustAsHtml"></span>\n        </span>\n\n        <a class="event-item-action"\n           ng-repeat="action in dayEvent.event.actions track by $index"\n           ng-class="action.cssClass"\n           ng-bind-html="action.label | calendarTrustAsHtml"\n           ng-click="action.onClick({calendarEvent: dayEvent.event})">\n        </a>\n\n      </div>\n\n    </div>\n  </div>\n<\/script>\n\n<h2 class="md-title">Your agenda for your undone tasks today</h2>\n<p>Nothing to click, nothing to do. This is just here to give you a vague idea of how your day might look like.</p>\n\n<md-switch ng-model="r.uiHelper.dailyAgenda.showSubTasks"\n           ng-change="vm.toggleSubTasks(vm.showSubTasks)">Show Sub Tasks\n</md-switch>\n\n<mwl-calendar\n  events="vm.events"\n  view="vm.calendarView"\n  view-date="vm.viewDate"\n  cell-is-open="vm.cellIsOpen"\n  cell-auto-open-disabled="true"\n  day-view-start="{{ vm.dayStarts }}"\n  day-view-end="{{ vm.dayEnds }}"\n  day-view-event-width="320"\n  custom-template-urls="{calendarDayView: \'calendarDayView\'}"\n  on-timespan-click="vm.timespanClicked(calendarDate, calendarCell)"\n  day-view-split="15"\n  on-event-times-changed="calendarEvent.startsAt = calendarNewEventStart; calendarEvent.endsAt = calendarNewEventEnd; vm.eventTimesChanged(calendarEvent)">\n</mwl-calendar>\n\n'), n.put("scripts/agenda-and-history/time-tracking-history/time-tracking-history-d.html", '<div ng-repeat="(yearKey, yearVal) in vm.worklog"\n     class="year">\n  <div class="year-title md-display-2"\n       ng-bind="yearKey"></div>\n  <div class="year-time-spent">Time spent total: <strong ng-bind="yearVal.timeSpent|duration"></strong></div>\n\n  <div ng-repeat="(monthKey, monthVal) in yearVal.entries"\n       class="month">\n    <div class="month-title md-headline">\n      <span ng-bind="monthKey|numberToMonth"></span>\n      <md-button class="md-raised md-primary md-icon-button"\n                 aria-label="export data"\n                 ng-click="vm.exportData(\'MONTH\',monthVal)">\n        <ng-md-icon icon="call_made"></ng-md-icon>\n      </md-button>\n    </div>\n    <div class="month-time-spent">Time spent total: <strong ng-bind="monthVal.timeSpent|duration"></strong>\n    </div>\n    <div ng-repeat="(dayKey, worklogForDay) in monthVal.entries"\n         class="day">\n\n      <div class="day-title">\n        <md-button class="md-raised md-icon-button"\n                   aria-label="export data"\n                   ng-click="worklogForDay.isVisible=!worklogForDay.isVisible;">\n          <ng-md-icon icon="list"></ng-md-icon>\n        </md-button>\n        <span ng-bind="worklogForDay.dateStr|amDateFormat:\'DD-MM-YYYY, dddd\'"></span>:\n        <strong ng-bind="worklogForDay.timeSpent|duration"></strong>\n      </div>\n\n      <div class="ani-expand-collapse"\n           ng-if="worklogForDay.isVisible">\n        <table class="task-summary-table">\n          <tr ng-repeat="logEntry in worklogForDay.entries track by logEntry.task.id">\n            <td ng-bind="logEntry.task.title"></td>\n            <td ng-bind="logEntry.task.timeSpentOnDay[worklogForDay.dateStr] |duration"></td>\n          </tr>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>\n\n'), n.put("scripts/dialogs/add-task/add-task-c.html", '<md-dialog aria-label="Add task Dialog"\n           md-theme="vm.theme"\n           class="add-task-dialog">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Add a new task</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.addTask()">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <md-input-container class="md-block">\n          <label>Task Name</label>\n          <input type="text"\n                 ng-model="vm.task.title"\n                 md-auto-focus\n                 required\n                 aria-label="Title">\n        </md-input-container>\n\n        <div style="text-align: center">\n          <duration-input-slider ng-model="vm.task.timeEstimate"\n                                 label="Estimated Duration"></duration-input-slider>\n        </div>\n\n        <md-input-container class="md-block">\n          <label>Notes</label>\n\n          <textarea ng-model="vm.task.notes"\n                    aria-label="Notes"></textarea>\n        </md-input-container>\n        <md-switch ng-model="vm.isAddToBacklog"\n                   aria-label="Add task to backlog">\n          Add task to backlog instead of today\'s list\n        </md-switch>\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-primary md-raised">\n        Save\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        Cancel\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/create-project/create-project-c.html", '<md-dialog aria-label="Create a new project"\n           class="create-project-dialog"\n           md-theme="{{vm.projectSettings.theme}}">\n\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Create a new project</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.createProject(vm.project)">\n\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <md-input-container class="md-block">\n          <label>Project Title</label>\n          <input type="text"\n                 ng-model="vm.project.title"\n                 md-auto-focus\n                 required\n                 aria-label="Title">\n        </md-input-container>\n\n        <theme-settings current-theme="vm.projectSettings.theme"\n                        is-boxed="true"></theme-settings>\n\n\n        <jira-settings settings="vm.projectSettings.jiraSettings"\n                       ng-if="vm.IS_ELECTRON || vm.IS_EXTENSION"></jira-settings>\n\n        \x3c!--<git-settings settings="vm.projectSettings.git"--\x3e\n        \x3c!--ng-if="vm.IS_ELECTRON || vm.IS_EXTENSION"></git-settings>--\x3e\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-primary md-raised">\n        Save\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        Cancel\n      </md-button>\n    </md-dialog-actions>\n  </form>\n\n</md-dialog>\n'), n.put("scripts/dialogs/distractions/distractions-c.html", '<md-dialog aria-label="Distractions"\n           md-theme="vm.theme"\n           class="distractions">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>What is distracting you?</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n  <md-dialog-content>\n    <div class="md-dialog-content">\n\n      <h2 class="md-title"></h2>\n      <form ng-submit="vm.saveDistraction()">\n        <md-input-container class="md-block">\n        <textarea ng-model="vm.newDistraction"\n                  md-autofocus\n                  minlength="2"\n                  aria-label="What is distracting you? Write it down to save it for later!"\n                  autofocus></textarea>\n        </md-input-container>\n\n        <md-button type="button"\n                   ng-click="vm.cancel();"\n                   class="md-raised">\n          Nevermind\n        </md-button>\n        <md-button type="submit"\n                   class="md-raised md-primary">\n          Save it for later\n        </md-button>\n      </form>\n    </div>\n  </md-dialog-content>\n\n</md-dialog>\n'), n.put("scripts/dialogs/edit-global-link/edit-global-link-c.html", '<md-dialog aria-label="{{vm.editOrAddStr}} {{vm.getGlobalOrTaskStr()}}"\n           md-theme="vm.theme"\n           class="edit-global-link-dialog">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>{{vm.editOrAddStr}} {{vm.getGlobalOrTaskStr()}}</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.saveGlobalLink()">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <p ng-if="vm.selectedTask"><strong>Add link to task:<br>{{vm.selectedTask.title}}</strong><br><br></p>\n        <md-input-container class="md-block">\n          <label>Title</label>\n          <input type="text"\n                 ng-model="vm.linkCopy.title"\n                 md-auto-focus="true"\n                 tabindex="1"\n                 aria-label="Title">\n        </md-input-container>\n        <md-input-container class="md-block">\n          <label>\n            <span ng-if="vm.linkCopy.type ===\'LINK\' || !vm.linkCopy.type">Url</span>\n            <span ng-if="vm.linkCopy.type ===\'FILE\'">File Path</span>\n            <span ng-if="vm.linkCopy.type ===\'IMG\'">Image</span>\n            <span ng-if="vm.linkCopy.type ===\'COMMAND\'">Command</span>\n          </label>\n          <input type="text"\n                 ng-model="vm.linkCopy.path"\n                 required\n                 tabindex="1"\n                 aria-label="Path/Url">\n        </md-input-container>\n        <md-select ng-model="vm.linkCopy.type"\n                   required="true"\n                   tabindex="1"\n                   placeholder="Select a type">\n          <md-option ng-repeat="type in vm.types"\n                     ng-value="type.type"\n                     ng-bind="type.title">\n          </md-option>\n        </md-select>\n\n\n        <div class="custom-icon-wrapper">\n          <ng-md-icon ng-if="vm.linkCopy.customIcon"\n                      icon="{{vm.linkCopy.customIcon}}"></ng-md-icon>\n          <md-autocomplete tabindex="1"\n                           md-floating-label="Select custom icon (optional)"\n                           md-selected-item="vm.linkCopy.customIcon"\n                           md-search-text="vm.searchIconTxt"\n                           md-items="icon in vm.getFilteredIconSuggestions(vm.searchIconTxt)"\n                           md-item-text="icon"\n                           md-require-match="true"\n                           placeholder="Select custom icon">\n            <md-item-template>\n              <ng-md-icon icon="{{icon}}"></ng-md-icon>\n              <span md-highlight-text="vm.searchIconTxt"\n                    md-highlight-flags="i">{{icon}}</span>\n            </md-item-template>\n            <md-not-found>\n              No icon found\n            </md-not-found>\n          </md-autocomplete>\n        </div>\n\n        <div ng-if="vm.isNew">\n          <md-autocomplete\n            md-floating-label="Select task to add to (or leave empty to add to the global link list)."\n            md-selected-item="vm.selectedTask"\n            md-search-text="vm.searchTaskText"\n            md-items="task in vm.getFilteredTasks(vm.searchTaskText)"\n            md-item-text="task.title"\n            tabindex="1"\n            placeholder="Select task">\n            <md-item-template>\n          <span md-highlight-text="vm.searchTaskText"\n                md-highlight-flags="i">{{ task.title }}</span>\n            </md-item-template>\n            <md-not-found>\n              No task found\n            </md-not-found>\n          </md-autocomplete>\n        </div>\n      </div>\n    </md-dialog-content>\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-primary md-raised">\n        Save\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        Cancel\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/help/help-c.html", '<md-dialog aria-label="Help Dialog"\n           md-theme="vm.theme"\n           class="help-dialog">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>\n        <ng-md-icon icon="help_outline"></ng-md-icon>\n        Help (v{{vm.VERSION}})\n      </h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <md-dialog-content>\n    <div class="md-dialog-content"\n         ng-include="vm.helpTpl">\n\n    </div>\n  </md-dialog-content>\n\n\n  <md-dialog-actions>\n    <md-button ng-click="vm.cancel()"\n               type="button"\n               class="md-raised">\n      Close\n    </md-button>\n  </md-dialog-actions>\n</md-dialog>\n'), n.put("scripts/dialogs/help/help-daily-agenda.html", '<h3 class="md-title">Daily Agenda</h3>\n<p>The daily agenda view is meant to give you a rough overview of how your workday might look on a time scale.</p>\n\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>'), n.put("scripts/dialogs/help/help-daily-planner.html", '<h3 class="md-title">The daily planner view</h3>\n<p>This is the daily planner view. It\'s meant to help you organize your day in the morning before you start to work.</p>\n<p>You can <strong>add new tasks</strong>\n  <ng-md-icon icon="playlist_add"></ng-md-icon>\n  by entering the title you want for your task into the\n  <strong>input at the top</strong>. Pressing enter will add the task to your todays ToDo-list\n  <ng-md-icon icon="playlist_play"></ng-md-icon>\n  .\n</p>\n<p>If <strong>Jira integration</strong> is enabled (you can enable it on the <a class="md-accent"\n                                                                                ui-sref="settings">\n  <ng-md-icon icon="settings"></ng-md-icon>\n  settings</a> page) you can use the input the top also for importing tasks from Jira. Just enter the issue number or the issue summary and select the issue you from the auto suggestions. You can\n  <strong>identify a successfully imported Jira issue by the link icon\n    <ng-md-icon icon="link"></ng-md-icon>\n  </strong>\n  in the actions bar of the task.\n</p>\n<p>There is also a <strong>task backlog</strong>\n  <ng-md-icon icon="my_library_books"></ng-md-icon>\n  meant to store tasks for later use below the list for your todays tasks. You can move tasks via drag and drop between the two lists. Or use the globally\n  <a class="md-accent"\n     ui-sref="settings">\n    <ng-md-icon icon="settings"></ng-md-icon>\n    configurable keyboard shortcuts</a>.\n</p>\n\n<div ng-include="\'scripts/dialogs/help/help-task-list.html\'"></div>\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>\n'), n.put("scripts/dialogs/help/help-daily-summary.html", '<h3 class="md-title">Daily Summary</h3>\n<p>You find an overview of your day\'s work here. This include all tasks you worked on today and also a list of your distractions if you saved any. You can also export a list of your tasks.</p>\n<p>Once youre done reviewing click on the button below. This will move all finished tasks to your done backlog and close the app.</p>\n\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>\n'), n.put("scripts/dialogs/help/help-done-tasks-backlog.html", '<h3 class="md-title">Done tasks backlog</h3>\n<p>The done tasks backlog gives you an overview of all your done tasks.</p>\n\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>'), n.put("scripts/dialogs/help/help-global-link-list.html", '<h3 class="md-title">The global link lists</h3>\n<p>The global link list right under the navigation offers the ability to add links to your project. This can be done by clicking on the \'+\' button in the top left, via drag and drop or via pasting a previously copied link while the application has focus.</p>\n<p>Links can be edited and deleted via the buttons that appear when hovering over a link.</p>\n<p ng-if="vm.IS_ELECTRON">Files can also be linked as can custom commands (be careful with this!).</p>\n<p>Here\'s an example to see what everything does.</p>\n\n<div class="global-link-list-inner">\n  <div class="global-link">\n    <md-button class="md-raised md-icon-button md-primary md-hue-3"\n               md-whiteframe="1"\n               tabindex="1">\n      <md-tooltip>\n        Click here to add a new one\n      </md-tooltip>\n      <ng-md-icon icon="add"\n                  aria-label="add global link"></ng-md-icon>\n    </md-button>\n  </div>\n\n  <div class="global-link"\n       ng-repeat="link in vm.globalLinks"\n       draggable="false">\n    <md-button external-link\n               class="md-raised md-primary md-hue-2"\n               href="{{link.path}}"\n               type="{{link.type}}"\n               md-whiteframe="1"\n               target="_blank"\n               tabindex="1"\n               draggable="false"\n               aria-label="open global link">\n      <div>\n        <ng-md-icon icon="link"\n                    ng-if="!link.customIcon && link.type === \'LINK\'"\n                    aria-label="Open link"></ng-md-icon>\n        <ng-md-icon icon="insert_drive_file"\n                    ng-if="!link.customIcon && link.type === \'FILE\'"\n                    aria-label="Open file"></ng-md-icon>\n        <ng-md-icon icon="laptop_windows"\n                    ng-if="!link.customIcon && link.type === \'COMMAND\'"\n                    aria-label="Exec command"></ng-md-icon>\n        <ng-md-icon icon="{{link.customIcon}}"\n                    ng-if="link.customIcon"\n                    aria-label="Open"></ng-md-icon>\n\n        <span ng-bind="link.title"></span>\n      </div>\n      <md-tooltip>\n        Click to open link\n      </md-tooltip>\n    </md-button>\n\n    <div class="controls">\n      <md-button class="md-icon-button md-raised md-primary md-hue-3 edit-button">\n        <ng-md-icon icon="edit"\n                    aria-label="edit link"></ng-md-icon>\n        <md-tooltip>\n          Click here to edit\n        </md-tooltip>\n      </md-button>\n      <md-button class="md-icon-button md-raised md-warn md-hue-3 trash-button"\n                 aria-label="remove link">\n        <ng-md-icon icon="delete_forever"></ng-md-icon>\n        <md-tooltip>\n          Click here to delete\n        </md-tooltip>\n      </md-button>\n    </div>\n  </div>\n</div>\n'), n.put("scripts/dialogs/help/help-settings.html", '<h3 class="md-title">Settings page</h3>\n<p>Here you can configure a lot of stuff. Click the\n  <ng-md-icon icon="help_outline"></ng-md-icon>\n   icons to learn more about a configuration section.\n</p>\n\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>\n'), n.put("scripts/dialogs/help/help-task-list.html", '<h3 class="md-title">The task lists</h3>\n<p>The task list will be your main tool to organize yourself. You start a task and time tracking for it by clicking on the play icon. There can only be one task tracked at a time.</p>\n<p>You can <strong>order the tasks</strong> via drag and drop or move them up or down by pressing\n  <ng-md-icon icon="keyboard"></ng-md-icon>\n  <em ng-bind="::vm.keys.moveTaskUp"></em> or\n  <ng-md-icon icon="keyboard"></ng-md-icon>\n  <em ng-bind="::vm.keys.moveTaskDown "></em>\n</p>\n\n<p>There are also several other <strong>keyboard shortcuts</strong> available. Check them out in the\n  <a class="md-accent"\n     ui-sref="settings">\n    <ng-md-icon icon="settings"></ng-md-icon>\n    settings section</a>.\n</p>\n\n<p>Each tasks can have a number of\n  <strong>sub tasks</strong>. When a task has sub tasks it cannot be started by itself or have tracked time directly to it. This because time spent and time estimated are set by the sum of the sub tasks.\n</p>\n\n<h3 class="md-title">An interactive example task</h3>\n<p>Hover the different buttons, icons and sections to get the information what a thing does.</p>\n<ul class="task-list">\n  <li class="task"\n      tabindex="1"\n      md-whiteframe="1">\n\n    <div class="first-line"\n         layout="row"\n         layout-align="space-between center">\n      <md-button class="md-icon-button "\n                 aria-label="is updated"\n                 tabindex="2"\n                 ng-if="vm.exampleTask.isUpdated"\n                 ng-click="vm.exampleTask.showNotes = true;">\n        <md-tooltip>\n          If shown, it means that the task was updated on Jira or GitHub\n        </md-tooltip>\n        <ng-md-icon class="update update-icon"\n                    flex="none"\n                    icon="update"></ng-md-icon>\n      </md-button>\n\n      <ng-md-icon class="handle"\n                  flex="none"\n                  icon="drag_handle"></ng-md-icon>\n\n      <md-button class="md-icon-button play-btn"\n                 aria-label="mark as current"\n                 tabindex="2"\n                 ng-click="vm.isCurrent= !vm.isCurrent">\n        <md-tooltip>\n          Starts time tracking for the task and marks it as the current active task. Will only appear on the work view.\n        </md-tooltip>\n        <ng-md-icon icon="{{vm.isCurrent? \'pause_circle_filled\':\'play_circle_fill\'}}"\n                    aria-label="start task"></ng-md-icon>\n      </md-button>\n\n      <div class="title"\n           flex="auto"\n           layout="row"\n           layout-align="center center">\n        <md-tooltip>\n          Clicking on the task title will allow you to edit it\n        </md-tooltip>\n        <span class="text"\n              tabindex="2"\n              contenteditable="true"\n              ng-model="vm.exampleTask.title"\n              edit-on-click-ev-id="vm.exampleTask.id"\n              edit-on-click="vm.exampleTask.title"></span>\n      </div>\n\n      <div class="time">\n        <span ng-bind="vm.exampleTask.timeSpent|duration"></span> /\n        <span ng-bind="vm.exampleTask.timeEstimate|duration"></span>\n        <md-tooltip>\n          Time spent / time estimated\n        </md-tooltip>\n      </div>\n\n      <div class="controls">\n        <md-button class="md-icon-button"\n                   tabindex="2"\n                   ng-disabled="vm.exampleTask.subTasks.length>0"\n                   aria-label="time estimation">\n          <md-tooltip>\n            Opens a dialog for you to specify time spent and time estimated for the task\n          </md-tooltip>\n          <ng-md-icon icon="access_time"\n                      aria-label="time estimation"></ng-md-icon>\n        </md-button>\n        <md-button class="md-icon-button"\n                   aria-label="add sub task"\n                   tabindex="2">\n          <md-tooltip>\n            Adds a sub task for this task\n          </md-tooltip>\n          <ng-md-icon icon="playlist_add"\n                      aria-label="add sub task"></ng-md-icon>\n        </md-button>\n        <md-button class="md-icon-button"\n                   aria-label="notes"\n                   tabindex="2"\n                   ng-class="{\'is-active\':vm.exampleTask.showNotes}"\n                   ng-click="vm.exampleTask.showNotes=!vm.exampleTask.showNotes">\n          <md-tooltip>\n            Opens a note section for the task. Jira or GitHub comments are also shown here.\n          </md-tooltip>\n          <ng-md-icon icon="{{(vm.exampleTask.notes||vm.exampleTask.originalKey) ?\'insert_comment\': \'mode_comment\'}}"\n                      aria-label="notes"></ng-md-icon>\n        </md-button>\n        <md-button class="md-icon-button"\n                   aria-label="link"\n                   tabindex="2">\n          <md-tooltip>\n            Link to the original issue on Jira or GitHub. Only shown for Jira or GitHub tasks.\n          </md-tooltip>\n          <ng-md-icon icon="link"\n                      aria-label="link"></ng-md-icon>\n        </md-button>\n        <md-button class="md-icon-button"\n                   aria-label="delete"\n                   tabindex="2">\n\n          <md-tooltip>\n            Deletes the task and all its sub tasks\n          </md-tooltip>\n          <ng-md-icon icon="delete_forever"\n                      class="delete-icon"\n                      aria-label="delete"></ng-md-icon>\n        </md-button>\n        <span>\n          <md-tooltip>\n            Marks task as done/undone\n          </md-tooltip>\n          <md-checkbox ng-model="vm.exampleTask.isDone"\n                       tabindex="2"\n                       aria-label="un-/mark as done">\n          </md-checkbox>\n        </span>\n      </div>\n    </div>\n\n    <md-progress-linear md-mode="determinate"\n                        value="{{vm.exampleTask.progress}}"></md-progress-linear>\n\n    <div class="notes"\n         flex="100"\n         ng-if="vm.exampleTask.showNotes===true">\n\n      <section ng-if="vm.exampleTask.isUpdated;">\n        <md-tooltip>\n          Shows remote changes made on Jira or Github, when there have been some made.\n        </md-tooltip>\n        <div class="md-caption">\n          Changes since last update\n        </div>\n\n        <ul class="changelog">\n          <li ng-repeat="changelogEntry in vm.exampleTask.originalChangelog">\n            <div><em>[<span ng-bind="::changelogEntry.author"></span>]\n              <span ng-bind="::changelogEntry.created| amDateFormat:\'Y.MM.DD HH:mm\'"></span>: </em>\n            </div>\n            <div ng-repeat="change in changelogEntry.items">\n              <strong>"<span ng-bind="::change.field"></span>" changed to:</strong>\n              <span ng-bind="::change.toString"></span>\n            </div>\n          </li>\n        </ul>\n        <md-button class="md-raised"\n                   ng-click="vm.exampleTask.isUpdated=false;vm.exampleTask.originalChangelog=undefined;">\n          <ng-md-icon icon="delete"></ng-md-icon>\n          Hide changes\n        </md-button>\n      </section>\n\n      <section>\n        <div class="md-caption">Notes</div>\n        <div md-whiteframe="4">\n          <md-tooltip>\n            Notes section. Click to edit.\n          </md-tooltip>\n          <inline-markdown ng-model="vm.exampleTask.notes"></inline-markdown>\n        </div>\n      </section>\n\n      <section ng-if="vm.exampleTask.status || vm.exampleTask.originalStatus"\n               class="status">\n        <div class="md-caption">Status: <span ng-bind="vm.exampleTask.originalStatus.name"></span>\n          <ng-md-icon icon="arrow_forward"\n                      aria-label="arrow forward"></ng-md-icon>\n          <span ng-bind="vm.exampleTask.status"></span>\n        </div>\n      </section>\n\n      <section ng-if="vm.exampleTask.originalAttachment.length > 0">\n        <collapsible collapsible-title="Attachments ({{ ::vm.exampleTask.originalAttachment.length }})">\n          <ul class="attachments">\n            <li ng-repeat="attachment in vm.exampleTask.originalAttachment">\n              <a href="{{ ::attachment}}"\n                 external-link\n                 target="_blank"\n                 class="md-accent"\n                 ng-bind="::attachment"></a>\n              <a href="{{ ::attachment}}"\n                 download="{{ ::attachment}}"\n                 class="md-accent">\n                <ng-md-icon icon="file_download"\n                            aria-label="download file directly"></ng-md-icon>\n              </a>\n            </li>\n          </ul>\n        </collapsible>\n      </section>\n\n      <section ng-if="vm.exampleTask.originalComments.length > 0">\n        <collapsible collapsible-title="Comments ({{:: vm.exampleTask.originalComments.length }})">\n          <md-divider></md-divider>\n          <ul class="comments">\n            <li ng-repeat="comment in vm.exampleTask.originalComments"\n                class="comment">\n              <strong class="author">[<span ng-bind="::comment.author"></span>]: </strong>\n              <span marked="comment.body"></span>\n            </li>\n          </ul>\n        </collapsible>\n      </section>\n\n      <section ng-if="vm.exampleTask.localAttachments && vm.exampleTask.localAttachments.length">\n        <collapsible collapsible-title="Local attachments and links"\n                     is-initially-expanded="\'true\'">\n          <task-local-links local-links="vm.exampleTask.localAttachments"></task-local-links>\n        </collapsible>\n      </section>\n    </div>\n\n  </li>\n</ul>\n'), n.put("scripts/dialogs/help/help-time-tracking-history.html", '<h3 class="md-title">Time tracking history</h3>\n<p>The time tracking history gives you an overview over all tasks in your done backlog.</p>\n<p>You click on the\n  <ng-md-icon icon="list"></ng-md-icon>\n   icon to show the tasks worked on a specific day.\n</p>\n<p>Clicking on the\n  <ng-md-icon icon="call_made"></ng-md-icon>\n   icon will open an export dialog for the current month.\n</p>\n\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>\n'), n.put("scripts/dialogs/help/help-work-view.html", '<h3 class="md-title">The work view</h3>\n<p>This is the work view. It\'s meant to help you to keep track of what you have to do today and to enable you to easily track the time spent on different tasks.</p>\n<p>The page is divided into a list for your undone tasks\n  <ng-md-icon icon="playlist_play"></ng-md-icon>\n  and a list of you done tasks\n  <ng-md-icon icon="playlist_add_check"></ng-md-icon>\n  below. Tasks can be moved via drag and drop between the lists.\n</p>\n<p>Once you are done working for the day you can go to the daily summary page by clicking the \'Finish your work day\' button.</p>\n\n\n<div ng-include="\'scripts/dialogs/help/help-task-list.html\'"></div>\n<div ng-include="\'scripts/dialogs/help/help-global-link-list.html\'"></div>'), n.put("scripts/dialogs/jira-add-worklog/jira-add-worklog-c.html", '<md-dialog aria-label="Submit worklog to jira"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Submit worklog for "<span ng-bind="vm.taskCopy.originalKey"></span>"</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.addWorklog()"\n        novalidate\n        name="worklogForm">\n\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <p>Submit a worklog to Jira for "<span ng-bind="vm.taskCopy.title"></span>".</p>\n        <p>The current logged work amount on Jira is <strong ng-bind="vm.taskCopy.originalTimeSpent|duration"></strong>.</p>\n\n\n        \x3c!--<md-input-container class="md-block">--\x3e\n        \x3c!--<label>Started (date)</label>--\x3e\n        \x3c!--<md-datepicker ng-model="vm.taskCopy.started"--\x3e\n        \x3c!--required--\x3e\n        \x3c!--name="startedDate"--\x3e\n        \x3c!--md-placeholder="Enter date"></md-datepicker>--\x3e\n        \x3c!--<div class="validation-messages"--\x3e\n        \x3c!--ng-messages="worklogForm.startedDate.$error">--\x3e\n        \x3c!--<div ng-message="valid">The entered value is not a date!</div>--\x3e\n        \x3c!--<div ng-message="required">This date is required!</div>--\x3e\n        \x3c!--</div>--\x3e\n        \x3c!--</md-input-container>--\x3e\n\n\n        <md-input-container class="md-block">\n          <ng-md-icon icon="event"></ng-md-icon>\n          <input type="date"\n                 ng-model="vm.taskCopy.started"\n                 required\n                 name="startedDate"\n                 placeholder="Started (date)">\n          <div class="validation-messages"\n               ng-messages="worklogForm.startedDate.$error">\n            <div ng-message="valid">The entered value is not a date!</div>\n            <div ng-message="required">This date is required!</div>\n          </div>\n        </md-input-container>\n\n        <md-input-container class="md-block">\n          <ng-md-icon icon="access_time"></ng-md-icon>\n          <input type="time"\n                 required\n                 name="startedTime"\n                 ng-model="vm.taskCopy.started"\n                 placeholder="Started (time)">\n          <div class="validation-messages"\n               ng-messages="worklogForm.startedTime.$error">\n            <div ng-message="required">This is required!</div>\n          </div>\n        </md-input-container>\n\n\n        <md-input-container class="md-block">\n          <ng-md-icon icon="timer"></ng-md-icon>\n          <input type="text"\n                 required\n                 name="timeSpent"\n                 placeholder="Time spent"\n                 input-duration\n                 min-duration="1m"\n                 ng-model="vm.taskCopy.timeSpent">\n          <div class="hint">Current Jira values is <span ng-bind="vm.taskCopy.originalTimeSpent|duration"></span></div>\n          <div class="validation-messages"\n               ng-messages="worklogForm.timeSpent.$error">\n            <div ng-message="required">This is required!</div>\n          </div>\n        </md-input-container>\n\n        <md-input-container class="md-block">\n          <label>Coment</label>\n          <textarea ng-model="vm.comment"></textarea>\n        </md-input-container>\n\n        \x3c!--<md-switch ng-model="vm.isUpdateLocalTaskSettings"--\x3e\n        \x3c!--aria-label="Update local task with values entered here">--\x3e\n        \x3c!--Update local task with values entered here--\x3e\n        \x3c!--</md-switch>--\x3e\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 aria-label="Submit"\n                 class="md-raised md-primary">\n        Add worklog on Jira\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 aria-label="Camcel"\n                 class="md-raised">\n        Cancel\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/jira-assign-ticket/jira-assign-ticket-c.html", '<md-dialog aria-label="Submit worklog to jira"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Assign task "<span ng-bind="vm.task.originalKey"></span>"</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.assignTicket()"\n        novalidate\n        name="worklogForm">\n\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <p>The ticket is currently <strong ng-if="!vm.task.originalAssigneeKey">unassigned</strong>\n          <span ng-if="vm.task.originalAssigneeKey"> assigned to\n          <strong ng-bind="vm.task.originalAssigneeKey"></strong></span>. Do you want to assign it to yourself?</p>\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 aria-label="Submit"\n                 class="md-raised md-primary">\n        Assign to myself\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 aria-label="Camcel"\n                 class="md-raised">\n        Don\'t start ticket\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>'), n.put("scripts/dialogs/jira-set-status/jira-set-status-c.html", '<md-dialog aria-label="Jira Set Status Dialog"\n           md-theme="vm.theme">\n\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Update Jira status for <span ng-bind="vm.task.originalKey"></span></h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.updateTask(vm.chosenTransitionIndex)">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <p>\n          <span ng-if="vm.localType===\'OPEN\'">\n            <strong>Open</strong>: You stopped working on a task.\n          </span>\n          <span ng-if="vm.localType===\'IN_PROGRESS\'">\n            <strong>In progress</strong>: You started to work on a task.\n          </span>\n          <span ng-if="vm.localType===\'DONE\'">\n            <strong>Done</strong>: You completed a task.\n          </span>\n        </p>\n        <p>\n          Do you want to update the task \'<strong ng-bind="vm.task.title"></strong>\' on Jira?\n        </p>\n\n        <h2 class="md-subhead">Move to:</h2>\n        <md-radio-group ng-model="vm.chosenTransitionIndex">\n          <md-radio-button\n            ng-value="$index"\n            ng-repeat="transition in vm.transitions"\n            class="md-primary">{{transition.name}}\n          </md-radio-button>\n        </md-radio-group>\n\n        <md-checkbox md-no-ink\n                     ng-model="vm.saveAsDefaultAction"\n                     aria-label="save as default action">\n          Make <strong ng-bind="vm.transitions[vm.chosenTransitionIndex].name"></strong> the default action for setting a task to\n          <strong ng-if="vm.localType===\'OPEN\'">open</strong>\n          <strong ng-if="vm.localType===\'IN_PROGRESS\'">in progress</strong>\n          <strong ng-if="vm.localType===\'DONE\'">done</strong>.\n          This will be set then always, when a task is changed to\n          <strong ng-if="vm.localType===\'OPEN\'">open</strong>\n          <strong ng-if="vm.localType===\'IN_PROGRESS\'">in progress</strong>\n          <strong ng-if="vm.localType===\'DONE\'">done</strong>. You can change this later in the project settings.\n        </md-checkbox>\n\n        <div>\n          <label class="md-caption">Assign issue to another user, (leave empty to leave it assigned to current user)</label>\n          <md-autocomplete md-selected-item="vm.userToAssign"\n                           md-require-match="true"\n                           md-search-text="vm.userSearchText"\n                           md-items="userKey in vm.userQuery(vm.userSearchText)">\n            <md-item-template>\n              <span md-highlight-text="vm.userSearchText"\n                    ng-bind="userKey"></span>\n            </md-item-template>\n          </md-autocomplete>\n        </div>\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-raised md-primary">\n        Update Task on Jira\n      </md-button>\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        Cancel\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/notes/notes-c.html", '<md-dialog aria-label="Notes"\n           class="notes-dialog fullscreen-dialog"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Notes for <span ng-bind="vm.r.currentProject.title || \'Project\'"></span></h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n  <md-dialog-content md-scroll-y\n                     layout="column"\n                     style="position: relative;"\n                     flex>\n    \x3c!--<inline-markdown ng-model="vm.r.note"></inline-markdown>--\x3e\n    <md-input-container class="md-block">\n    <textarea ng-model="vm.r.note"\n              aria-label="Note"\n              id="notes-textarea"\n              md-autofocus\n              autofocus></textarea>\n    </md-input-container>\n  </md-dialog-content>\n\n</md-dialog>\n'), n.put("scripts/dialogs/pomodoro-break/pomodoro-break-c.html", '<md-dialog aria-label="Pomodoro Break"\n           class="pomodoro-break-dialog"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>\n        <ng-md-icon icon="free_breakfast"></ng-md-icon>\n        Take a break\n      </h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n  <md-dialog-content md-scroll-y\n                     layout="column"\n                     style="position: relative;"\n                     flex>\n    <div class="md-dialog-content">\n      <div ng-if="!vm.isBreakDone">\n        <p>You successfully finished session\n          <strong ng-bind="vm.pomodoroData.currentCycle"></strong>! Enjoy yourself, get yourself moving, come back in:\n        </p>\n      </div>\n\n      <div ng-if="vm.isBreakDone">\n        <p>You\'re break is done!</p>\n      </div>\n\n\n      <div class="timer"\n           ng-bind="(vm.pomodoroData.currentSessionTime | date:\'mm:ss\')"></div>\n\n      <section class="distractions"\n               ng-if="vm.isShowDistractionsOnBreak">\n\n        <distraction-list></distraction-list>\n      </section>\n    </div>\n\n    <md-dialog-actions>\n      <md-button ng-click="vm.continue()"\n                 class="md-primary md-raised">\n        <span ng-if="!vm.isBreakDone">But I want to work (skip break)!!</span>\n        <span ng-if="vm.isBreakDone">Go back to work!</span>\n      </md-button>\n      <md-button class="md-raised"\n                 ng-click="vm.cancel()">\n        Hide me\n      </md-button>\n    </md-dialog-actions>\n  </md-dialog-content>\n\n</md-dialog>\n'), n.put("scripts/dialogs/simple-task-summary/simple-task-summary-c.html", '<md-dialog aria-label="Task list export"\n           class="dialog-simple-task-summary"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Task List Export</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.copyToClippboard()">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n\n        <textarea ng-model="vm.tasksTxt"\n                  rows="10"\n                  id="task-textarea"\n                  md-whiteframe="2"\n                  class="simple-textarea"></textarea>\n\n\n        <section class="options">\n          <div layout-gt-xs="row">\n            <div flex-gt-xs="50">\n              <div class="md-caption"\n                   style="margin: 10px 0;">Options\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.isUseNewLine"\n                           aria-label="Add new line">\n                  Add new line after task\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.isListSubTasks"\n                           aria-label="List sub tasks">\n                  List sub tasks\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.isWorkedOnTodayOnly"\n                           aria-label="List worked on today tasks only">\n                  List worked on today tasks only\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.isListDoneOnly"\n                           aria-label="List done tasks only">\n                  List done tasks only\n                </md-switch>\n              </div>\n              <md-input-container class="md-block">\n                <label>Separate tasks by</label>\n                <input type="text"\n                       ng-model="vm.options.separateBy">\n              </md-input-container>\n            </div>\n\n            <div flex-gt-xs="50">\n              <div class="md-caption"\n                   style="margin: 10px 0;">Fields to display\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.showTitle"\n                           aria-label="Title">\n                  Title\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.showDate"\n                           aria-label="Date">\n                  Date\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.showTimeSpent"\n                           aria-label="Time Spent">\n                  Time Spent\n                </md-switch>\n              </div>\n              <div>\n                <md-switch ng-model="vm.options.isTimeSpentAsMilliseconds"\n                           ng-disabled="!vm.options.showTimeSpent"\n                           aria-label="Show time spent as milliseconds">\n                  Time Spent in milliseconds\n                </md-switch>\n              </div>\n              <md-input-container class="md-block">\n                <label>Separate fields by</label>\n                <input type="text"\n                       ng-model="vm.options.separateFieldsBy">\n              </md-input-container>\n            </div>\n          </div>\n\n          <div flex-gt-xs="100">\n            <md-input-container class="md-block">\n              <label>Regular Expression to remove</label>\n              <input type="text"\n                     ng-model="vm.options.regExToRemove"\n                     ng-model-options="{ debounce: 50 }">\n              <div class="validation-messages">\n                <div ng-if="vm.isInvalidRegEx"\n                     class="error">Invalid Regular Expression\n                </div>\n              </div>\n            </md-input-container>\n          </div>\n        </section>\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n      <md-button class="md-raised md-primary"\n                 ng-show="vm.finishDayFn"\n                 ng-click="vm.cancel();vm.finishDayFn()">\n        <ng-md-icon icon="wb_sunny"></ng-md-icon>\n        Clear Done and go home\n      </md-button>\n      <md-button class="md-primary md-raised"\n                 id="clipboard-btn"\n                 data-clipboard-action="copy"\n                 data-clipboard-target="#task-textarea">\n        <ng-md-icon icon="content_paste"></ng-md-icon>\n        Copy to clipboard\n      </md-button>\n      <a class="md-button md-primary md-raised"\n         text-to-file-download="vm.tasksTxt">\n        <ng-md-icon icon="file_download"></ng-md-icon>\n        Save to file\n      </a>\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        <ng-md-icon icon="close"></ng-md-icon>\n        Close\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/task-selection/task-selection-c.html", '<md-dialog aria-label="Time estimation dialog"\n           class="dialog-task-selection"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Select a task</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.submit()">\n\n    <md-dialog-content>\n      <div class="md-dialog-content">\n\n        <section ng-if="!vm.isShowTaskCreationForm">\n          <p>Select the task you want to work on next or just press enter to work on</p><p>\n          <strong ng-bind="vm.undoneTasks[0].title"></strong></p>\n\n          <md-autocomplete\n            md-selected-item="vm.selectedTask"\n            md-search-text="vm.searchText"\n            md-items="task in vm.getFilteredUndoneTasks(vm.searchText)"\n            md-item-text="task.title"\n            md-input-minlength="0"\n            md-require-match="true"\n            md-autofocus="true"\n            md-autoselect\n            placeholder="Select a task to start with">\n            <md-item-template>\n              <span md-highlight-text="vm.searchText">{{ task.title }}</span>\n            </md-item-template>\n            <md-not-found>\n              No states matching "<span ng-bind="vm.searchText"></span>" were found.\n              <a ng-click="vm.newState(vm.searchText)">Create a new one!</a>\n            </md-not-found>\n          </md-autocomplete>\n        </section>\n\n\n        <section ng-if="vm.isShowTaskCreationForm">\n          <p><strong>No tasks created for today\'s list. Please create a new one.</strong></p>\n          <md-input-container class="md-block">\n            <label>Task Name</label>\n            <input type="text"\n                   ng-model="vm.newTask.title"\n                   md-auto-focus\n                   required\n                   aria-label="Title">\n          </md-input-container>\n\n          <md-input-container class="md-icon-float md-block">\n            <ng-md-icon icon="access_time"\n                        aria-label="Estimated Durations"></ng-md-icon>\n            <label>Estimated Duration</label>\n\n            <input type="text"\n                   input-duration="optional"\n                   ng-model="vm.newTask.timeEstimate"\n                   aria-label="Estimated Durations">\n          </md-input-container>\n\n          <md-input-container class="md-block">\n            <label>Notes</label>\n\n            <textarea ng-model="vm.newTask.notes"\n                      aria-label="Notes"></textarea>\n          </md-input-container>\n        </section>\n      </div>\n    </md-dialog-content>\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-primary md-raised">\n        Go go go!\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>'), n.put("scripts/dialogs/time-estimate/time-estimate-c.html", '<md-dialog aria-label="Time estimation and time spent dialog"\n           class="dialog-time-estimate"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Estimate time / adjust time spent</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <md-dialog-content>\n    <div class="md-dialog-content">\n\n      <form ng-submit="vm.submit(vm.timeEstimate, vm.timeSpent)">\n        <div class="time-estimate-spent-wrapper">\n          <duration-input-slider ng-model="vm.timeEstimate"\n                                 label="Estimated Duration"></duration-input-slider>\n\n          <duration-input-slider ng-model="vm.timeSpentOnDayCopy[vm.todayStr]"\n                                 label="Time Spent Today"></duration-input-slider>\n        </div>\n\n        <div><strong>Progress</strong></div>\n        <div class="progress-bar-wrapper">\n          <progress-bar progress="vm.progress"\n                        mdx-paint-bg="primary"></progress-bar>\n        </div>\n\n        <collapsible collapsible-title="Time Spent on other days ({{vm.timeSpentOnOtherDaysTotal|duration}})">\n          <div>\n            <div class="time-spend-on-days-wrapper"\n                 ng-repeat="(strDate,timeSpent) in vm.timeSpentOnDayCopy"\n                 ng-if="vm.todayStr !== strDate">\n              <div class="inner-wrapper">\n                <label><strong ng-bind="strDate"></strong></label>\n                <duration-input-slider ng-model="vm.timeSpentOnDayCopy[strDate]"></duration-input-slider>\n                <md-button class="md-raised md-icon-button md-accent"\n                           aria-label="Delete"\n                           ng-click="vm.deleteValue(strDate)">\n                  <ng-md-icon icon="delete_forever"></ng-md-icon>\n                </md-button>\n              </div>\n            </div>\n          </div>\n\n          <md-button type="button"\n                     class="md-raised md-primary"\n                     aria-label="add for another day"\n                     ng-hide="vm.showAddForAnotherDayForm"\n                     ng-click="vm.showAddForAnotherDayForm = true;">\n            <ng-md-icon icon="add"></ng-md-icon>\n            add for another day\n          </md-button>\n        </collapsible>\n        <button type="submit"\n                style="width: 0;height: 0; font-size: 0;border: 0;background: transparent;"\n                tabindex="-1"></button>\n      </form>\n\n\n      <form name="addForAnotherDayForm"\n            ng-if="vm.showAddForAnotherDayForm"\n            ng-submit="vm.addNewEntry(vm.newEntry)">\n        <h3 class="md-caption">Add new entry <span ng-bind="vm.newEntry.date|amDateFormat:\'DD-MM-YYYY\'"></span></h3>\n        <md-input-container class="md-block">\n          <ng-md-icon icon="event"></ng-md-icon>\n          <input type="date"\n                 ng-model="vm.newEntry.date"\n                 required\n                 name="date"\n                 placeholder="Date for new entry">\n          <div class="validation-messages"\n               ng-messages="addForAnotherDayForm.date.$error">\n            <div ng-message="valid">The entered value is not a date!</div>\n            <div ng-message="required">This date is required!</div>\n          </div>\n        </md-input-container>\n        <md-input-container class="md-icon-float md-block">\n          <ng-md-icon icon="timer"\n                      aria-label="Time Spent on new entry"></ng-md-icon>\n          <label>Time Spent on <span ng-bind="vm.newEntry.date|amDateFormat:\'DD-MM-YYYY\'"></span></label>\n          <input type="text"\n                 input-duration="optional"\n                 ng-model="vm.newEntry.timeSpent"\n                 aria-label="Time Spent for new entry">\n        </md-input-container>\n\n        <md-button class="md-raised"\n                   type="submit">\n          <ng-md-icon icon="add"></ng-md-icon>\n          Add\n        </md-button>\n      </form>\n\n\n      <div class="side-info">\n        Examples:<br>\n        30m => 30 minutes<br>\n        2h 30m => 2 hours and 30 minutes\n      </div>\n\n    </div>\n  </md-dialog-content>\n\n\n  <md-dialog-actions>\n    <md-button type="submit"\n               ng-click="vm.submit(vm.timeEstimate, vm.timeSpent)"\n               class="md-primary md-raised">\n      Save\n    </md-button>\n    <md-button ng-click="vm.cancel()"\n               type="button"\n               class="md-raised">\n      Cancel\n    </md-button>\n  </md-dialog-actions>\n</md-dialog>\n'), n.put("scripts/dialogs/time-sheet-export/time-sheet-export-c.html", '<md-dialog aria-label="Task list export"\n           class="dialog-time-sheet-export fullscreen-dialog"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Time Sheet Export</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.save()">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <collapsible class="help-collapsible"\n                     collapsible-title="What is this and how does it work?"\n                     is-initially-expanded="{{(vm.opts.spreadsheetId ? \'\':\'true\')}}">\n          <div class="info">\n            <p>This view allows you to export your worked time to a google sheet. You need to allow for your Google Spreadsheets to be accessed by Super Productivity. You also need to create a spreadsheet with a headings in the first row nad specify it\'s ID in the input field (<a external-link\n                                                                                                                                                                                                                                                                                         target="_blank"\n                                                                                                                                                                                                                                                                                         href="https://stackoverflow.com/questions/36061433/how-to-do-i-locate-a-google-spreadsheet-id">Ho to find the id of a spreadsheet?</a>).\n            </p>\n            <p>After successfully loading your spreadsheet a table will show up with 4 rows. The first row shows the heading you specified in the spreadsheet itself.</p>\n            <p>The second row is for informational purposes and shows the last row from the spreadsheet.</p>\n            <p>The forth row is a list of values you can directly enter save to the spreadsheet.</p>\n            <p>The third row is there to automatically define some values for the forth row. There are several special strings you can enter into the cells:</p>\n          </div>\n\n          <dl class="possible-properties">\n            <dt>{startTime}</dt>\n            <dd>The time when you first used this app today. It\'s possible to round this via the options.</dd>\n\n            <dt>{currentTime}</dt>\n            <dd>The current time. Could be used for the for the end time of todays working day It\'s possible to round this via the options.</dd>\n\n            <dt>{date}</dt>\n            <dd>Todays date in standard format (mm/dd/yyyy)</dd>\n\n            <dt>{date:DD/MM/YYYY} (example)</dt>\n            <dd>Date with a custom date format string.</dd>\n\n            <dt>{taskTitles}</dt>\n            <dd>Comma separated (parent) task titles</dd>\n\n            <dt>{subTaskTitles}</dt>\n            <dd>Comma separated sub task titles</dd>\n\n            <dt>{totalTime}</dt>\n            <dd>The total time you spend working on your todays tasks.</dd>\n          </dl>\n\n          <p>In addition to this there are several options you can use to modify the calculation of those values.</p>\n        </collapsible>\n\n        <collapsible collapsible-title="Options"\n                     class="options-collapsible"\n                     is-initially-expanded="{{(vm.opts.spreadsheetId ? \'\':\'true\')}}">\n          <md-switch ng-model="vm.opts.isAutoLogin">Auto-login and load data next time</md-switch>\n          \x3c!--<md-switch ng-model="vm.opts.isAutoFocusEmpty">Auto-focus first empty field after loading table headings</md-switch>--\x3e\n          <md-switch ng-model="vm.opts.isRoundWorkTimeUp"\n                     ng-change="vm.updateDefaults()">Always round work time up\n          </md-switch>\n          <md-input-container>\n            <label>Round start time to</label>\n            <md-select ng-change="vm.updateDefaults()"\n                       ng-model="vm.opts.roundStartTimeTo">\n              <md-option><em>don\'t round</em></md-option>\n              <md-option ng-repeat="roundOption in vm.roundTimeOptions"\n                         ng-value="roundOption.id">\n                {{roundOption.title}}\n              </md-option>\n            </md-select>\n          </md-input-container>\n\n          <md-input-container>\n            <label>Round end time to</label>\n            <md-select ng-change="vm.updateDefaults()"\n                       ng-model="vm.opts.roundEndTimeTo">\n              <md-option><em>don\'t round</em></md-option>\n              <md-option ng-repeat="roundOption in vm.roundTimeOptions"\n                         ng-value="roundOption.id">\n                {{roundOption.title}}\n              </md-option>\n            </md-select>\n          </md-input-container>\n\n          <md-input-container>\n            <label>Round time worked to</label>\n            <md-select ng-change="vm.updateDefaults()"\n                       ng-model="vm.opts.roundWorkTimeTo">\n              <md-option><em>don\'t round</em></md-option>\n              <md-option ng-repeat="roundOption in vm.roundTimeOptions"\n                         ng-value="roundOption.id">\n                {{roundOption.title}}\n              </md-option>\n            </md-select>\n          </md-input-container>\n        </collapsible>\n\n        <div>\n          <md-button class="md-raised md-primary"\n                     promise-btn\n                     ng-show="!vm.GoogleApi.isLoggedIn"\n                     ng-click="vm.login()">Login\n          </md-button>\n          <md-button class="md-raised md-primary"\n                     promise-btn\n                     ng-show="vm.GoogleApi.isLoggedIn"\n                     ng-click="vm.logout()">Logout\n          </md-button>\n          <md-button class="md-raised md-primary"\n                     promise-btn\n                     ng-disabled="!vm.opts.spreadsheetId"\n                     ng-show="vm.GoogleApi.isLoggedIn"\n                     ng-click="vm.readSpreadsheet()">Read spreadsheet\n          </md-button>\n          <md-button class="md-raised md-primary"\n                     ng-show="vm.GoogleApi.isLoggedIn"\n                     external-link\n                     target="_blank"\n                     href="https://myaccount.google.com/permissions">Revoke permissions\n          </md-button>\n          <md-button class="md-raised md-primary"\n                     external-link\n                     target="_blank"\n                     ng-show="vm.GoogleApi.isLoggedIn && vm.opts.spreadsheetId"\n                     ng-href="https://docs.google.com/spreadsheets/d/{{vm.opts.spreadsheetId}}">Edit spreadsheet\n          </md-button>\n        </div>\n\n\n        <div layout="row"\n             class="loading-spinner"\n             layout-sm="column"\n             layout-align="space-around"\n             ng-show="vm.isLoading && !vm.GoogleApi.isLoggedIn">\n          <md-progress-circular md-mode="indeterminate"></md-progress-circular>\n        </div>\n\n        <section ng-show="vm.GoogleApi.isLoggedIn">\n          <md-input-container class="md-block">\n            <label>Spreadsheet ID</label>\n            <input type="text"\n                   ng-model="vm.opts.spreadsheetId">\n          </md-input-container>\n\n          <div layout="row"\n               class="loading-spinner"\n               layout-sm="column"\n               layout-align="space-around"\n               ng-show="vm.isLoading && vm.GoogleApi.isLoggedIn">\n            <md-progress-circular md-mode="indeterminate"></md-progress-circular>\n          </div>\n\n          <table class="export-input-table"\n                 ng-show="vm.headings">\n            <tr>\n              <th></th>\n              <th class="heading"\n                  ng-repeat="heading in vm.headings track by $index"\n                  ng-bind="heading"></th>\n            </tr>\n            <tr>\n              <th>Last saved row</th>\n              <td ng-repeat="col in vm.lastRow track by $index">{{col}}</td>\n            </tr>\n            <tr>\n              <th>Default</th>\n              <td class="default"\n                  ng-repeat="(i,heading) in vm.headings track by $index">\n                <input type="text"\n                       ng-change="vm.updateDefaults()"\n                       ng-model="vm.opts.defaultValues[i]">\n              </td>\n            </tr>\n            <tr>\n              <th>Actual</th>\n              <td class="actual"\n                  ng-repeat="(i,heading) in vm.headings track by $index">\n                <input type="text"\n                       ng-model="vm.actualValues[i]">\n              </td>\n            </tr>\n          </table>\n        </section>\n      </div>\n    </md-dialog-content>\n\n\n    <md-dialog-actions>\n\n      <md-button ng-click="vm.save()"\n                 ng-show="vm.actualValues.length > 0 &&  vm.GoogleApi.isLoggedIn"\n                 type="button"\n                 class="md-raised md-primary"\n                 promise-btn>\n        <ng-md-icon icon="save"></ng-md-icon>\n        Save row\n      </md-button>\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        <ng-md-icon icon="close"></ng-md-icon>\n        Close\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>\n'), n.put("scripts/dialogs/was-idle/was-idle-c.html", '<md-dialog aria-label="Was Idle Dialog"\n           class="was-idle-dialog"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Glad you\'re back!</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <form ng-submit="vm.trackIdleToTask(false)">\n    <md-dialog-content>\n      <div class="md-dialog-content">\n\n        <p>You have been idle for <strong ng-bind="vm.idleTime"></strong>.\n        </p>\n        <p>Select the task you want to track the time for, or just press cancel if you don\'t want to track the time.</p>\n\n        <md-autocomplete\n          required\n          md-selected-item="vm.selectedTask"\n          md-search-text="vm.searchText"\n          md-items="task in vm.getFilteredUndoneTasks(vm.searchText)"\n          md-item-text="task.title"\n          md-input-minlength="0"\n          placeholder="Select a task to track the time">\n          <md-item-template>\n          <span md-highlight-text="vm.searchText"\n                md-highlight-flags="i"\n                ng-bind="task.title"></span>\n          </md-item-template>\n          <md-not-found>\n            No states matching "<span ng-bind="vm.searchText"></span>" were found.\n            <a ng-click="vm.newState(vm.searchText)">Create a new one!</a>\n          </md-not-found>\n        </md-autocomplete>\n\n      </div>\n    </md-dialog-content>\n\n    <md-dialog-actions>\n      <md-button type="submit"\n                 class="md-primary md-raised">\n        Track\n      </md-button>\n\n      <md-button ng-click="vm.trackIdleToTask(true)"\n                 ng-if="vm.isShowTrackButResetTakeABreakTimer"\n                 type="button"\n                 class="md-primary md-raised">\n        Track but reset break timer\n      </md-button>\n\n      <md-button ng-click="vm.cancel()"\n                 type="button"\n                 class="md-raised">\n        Don\'t track\n      </md-button>\n    </md-dialog-actions>\n  </form>\n\n</md-dialog>\n'), n.put("scripts/dialogs/welcome/welcome-c.html", '<md-dialog aria-label="Welcome Dialog"\n           class="welcome-dialog"\n           md-theme="vm.theme">\n  <md-toolbar>\n    <div class="md-toolbar-tools">\n      <h2>Welcome to Super Productivity!</h2>\n      <span flex></span>\n      <md-button class="md-icon-button"\n                 aria-label="Cancel"\n                 ng-click="vm.cancel()">\n        <ng-md-icon icon="close"></ng-md-icon>\n      </md-button>\n    </div>\n  </md-toolbar>\n\n  <md-dialog-content>\n    <div class="md-dialog-content">\n      <p>Happy to see you try out Super Productivity!</p>\n      <p>After familiarizing you with the basic functionality, you might want head over to\n        <a ui-sref="settings"\n           ng-click="vm.cancel()"\n           class="md-accent">\n          <ng-md-icon icon="settings"></ng-md-icon>\n          the settings</a> to adjust everything to your personal needs<span ng-if="vm.IS_ELECTRON"> and to set up the Jira integration</span>. You can find them under the cog icon in the upper right.\n      </p>\n      <p>If you need it there is also <a ng-click="vm.openHelp($event)"\n                                         href="#"\n                                         class="md-accent">\n        <ng-md-icon icon="help_outline"></ng-md-icon>\n        help</a> on every page.\n      </p>\n      <p>Enjoy yourself!</p>\n\n      <md-switch ng-model="vm.isHideDialog"\n                 ng-change="vm.hideDialogChange(vm.isHideDialog)"\n                 aria-label="Don\'t show this dialog at startup any more">\n        Don\'t show this dialog at startup any more\n      </md-switch>\n    </div>\n  </md-dialog-content>\n\n\n  <md-dialog-actions>\n    <md-button ng-click="vm.cancel()"\n               type="button"\n               class="md-raised">\n      Dismiss\n    </md-button>\n  </md-dialog-actions>\n</md-dialog>\n'), n.put("scripts/routes/settings/settings-c.html", '<div class="page-settings">\n\n  <div layout-gt-sm="row">\n    <div flex-gt-sm="50"\n         class="settings-col">\n      <h1 class="md-subhead">Global Settings</h1>\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Projects"\n                     icon="work">\n          <project-settings all-projects="vm.allProjects"\n                            selected-current-project="vm.selectedCurrentProject"></project-settings>\n        </collapsible>\n      </section>\n\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Backup and Sync"\n                     icon="swap_vert">\n\n          <backup-settings settings="r.config"></backup-settings>\n        </collapsible>\n      </section>\n\n\n      <section class="config-section keyboard-settings"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Keyboard Shortcuts"\n                     icon="keyboard">\n\n          <keyboard-settings keys="r.keys"></keyboard-settings>\n        </collapsible>\n      </section>\n\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Misc Settings"\n                     icon="settings">\n\n          <misc-settings settings="r.config"></misc-settings>\n        </collapsible>\n      </section>\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Pomodoro Timer"\n                     icon="add_alert">\n          <pomodoro-settings settings="r.config.pomodoro"></pomodoro-settings>\n        </collapsible>\n      </section>\n    </div>\n\n    <div flex-gt-sm="50"\n         class="settings-col">\n\n      <h1 class="md-subhead">Project Specific Settings</h1>\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Theme Settings"\n                     icon="color_lens">\n          <theme-settings current-theme="r.theme"\n                          is-current-project-theme="true"></theme-settings>\n        </collapsible>\n      </section>\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Jira-Integration">\n\n          <jira-settings settings="r.jiraSettings"></jira-settings>\n        </collapsible>\n      </section>\n\n\n      <section class="config-section"\n               md-whiteframe="2">\n        <collapsible collapsible-title="Git Integration"\n                     icon="github-circle">\n\n          <git-settings settings="r.git"></git-settings>\n        </collapsible>\n      </section>\n    </div>\n  </div>\n</div>\n'), n.put("scripts/settings/backup-settings/backup-settings-d.html", '<help-section>\n  <p>Here you can export all your data as a\n    <strong>JSON</strong> for backups, but also to use it in a different context (e.g. you might want to export your projects in the browser and import them into the desktop version).\n  </p>\n  <p>The import expects valid JSON to be copied into the text area.\n    <strong>NOTE: Once you hit the import button all your current settings and data will be overwritten!</strong></p>\n\n  <section ng-if="vm.IS_ELECTRON">\n    <p>There is also the option to do\n      <strong>automatic backups</strong>. You can choose an interval in seconds of how often the backup should occur and a custom destination to where the backup should be saved. You can use `{unix}` and `{date}` inside the path string to add output a unix timestamp or a date at this location of the string. E.g. `/mypath/{date}.json` will save your data to `/mypath/2017-12-12.json.\n    </p>\n  </section>\n</help-section>\n\n<section>\n  <h3 class="md-subtitle">File import/export</h3>\n  <a class="md-raised md-button md-ink-ripple"\n     type="button"\n     download-backup>\n    <ng-md-icon icon="file_download"\n                aria-label="download settings"></ng-md-icon>\n    Export your tasks and settings\n    <div class="md-ripple-container"></div>\n  </a>\n  <md-button\n    class="md-raised"\n    ng-click="vm.showUploadForm=!vm.showUploadForm;">\n    <ng-md-icon icon="file_upload"\n                aria-label="import settings"></ng-md-icon>\n    Import Settings\n  </md-button>\n\n  <form ng-if="vm.showUploadForm"\n        ng-submit="vm.importSettings(vm.uploadSettingsTextarea)">\n    <md-input-container class="md-block"\n                        flex-gt-sm>\n      <label>Copy and paste the contents of the saved JSON file here</label>\n      <textarea ng-model="vm.uploadSettingsTextarea"\n                md-auto-focus\n                rows="3"></textarea>\n    </md-input-container>\n\n    <div><strong>NOTE: Once you hit the import button all your current settings and data will be overwritten!</strong>\n    </div>\n\n    <md-button type="submit"\n               class="md-raised md-primary">Import settings\n    </md-button>\n  </form>\n</section>\n\n<section>\n  <h3 class="md-subtitle">Sync via Google Drive</h3>\n\n  <md-switch ng-model="vm.settings.googleDriveSync.isEnabled"\n             ng-change="vm.onGoogleDriveSyncToggle(vm.settings.googleDriveSync.isEnabled)"\n             aria-label="Enable syncing via Google Drive">\n    Enable syncing via Google Drive\n  </md-switch>\n\n  <div ng-if="vm.settings.googleDriveSync.isEnabled"\n       class="ani-expand-collapse">\n    <div>\n      <md-button class="md-raised"\n                 promise-btn\n                 ng-show="!vm.GoogleApi.isLoggedIn"\n                 ng-click="vm.login()">\n        <ng-md-icon icon="login"></ng-md-icon>\n        Login\n      </md-button>\n      <md-button class="md-raised"\n                 ng-show="vm.GoogleApi.isLoggedIn"\n                 ng-click="vm.logout()">\n        <ng-md-icon icon="logout"></ng-md-icon>\n        Logout\n      </md-button>\n\n      <md-button class="md-raised"\n                 promise-btn\n                 ng-show="vm.GoogleApi.isLoggedIn"\n                 ng-click="vm.backupNow()">\n        <ng-md-icon icon="backup"></ng-md-icon>\n        Backup now\n      </md-button>\n      <md-button class="md-raised sync-from-btn"\n                 promise-btn\n                 ng-show="vm.GoogleApi.isLoggedIn"\n                 ng-click="vm.loadRemoteData()">\n        <ng-md-icon icon="backup"></ng-md-icon>\n        Load From GDrive\n      </md-button>\n      <md-button class="md-raised"\n                 ng-show="vm.GoogleApi.isLoggedIn"\n                 external-link\n                 target="_blank"\n                 href="https://myaccount.google.com/permissions">\n        <ng-md-icon icon="remove_circle"></ng-md-icon>\n        Revoke permissions\n      </md-button>\n    </div>\n\n    <div ng-show="vm.GoogleApi.isLoggedIn"\n         class="sync-file-wrapper">\n      <md-input-container class="md-block md-icon-float">\n        <label>Sync file name</label>\n        <ng-md-icon icon="file_upload"\n                    aria-label="file_upload"></ng-md-icon>\n        <input type="text"\n               ng-model="vm.tmpSyncFile">\n      </md-input-container>\n\n      <md-button class="md-raised md-primary md-icon-button"\n                 aria-label="Save changed sync file name"\n                 ng-click="vm.changeSyncFileName(vm.tmpSyncFile)">\n        <ng-md-icon icon="save"></ng-md-icon>\n      </md-button>\n    </div>\n\n    <div>\n      <md-switch ng-model="vm.settings.googleDriveSync.isAutoLogin"\n                 aria-label="Auto login at when starting app">\n        Auto login at when starting app\n      </md-switch>\n    </div>\n    <div ng-if="vm.settings.googleDriveSync.isAutoLogin">\n      <md-switch ng-model="vm.settings.googleDriveSync.isLoadRemoteDataOnStartup"\n                 aria-label="Load remote data on startup">\n        Load remote data on startup\n      </md-switch>\n    </div>\n    <div ng-if="vm.settings.googleDriveSync.isAutoLogin">\n      <md-switch ng-model="vm.settings.googleDriveSync.isAutoSyncToRemote"\n                 ng-change="vm.resetSync();"\n                 aria-label="Auto sync data TO remote">\n        Auto sync data TO remote\n      </md-switch>\n    </div>\n\n    <div ng-if="vm.settings.googleDriveSync.isAutoLogin">\n      <md-switch ng-model="vm.settings.googleDriveSync.isNotifyOnSync"\n                 aria-label="Notify when syncing">\n        Notify when syncing\n      </md-switch>\n    </div>\n\n    <md-input-container class="md-block md-icon-float"\n                        ng-show="vm.settings.googleDriveSync.isAutoLogin && vm.settings.googleDriveSync.isAutoSyncToRemote">\n      <label>Sync interval (sync every x)</label>\n      <ng-md-icon icon="timer"\n                  aria-label="timer"></ng-md-icon>\n      <input type="text"\n             input-duration\n             ng-model-options="{ debounce: 250 }"\n             ng-change="vm.resetSync();"\n             ng-model="vm.settings.googleDriveSync.syncInterval">\n    </md-input-container>\n  </div>\n</section>\n\n<section ng-if="vm.IS_ELECTRON">\n  <h3 class="md-subtitle">Automatic Backups</h3>\n  <p><strong>NOTE:</strong> Changes to automated backup settings require you to restart the application to take effect.\n  </p>\n  <div>\n    <md-switch ng-model="vm.settings.automaticBackups.isEnabled"\n               aria-label="Enable automatic backups">\n      Enable automatic backups\n    </md-switch>\n  </div>\n\n\n  <div ng-if="vm.settings.automaticBackups.isEnabled"\n       class="ani-expand-collapse">\n    <md-input-container class="md-block">\n      <label>Interval in seconds to make backups</label>\n      <input type="number"\n             ng-model="vm.settings.automaticBackups.intervalInSeconds">\n    </md-input-container>\n    <md-input-container class="md-block">\n      <label>Path to backup (e.g. ~/backup-{date}.json)</label>\n      <input type="text"\n             ng-model="vm.settings.automaticBackups.path">\n    </md-input-container>\n  </div>\n\n  <h3 class="md-subtitle">Automatic Sync</h3>\n  <p><strong>NOTE:</strong> This is\n    <strong>a experimental feature!!!</strong> Take care! Make a backup with the export button above!\n  </p>\n  <div>\n    <md-switch ng-model="vm.settings.automaticBackups.isSyncEnabled"\n               aria-label="Enable automatic backups">\n      Enable auto sync\n    </md-switch>\n  </div>\n\n  <div ng-if="vm.settings.automaticBackups.isSyncEnabled"\n       class="ani-expand-collapse">\n    <md-input-container class="md-block">\n      <label>Path to sync file</label>\n      <input type="text"\n             ng-change="vm.onLocalSyncToggle(vm.settings.automaticBackups.isSyncEnabled)"\n             ng-model="vm.settings.automaticBackups.syncPath">\n    </md-input-container>\n  </div>\n</section>\n'), n.put("scripts/settings/jira-settings/jira-settings-d.html", '<help-section ng-if="vm.hasJiraSupport">\n  <div class="md-caption">Basic configuration</div>\n  <p>Please provide a username (can be found on your profile page) and an\n    <a class="md-accent"\n       href="https://confluence.atlassian.com/cloud/api-tokens-938839638.html"\n       external-link="">API token</a> or password if you can\'t generate one for some reason.\n  </p>\n  <p>You also need to specify a JQL query which is used for the suggestions to add tasks from Jira. If you need help check out this link\n    <a class="md-accent"\n       href="https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html"\n       external-link="">https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html</a>.</p>\n  <p>You can also configure, if you want to automatically (e.g. every time you visit the planning view), to add all new tasks specified by a custom JQL query to the backlog.</p>\n  <p>Another option is "Check if current ticket is assigned to current user". If enabled and you\'re starting, a check will be made if you\'re currently assigned to that ticket on Jira, if not an Dialog appears in which you can chose to assign the ticket to yourself.</p>\n\n\n  <div class="md-caption">Worklog settings</div>\n  <p>There are several options to determine when and how you want to submit a worklog. Enabling\n    <em>\'Open worklog dialog for adding a worklog to Jira when task is done\'</em> opens a dialog to add an worklog every time you mark a Jira Task as done. So keep in mind that worklogs will be added on top of everything tracked so far. So if you mark a task as done for a second time, you might not want to submit the complete worked time for the task again.\n  </p>\n  <p>\n    <em>\'Open worklog dialog when sub task is done and not for tasks with sub tasks themselves\'</em> opens a worklog dialog every time when you mark a sub task of a Jira issue as done. Because you already track your time via the sub tasks, no dialog is opened once you mark the Jira task itself as done.\n  </p>\n  <p>\n    <em>\'Send updates to worklog automatically without dialog\'</em> does what it says. Because marking a task as done several times leads to the whole worked time being tracked twice, this is not recommended.\n  </p>\n\n  <div class="md-caption">Default transitions</div>\n  <p>Here you can reconfigure your default transitions. Jira enables a wide configuration of transitions usually coming into action as different columns on your Jira agile board we can\'t make assumptions about where and when to transition your tasks and you need to set it manually.</p>\n</help-section>\n\n<div ng-if="!vm.IS_ELECTRON && !vm.hasJiraSupport">\n  <p>Please download the chrome extension in order to allow communication with the Jira Api. Note that this doesn\'t work for mobile</p>\n  <md-button class="md-raised md-primary"\n             target="_blank"\n             href="https://chrome.google.com/webstore/detail/super-productivity/ljkbjodfmekklcoibdnhahlaalhihmlb">\n    <ng-md-icon icon="file_download"></ng-md-icon>\n    Download now\n  </md-button>\n</div>\n\n<div ng-if="vm.hasJiraSupport">\n  <md-switch ng-model="vm.settings.isJiraEnabled"\n             aria-label="Enable Jira Integration">\n    Enable Jira Integration\n  </md-switch>\n\n  <div ng-show="vm.settings.isJiraEnabled"\n       class="ani-expand-collapse">\n    <form>\n      <md-input-container class="md-block">\n        <label>Host / Base URL</label>\n        <input type="text"\n               ng-model="vm.settings.host">\n      </md-input-container>\n      <md-input-container class="md-block">\n        <label>Username</label>\n        <input type="text"\n               ng-model="vm.settings.userName">\n      </md-input-container>\n      <md-input-container class="md-block">\n        <label>Token / Password</label>\n        <input type="password"\n               ng-model="vm.settings.password">\n      </md-input-container>\n      <md-input-container class="md-block">\n        <label>JQL Query for Searching Tasks</label>\n        <input type="text"\n               ng-model="vm.settings.jqlQuery">\n        <div class="hint">e.g.: assignee = "<span ng-bind="vm.settings.userName"></span>" AND resolution = Unresolved ORDER BY updatedDate DESC\n        </div>\n      </md-input-container>\n\n      <md-button aria-label="Test credentials"\n                 class="md-primary md-raised"\n                 ng-click="vm.testJiraCredentials()">\n        <ng-md-icon icon="import_export"></ng-md-icon>\n        Test credentials\n      </md-button>\n\n      <h3 class="md-subtitle">Advanced Options</h3>\n\n      <div>\n        <md-switch ng-model="vm.settings.isEnabledAutoAdd"\n                   aria-label="Auto add issues from Jira to backlog">\n          Auto add issues from Jira to backlog\n        </md-switch>\n      </div>\n\n      <md-input-container class="md-block"\n                          ng-if="vm.settings.isEnabledAutoAdd">\n        <label>JQL Query for Auto Adding Tasks to Backlog</label>\n        <input type="text"\n               ng-disabled="!vm.settings.isEnabledAutoAdd"\n               ng-model="vm.settings.jqlQueryAutoAdd">\n        <div class="hint">e.g.: assignee = currentUser() AND resolution = Unresolved ORDER BY updatedDate DESC</div>\n      </md-input-container>\n\n      <md-switch ng-model="vm.settings.isUpdateIssueFromLocal"\n                 aria-label="Update issue description on jira if task notes are updated">\n        Update issue description on Jira if task notes are updated\n      </md-switch>\n\n      <md-switch ng-model="vm.settings.isCheckToReAssignTicketOnTaskStart"\n                 aria-label="Check if current ticket is assigned to current user">\n        Check if current ticket is assigned to current user\n      </md-switch>\n\n      <section>\n        <h3 class="md-subtitle">Worklog</h3>\n\n        <div>\n          <md-switch ng-model="vm.settings.isWorklogEnabled"\n                     aria-label="open dialog for adding a worklog to jira when task is done">\n            Open worklog dialog for adding a worklog to Jira when task is done\n          </md-switch>\n        </div>\n\n        <div>\n          <md-switch ng-model="vm.settings.isAddWorklogOnSubTaskDone"\n                     ng-disabled="!vm.settings.isWorklogEnabled"\n                     aria-label="Add worklog when sub task is done">\n            Open worklog dialog when sub task is done and not for tasks with sub tasks themselves\n          </md-switch>\n        </div>\n\n        <div>\n          <md-switch ng-model="vm.settings.isAutoWorklog"\n                     ng-disabled="!vm.settings.isWorklogEnabled"\n                     aria-label="(not recommended) send updates to worklog automatically when task is done">\n            (not recommended!) Send updates to worklog automatically without dialog\n          </md-switch>\n        </div>\n      </section>\n\n      <h3 class="md-subtitle">Transition Issues</h3>\n      <md-switch ng-model="vm.settings.isTransitionIssuesEnabled"\n                 aria-label="Enable transition handling">\n        Enable transition handling\n      </md-switch>\n\n      <section ng-if="vm.settings.isTransitionIssuesEnabled"\n               class="ani-expand-collapse">\n        <p>Jira enables a wide configuration of transitions usually coming into action as different columns on your jira agile board. That\'s why we can\'t make assumptions about where and when to transition your tasks and you need to set it manually.</p>\n        <p>First you need to select an example ticket from which we can load the different available transitions. This requires you to\n          <strong>already have set valid credentials</strong> and a <strong>valid JQL Query for searching tasks</strong>.\n        </p>\n        <p>\n          <strong>Click on the "Test Credentials" button above to (re)load the task list for that</strong> and then use the input below to select an example task to load the transitions from.\n        </p>\n\n        <md-autocomplete\n          ng-show="vm.taskSuggestions.length"\n          md-whiteframe="2"\n          flex="100"\n          tabindex="1"\n          md-selected-item="vm.transitionExampleTask"\n          md-search-text="vm.transitionExampleTaskTitle"\n          md-items="task in vm.getFilteredTaskSuggestions(vm.transitionExampleTaskTitle)"\n          md-item-text="task.title"\n          md-require-match="true"\n          md-selected-item-change="vm.onTransitionExampleTaskSelected(vm.transitionExampleTask)"\n          autofocus-autocomplete\n          placeholder="Select an example task to load it\'s transitions">\n          <md-item-template>\n          <span md-highlight-text="vm.transitionExampleTaskTitle"\n                md-highlight-flags="i">{{task.title}}</span>\n          </md-item-template>\n        </md-autocomplete>\n\n        <h3 class="md-caption">Configure transitions</h3>\n\n        <section ng-if="vm.settings.transitions"\n                 class="ani-expand-collapse">\n          <md-input-container class="md-block">\n            <label>Default transition for OPEN</label>\n            <md-select ng-model="vm.settings.transitions.OPEN"\n                       arial-label="Select default transition for OPEN">\n              <md-option ng-value="\'ALWAYS_ASK\'"><em>Always ask</em></md-option>\n              <md-option ng-value="\'DO_NOT\'"><em>Don\'t transition</em></md-option>\n              <md-option ng-repeat="jiraTransition in vm.settings.allTransitions"\n                         ng-value="jiraTransition.id">\n                <span ng-bind="jiraTransition.id"></span> -\n                <span ng-bind="jiraTransition.name"></span>\n              </md-option>\n            </md-select>\n          </md-input-container>\n          <md-input-container class="md-block">\n            <label>Default transition for IN_PROGRESS</label>\n            <md-select ng-model="vm.settings.transitions.IN_PROGRESS"\n                       arial-label="Select default transition for IN_PROGRESS">\n              <md-option ng-value="\'ALWAYS_ASK\'"><em>Always ask</em></md-option>\n              <md-option ng-value="\'DO_NOT\'"><em>Don\'t transition</em></md-option>\n              <md-option ng-repeat="jiraTransition in vm.settings.allTransitions"\n                         ng-value="jiraTransition.id">\n                <span ng-bind="jiraTransition.id"></span> -\n                <span ng-bind="jiraTransition.name"></span>\n              </md-option>\n            </md-select>\n          </md-input-container>\n          <md-input-container class="md-block">\n            <label>Default transition for DONE</label>\n            <md-select ng-model="vm.settings.transitions.DONE"\n                       arial-label="Select default transition for DONE">\n              <md-option ng-value="\'ALWAYS_ASK\'"><em>Always ask</em></md-option>\n              <md-option ng-value="\'DO_NOT\'"><em>Don\'t transition</em></md-option>\n              <md-option ng-repeat="jiraTransition in vm.settings.allTransitions"\n                         ng-value="jiraTransition.id">\n                <span ng-bind="jiraTransition.id"></span> -\n                <span ng-bind="jiraTransition.name"></span>\n              </md-option>\n            </md-select>\n          </md-input-container>\n        </section>\n      </section>\n    </form>\n\n    <md-divider></md-divider>\n  </div>\n</div>'), n.put("scripts/settings/git-settings/git-settings-d.html", '<help-section>\n  <p>Here you can configure SuperProductivity to list open GithHub issues for a specific repository in the task creation panel in the daily planning view. They will be listed as suggestions and will provide a link to the issue as well as more information about it.</p>\n  <p>In addition you can automatically add and sync all open issues to your task backlog.</p>\n  <p>Pull requests will also be treated as a task, you can add a custom prefix to easily distinguish them from other issues.</p>\n  <p></p>\n  <p ng-if="vm.IS_ELECTRON">You can also configure the path to your project\'s .git directory to show you a summary of commits at the end of the day.</p>\n</help-section>\n\n<md-input-container class="md-block">\n  <label>Git repository to track for importing tasks (e.g.: johannesjo/super-productivity)</label>\n  <input type="text"\n         ng-model="vm.settings.repo">\n</md-input-container>\n\n<md-switch ng-model="vm.settings.isShowIssuesFromGit"\n           aria-label="Enable showing Git tasks when adding tasks">\n  Show open Git issues when adding tasks\n</md-switch>\n\n<md-switch ng-model="vm.settings.isAutoImportToBacklog"\n           aria-label="Auto-import all issues to backlog">\n  Auto-import all issues to backlog\n</md-switch>\n\n<md-input-container class="md-block">\n  <label>Prefix for pull request issues</label>\n  <input type="text"\n         ng-model="vm.settings.prPrefix">\n</md-input-container>\n\n<section ng-if="vm.IS_ELECTRON">\n  <p>Set project directory to show the day\'s commits at summary.</p>\n  <md-input-container class="md-block">\n    <label>Project path (where .git resides)</label>\n    <input type="text"\n           ng-model="vm.settings.projectDir">\n  </md-input-container>\n</section>\n'), n.put("scripts/settings/keyboard-settings/keyboard-settings-d.html", '<help-section>\n  <p>Here you can configure all keyboard shortcuts.</p>\n  <p>Click on the text input and enter the desired keyboard combination. Hit enter to save and Escape to abort.</p>\n  <p>There are three types of shortcuts:</p>\n  <ul>\n    <li>\n      <strong>Global shortcuts:</strong> When the app is running it will trigger the action from every other application.\n    </li>\n    <li>\n      <strong>Application level shortcuts:</strong> Will trigger from every screen of the application, but not if you\'re currently editing a text field.\n    </li>\n    <li>\n      <strong>Task level shortcuts:</strong> They will only trigger if you have selected a task via mouse or keyboard and usually trigger an action specifically related to that one task.\n    </li>\n  </ul>\n</help-section>\n\n<section ng-if="vm.IS_ELECTRON">\n  <h3 class="md-caption">Global Shortcuts (system wide)</h3>\n  <md-input-container class="md-block">\n    <label>Show/Hide Super Productivity</label>\n    <input type="text"\n           ng-blur="vm.registerGlobalShortcut(vm.keys.globalShowHide)"\n           keyboard-key-input\n           ng-model="vm.keys.globalShowHide">\n  </md-input-container>\n</section>\n\n<h3 class="md-caption">Global Shortcuts (application wide)</h3>\n\n<div class="gt-xs-2-col">\n  <md-input-container class="md-block">\n    <label>Add New Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.addNewTask">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Open Project Notes</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.openProjectNotes">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Open Distraction Panel</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.openDistractionPanel">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Show Help</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.showHelp">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Go to Daily Planner</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.goToDailyPlanner">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Go to Work View</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.goToWorkView">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Go to Agenda</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.goToDailyAgenda">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Go to Settings</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.goToSettings">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Go to Focus Mode</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.goToFocusMode">\n  </md-input-container>\n</div>\n\n<h3 class="md-caption">Tasks</h3>\n<p>The following shortcuts apply for the currently selected task (selected via tab or mouse).</p>\n<div class="gt-xs-2-col">\n  <md-input-container class="md-block">\n    <label>Edit Title</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskEditTitle">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Show/Hide Notes</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskToggleNotes">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Edit estimation / time spent</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskOpenEstimationDialog">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Toggle Done</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskToggleDone">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Add sub Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskAddSubTask">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Delete Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskDelete">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Select next Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.selectNextTask">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Select previous Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.selectPreviousTask">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Move Task up in List</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.moveTaskUp">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Move Task down in Tist</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.moveTaskDown">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Expand sub Tasks</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.expandSubTasks">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Collapse sub Tasks</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.collapseSubTasks">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Start/Stop Task</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.togglePlay">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Move Task to Task Backlog</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.moveToBacklog">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Move Task to Today\'s Task List</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.moveToTodaysTasks">\n  </md-input-container>\n  <md-input-container class="md-block">\n    <label>Open Original Issue URL on Jira/Git</label>\n    <input type="text"\n           keyboard-key-input\n           ng-model="vm.keys.taskOpenOriginalLink">\n  </md-input-container>\n</div>\n\n<md-button class="md-raised md-primary"\n           ng-click="vm.resetAllShortcuts()">\n  <ng-md-icon icon="undo"></ng-md-icon>\n  Reset all shortcuts\n</md-button>\n'), n.put("scripts/settings/misc-settings/misc-settings-d.html", '<help-section>\n  <div class="md-caption">Auto-start next task on done</div>\n  <p>Decide if you want to automatically start the next task, once you mark a task as done.</p>\n\n  <div class="md-caption">Use short syntax</div>\n  <p>The short syntax can be enabled to quickly create tasks with an estimation already set. If you enter \'TaskTitleBla t30m\' a task with the name \'TaskTitleBla\' will be created with the estimation set to 30 minutes.</p>\n\n  <div ng-if="vm.IS_ELECTRON">\n    <div class="md-caption">Enable idle time handling</div>\n    <p>Open a dialog after a specified amount of time to check if and on which task you want to track your time, when you have been idle.</p>\n\n    <div class="md-caption">Enable take a break reminder</div>\n    <p>Allows you to configure a reoccurring reminder when you have worked for a specified amount of time without taking a break.</p>\n    <p>You can modify the message displayed. ${duration} will be replaced with the time spent without a break.</p>\n  </div>\n</help-section>\n\n<md-switch ng-model="vm.settings.isAutoStartNextTask"\n           aria-label="Auto-start next task on done">\n  Auto-start next task on done\n</md-switch>\n\n\n<md-switch ng-model="vm.settings.isShortSyntaxEnabled"\n           aria-label="Use short syntax (e.g. \'TaskTitleBla e:30m\')">\n  Use short syntax (e.g. \'TaskTitleBla t30m\') for task creation\n</md-switch>\n\n<md-switch ng-model="vm.settings.isBlockFinishDayUntilTimeTimeTracked"\n           aria-label="Disable finish day button until time sheet was exported">\n  Disable finish day button until time sheet was exported\n</md-switch>\n\n<md-switch ng-if="!vm.IS_ELECTRON"\n           ng-model="vm.settings.isConfirmBeforeExit"\n           aria-label="Show confirm before exiting the app">\n  Show confirm before exiting the app\n</md-switch>\n\n<section ng-if="vm.isIdleTimeAvailable">\n  <md-switch ng-model="vm.settings.isEnableIdleTimeTracking"\n             aria-label="Enable idle time tracking">\n    Enable idle time handling (when idle, open dialog on what to track)\n  </md-switch>\n  <md-input-container class="md-block md-icon-float ani-expand-collapse"\n                      ng-if="vm.settings.isEnableIdleTimeTracking">\n    <label>Idle time minimum idle time</label>\n    <ng-md-icon icon="timer"\n                aria-label="timer"></ng-md-icon>\n    <input type="text"\n           input-duration\n           ng-model="vm.settings.minIdleTime">\n  </md-input-container>\n\n  <md-switch ng-model="vm.settings.isShowTimeWorkedWithoutBreak"\n             aria-label="Show time worked without break in work view">\n    Show time worked without break in work view\n  </md-switch>\n\n  <md-switch ng-model="vm.settings.isNotifyWhenTimeEstimateExceeded"\n             aria-label="Notify when time estimate was exceeded for current task">\n    Notify when time estimate was exceeded for current task\n  </md-switch>\n\n  <md-switch ng-model="vm.settings.isTakeABreakEnabled"\n             aria-label="Enable take a break reminder">\n    Enable take a break reminder\n  </md-switch>\n\n  <md-input-container class="md-block md-icon-float"\n                      ng-hide="!vm.settings.isTakeABreakEnabled">\n    <label>Remind when I worked longer than X without a break</label>\n    <ng-md-icon icon="timer"\n                aria-label="timer"></ng-md-icon>\n    <input type="text"\n           input-duration\n           ng-model="vm.settings.takeABreakMinWorkingTime">\n  </md-input-container>\n\n  <md-input-container class="md-block">\n    <label>Take a break message</label>\n    <textarea ng-model="vm.settings.takeABreakMessage"\n              rows="3"></textarea>\n  </md-input-container>\n</section>\n'), n.put("scripts/settings/pomodoro-settings/pomodoro-settings-d.html", '<help-section>\n  <p>The pomodoro timer can be configured via a couple of settings. The duration of every work session, the duration of normal breaks, the number of work sessions to run before a longer break is started and the duration of this longer break.</p>\n  <p>You can also set if you want to display your distractions during your pomodoro breaks.</p>\n  <p>Setting "Pause time tracking on pomodoro break" will also track your breaks as work time spent on a task. Setting "Pause time tracking on\n    <strong>longer</strong> pomodoro break" will do the same for the longer breaks.</p>\n  <p>Enabling "Pause pomodoro session when no active task" will also pause the pomodoro session, when you pause a task.</p>\n</help-section>\n\n<div>\n  <md-switch ng-model="vm.settings.isEnabled"\n             ng-change="vm.onIsEnabledChange(vm.settings.isEnabled)"\n             aria-label="Enable Pomodoro Timer">\n    Enable Pomodoro Timer\n  </md-switch>\n</div>\n\n<div ng-show="vm.settings.isEnabled"\n     class="ani-expand-collapse">\n  <md-input-container class="md-block md-icon-float">\n    <label>Work Session Duration</label>\n    <ng-md-icon icon="timer"\n                aria-label="timer"></ng-md-icon>\n    <input type="text"\n           input-duration\n           ng-model="vm.settings.duration">\n  </md-input-container>\n\n  <md-input-container class="md-block md-icon-float">\n    <label>Break Duration</label>\n    <ng-md-icon icon="timer"\n                aria-label="timer"></ng-md-icon>\n    <input type="text"\n           input-duration\n           ng-model="vm.settings.breakDuration">\n  </md-input-container>\n\n  <md-input-container class="md-block md-icon-float">\n    <label>Longer Break Duration</label>\n    <ng-md-icon icon="timer"\n                aria-label="timer"></ng-md-icon>\n    <input type="text"\n           input-duration\n           ng-model="vm.settings.longerBreakDuration">\n  </md-input-container>\n\n  <md-input-container class="md-block">\n    <label>Cycles for longer break</label>\n    <input type="text"\n           ng-model="vm.settings.cyclesBeforeLongerBreak">\n  </md-input-container>\n\n  <div>\n    <md-switch ng-model="vm.settings.isGoToWorkView"\n               aria-label="Go to work view when starting a session">\n      Go to work view when starting a session\n    </md-switch>\n  </div>\n  <div>\n    <md-switch ng-model="vm.settings.isManualContinue"\n               aria-label="Manually confirm continuing session after break ">\n      Manually confirm continuing session after break\n    </md-switch>\n  </div>\n  <div>\n    <md-switch ng-model="vm.settings.isStopTrackingOnBreak"\n               aria-label="Pause time tracking on pomodoro break">\n      Pause time tracking on pomodoro break\n    </md-switch>\n  </div>\n\n  <div>\n    <md-switch ng-model="vm.settings.isStopTrackingOnLongBreak"\n               aria-label="Pause time tracking on longer pomodoro break">\n      Pause time tracking on <strong>longer</strong> pomodoro break\n    </md-switch>\n  </div>\n\n  <div>\n    <md-switch ng-model="vm.settings.isPlaySound"\n               aria-label="Play sound when session done">\n      Play sound when session done\n    </md-switch>\n  </div>\n\n  <div>\n    <md-switch ng-model="vm.settings.isShowDistractionsOnBreak"\n               aria-label="Show distractions on break">\n      Show distractions on break\n    </md-switch>\n  </div>\n</div>\n'), n.put("scripts/settings/project-settings/project-settings-d.html", '<help-section>\n  <p>Here you can add, edit, switch and delete different projects.</p>\n</help-section>\n\n<div ng-if="vm.allProjects.length > 0">\n  <md-input-container class="md-block">\n    <label>Choose current project</label>\n    <md-select ng-model="vm.selectedCurrentProject"\n               arial-label="Select Project"\n               ng-change="vm.changeProject(vm.selectedCurrentProject)">\n      <md-option ng-repeat="project in vm.allProjects"\n                 arial-label="Select Project"\n                 ng-value="project"\n                 ng-bind="project.title">\n      </md-option>\n    </md-select>\n  </md-input-container>\n\n  <div class="project-overview"\n       ng-show="vm.showAllProjects">\n    <h3 class="md-title">Overview of all Projects</h3>\n\n    <md-list-item ng-repeat="project in vm.allProjects">\n      <p>\n        <ng-md-icon icon="edit"\n                    aria-label="edit"></ng-md-icon>\n        <span edit-on-click\n              contenteditable="true"\n              ng-model="project.title"\n              class="title"\n              edit-on-click-on-edit-finished="vm.updateProjectTitle(project.id, newVal)"></span>\n      </p>\n\n      <md-button class="md-icon-button"\n                 aria-label="delete"\n                 tabindex="2"\n                 ng-click="vm.deleteProject(project,$index)">\n        <ng-md-icon icon="delete_forever"\n                    aria-label="delete"\n                    style="fill: #dc2d3d;"></ng-md-icon>\n      </md-button>\n    </md-list-item>\n  </div>\n\n  <md-button type="button"\n             ng-click="vm.createNewProject()"\n             class="md-raised md-primary">Create new project\n  </md-button>\n  <md-button type="button"\n             ng-hide="vm.showAllProjects"\n             ng-click="vm.showAllProjects = true;"\n             class="md-raised md-primary">Manage Projects\n  </md-button>\n\n\n</div>\n\n<div ng-if="!vm.allProjects.length">\n  <p>You can manage multiple different ToDos with SuperProductivity. To do so you need to give your current ToDo a title and save it.</p>\n\n  <form ng-submit="vm.createNewProjectFromCurrent(vm.projectTitle)">\n    <md-input-container class="md-block">\n      <label>Project Title</label>\n      <input type="text"\n             ng-model="vm.projectTitle">\n    </md-input-container>\n    <md-button type="submit"\n               class="md-raised md-primary">Save current Todo as Project\n    </md-button>\n  </form>\n</div>\n'), n.put("scripts/settings/theme-settings/theme-settings-d.html", '<help-section>\n  <p>Select the theme you want to use. Themes are always saved on project level, which means that you can use different themes for different projects.</p>\n</help-section>\n\n<h2 class="md-caption">\n  <ng-md-icon icon="color_lens"></ng-md-icon>\n  Select Theme\n</h2>\n\n<md-select ng-model="vm.selectedTheme"\n           placeholder="Select a theme">\n  <md-option ng-repeat="themeName in vm.themes"\n             ng-value="themeName"\n             ng-bind="themeName">\n  </md-option>\n</md-select>\n<div>\n  <md-switch ng-model="vm.isDarkTheme"\n             aria-label="Use dark theme">\n    Use dark theme\n  </md-switch>\n</div>\n')
}]), angular.module("superProductivity").constant("VERSION", "1.10.36"), function() {
  function n(e, n, t, i, o, a, s, r, l) {
    var c = this, d = n._;

    function m() {
      c.session = i.r.currentSession, c.config = i.r.config, c.tasksUndone = e.getUndoneToday(), c.tasksDone = e.getDoneToday(), p(), a(function() {
        var n = document.querySelectorAll(".task");
        n && n[0] && n[0].focus()
      })
    }

    function u() {
      c.tasksUndone && c.tasksDone && (i.r.tasks = c.tasksDone.concat(c.tasksUndone))
    }

    function p() {
      c.totalTimeWorkedToday = e.getTimeWorkedToday(), c.totalEstimationRemaining = o.calcRemainingTime(c.tasksUndone)
    }

    m(), c.openAddTask = function() {
      l.show()
    }, c.collapseAllNotesAndSubTasks = function() {
      e.collapseNotes(c.tasksDone), e.collapseNotes(c.tasksUndone), e.collapseSubTasks(c.tasksDone), e.collapseSubTasks(c.tasksUndone)
    }, c.onTaskDoneChangedUndoneList = function(t) {
      if (t.isDone) {
        var n = d.findIndex(c.tasksUndone, function(n) {
          return n.id === t.id
        });
        c.tasksDone.push(t), c.tasksUndone.splice(n, 1)
      }
    }, c.onTaskDoneChangedDoneList = function(t) {
      if (!t.isDone) {
        var n = d.findIndex(c.tasksDone, function(n) {
          return n.id === t.id
        });
        c.tasksUndone.unshift(t), c.tasksDone.splice(n, 1)
      }
    };
    var g = r(p, 500), h = [];
    h.push(t.$watch("r.tasks.length", function(n, t) {
      n !== t && (c.tasksUndone = e.getUndoneToday(), c.tasksDone = e.getDoneToday())
    }, !0)), h.push(t.$watchCollection("vm.tasksDone", function() {
      d.each(c.tasksDone, function(n) {
        n.isDone = !0
      }), u()
    })), h.push(t.$watchCollection("vm.tasksUndone", function() {
      d.each(c.tasksUndone, function(n) {
        n.isDone = !1
      }), u()
    })), [s.PROJECT_CHANGED, s.COMPLETE_DATA_RELOAD].forEach(function(n) {
      t.$on(n, function() {
        m()
      })
    }), t.$on("$destroy", function() {
      !function() {
        if (c.tasksUndone && c.tasksDone) {
          var n = c.tasksDone.concat(c.tasksUndone);
          e.updateToday(n)
        }
      }(), d.each(h, function(n) {
        n()
      }), g && r.cancel(g)
    })
  }

  n.$inject = ["Tasks", "$window", "$scope", "$rootScope", "TasksUtil", "$timeout", "EV", "$interval", "AddTaskBarGlobal"], angular.module("superProductivity")
    .directive("workView", function() {
      return {
        templateUrl: "scripts/work-view/work-view-d.html",
        bindToController: !0,
        controller: n,
        controllerAs: "vm",
        restrict: "E",
        scope: !0
      }
    })
}();
//# sourceMappingURL=../maps/scripts/scripts.js.map
