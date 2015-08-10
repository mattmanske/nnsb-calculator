'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

var livereload = require('gulp-livereload');
var connect = require('connect');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var browserify = require('browserify');
var watchify = require('watchify');
var reactify = require('coffee-reactify');
var source = require('vinyl-source-stream');
var ghPages = require('gulp-gh-pages');

/** Config variables */
var serverPort = 8888;
var lrPort = 35731;


/** File paths */
var dist = 'dist';

var bourbon = require('node-bourbon').includePaths;
var htmlFiles = 'app/**/*.html';
var htmlBuild = dist;

var jsxFiles = 'app/js/**/*.jsx';
var sassFiles = 'app/css/**/*.sass';

var vendorFiles = [
    'bower_components/react/react-with-addons.js'];
var vendorBuild = dist + '/vendor';
var requireFiles = './node_modules/react/react.js';


gulp.task('vendor', function () {
    return gulp.src(vendorFiles).
        pipe(gulp.dest(vendorBuild));
});


gulp.task('html', function () {
    return gulp.src(htmlFiles).
        pipe(gulp.dest(htmlBuild));
});

gulp.task('sass', function () {
  gulp.src(sassFiles)
    .pipe(sass({
      includePaths: ['sass'].concat(bourbon)
    }).on('error', sass.logError))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('sass:watch', function () {
  gulp.watch(sassFiles, ['sass']);
});

function compileScripts(watch) {
    gutil.log('Starting browserify');

    var entryFile = './app/js/app.cjsx';

    var bundler;
    var opts = {
        entries: entryFile,
        extensions: ['.cjsx', 'coffee']
    }
    if (watch) {
        bundler = watchify(opts);
    } else {
        bundler = browserify(opts);
    }

    bundler.require(requireFiles);
    bundler.transform(reactify);

    var rebundle = function () {
        var stream = bundler.bundle({ debug: true});

        stream.on('error', function (err) { console.error(err) });
        stream = stream.pipe(source(entryFile));
        stream.pipe(rename('app.js'));

        stream.pipe(gulp.dest('dist/bundle'));
    }

    bundler.on('update', rebundle);
    return rebundle();
}


gulp.task('server', function (next) {
    var server = connect();
    server.use(connect.static(dist)).listen(serverPort, next);
});


function initWatch(files, task) {
    if (typeof task === "string") {
        gulp.start(task);
        gulp.watch(files, [task]);
    } else {
        task.map(function (t) { gulp.start(t) });
        gulp.watch(files, task);
    }
}

gulp.task('deploy', function() {
  return gulp.src('dist/**/*')
    .pipe(ghPages());
});

/**
 * Run default task
 */
gulp.task('default', ['vendor', 'sass', 'server', 'sass:watch'], function () {
    var lrServer = livereload(lrPort);
    var reloadPage = function (evt) {
        lrServer.changed(evt.path);
    };

    function initWatch(files, task) {
        gulp.start(task);
        gulp.watch(files, [task]);
    }

    compileScripts(true);
    initWatch(htmlFiles, 'html');

    gulp.watch([dist + '/**/*'], reloadPage);
});
