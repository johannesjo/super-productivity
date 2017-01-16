# superProductivity

This is a ToDo List / Time Tracker / Personal Jira Task Manager for Linux, MacOS and Windows to make you work super productively. 

Build with the awesome [electron](http://electron.atom.io/).

## Features
* Configurable and automatable Jira integration for: 
  * searching and adding tasks from jira
  * creating (local/personal) sub tasks for your jira tickets
  * worklogs (tracking your work to jira)
  * Setting transitions aka setting tickets to in progress or done
  * Automatic notifications once your (current) task has changed or been commented on jira => no messy email notifications required any more
* Time Tracking 
* Sub Tasks
* Task Backlog
* 'Take a break' reminder
* Daily Schedule
* Daily Summary
* Full Keyboard Support
* (Anti-) Distraction Pad
* Different Themes!

And much more!

## Build and Run
```
git clone https://github.com/johannesjo/super-productivity.git
cd super-productivity
# install electron, gulp, bower and node gyp globally
npm install -g electron node-gyp gulp bower
npm install && bower install
gulp build # or for dev run 'gulp'/'gulp serve' in a separate tab
npm start
```

## Binaries
### Linux
* [superProductivity-0.9.0-x86_64.AppImage](http://super-productivity.com/downloads/superProductivity-0.9.0-x86_64.AppImage)
* [superProductivity_0.9.0_amd64.deb](http://super-productivity.com/downloads/superProductivity_0.9.0_amd64.deb)

### MacOS
(not yet compiled)
### Windows
(not yet compiled)

## Web Version
There is also a [web-version](http://super-productivity.com) but it is much more limited (no Jira integration, no time tracking).