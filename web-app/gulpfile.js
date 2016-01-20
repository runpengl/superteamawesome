'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('sass', function () {
  gulp.src('./public/stylesheets/**/main.scss')
    .pipe(sass({includePaths: ['./styles']}).on('error', sass.logError))
    .pipe(gulp.dest('./public/stylesheets'));
});

gulp.task('sass:watch', function () {
  gulp.watch('./public/stylesheets/**/*.scss', ['sass']);
});

gulp.task('default', ['sass:watch']);