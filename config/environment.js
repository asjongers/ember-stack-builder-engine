/*jshint node:true*/
'use strict';

module.exports = function(environment) {
  const ENV = {
    modulePrefix: 'ember-stack-builder-engine',
    environment: environment,
    searchDebounceMiliseconds: 250,
    defaultNumberOfContainers: 2
  };

  return ENV;
};
