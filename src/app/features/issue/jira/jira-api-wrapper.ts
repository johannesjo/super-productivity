import xhr from 'xhr';
import {stringify} from 'query-string';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JiraApiWrapper {
  xhr: any;
  queryStringParser: any;

  constructor() {
    this.xhr = xhr;
    this.queryStringParser = stringify;
  }

  isConfigSufficient(config) {
    if (!config) {
      throw new Error('SPEX:JiraApiWrapper: No request config.');
    } else if (!config.isJiraEnabled) {
      throw new Error('SPEX:JiraApiWrapper: Jira not enabled.');
    } else if (!config.host) {
      throw new Error('SPEX:JiraApiWrapper: Host not configured.');
    } else {
      return true;
    }
  }

  execRequest(request) {
    console.log(`SPEX:JiraApiWrapper:Request:${request.apiMethod}`, request);

    if (!this.isConfigSufficient(request.config)) {
      return;
    }

    if (request.apiMethod && this[request.apiMethod]) {
      return this[request.apiMethod](request);
    } else {
      throw new Error('SPEX:JiraApiWrapper: invalid request ' + request.apiMethod);
    }
  }


  doRequest(orgRequest, request) {
    const encoded = this._b64EncodeUnicode(`${orgRequest.config.userName}:${orgRequest.config.password}`);
    console.log(request);

    const queryStr = request.query ? `?${this.queryStringParser(request.query)}` : '';
    const base = `${orgRequest.config.host}/rest/api/latest`;
    // cleanup just in case
    const uri = `${base}/${request.pathname}${queryStr}`.trim().replace('//', '/');

    return new Promise((resolve) => {
      this.xhr({
        uri,
        method: request.method || 'GET',
        body: JSON.stringify(request.body),
        headers: {
          authorization: `Basic ${encoded}`,
          'Content-Type': 'application/json'
        }
      }, (err, res, body) => {
        if (err) {
          resolve({
            error: err,
            requestId: orgRequest.requestId
          });
        } else if (res.statusCode >= 300) {
          resolve({
            error: res.statusCode,
            requestId: orgRequest.requestId
          });
        } else if (body) {
          const parsed = JSON.parse(body);

          const errIn = parsed.errorMessages || parsed.errors;
          if (errIn) {
            resolve({
              error: errIn,
              requestId: orgRequest.requestId
            });
          } else {
            resolve({
              response: parsed,
              requestId: orgRequest.requestId
            });
          }
        } else if (!body) {
          resolve({
            response: null,
            requestId: orgRequest.requestId
          });
        }
      });
    });
  }

  searchJira(orgRequest) {
    const optional = orgRequest.arguments.length > 1 && orgRequest.arguments[1] !== undefined ? orgRequest.arguments[1] : {};

    return this.doRequest(orgRequest, {
      pathname: 'search',
      method: 'POST',
      body: Object.assign(optional, {
        jql: orgRequest.arguments[0]
      }),
    });
  }

  issuePicker(orgRequest) {
    const jql = orgRequest.arguments.length > 1 && orgRequest.arguments[1] !== undefined ? orgRequest.arguments[1] : '';

    return this.doRequest(orgRequest, {
      pathname: 'issue/picker',
      method: 'GET',
      followAllRedirects: true,
      query: {
        showSubTasks: true,
        showSubTaskParent: true,
        query: orgRequest.arguments[0],
        currentJQL: jql
      },
    });
  }

  addWorklog(orgRequest) {
    const issueId = orgRequest.arguments[0];
    const worklog = orgRequest.arguments[1];

    return this.doRequest(orgRequest, {
      pathname: `issue/${issueId}/worklog`,
      method: 'POST',
      body: worklog,
    });
  }

  searchUsers(orgRequest) {
    const username = orgRequest.arguments[0].username;
    const startAt = orgRequest.arguments[0].startAt;
    const maxResults = orgRequest.arguments[0].maxResults;
    const includeActive = orgRequest.arguments[0].includeActive;
    const includeInactive = orgRequest.arguments[0].includeInactive;

    return this.doRequest(orgRequest, {
      pathname: 'user/search',
      method: 'GET',
      query: {
        username,
        startAt: startAt || 0,
        maxResults: maxResults || 50,
        includeActive: includeActive || true,
        includeInactive: includeInactive || false
      }
    });
  }

  listTransitions(orgRequest) {
    const issueId = orgRequest.arguments[0];

    return this.doRequest(orgRequest, {
      pathname: `issue/${issueId}/transitions`,
      method: 'GET',
      query: {
        expand: 'transitions.fields'
      }
    });
  }

  updateIssue(orgRequest) {
    const issueId = orgRequest.arguments[0];
    const issueUpdate = orgRequest.arguments[1];

    return this.doRequest(orgRequest, {
      pathname: `issue/${issueId}`,
      method: 'PUT',
      body: issueUpdate,
    });
  }

  findIssue(orgRequest) {
    const issueId = orgRequest.arguments[0];
    const expandParam = orgRequest.arguments[1];

    return this.doRequest(orgRequest, {
      pathname: `issue/${issueId}`,
      method: 'GET',
      query: {
        expand: expandParam || ''
      }
    });
  }

  transitionIssue(orgRequest) {
    const issueId = orgRequest.arguments[0];
    const issueTransition = orgRequest.arguments[1];

    return this.doRequest(orgRequest, {
      pathname: `issue/${issueId}/transitions`,
      method: 'POST',
      body: issueTransition
    });
  }

  listStatus(orgRequest) {
    return this.doRequest(orgRequest, {
      pathname: `status`,
      method: 'GET',
    });
  }

  listFields(orgRequest) {
    return this.doRequest(orgRequest, {
      pathname: 'field',
      method: 'GET',
    });
  }

  getCurrentUser(orgRequest) {
    return this.doRequest(orgRequest, {
      pathname: `myself`,
      method: 'GET',
    });
  }
}
