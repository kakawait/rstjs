define(function() {
	'use strict';

    if (typeof Object.create !== 'function') {
        (function () {
            var F = function () {};
            Object.create = function (o) {
                if (arguments.length > 1) { throw Error('Second argument not supported');}
                if (o === null) { throw Error('Cannot set a null [[Prototype]]');}
                if (typeof o != 'object') { throw new TypeError('Argument must be an object');}
                F.prototype = o;
                return new F();
            };
        })();
    }

    if (Function.prototype.name === undefined && Object.defineProperty !== undefined) {
        Object.defineProperty(Function.prototype, 'name', {
            get: function() {
                var funcNameRegex = /function\s+(.{1,})\s*\(/;
                var results = (funcNameRegex).exec((this).toString());
                return (results && results.length > 1) ? results[1] : '';
            },
            set: function(value) {}
        });
    }

    //---------------------------------------------------------------------------

    /*
     * @perf http://jsperf.com/endswith-lastindexof-regexp
     */
    String.prototype.endsWith = function(sub){
        var last = this.lastIndexOf(sub);
        return (~last) ? last + sub.length === this.length : false;
    };

    /*
     * @perf http://jsperf.com/ltrim-for-substring-vs-regex/3
     */
    String.prototype.rtrim = function() {
        return this.replace(/\s+$/g, '');
    };

    /* 
     * @perf http://jsperf.com/different-string-format-implementations/6 
     */
    String.prototype.format = function() {
        var format = this;
        for (var i = arguments.length - 1; i >= 0; i--) {
            var regexp = new RegExp('\\{' + i + '\\}', 'gm');
            format = format.replace(regexp, arguments[i]);
        }
        return format;
    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }
});