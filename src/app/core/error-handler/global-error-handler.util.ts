import { HANDLED_ERROR_PROP_STR, IS_ELECTRON } from '../../app.constants';
import StackTrace from 'stacktrace-js';
import pThrottle from 'p-throttle';
import newGithubIssueUrl from 'new-github-issue-url';
import { getBeforeLastErrorActionLog } from '../../util/action-logger';
import { download } from '../../util/download';
import { privacyExport } from '../../imex/file-imex/privacy-export';
import { getAppVersionStr } from '../../util/get-app-version-str';
import { CompleteBackup } from '../../pfapi/api';

let isWasErrorAlertCreated = false;

const _getStacktrace = async (err: Error | any): Promise<string> => {
  const isHttpError = err && (err.url || err.headers);
  const isErrorWithStack = err && err.stack;

  // Don't try to send stacktraces of HTTP errors as they are already logged on the server
  if (!isHttpError && isErrorWithStack && !isHandledError(err)) {
    return StackTrace.fromError(err).then((stackframes) => {
      return stackframes
        .splice(0, 20)
        .map((sf) => {
          return sf.toString();
        })
        .join('\n');
    });
  } else if (!isHandledError(err)) {
    console.warn('Error without stack', err);
  }
  return Promise.resolve('');
};

const throttle = pThrottle({
  limit: 2,
  interval: 5000,
});
const _getStacktraceThrottled = throttle(_getStacktrace);

export const logAdvancedStacktrace = (
  origErr: unknown,
  additionalLogFn?: (stack: string) => void,
): Promise<unknown> =>
  _getStacktraceThrottled(origErr)
    .then((stack) => {
      document.getElementById('error-fetching-info-wrapper')?.remove();

      if (additionalLogFn) {
        additionalLogFn(stack);
      }
      // append to dialog
      const stacktraceEl = document.getElementById('stack-trace');
      if (stacktraceEl) {
        stacktraceEl.innerText = stack;
      }

      const githubIssueLinks = document.getElementsByClassName('github-issue-urlX');
      console.log(githubIssueLinks);

      if (githubIssueLinks) {
        const errEscaped = _cleanHtml(origErr as string);
        Array.from(githubIssueLinks).forEach((el) =>
          el.setAttribute('href', getGithubErrorUrl(errEscaped, stack)),
        );
      }

      // NOTE: there is an issue with this sometimes -> https://github.com/stacktracejs/stacktrace.js/issues/202
    })
    .catch(console.error);

const _cleanHtml = (str: string): string => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

