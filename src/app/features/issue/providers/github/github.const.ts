export { GITHUB_ISSUE_CONTENT_CONFIG } from './github-issue-content.const';
export {
  GITHUB_CONFIG_FORM_SECTION,
  GITHUB_CONFIG_FORM,
  DEFAULT_GITHUB_CFG,
} from './github-cfg-form.const';

// NOTE: we need a high limit because git has low usage limits :(
export const GITHUB_POLL_INTERVAL = 10 * 60 * 1000;
export const GITHUB_INITIAL_POLL_DELAY = 8 * 1000;
export const GITHUB_API_BASE_URL = 'https://api.github.com/';
