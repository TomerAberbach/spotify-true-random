const path = require('path')
const fs = require('fs')
const del = require('del')

const gulp = require('gulp')
const htmlmin = require('gulp-htmlmin')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const cssnano = require('cssnano')
const imagemin = require('gulp-imagemin')
const uglify = require('gulp-uglify-es').default

const clean = () => del(['dist'])
gulp.task('clean', clean)

const html = () =>
  gulp.src('src/**/*.html')
    .pipe(htmlmin({
      collapseBooleanAttributes: true,
      collapseWhitespace: true
    }))
    .pipe(gulp.dest('dist'))

const css = () =>
  gulp.src('src/**/*.css')
    .pipe(postcss([
      autoprefixer,
      cssnano
    ]))
    .pipe(gulp.dest('dist'))

const img = () =>
  gulp.src('src/**/*.{gif,jpg,jpeg,png,svg}')
    .pipe(imagemin([
      imagemin.gifsicle(),
      imagemin.jpegtran(),
      imagemin.optipng(),
      imagemin.svgo({plugins: [{removeTitle: false}]})
    ]))
    .pipe(gulp.dest('dist'))
  
const js = () =>
  gulp.src('src/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist'))

gulp.task('default', gulp.series(clean, gulp.parallel(html, css, img, js)))
