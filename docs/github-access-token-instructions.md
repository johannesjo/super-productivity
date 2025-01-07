# How to generate an Access Token with Privileges

## GitLab Personal Access Token
For polling GitLab Issues, you need to provide an access token.   

1. Go to User Settings / Access tokens (for GitHub see below)
2. Add a new token with the scope `api`

![Personal Token](https://github.com/user-attachments/assets/76fb204e-450a-4516-9d93-897ae2a32f6d)


## Project Access Token
If you self-host GitLab or have the Premium/Ultimate license, it's possible to get a Project Access Token, which is scoped to a project. 
The scope is similar to the Personal Access token, but you also set a role. To learn what each role can do, see the <a href="https://docs.gitlab.com/ee/user/permissions.html#project-planning">Documentation</a>.


![Project Token](https://github.com/user-attachments/assets/f008f114-3d3e-450d-9301-7825222f9812)

## GitHub Personal Access Token

To generate a GitHub Personal Access Token:

1. Navigate to GitHub's [Personal Access Tokens (Classic)](https://github.com/settings/tokens) page
   - Note: Fine-grained tokens are not currently supported
2. Click "Generate new token (classic)"
3. Select the `repo` scope to grant access to private repositories
4. Click "Generate token" and securely store the token value
