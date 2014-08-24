define(function() {
    function ParserError(message, source, line) {
        this.name = "ParserError";
        if (line) {
            this.message = '[l:' + line + '] ';
            this.message += message || 'An error occurs during parsing.';
        } else {
            this.message = message || 'An error occurs during parsing.';
        }
        if (source) {
            this.message += '\n' + source;
        }
    }
    ParserError.prototype = Error.prototype;

    return ParserError;
});
