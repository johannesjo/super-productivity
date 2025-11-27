import { ipcMain } from 'electron';
import { IPC } from '../shared-with-frontend/ipc-events.const';
import { JiraCfg } from '../../src/app/features/issue/providers/jira/jira.model';
import { sendJiraRequest, setupRequestHeadersForImages } from '../jira';

export const initJiraIpc = (): void => {
  ipcMain.on(IPC.JIRA_SETUP_IMG_HEADERS, (ev, { jiraCfg }: { jiraCfg: JiraCfg }) => {
    setupRequestHeadersForImages(jiraCfg);
  });

  ipcMain.on(IPC.JIRA_MAKE_REQUEST_EVENT, (ev, request) => {
    sendJiraRequest(request);
  });
};