export const createErrorAlert = (
  err: string = '',
  stackTrace: string,
  origErr: any,
  userData?: CompleteBackup<any> | undefined,
): void => {
  if (isWasErrorAlertCreated) {
    return;
  }
  // it seems for whatever reason, sometimes we get tags in our error which break the html
  const errEscaped = _cleanHtml(err);
  const githubUrl = getGithubErrorUrl(errEscaped, stackTrace);

  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.style.color = 'black';
  errorAlert.style.maxHeight = '100vh';
  errorAlert.innerHTML = `
    <div id="error-alert-inner-wrapper">
    <h2 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">${errEscaped}<h2>
    <p><a href="${githubUrl}" class="github-issue-urlX" target="_blank">! Please copy & report !</a></p>
    <!-- second error is needed, because it might be too long -->
    <pre style="line-height: 1.3;">${errEscaped}</pre>

    <div id="error-fetching-info-wrapper">
      <div>Trying to load more info...</div>
      <div class="spinner"></div>
    </div>

    <pre id="stack-trace"
         style="line-height: 1.3; text-align: left; max-height: 240px; font-size: 12px; overflow: auto;">${stackTrace}</pre>
    <pre style="line-height: 1.3; font-size: 12px;">${getSimpleMeta()}</pre>
    </div>
  `;

  document.body.append(errorAlert);
  const innerWrapper = document.getElementById(
    'error-alert-inner-wrapper',
  ) as HTMLElement;

  const btnReload = document.createElement('BUTTON');
  btnReload.innerText = 'Reload App';
  btnReload.addEventListener('click', () => {
    if (IS_ELECTRON) {
      window.ea.reloadMainWin();
    } else {
      window.location.reload();
    }
  });
  innerWrapper.append(btnReload);

  console.log(userData);

  if (userData) {
    const btnExport = document.createElement('BUTTON');
    btnExport.innerText = 'Export data';
    btnExport.addEventListener('click', () => {
      download(
        'super-productivity-crash-user-data-export.json',
        JSON.stringify(userData),
      );
    });
    innerWrapper.append(btnExport);

    const btnPrivacyExport = document.createElement('BUTTON');
    btnPrivacyExport.innerText = 'PE';
    btnPrivacyExport.title =
      'Export anonymized data (to send to contact@super-productivity.com for debugging)';
    btnPrivacyExport.addEventListener('click', () => {
      download(
        'ANONYMIZED-super-productivity-crash-user-data-export.json',
        privacyExport(userData),
      );
    });
    innerWrapper.append(btnPrivacyExport);
  }

  const tagReport = document.createElement('A');
  const btnReport = document.createElement('BUTTON');
  btnReport.innerText = 'Report';
  tagReport.append(btnReport);
  tagReport.setAttribute('href', githubUrl);
  tagReport.setAttribute('class', 'github-issue-urlX');
  tagReport.setAttribute('target', '_blank');
  innerWrapper.append(tagReport);

  isWasErrorAlertCreated = true;

  innerWrapper.style.visibility = 'hidden';
  // let's wait a bit to ensure, that the sourcemaps have been parsed
  setTimeout(() => {
    innerWrapper.style.visibility = 'visible';
  }, 1500);

  if (IS_ELECTRON) {
    window.ea.openDevTools();
  }
};

export const getSimpleMeta = (): string => {
  const n = window.navigator;
  return `META: SP${getAppVersionStr()} __ ${IS_ELECTRON ? 'Electron' : 'Browser'} – ${
    n.language
  } – ${n.platform} – ${n.language} – UA:${n.userAgent}`;
};

export const isHandledError = (err: unknown): boolean => {
  const errStr =
    typeof err === 'string'
      ? err
      : typeof err === 'object' &&
        err !== null &&
        typeof (err as any).toString === 'function' &&
        err.toString();
  // NOTE: for some unknown reason sometimes err is undefined while err.toString is not...
  // this is why we also check the string value
  return (
    (err && (err as any).hasOwnProperty(HANDLED_ERROR_PROP_STR)) ||
    !!(errStr as string).match(HANDLED_ERROR_PROP_STR)
  );
};

export const getGithubErrorUrl = (
  title: string,
  stackTrace?: string,
  isHideActionsBeforeError = false,
): string => {
  return newGithubIssueUrl({
    user: 'johannesjo',
    repo: 'super-productivity',
    title: '💥 ' + title,
    template: 'in_app_bug_report.md',
    body: getGithubIssueErrorMarkdown(stackTrace, isHideActionsBeforeError),
  });
};

const getGithubIssueErrorMarkdown = (
  stacktrace?: string,
  isHideActionsBeforeError = false,
): string => {
  const code = '```';
  let txt = `### Steps to Reproduce
<!-- !!! Please provide an unambiguous set of steps to reproduce this bug! !!! -->
1.
2.
3.

### Additional Console Output
<!-- Is there any output if you press Ctrl+Shift+i (Cmd+Alt+i for mac) in the console tab? If so please post it here. -->





























### Url
${window.location.href}

### Meta Info
${getSimpleMeta()}
`;

  if (stacktrace) {
    txt += `

### Stacktrace
${code}
${stacktrace}
${code}
`;
  }

  if (!isHideActionsBeforeError) {
    txt += `

### Actions Before Error
${code}
${getBeforeLastErrorActionLog().join(' \n')}
${code}`;
  }

  return txt;
};
