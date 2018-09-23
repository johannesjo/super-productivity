# next steps
* normalize state 
* use entities
* get sub tasks as entitites


# integrations
### Questions
  * How to deal with getting related data???
  ==> get them in the component (e.g. task component via a id)
  ==> remember: looking up entities is cheap
  ==> same goes for nested tasks i guess
  
  

### Structure
* link via related property to task, e.g. `linkedIssueId`

stores:
* `selectableIssues` 
* `linkedIssues`

**as effect:**
* task start => check for linkedIssue updates, move task, check assignment
* task delete => delete linkedIssue
* update task => update issue according to settings (description, title) 
* task done => update work log, move task etc

**settings**
* settings as component?
* or as a config object?


# settings
* different config objects
* simple update by property
* but with interface!!!
* 

# dialogs
* opts: force, first and make current reappear, append to queue



