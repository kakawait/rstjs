define([
    'rstjs/parser/grammar',
    'rstjs/util/unicode',
    'rstjs/nodes',
    'rstjs/validator',
    'rstjs/parser/error'
], function(Grammar, Unicode, Nodes, Validator, ParserError) {
    'use strict';

    function escape(source) {
        return source.replace(/\\(.)?/g, function(match, $1) { return Grammar.common.escape.source + $1; });
    }

    function unescape(source, backslash) {
        backslash = backslash || false;
        if (backslash) {
            return source.replace('/\x00/g', '\\');
        } else {
            return source.replace('/\x00/g', ' ');
        }
    }

    function isQuoted(match) {
        var pre     = match.input[match.index],
            post    = match.input[match.index + match[0].length],
            openers = '"\'(<[{' + Unicode.openers,
            closers = '"\')>]}' + Unicode.closers;

        if (match.index > 0) {
            var index = openers.indexOf(pre);
            if (index >= 0) {
                return post === closers[index];
            }
        }
        return false;
    }

    // todo: IN PROGRESS
    function phraseRef(match2, lastPosition, source, suffix) {
        var match,
            target;
        if ((match = Grammar.inline.embeddedLink.exec(source))) {
            var text    = unescape(source.substring(0, match.index)),
                alias   = {value: unescape(match[2], true)},
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
                //target.indirectReferenceName = aliastext[:-1]
            } else {
                alias.type = 'uri';
                alias.value = alias.value.replace(/ +/g, '');
                // adjust Uri for mail
                if (isEmail) {
                    alias.value = 'mailto:' + alias.value;
                }
                if (alias.value.endsWith('\\_')) {
                    alias.value = alias.value.substr(0, alias.value.length - 2) + '_';
                }
                target = new Nodes.Target(match[1], alias.value);
                target.referenced = true
            }

            if (!text) {
                text = alias.value;
            }
        }

        var refname = match.input.substring(0, match.index),
            reference = new Nodes.Reference(refname.replace(/ +/g, ' ')),
            nodes = [reference];

        if (suffix.slice(-2) === '__') {
            if (target && alias.type === 'name') {
                reference.refname = alias.value;
            } else if (target && alias.type === 'uri') {
                reference.refuri = alias.value;
            } else {
                reference.anonymous = true;
            }
        } else {
            // TODO: finish implementation
        }

        return {
            before: new Nodes.Text(match2.input.substring(lastPosition, match2.index + 1)),
            inline: reference,
            endPosition: 0 // TODO: calculate end position
        };
    }

    function Parser() {
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
    Parser.STATES = {
        '*':  'emphasis',
        '**': 'strong',
        //'`':  'interpretedOrPhraseRef',
        '``': 'literal'
        //'_`': 'target',
        //']_': 'footnote',
        //'|':  'subsitution',
        //'_':  'reference',
        //'__': 'anonymous'
    };
    Parser.prototype.inline = function(type, match, lastPosition, final) {
        var endPosition = match.index + match[0].length,
            before      = match.input.substring(lastPosition, endPosition - match[this.groups.indexOf('start') + 1].length),
            source      = match.input.substr(endPosition);
        if (!isQuoted(match)) {
            var pattern = new RegExp(final.pattern, 'g'),
                result;
            if ((result = pattern.exec(source)) && final.lookBehind(source, result.index)) {
                var value = unescape(source.substring(0, result.index), true);
                return {
                    before: new Nodes.Text(before),
                    inline: new Nodes[type.capitalize()](value),
                    endPosition: endPosition + value.length + match[this.groups.indexOf('start') + 1].length
                };
            }
            throw new ParserError('Inline ' + type + ' start-string without end-string.');
        } else {
            // Todo: handle isQuoted
        }

        return null;
    };
    Parser.prototype.emphasis = function(match, lastPosition) {
        var type = 'emphasis';
        return this.inline(type, match, lastPosition, Grammar.inline.final[type]);
    };
    Parser.prototype.strong = function(match, lastPosition) {
        var type = 'strong';
        return this.inline(type, match, lastPosition, Grammar.inline.final[type]);
    };
    Parser.prototype.literal = function(match, lastPosition) {
        var type = 'literal';
        return this.inline(type, match, lastPosition, Grammar.inline.final[type]);
    };
    // TODO: finish implementation
    Parser.prototype.reference = function(match) {
        var type          = 'reference',
        // Todo normalization need to be a function
            referenceName = match[this.groups.indexOf('refname') + 1].toLowerCase().replace(/\s{2,}/g, ' ');

        new Nodes.Reference(referenceName);

    };
    // TODO: finish implementation
    Parser.prototype.interpretedOrPhraseRef = function(match, lastPosition) {
        var type        = 'interpreted',
            subject     = Grammar.inline.final[type],
            endPosition = match.index + match[0].length,
            source      = match.input.substr(endPosition),
            role;

        if (role) {
            role = {value: role.substr(1, role.length - 2), position: 'prefix'};
        } else if (isQuoted(match)) {
            // Todo handle isQuoted
            return null;
        }

        var pattern = new RegExp(Grammar.inline.final[type].pattern, 'g'),
            result;
        if ((result = pattern.exec(source)) && Grammar.inline.final[type].lookBehind(source, result.index)) {
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
                //console.log('phrase_ref: ' + value);
                return phraseRef(match, lastPosition, value, suffix);
            } else {
                console.log('interpreted');
                return;
            }
            console.log(result);
        }
        throw new ParserError('Inline interpreted text or phrase reference start-string without end-string.');
    };
    // TODO: finish implementation
    Parser.prototype.parse = function(source) {
        var match,
            lastPosition = 0,
            nodes = [];
        while ((match = this.initial.exec(source))) {
            var method = Parser.STATES[
            match[this.groups.indexOf('start') + 1] ||
            match[this.groups.indexOf('backquote') + 1] ||
            match[this.groups.indexOf('refend') + 1] ||
            match[this.groups.indexOf('fnend') + 1]
                ];
            if (typeof this[method] === 'function') {
                var result = this[method](match, lastPosition);
                nodes = nodes.concat([result.before, result.inline]);
                console.log('\t' + method + ': ' + result.inline.getValue());
                lastPosition = result.endPosition;
            }
        }

        return nodes;
        /*    if (Grammar.inline.prefix.test(source.charAt(match.index - 1)) &&
         Grammar.inline.suffix.test(source.charAt(match.index + 1))) {
         var state = states[match[1]];
         if (state) {
         console.log(state(match));
         }
         }
         }*/
    };

    return Parser;
});