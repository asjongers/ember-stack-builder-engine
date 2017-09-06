/* eslint-env node */
module.exports = {
  description: '',
  normalizeEntityName() {},

  afterInstall() {
    return this.addBowerPackagesToProject([
      {name: 'materialize', target: '0.97.6'},
      {name: 'jquery-textcomplete', target: '^1.8.0'},
      {name: 'FileSaver', target: '^1.3.3'}
    ]);
  }
};
