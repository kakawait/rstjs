define([
    'markup/core',
    'markup/parser/error', 
    'markup/reader/line', 
    'javascript-state-machine',
    'markup/tree',
    'markup/nodes',
    'markup/validator'
], function (Core, ParserError, LineReader, StateMachine, Tree, Nodes, Validator) {
    'use strict';

    var unicode = {
        openers:    '\u0f3a\u0f3c\u169b\u2045\u207d\u208d\u2329\u2768' +
                    '\u276a\u276c\u276e\u2770\u2772\u2774\u27c5\u27e6\u27e8\u27ea' +
                    '\u27ec\u27ee\u2983\u2985\u2987\u2989\u298b\u298d\u298f\u2991' +
                    '\u2993\u2995\u2997\u29d8\u29da\u29fc\u2e22\u2e24\u2e26\u2e28' +
                    '\u3008\u300a\u300c\u300e\u3010\u3014\u3016\u3018\u301a\u301d' +
                    '\u301d\ufd3e\ufe17\ufe35\ufe37\ufe39\ufe3b\ufe3d\ufe3f\ufe41' +
                    '\ufe43\ufe47\ufe59\ufe5b\ufe5d\uff08\uff3b\uff5b\uff5f\uff62' +
                    '\xab\u2018\u201c\u2039\u2e02\u2e04\u2e09\u2e0c\u2e1c\u2e20' +
                    '\u201a\u201e\xbb\u2019\u201d\u203a\u2e03\u2e05\u2e0a\u2e0d' +
                    '\u2e1d\u2e21\u201b\u201f',
        closers:    '\u0f3b\u0f3d\u169c\u2046\u207e\u208e\u232a\u2769' +
                    '\u276b\u276d\u276f\u2771\u2773\u2775\u27c6\u27e7\u27e9\u27eb' +
                    '\u27ed\u27ef\u2984\u2986\u2988\u298a\u298c\u298e\u2990\u2992' +
                    '\u2994\u2996\u2998\u29d9\u29db\u29fd\u2e23\u2e25\u2e27\u2e29' +
                    '\u3009\u300b\u300d\u300f\u3011\u3015\u3017\u3019\u301b\u301e' +
                    '\u301f\ufd3f\ufe18\ufe36\ufe38\ufe3a\ufe3c\ufe3e\ufe40\ufe42' +
                    '\ufe44\ufe48\ufe5a\ufe5c\ufe5e\uff09\uff3d\uff5d\uff60\uff63' +
                    '\xbb\u2019\u201d\u203a\u2e03\u2e05\u2e0a\u2e0d\u2e1d\u2e21' +
                    '\u201b\u201f\xab\u2018\u201c\u2039\u2e02\u2e04\u2e09\u2e0c' +
                    '\u2e1c\u2e20\u201a\u201e',
        delimiters: '\u058a\xa1\xb7\xbf\u037e\u0387\u055a-\u055f\u0589' +
                    '\u05be\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c' +
                    '\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d' +
                    '\u07f7-\u07f9\u0830-\u083e\u0964\u0965\u0970\u0df4\u0e4f' +
                    '\u0e5a\u0e5b\u0f04-\u0f12\u0f85\u0fd0-\u0fd4\u104a-\u104f' +
                    '\u10fb\u1361-\u1368\u1400\u166d\u166e\u16eb-\u16ed\u1735' +
                    '\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u180a\u1944\u1945' +
                    '\u19de\u19df\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-' +
                    '\u1b60\u1c3b-\u1c3f\u1c7e\u1c7f\u1cd3\u2010-\u2017\u2020-' +
                    '\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-' +
                    '\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2e00' +
                    '\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e1b\u2e1e\u2e1f\u2e2a-' +
                    '\u2e2e\u2e30\u2e31\u3001-\u3003\u301c\u3030\u303d\u30a0' +
                    '\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7' +
                    '\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f' +
                    '\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uabeb' +
                    '\ufe10-\ufe16\ufe19\ufe30-\ufe32\ufe45\ufe46\ufe49-\ufe4c' +
                    '\ufe50-\ufe52\ufe54-\ufe58\ufe5f-\ufe61\ufe63\ufe68\ufe6a' +
                    '\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c-\uff0f\uff1a' +
                    '\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65'
    },
    common = {
        escape:              /\x00/,
        whitespace:          /[ \n]/,
        whitespaceEscape:    /[ \x00\n]/,
        nonWhitespace:       /[^ \\n]/,
        nonWhitespaceEscape: /[^ \x00\n]/,
        simpleName:          /(?:(?!_)\w)+(?:[-._+:](?:(?!_)\w)+)*/,
        startString:         new RegExp('(?:^|\\s|[\'"\\(\\[\\{<\\-\\/:{0}{1}])'.format(unicode.openers, unicode.delimiters)),
        endString:           new RegExp('(?:$|\\s|[\'"\\)\\]\\}>\\-\\/:\\\\.,;!?{0}{1}])'.format(unicode.delimiters, unicode.closers))
    },
    lookBehind = {
        nonWhitespace: function(source, index) {
            return typeof source[index - 1] === 'string' && common.nonWhitespace.test(source[index - 1]); 
        },
        nonUnescapedWhitespaceEscape: function(source, index) {
            if (typeof source[index - 1] === 'string' && common.whitespaceEscape.test(source[index - 1])) {
                if (typeof source[index - 2] === 'string' && !common.escape.test(source[index - 2])) {
                    return false;
                }
            } 
            return true;
        } 
    }, 
    grammar = {
        block: {
            blank:          /^ *$/,
            bullet:         /^[*+\-•‣⁃](?: +|$)/,
            // enumerator:
            fieldMarker:    /^:(?![: ])([^:\\]|\\.)*( )?ll:( +|$)/,
            // optionMarker
            doctest:        /^>>>( +|$)/,
            lineBlock:      /^\|( +|$)/,
            // gridTable: 
            // simpleTable:
            explicitMarkup: /^\.\.( +|$)/,
            anonymous:      /__( +|$)/,
            line:           /^([!-\/:-@[-`{-~])\1* *$/,
            text:           /^.*$/
        },
        inline: {
            embeddedLink: new RegExp('((?:[ \\n]+|^)<({0}[^<>\x00]+(\x00_)?{0})>)$'.format(common.nonWhitespace.source)),
            initial: [
                {
                    groups:  ['start'],
                    pattern: '\\*\\*|\\*(?!\\*)|``|_`|\\|(?!\\|)',
                    suffix:  '(?!{0})'.format(common.whitespace.source)
                },
                {
                    groups:  ['whole', 'refname', 'refend', 'footnotelabel', '', 'citationlabel', 'fnend'],
                    pattern: '({0})(__?)|\\[([0-9]+|\\#({0})?|\\*|({0}))(\\]_)'.format(common.simpleName.source),
                    suffix:  common.endString.source
                },
                {
                    groups:  ['role', '', 'backquote'],
                    pattern: '`(?!`)',
                    prefix:  '((:{0}:)?)'.format(common.simpleName.source),
                    suffix:  '(?!{0})'.format(common.whitespace.source)
                }
            ],
            final: {
                literal: { 
                    lookBehind: lookBehind.nonWhitespace, 
                    pattern: '``' + common.endString.source 
                },
                emphasis: { 
                    lookBehind: lookBehind.nonWhitespace, 
                    pattern: '\\*' + common.endString.source 
                }, 
                strong: { 
                    lookBehind: lookBehind.nonWhitespace, 
                    pattern: '\\*\\*' + common.endString.source 
                },
                interpreted: { 
                    lookBehind: lookBehind.nonUnescapedWhitespaceEscape, 
                    groups: ['', 'suffix', 'role', 'refend'],
                    pattern: '(`((:{0}:)?(__?)?)){1}'.format(common.simpleName.source, common.endString.source)
                }
            }
        }
    };

    function Inliner() {
        this.groups = ['inline'];
        this.initial = common.startString.source + '(';
        for (var i = 0, len = grammar.inline.initial.length; i < len; i++) {
            var prefix = grammar.inline.initial[i].prefix || '',
                suffix = grammar.inline.initial[i].suffix || '';
            this.groups.push.apply(this.groups, grammar.inline.initial[i].groups);
            if ((i + 1) === len) {
                this.initial += prefix + '(' + grammar.inline.initial[i].pattern + ')' + suffix;
            } else {
                this.initial += prefix + '(' + grammar.inline.initial[i].pattern + ')' + suffix + '|';
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
        /*    if (grammar.inline.prefix.test(source.charAt(match.index - 1)) && 
                    grammar.inline.suffix.test(source.charAt(match.index + 1))) {
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
            openers = '"\'(<[{' + unicode.openers,
            closers = '"\')>]}' + unicode.closers;

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
        return this.inline(type, match, grammar.inline.final[type]);
    };
    Inliner.prototype.strong = function(match) {
        var type = 'strong';
        return this.inline(type, match, grammar.inline.final[type]);
    };
    Inliner.prototype.literal = function(match) {
        var type = 'literal';
        return this.inline(type, match, grammar.inline.final[type]);
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
            subject     = grammar.inline.final[type],
            endPosition = match.index + match[0].length,
            source      = match.input.substr(endPosition),
            role;

        if (role) {
            role = {value: role.substr(1, role.length - 2), position: 'prefix'};
        } else if (this.quoted(match)) {
            return null;
        }

        var pattern = new RegExp(grammar.inline.final[type].pattern, 'g'),
            found   = false,
            result;
        while ((result = pattern.exec(source)) && grammar.inline.final[type].lookBehind(source, result.index)) {
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
        if ((match = grammar.inline.embeddedLink.exec(source))) {
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
        { name: 'text',             to: 'Text', pattern: grammar.block.text },
        { name: 'line',             to: 'Line', pattern: grammar.block.line },
        //{ name: 'anonymous',        pattern: grammar.block.anonymous },
        //{ name: 'explicitMarkup',   pattern: grammar.block.explicitMarkup },
        // simpleTable:
        // gridTable: 
        //{ name: 'lineBlock',        pattern: grammar.block.lineBlock },
        //{ name: 'doctest',          pattern: grammar.block.doctest },
        // optionMarker
        //{ name: 'fieldMarker',      pattern: grammar.block.fieldMarker },
        // enumerator:
        //{ name: 'bullet',           pattern: grammar.block.bullet },
        { name: 'blank',            pattern: grammar.block.blank}
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
        { name: 'text',      to: 'Body', pattern: grammar.block.text },
        { name: 'underline', to: 'Body', pattern: grammar.block.line }
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
        { name: 'text',      to: 'Body', pattern: grammar.block.text },
        { name: 'underline', to: 'Body', pattern: grammar.block.line }
    ];
    LineState.prototype = Object.create(State.prototype);
    LineState.prototype.constructor = LineState;
    LineState.prototype.text = function() {
        var position    = this.lineReader.getPosition(),
            overline    = this.lineReader.get(position - 1).rtrim(),
            title       = this.lineReader.get(position).rtrim(),
            underline   = this.lineReader.next(),
            source      = overline + '\n' + title + '\n' + underline;

        if (!underline.match(grammar.block.line)) {
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