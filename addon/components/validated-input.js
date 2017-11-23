import Ember from 'ember';
const KEYCODE_TABULATION = 9;
const KEYCODE_ESCAPE = 27;
const KEYCODE_Z = 90;
const TAB = "  ";

export default Ember.Component.extend({
  setTabSize (){
    this.$('textarea').css("tab-size", String(TAB.length));
  },
  didInsertElement() {
    this._super(...arguments);
    this.moveLabel();
    this.setTabSize();
  },

  moveLabel() {
    // make sure the label moves when a value is bound.
    const $label = Ember.$('#textarea-label-' + this.get('label'));

    if (Ember.isPresent(this.get('value')) && !$label.hasClass('active')) {
      $label.addClass('active');
    }
  },
  textAreaObserver: Ember.observer('value', function() {
    if (this.get('type') === "textarea") {
      this.moveLabel();
    }
  }),
  undos: [],
  undosLimit: 10,
  redos: [],
  addUndo: function() {
    let textarea = this.$('textarea').get(0);
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    let value = textarea.value;
    let undos = this.get('undos');
    undos.pushObject({value, start, end});
    if(undos.length > this.get('undosLimit')) {undos.shift();}
    return {value, start, end};
  },
  addRedo: function() {
    let textarea = this.$('textarea').get(0);
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    let value = textarea.value;
    this.get('redos').pushObject({value, start, end});
  },
  actions: {
    escapePress() {
      const _this = this;
      Ember.run.later(function() {
        _this.$('textarea').get(0).blur();
      })
      return true;
    },
    keyPress(value, event) {
      Ember.run.debounce(this, "addUndo", 500, true);
      this.get('redos').clear();
      return true;
    },
    keyDown(value, event) {
      let keyCode = event.keyCode || event.which;

      // handle CtrlZ and CtrlShiftZ
      if(event.ctrlKey && keyCode == KEYCODE_Z) {
        event.preventDefault();
        event.stopPropagation();
        let textarea = this.$('textarea').get(0);

        if(event.shiftKey){
          let lastchange = this.get('redos').pop();
          if(!lastchange){return false;}
          this.addUndo();
          const _this = this;
          Ember.run.later(function(){
            _this.set('value', lastchange.value);
            textarea.value = lastchange.value;
            textarea.focus();
            textarea.setSelectionRange(lastchange.start, lastchange.end);
          });
          return false;
        }

        let lastchange = this.get('undos').pop();
        if(!lastchange){return false;}
        this.addRedo();
        const _this = this;
        Ember.run.later(function(){
          _this.set('value', lastchange.value);
          textarea.value = lastchange.value;
          textarea.focus();
          textarea.setSelectionRange(lastchange.start, lastchange.end);
        });
        return false;
      }

      // handle tabulation
      else if(keyCode == KEYCODE_TABULATION) {
        let textarea = this.$('textarea').get(0);
        let start = textarea.selectionStart;
        let end = textarea.selectionEnd;
        let charMoved = 0, startMove=0;

        let lineStart = value.substr(0, start).split('\n').length - 1;
        let lineEnd = value.substr(0, end).split('\n').length - 1;
        // Handle wrong lineEnd detection
        if(start != end && value[end-1] == '\n'){lineEnd--;}

        let lines = value.split('\n').map(line => {
          return line.concat('\n');
        });
        // Remove last \n
        lines[lines.length-1] = lines[lines.length-1].slice(0, -1);

        let cpt= 0, acc= 0, colStart=0, colEnd=0;
        while(cpt < lineStart) {
          acc += lines[cpt].length;
          cpt ++;
        }
        colStart = start - acc;

        cpt= 0; acc= 0;
        while(cpt < lineEnd) {
          acc += lines[cpt].length;
          cpt ++;
        }
        colEnd = end - acc;

        let shiftRightStart=0, shiftRightEnd=0, shiftLeftStart=0, shiftLeftEnd=0;

        let linesCounter = lineStart;

        // Handle tab decrement
        if(event.shiftKey) {
          for(let i=0; i<TAB.length; i++) {
            if(lines[lineStart][i] == ' ') {
              shiftLeftStart ++;
            }else{break;}
          }

          for(let i=0; i<TAB.length; i++) {
            if(lines[lineEnd][i] == ' ') {
              shiftLeftEnd ++;
            }else{break;}
          }

          do {
            let newLine = lines[linesCounter];

            let i = 0;
            while(newLine[0] == ' ' && i < TAB.length){
              newLine = newLine.slice(1);
              i++;
            }
            lines[linesCounter] = newLine;
            linesCounter++;
          } while(linesCounter <= lineEnd)
        }
        // Handle tab increment
        else {
          shiftRightStart += TAB.length;
          shiftRightEnd += TAB.length;
          do {
            let newLine = TAB.concat(lines[linesCounter]);
            lines[linesCounter] = newLine;
            linesCounter++;
          } while(linesCounter <= lineEnd)
        }


        value = lines.join('');
        Ember.run.debounce(this, "addUndo", 500, true);
        this.set('value', value);
        let newColStart, newColEnd;
        newColStart = colStart + shiftRightStart - shiftLeftStart;
        if(newColStart < 0) { newColStart = 0;}
        newColEnd = colEnd + shiftRightEnd - shiftLeftEnd;
        if(newColEnd < 0) { newColEnd = 0;}

        // Calculating new indices for start and end position of the caret
        let accStart = 0, accEnd = 0;
        cpt= 0, colStart=0, colEnd=0;
        while(cpt < lineEnd) {
          if(cpt < lineStart){
            accStart += lines[cpt].length;
          }
          accEnd += lines[cpt].length;
          cpt ++;
        }
        if(newColEnd == 0 && lineStart != lineEnd) { accEnd ++;}
        start = accStart + newColStart;
        end = accEnd + newColEnd;

        Ember.run.later(function () {
          textarea.focus();
          textarea.setSelectionRange(start, end);
        });
        event.preventDefault(); event.stopPropagation();
        return false;
      }
      else {
        // the rest can just go its merry little way
        return true;
      }
    }
  }
});
