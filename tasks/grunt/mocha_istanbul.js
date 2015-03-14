module.exports = {
  coverage: {
    src: [
      'test/*.uspec.js'
    ], // the folder, not the files
    options: {
      coverage: true,
      coverageFolder: 'test/reports',
      root: '/lib',
      timeout: 5000,
      reportFormats: ['lcov'],
      check: {
        statements: 85
      }
    }
  }
};