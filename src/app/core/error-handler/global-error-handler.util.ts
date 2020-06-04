import {ElectronService} from '../electron/electron.service';
import {HANDLED_ERROR_PROP_STR, IS_ELECTRON} from '../../app.constants';
import {environment} from '../../../environments/environment';
import * as StackTrace from 'stacktrace-js';
import * as pThrottle from 'p-throttle';
import * as newGithubIssueUrl from 'new-github-issue-url';

let isWasErrorAlertCreated = false;

async function _getStacktrace(err): Promise<string> {
  const isHttpError = err && (err.url || err.headers);
  const isErrorWithStack = err && err.stack;

  // Don't try to send stacktraces of HTTP errors as they are already logged on the server
  if (!isHttpError && isErrorWithStack && !isHandledError(err)) {
    return StackTrace.fromError(err)
      .then((stackframes) => {
        return stackframes
          .splice(0, 20)
          .map((sf) => {
            return sf.toString();
          }).join('\n');
      });
  } else if (!isHandledError(err)) {
    console.warn('Error without stack', err);
  }
  return Promise.resolve('');
}

const _getStacktraceThrottled = pThrottle(_getStacktrace, 2, 5000);

export const logAdvancedStacktrace = (origErr, additionalLogFn?: (stack: string) => void) => _getStacktraceThrottled(origErr).then(stack => {
  console.log(stack);

  if (additionalLogFn) {
    additionalLogFn(stack);
  }
  // append to dialog
  const stacktraceEl = document.getElementById('stack-trace');
  if (stacktraceEl) {
    stacktraceEl.innerText = stack;
  }

  const githubIssueLink = document.getElementById('github-issue-url');
  console.log(githubIssueLink);

  if (githubIssueLink) {
    const errEscaped = _cleanHtml(origErr);
    githubIssueLink.setAttribute('href', getGithubUrl(errEscaped, stack));
  }


// NOTE: there is an issue with this sometimes -> https://github.com/stacktracejs/stacktrace.js/issues/202
}).catch(console.error);


const _cleanHtml = (str: string): string => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

export const createErrorAlert = (eSvc: ElectronService, err: string = '', stackTrace: string, origErr: any) => {
  if (isWasErrorAlertCreated) {
    return;
  }
  // it seems for whatever reasons, sometimes we get tags in our error which break the html
  const errEscaped = _cleanHtml(err);
  const githubUrl = getGithubUrl(errEscaped, stackTrace);

  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.style.color = 'black';
  errorAlert.style.maxHeight = '100vh';
  errorAlert.innerHTML = `
    <div id="error-alert-inner-wrapper">
    <h2 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">${errEscaped}<h2>
    <p><a href="${githubUrl}" id="github-issue-url" target="_blank">! Please copy & report !</a></p>
    <!-- second error is needed, because it might be too long -->
    <pre style="line-height: 1.3;">${errEscaped}</pre>

    <pre id="stack-trace"
         style="line-height: 1.3; text-align: left; max-height: 240px; font-size: 12px; overflow: auto;">${stackTrace}</pre>
    <pre style="line-height: 1.3; font-size: 12px;">${getSimpleMeta()}</pre>
    </div>
  `;
  const btnReload = document.createElement('BUTTON');
  btnReload.innerText = 'Reload App';
  btnReload.addEventListener('click', () => {
    if (IS_ELECTRON) {
      eSvc.remote.getCurrentWindow().webContents.reload();
    } else {
      window.location.reload();
    }
  });
  document.body.append(errorAlert);
  const innerWrapper = document.getElementById('error-alert-inner-wrapper');
  innerWrapper.append(btnReload);
  isWasErrorAlertCreated = true;

  innerWrapper.style.visibility = 'hidden';
  // let's wait a bit to ensure, that the sourcemaps have been parsed
  setTimeout(() => {
    innerWrapper.style.visibility = 'visible';
  }, 1500);

  if (IS_ELECTRON) {
    eSvc.remote.getCurrentWindow().webContents.openDevTools();
  }
};


export const getSimpleMeta = (): string => {
  const n = window.navigator;
  return `META: SP${environment.version} ${IS_ELECTRON ? 'Electron' : 'Browser'} – ${n.language} – ${n.platform} – ${n.userAgent}`;
};

export const isHandledError = (err): boolean => {
  const errStr = (typeof err === 'string') ? err : err.toString();
  // NOTE: for some unknown reason sometimes err is undefined while err.toString is not...
  // this is why we also check the string value
  return (err && err.hasOwnProperty(HANDLED_ERROR_PROP_STR)) || (errStr.match(HANDLED_ERROR_PROP_STR));
};

const getGithubUrl = (errEscaped: string, stackTrace: string): string => {
  return newGithubIssueUrl({
    user: 'johannesjo',
    repo: 'super-productivity',
    body: getGithubIssueErrorMarkdown(stackTrace),
    title: errEscaped,
  });
};

const getGithubIssueErrorMarkdown = (stacktrace: string): string => {
  const code = '```';
  return `
${getSimpleMeta()}

### Steps to Reproduce
<!--- Provide a link to a live example or an unambiguous set of steps to -->
<!--- reproduce this bug. Include code to reproduce, if relevant -->
1.
2.
3.
4.

### Console Output
<!--- Is there any output if you press Ctrl+Shift+i (Cmd+Alt+i for mac) in the console tab? If so please post it here. -->

### Error Log (Desktop only)
<!--- For the desktop versions, there is also an error log file in case there is no console output.
Usually, you can find it here:
on Linux:
~/.config/superProductivity/log.log
--or--
~/snap/superproductivity/current/.config/superProductivity/log.log

on macOS: ~/Library/Logs/superProductivity/log.log

on Windows: %USERPROFILE%\\AppData\\Roaming\\superProductivity\\log.log
. -->

### Stacktrace
${code}
${stacktrace}
${code}
`;
};
