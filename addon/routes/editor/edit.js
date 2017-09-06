import Ember from 'ember';


export default Ember.Route.extend({
  classNames: ['container-manager'],
  store: Ember.inject.service('store')
});
