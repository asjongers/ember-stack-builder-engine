/*jshint node:true*/
const EngineAddon = require('ember-engines/lib/engine-addon');

module.exports = EngineAddon.extend({
  name: 'ember-stack-builder-engine',
  lazyLoading: true,
  included(app) {
    this.bowerDirectory = app.bowerDirectory;
    this._super.included.apply(this, app);
    app.import(app.bowerDirectory + '/materialize/dist/js/materialize.js');
    app.import(app.bowerDirectory + '/jquery-textcomplete/dist/jquery.textcomplete.js');
    app.import(app.bowerDirectory + '/FileSaver/FileSaver.js');
  }
});