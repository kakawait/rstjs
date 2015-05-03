define(['rstjs/parser/unicode'], function(Unicode) {
    'use strict';

    var common = {
        escape:              /\x00/,
        whitespace:          /[ \n]/,
        whitespaceEscape:    /[ \x00\n]/,
        nonWhitespace:       /[^ \\n]/,
        nonWhitespaceEscape: /[^ \x00\n]/,
        simpleName:          /(?:(?!_)\w)+(?:[-._+:](?:(?!_)\w)+)*/,
        startString:         new RegExp('(?:^|\\s|[\'"\\(\\[\\{<\\-\\/:{0}{1}])'.format(Unicode.openers, Unicode.delimiters)),
        endString:           new RegExp('(?:$|\\s|[\'"\\)\\]\\}>\\-\\/:\\\\.,;!?{0}{1}])'.format(Unicode.delimiters, Unicode.closers))
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
    block = {
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
    inline = {
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
    };

    return {
        common: common,
        block: block,
        inline: inline,
        lookBehind: lookBehind
    };
});