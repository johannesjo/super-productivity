# Howto generate a Access Token with Privilegs

## Personal Access Token
For polling Gitlab Issues you need to provide a access Token.   

1. Got to User Settings / Access tokens (On Github you can go [here](https://github.com/settings/personal-access-tokens))
2. Add new Token with the Scope `api`

![Personal Token](https://github.com/user-attachments/assets/76fb204e-450a-4516-9d93-897ae2a32f6d)


## Project Access Token
If you self-host Gitlab or have the Premium / Ultimate license it's possible to get a Project Access Token. Which are scoped to this Project. 
The scope is similiar to the Personal Access token but you set also a role. Which Role can do what? <a href="https://docs.gitlab.com/ee/user/permissions.html#project-planning">Documentation</a> 


![Project Token](https://github.com/user-attachments/assets/f008f114-3d3e-450d-9301-7825222f9812)
