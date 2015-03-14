module.exports = gruntConfig;

function gruntConfig(grunt) {
  var
    pkg = grunt.file.readJSON('package.json'),
    tasks = require('./tasks/grunt'),
    gruntInitConfig = {};

  for (var task in tasks) {
    gruntInitConfig[task] = tasks[task];
  }

  grunt.initConfig(gruntInitConfig);

  for (var task in pkg.devDependencies) {
    if (task !== 'grunt' && !task.indexOf('grunt')) {
      grunt.loadNpmTasks(task);
    }
  }

  grunt.registerTask('build:watch', [
    'watch'
  ]);

  grunt.registerTask('test', [
    'jshint',
    'mocha_istanbul:coverage'
  ]);

}