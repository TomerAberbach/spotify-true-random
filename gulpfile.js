import path from 'path'
import fs from 'fs'
import del from 'del'
import gulp from 'gulp'
import htmlmin from 'gulp-htmlmin'
import postcss from 'gulp-postcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import imagemin from 'gulp-imagemin'
import uglify from 'gulp-uglify-es'

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
      imagemin.mozjpeg(),
      imagemin.optipng(),
      imagemin.svgo({plugins: [{removeTitle: false}]})
    ]))
    .pipe(gulp.dest('dist'))
  
const js = () =>
  gulp.src('src/**/*.js')
    .pipe(uglify.default())
    .pipe(gulp.dest('dist'))

gulp.task('default', gulp.series(clean, gulp.parallel(html, css, img, js)))
