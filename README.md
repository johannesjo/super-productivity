# Super Productivity

This is a ToDo List / Time Tracker / Personal Jira Task Manager for Linux, MacOS and Windows to make you work super productively. 

![Work View with global links](screens/global-links.png)

## Features
* Configurable and automatable Jira integration for: 
  * searching and adding tasks from jira
  * creating (local/personal) sub tasks for your jira tickets
  * worklogs (tracking your work to jira)
  * Setting transitions aka setting tickets to in progress or done
  * Automatic notifications once your (current) task has changed or been commented on jira => no messy email notifications required any more
* Time Tracking 
* Sub Tasks
* Sexy global pinboard to add quick links and project related files 
* 'Take a break' reminder
* Daily Schedule
* Daily Summary
* Full Keyboard Support
* (Anti-) Distraction Pad
* Different Themes!

And much more!

## Web Version
Check out the [web-version](http://super-productivity.com) to get a quick idea of the app. But keep in mind it is more limited (no Jira integration, time tracking only works if the app is open).

## Downloads & Install
### Linux
Run `sudo snap install superproductivity` or install it manually from the [releases page](/releases/latest).

### MacOS
* Install [superProductivity-latest.dmg from the releases page](/releases/latest).

### Windows
* Install [superProductivity_Setup_latest.exe from the releases page](/releases/latest).

## Gnome Shell Integration
There is also an [extension which integrates the application into the status bar](https://github.com/johannesjo/gnome-shell-extension-super-productivity). It's at a very early stage, so use it at your own risk.

## Build and run for yourself
```
git clone https://github.com/johannesjo/super-productivity.git
cd super-productivity
# install electron, gulp, bower and node gyp globally
npm install -g electron node-gyp gulp bower
npm install && bower install
gulp build # or for dev run 'gulp'/'gulp serve' in a separate tab
npm start # on windows use "set NODE_ENV=DEV electron ./electron/main.js" instead
```

## More Screenshots
![Daily Planner](screens/daily-planner.png)
![submit-worklog](screens/submit-worklog.png)
![agenda](screens/agenda.png)
![daily-summary](screens/daily-summary.png)
![plan](screens/plan.png)
![time-tracking-history](screens/time-tracking-history.png)


Build with the awesome [electron](http://electron.atom.io/).
