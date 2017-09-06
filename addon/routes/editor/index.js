import Ember from 'ember';

export default Ember.Route.extend({
  store: Ember.inject.service('store'),
  model() {
    return this.get('store').createRecord('docker-compose',{
      text: 'version: "2"\nservices:\n',
      title: 'New Docker Compose file'
    });
  }
});
