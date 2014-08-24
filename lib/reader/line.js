define(function() {
    'use strict';

    function LineReader(input) {
        this.lines       = input.split(/\r?\n/);
        this.position    = 0;
    }
    LineReader.prototype.current = function() {
        return this.lines[this.position - 1];
    };
    LineReader.prototype.next = function() {
        return this.lines[this.position++];
    };
    LineReader.prototype.hasNext = function() {
        return this.position + 1 <= this.lines.length;
    };
    LineReader.prototype.reset = function() {
        this.position = 0;
    };
    LineReader.prototype.getPosition = function() {
        return this.position - 1;
    };
    LineReader.prototype.get = function(offset) {
        return this.lines[offset];
    };
    LineReader.prototype.count = function() {
        return this.lines.length;
    };

    return LineReader;
});