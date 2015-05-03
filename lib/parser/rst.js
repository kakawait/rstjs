define([
    'rstjs/core',
    'javascript-state-machine',
    'rstjs/parser/grammar',
    'rstjs/parser/unicode',
    'rstjs/reader/line',
    'rstjs/tree',
    'rstjs/nodes',
    'rstjs/validator',
    'rstjs/parser/error'
], function (Core, StateMachine, Grammar, Unicode, LineReader, Tree, Nodes, Validator, ParserError) {
    'use strict';

    function Inliner() {
        this.groups = ['inline'];
        // Recompose initials inline grammar
        this.initial = Grammar.common.startString.source + '(';
        for (var i = 0, len = Grammar.inline.initial.length; i < len; i++) {
            var prefix = Grammar.inline.initial[i].prefix || '',
                suffix = Grammar.inline.initial[i].suffix || '';
            this.groups.push.apply(this.groups, Grammar.inline.initial[i].groups);
            if ((i + 1) === len) {
                this.initial += prefix + '(' + Grammar.inline.initial[i].pattern + ')' + suffix;
            } else {
                this.initial += prefix + '(' + Grammar.inline.initial[i].pattern + ')' + suffix + '|';
            }
        }
        this.initial = new RegExp(this.initial + ')', 'g');
    }
    Inliner.STATES = {
        '*':  'emphasis',
        '**': 'strong',
        '`':  'interpretedOrPhraseRef',
        '``': 'literal',
        '_`': 'target',
        ']_': 'footnote',
        '|':  'subsitution',
        '_':  'reference',
        '__': 'anonymous'
    };
    Inliner.prototype.parse = function(source) {
        var match;
        while ((match = this.initial.exec(source))) {
            var method = Inliner.STATES[
                match[this.groups.indexOf('start') + 1] || 
                match[this.groups.indexOf('backquote') + 1] || 
                match[this.groups.indexOf('refend') + 1] ||
                match[this.groups.indexOf('fnend') + 1]
            ];
            if (typeof this[method] === 'function') {
                console.log('\t' + method + ': ' + this[method](match));
            }
        }
        /*    if (Grammar.inline.prefix.test(source.charAt(match.index - 1)) &&
                    Grammar.inline.suffix.test(source.charAt(match.index + 1))) {
                var state = states[match[1]];
                if (state) {
                    console.log(state(match));
                }
            }
        }*/ 
    };
    Inliner.prototype.escape = function(source) {
        return source.replace(/\\(.)?/g, function(match, $1) { return common.escape.source + $1; });
    };
    Inliner.prototype.unescape = function(source, backslash) {
        backslash = backslash || false;
        if (backslash) {
            return source.replace('/\x00/g', '\\');
        } else {
            return source.replace('/\x00/g', ' ');
        }
    };
    Inliner.prototype.quoted = function(match) {
        var pre     = match.input[match.index],
            post    = match.input[match.index + match[0].length],
            openers = '"\'(<[{' + Unicode.openers,
            closers = '"\')>]}' + Unicode.closers;

        if (match.index > 0) {
            var index = openers.indexOf(pre);
            if ((index = openers.indexOf(pre)) >= 0) {
                return post === closers[index];
            }
        }
        return false;
    };
    Inliner.prototype.inline = function(type, match, final) {
        var endPosition = match.index + match[0].length,
            source      = match.input.substr(endPosition);
        if (!this.quoted(match)) {
            var pattern = new RegExp(final.pattern, 'g'),
                result;
            while ((result = pattern.exec(source)) && final.lookBehind(source, result.index)) {
                return this.unescape(source.substring(0, result.index), true);
            }
            throw new ParserError('Inline ' + type + ' start-string without end-string.');
        }

        return null;
    };
    Inliner.prototype.emphasis = function(match) {
        var type = 'emphasis';
        return this.inline(type, match, Grammar.inline.final[type]);
    };
    Inliner.prototype.strong = function(match) {
        var type = 'strong';
        return this.inline(type, match, Grammar.inline.final[type]);
    };
    Inliner.prototype.literal = function(match) {
        var type = 'literal';
        return this.inline(type, match, Grammar.inline.final[type]);
    };
    Inliner.prototype.reference = function(match) {
        match;
        var type          = 'reference',
            // Todo normalization need to be a function
            referenceName = match[this.groups.indexOf('refname') + 1].toLowerCase().replace(/\s{2,}/g, ' ');

        new Nodes.Reference(referenceName);

    };
    Inliner.prototype.interpretedOrPhraseRef = function(match) {
        var type        = 'interpreted',
            subject     = Grammar.inline.final[type],
            endPosition = match.index + match[0].length,
            source      = match.input.substr(endPosition),
            role;

        if (role) {
            role = {value: role.substr(1, role.length - 2), position: 'prefix'};
        } else if (this.quoted(match)) {
            return null;
        }

        var pattern = new RegExp(Grammar.inline.final[type].pattern, 'g'),
            found   = false,
            result;
        while ((result = pattern.exec(source)) && Grammar.inline.final[type].lookBehind(source, result.index)) {
            found = true;
            break;
        }

        if (found) {
            var value       = source.substring(0, result.index),
                suffixRole  = result[subject.groups.indexOf('role') + 1];
            if (suffixRole) {
                if (role) {
                    throw new ParserError('Multiple roles in interpreted text ' + 
                        '(both prefix and suffix present; only one allowed).');
                } else {
                    role = {value: suffixRole.substr(1, suffixRole.length + 2), position: 'prefix'};
                }
            } 

            var suffix = result[subject.groups.indexOf('suffix') + 1];
            if (suffix.charAt(suffix.length - 1) === '_') {
                if (role) {
                    throw new ParserError('Mismatch: both interpreted text role {0} and ' + 
                        'reference suffix.'.format(rolePosition));
                }
                console.log('phrase_ref: ' + value);
                return this.phraseRef(value);
            } else {
                console.log('interpreted');
                return;
            }
            console.log(result);
        }
        throw new ParserError('Inline interpreted text or phrase reference start-string without end-string.');
    };
    Inliner.prototype.phraseRef = function(source) {
        var match,
            target;
        if ((match = Grammar.inline.embeddedLink.exec(source))) {
            var text    = this.unescape(source.substring(0, match.index)),
                alias   = {value: this.unescape(match[2], true)},
                isUri   = Validator.isUri(alias.value),
                isEmail = Validator.isEmail(alias.value);
            if (typeof alias.value === 'undefined') {
                throw new ParserError('problem with embedded link.');
            }
            if (alias.value.endsWith('_') && !(alias.value.endsWith('\\_') || (isUri || isEmail))) {
                alias.type = 'name';
                alias.value = alias.value.substr(0, alias.value.length - 1);
                // Normalize value
                alias.value = alias.value.toLowerCase().replace(/\s{2,}/g, ' ');
                target = new Nodes.Target(match[1], alias.value);
                // target.indirect_reference_name = aliastext[:-1]
            } else {
                alias.type = 'uri';
                alias.value = alias.value.replace(/ +/g, '');
                if (isEmail) {
                    alias.value = 'mailto:' + alias.value;
                }
                if (alias.value.endsWith('\\_')) {
                    alias.value = alias.value.substr(0, alias.value.length - 2) + '_';
                }
                target = new Nodes.Target(match[1], alias.value);
                // target.referenced = 1
            }
        }

        var refname = match.input.substring(0, match.index),
            reference = new Nodes.Reference(refname),
            nodes = [reference];

        //if (match.input.substring(0, -2));
        // TODO: finish the function lol
    };

    //---------------------------------------------------------------------------

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
            if (typeof this._states[key] !== 'undefined') {
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

        inliner.parse(lines);
        
        // TODO: finish the function lol
        //lines;
        // paragraph(lines, lineno)


    };
    TextState.prototype.underline = function() {
        var title       = context[0],
            underline   = this.lineReader.current().rtrim(),
            source      = title + '\n' + underline;

        if (title.length > underline.length) {
            throw new ParserError('Title underline too short.', source , position);
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