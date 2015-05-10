define([
    'rstjs/core',
    'rstjs/parser/inliner',
    'javascript-state-machine',
    'rstjs/parser/grammar',
    'rstjs/util/unicode',
    'rstjs/reader/line',
    'rstjs/tree',
    'rstjs/nodes',
    'rstjs/parser/error',
    'util'
], function (Core, Inliner, StateMachine, Grammar, Unicode, LineReader, Tree, Nodes, ParserError, Util) {
    'use strict';

    function StateRegistry() {
        this._states = {};
        this._instances = {};
    }
    StateRegistry.prototype.getState = function(name) {
        if (typeof this._instances[name] !== 'undefined') {
            return this._instances[name];
        }
        if (typeof this._states[name] !== 'undefined') {
            this._instances[name] = new this._states[name]();    
        }
        return this._instances[name] || null;
    };
    StateRegistry.prototype.getTransitionsOf = function(name) {
        if (typeof this._states[name] !== 'undefined') {
            return this._states[name].TRANSITIONS;
        }
        return null;
    };
    StateRegistry.prototype.registerState = function(name, state) {
        this._states[name] = state;
        return this;
    };
    StateRegistry.prototype.getTransitions = function() {
        var list = [],
            key;
        for (key in this._states) {
            if (this._states.hasOwnProperty(key) && typeof this._states[key] !== 'undefined') {
                var state = this._states[key].name.slice(0, -5),
                    transitions = this._states[key].TRANSITIONS;
                for (var i = transitions.length - 1; i >= 0; i--) {
                    list.push({ name: transitions[i].name, from: state, to: transitions[i].to });
                }
            }
        }
        return list;
    };

    //---------------------------------------------------------------------------

    var tree            = new Tree(),
        inliner         = new Inliner(),
        stateRegistry   = new StateRegistry(),
        context         = [];

    //---------------------------------------------------------------------------

    function State() {}
    State.SECTION_LEVEL = 0;
    State.TITLE_STYLES = [];
    State.prototype.setLineReader = function(lineReader) {
        this.lineReader = lineReader;
    };
    State.prototype.checkHeader = function(level) {
        return (level === 0 && State.TITLE_STYLES.length === State.SECTION_LEVEL) || level === (State.SECTION_LEVEL);
    };
    State.prototype.createHeader = function(title, style, source) {
        var level = State.TITLE_STYLES.indexOf(style) + 1;
        if (!this.checkHeader(level)) {
            throw new ParserError('Title level inconsistent.', source, this.lineReader.getPosition() - 1);
        }

        // if level === 0 new header
        if (level === 0) {
            State.TITLE_STYLES.push(style);
        }
        State.SECTION_LEVEL = State.TITLE_STYLES.length;
        inliner.parse(title);
        tree.add(new Nodes.Header(title, State.SECTION_LEVEL));
    };

    function BodyState() {
        State.call(this);
    }
    BodyState.TRANSITIONS = [
        { name: 'text',             to: 'Text', pattern: Grammar.block.text },
        { name: 'line',             to: 'Line', pattern: Grammar.block.line },
        //{ name: 'anonymous',        pattern: Grammar.block.anonymous },
        //{ name: 'explicitMarkup',   pattern: Grammar.block.explicitMarkup },
        // simpleTable:
        // gridTable: 
        //{ name: 'lineBlock',        pattern: Grammar.block.lineBlock },
        //{ name: 'doctest',          pattern: Grammar.block.doctest },
        // optionMarker
        //{ name: 'fieldMarker',      pattern: Grammar.block.fieldMarker },
        // enumerator:
        //{ name: 'bullet',           pattern: Grammar.block.bullet },
        { name: 'blank',            pattern: Grammar.block.blank}
    ];
    BodyState.prototype = Object.create(State.prototype);
    // noinspection JSUnusedGlobalSymbols
    BodyState.prototype.constructor = BodyState;
    BodyState.prototype.text = function() {
        return [this.lineReader.current()];
    };
    stateRegistry.registerState('Body', BodyState);

    function TextState() {
        State.call(this);
    }
    TextState.TRANSITIONS = [
        { name: 'text',      to: 'Body', pattern: Grammar.block.text },
        { name: 'underline', to: 'Body', pattern: Grammar.block.line }
    ];
    TextState.prototype = Object.create(State.prototype);
    // noinspection JSUnusedGlobalSymbols
    TextState.prototype.constructor = TextState;
    TextState.prototype.blank = function() {
        console.log(context);
    };
    TextState.prototype.text = function() {
        var lines = '';
        for (var i = context.length - 1; i >= 0; i--) {
            lines += context[i].rtrim();
        }
        lines += '\n' + this.lineReader.current().rtrim();

        while (this.lineReader.hasNext()) {
            var line = this.lineReader.next();
            if (!line.trim()) {
                break;
            }
            if (line[0] == ' ') {
                throw new ParserError('Unexpected indentation.', line, this.lineReader.getPosition() - 1);
            }
            lines += '\n' + line.rtrim();
        }

        tree.add(new Nodes.Paragraph(inliner.parse(lines)));
        
        // TODO: finish the function lol
        //lines;
        // paragraph(lines, lineno)


    };
    TextState.prototype.underline = function() {
        var title       = context[0],
            underline   = this.lineReader.current().rtrim(),
            source      = title + '\n' + underline;

        if (title.length > underline.length) {
            throw new ParserError('Title underline too short.', source , this.lineReader.getPosition());
        }

        this.createHeader(title, underline.charAt(0), source);
        return [];
    };
    stateRegistry.registerState('Text', TextState);

    function LineState() {
        State.call(this);
    }
    LineState.TRANSITIONS = [
        { name: 'text',      to: 'Body', pattern: Grammar.block.text },
        { name: 'underline', to: 'Body', pattern: Grammar.block.line }
    ];
    LineState.prototype = Object.create(State.prototype);
    // noinspection JSUnusedGlobalSymbols
    LineState.prototype.constructor = LineState;
    LineState.prototype.text = function() {
        var position    = this.lineReader.getPosition(),
            overline    = this.lineReader.get(position - 1).rtrim(),
            title       = this.lineReader.get(position).rtrim(),
            underline   = this.lineReader.next(),
            source      = overline + '\n' + title + '\n' + underline;

        if (!underline.match(Grammar.block.line)) {
            throw new ParserError('Missing matching underline for section title overline.', source , position);
        } else if (overline !== underline) {
            throw new ParserError('Title overline & underline mismatch.', source , position);
        }           

        if (title.length > overline.length) {
            throw new ParserError('Title overline too short.', source , position);
        }

        this.createHeader(title, overline.charAt(0) + underline.charAt(0), source);
        return [];
    };
    stateRegistry.registerState('Line', LineState);

    //---------------------------------------------------------------------------

    // noinspection JSUnusedGlobalSymbols
    var fsm = StateMachine.create({
        initial: { state: 'Body', event: 'startup' },
        events: stateRegistry.getTransitions(),
        callbacks: {
            onafterevent: function(event, from, to, lineReader) {
                var state = stateRegistry.getState(from);
                if (state && typeof state[event] === 'function') {
                    state.setLineReader(lineReader);
                    context = state[event]();    
                }
            }
        }
    });

    //---------------------------------------------------------------------------

    var run = function(self, lineReader) {
        while (lineReader.hasNext()) {
            var line = lineReader.next();
            var transitions = stateRegistry.getTransitionsOf(fsm.current);
            for (var i = transitions.length - 1; i >= 0; i--) {
                /*fsm.can(transitions[i].name) && */
                if (typeof fsm[transitions[i].name] === 'function' && line.match(transitions[i].pattern)) {
                    console.log(fsm.current.toString() + " => " + transitions[i].name + "\t\t" + line);
                    fsm[transitions[i].name](lineReader);
                    console.log(Util.inspect(tree.toString(), false, null));
                    break;
                }
            }
        }
    };

    function Parser() {}
    Parser.prototype.parse = function(input) {
        run(this, new LineReader(input));
        return tree.toString();
    };

    return Parser;
});