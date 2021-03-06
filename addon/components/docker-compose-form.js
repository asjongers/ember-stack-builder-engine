import Ember from 'ember';
import ResizeTextareaMixin from '../mixins/resize-textarea';
import FileSaver from 'ember-cli-file-saver/mixins/file-saver';
import RSVP from 'rsvp';
import DockerFileParser from '../mixins/docker-file-parser';

export default Ember.Component.extend(ResizeTextareaMixin, FileSaver, DockerFileParser, {



  // Every jQuery event needs to be wrapped inside the ember run loop
  didInsertElement() {

    Array.prototype.flatten = function() {
      let arr = this;
      while (arr.find(el => Array.isArray(el))) { arr = Array.prototype.concat(...arr); }
      return arr;
    };

    document.addEventListener('keyup', () => {
      this.getCursorYmlPath();
    });

    Ember.run.scheduleOnce('afterRender', this, function() {
      // This is necessary because the addition of this addon resets scroll
      Ember.$('#textarea-autocomplete').height(Ember.$('#textarea-autocomplete').prop('scrollHeight'));

      let that = this;

      Ember.$('#textarea-autocomplete').textcomplete([{
        match: /(^|\b)(\w{2,})$/,
        search: function(term, callback) {
          callback(that.get('drcServiceNames').filter(function(service) {
            return service.includes(term);
          }));
        },
        replace: function(word) {
          return word;
        }
      }]);
    });

    try {
      var yaml = this.yamlParser(this.get('changeset.text'));
      var services = this.serviceNameFilter(yaml);
      this.set('oldServices', services);
    } catch (err) {
      this.set('oldServices', []);
    }
  },

  oldServices: [],
  drcServiceNames: Ember.computed('changeset.text', function() {
    try {
      var yaml = this.yamlParser(this.get('changeset.text'));
      var services = this.serviceNameFilter(yaml);
      this.set('oldServices', services);
      return services;
    } catch (err) {
      console.log(err);
      return this.get('oldServices');
    }
  }),

  dockerTextChanged: Ember.observer('changeset.text', function() {
    Ember.run.next(this, function(){
      try {
        let yamlObj = this.checkYaml();
        this.setProperties({
          yamlErrorMessage: '',
          yamlError: false,
          yamlObject: yamlObj
        });
      }
      catch(err){
        this.setProperties({
          yamlErrorMessage: err,
          yamlError: true,
          yamlObject: null
        });
      }
    });
  }).on('init'),

  checkYaml() {
    this.yamlParser(this.get('changeset.text'));
  },


  // Get indices of all ocurrences of string in a string
  getIndicesOf(searchStr, str) {
      let searchStrLen = searchStr.length;
      if (searchStrLen === 0) {
          return [];
      }
      let startIndex = 0, index, indices = [];
      while ((index = str.indexOf(searchStr, startIndex)) > -1) {
          indices.push(index);
          startIndex = index + searchStrLen;
      }
      return indices;
  },

  // Returns the padding of a string from the cursor index to a direction until
  // it ends or finds any stop character.
  stringPad(direction, write) {
    return function (text, cursor) {
      let stopChars = ['\n', '\t'];
      let i = cursor;
      let predicate = write ? () => stopChars.indexOf(text[i-1]) : () => stopChars.indexOf(text[i]);
      while (predicate() === -1 && i > 0 && i < text.length) {
        if (direction === 'right') {
          i = i + 1;
        }
        else if (direction === 'left') {
          i = i - 1;
        }
        else {
          break;
        }
      }
      if (direction === 'right') {
        return {
          text: text.slice(cursor, i),
          index: i
        };
      }
      else if (direction === 'left') {
        return {
          text: text.slice(i, cursor),
          index: i
        };
      }
      else {
        return { text: "", index: -1 };
      }
    };
  },

  // Get an array of drc yml object paths that have the context string as a match.
  getYmlPathMatches(contextString, yaml, path) {
    if (yaml && yaml !== null) {
      let currentPath = path || "root";

      return Object.keys(yaml).map((key) => {
        if (typeof yaml[key] === "object" && yaml[key] !== null) {
          if (contextString.includes(key)) {
            return [`${currentPath}.${key}`].concat(this.getYmlPathMatches(contextString, yaml[key], `${currentPath}.${key}`));
          }
          else {
            return this.getYmlPathMatches(contextString, yaml[key], `${currentPath}.${key}`);
          }
        }
        else {
          // Key is not of numeric type (so we are not inside an array)
          if (isNaN(key)) {
            if (contextString.includes(key) || contextString.includes(yaml[key])) {
              return `${currentPath}.${key}`;
            }
            else {
              return [];
            }
          }
          else {
            if (contextString.includes(yaml[key])) {
              return `${currentPath}.${key}`;
            }
            else {
              return [];
            }
          }
        }
      });
    }
    else {
      return [];
    }
  },

  // Get the path in the docker-compose yml object where the cursor is.
  // Variable write indicates whether the user is moving cursor or typing.
  getCursorYmlPath(write = false) {
    const text = this.get('changeset.text');
    const cursorPosition = Ember.$('#textarea-autocomplete').prop("selectionStart");
    const stringLeft = this.stringPad('left', write);
    const stringRight = this.stringPad('right', write);
    const contextString = `${stringLeft(text, cursorPosition).text.trim()}${stringRight(text, cursorPosition).text.trim()}`;
    const pathMatches = this.getYmlPathMatches(contextString, this.get('yamlObject')).flatten();
    const tramo = text.length / pathMatches.length;
    const probableIndex = Math.floor(cursorPosition / tramo);
    return pathMatches[probableIndex];
  },

  textAreaObserver: Ember.observer('changeset.text', function() {
    this.recalculateTextareaSize();
  }),

  disabledSaveButton: Ember.computed('changeset.changes', 'changeset.changes.[]', 'changeset.errors', 'changeset.errors.[]', 'newFile', function() {
    if (this.get('newFile') === true) {
      return false;
    }
    return this.get('changeset.errors.length') > 0 || this.get('changeset.changes.length') === 0;
  }),
  disabledCancelButton: Ember.computed('changeset.changes', 'changeset.changes.[]', 'changeset.errors', 'changeset.errors.[]', 'newFile', function() {
    if (this.get('changeset.errors.length') > 0) {
      return false;
    }
    return this.get('newFile') === false && this.get('changeset.changes.length') === 0;
  }),

  actions: {
    addDockerText: function(item) {
      RSVP.Promise.resolve(item.get('dockerText')).then((itemDockerText) => {
        var dockerText = this.get('changeset.text');
        if (!dockerText) {
          dockerText = "";
        }
        dockerText += "\n" + itemDockerText;
        this.set('changeset.text', dockerText);
        return false;
      });
      // this.sendAction('addDockerText', item);
    },
    showDeleteDialog: function() {
      this.sendAction('showDeleteDialog');
    },
    cancel: function() {
      this.get('changeset').rollback();
      if (this.get('newFile')) {
        this.sendAction('goToIndexView');
        return true;
      }
      return false;
    },
    save: function() {
      this.get('changeset').save();
      this.set('newFile', false);
      this.set('allowDownload', true);
      this.set('allowDelete', true);
      return false;
    },
    download: function() {
      this.get('changeset').save().then(() => {
        let url = "/stack-builder-backend/" + this.get('changeset.id');
        Ember.$.get(url,
          (content) => this.saveFileAs("docker-compose.yml", content, "application/x-yaml"));
      });
      return false;
    }
  }
});
