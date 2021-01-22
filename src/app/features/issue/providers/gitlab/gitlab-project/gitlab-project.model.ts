export type GitlabProject = Readonly<{
  id: number,
  description: string,
  name: string,
  path: string,
  path_with_namespace: string,
  web_url: string,
}>;
