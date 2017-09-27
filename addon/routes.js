import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  this.route('editor', function() {
    this.route('edit', {
      path: ':docker_compose_id'
    });
  });
});
