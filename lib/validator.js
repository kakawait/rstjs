define(['valid-url', 'valid-email'], function(url, email) {
    'use strict'; 

    return {
        isUri: function(suspect) {
            return url.isUri(suspect) ? true : false;
        },
        isEmail: email
    };
});