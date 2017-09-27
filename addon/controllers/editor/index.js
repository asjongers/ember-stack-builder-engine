import Ember from 'ember';
import DockerComposeValidations from '../../validations/docker-compose';

export default Ember.Controller.extend({
  DockerComposeValidations,
  goToIndexView: function() {
    this.transitionToRoute('index');
  },
  actions: {
    goToIndexView: function() {
      this.goToIndexView();
    },
    delete: function() {
      this.set('showDialog', false);
      this.get('model').rollbackAttributes().then(() => {
        this.goToIndexView();
      });
    }
  }
});
