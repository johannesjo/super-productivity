var config = require('./config');
var gulp = require('gulp');
//var rsync = require('rsyncwrapper').rsync;

/**
 * Build-Task Files
 *
 * NOTE: Hard to make assumptions about this one
 * so be creative ;)
 */

//gulp.task('deploy', function ()
//{
//    rsync({
//        ssh: true,
//        src: config.dist,
//        recursive: true,
//        dest: config.wwwDestination,
//        syncDest: true,
//        args: ['--verbose']
//    }, function (error, stdout, stderr)
//    {
//        console.log(error);
//        console.log(stdout);
//        console.log(stderr);
//    });
//});