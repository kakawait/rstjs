var requirejs = require('requirejs');

requirejs.config({
    paths: {
        markup: './lib'
    },
    nodeRequire: require
});

requirejs(['fs', 'markup/parser/rst'], function(fs, Rst) {
    var file = 'demo/test.rst';
    fs.readFile(file, 'utf-8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        console.log(new Rst().parse(data));
    });
});

