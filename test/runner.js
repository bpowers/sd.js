
dataStore = {};

if (typeof module !== 'undefined' && module.exports) {
    var fs = require('fs');
    dataStore.getFile = function(path, cb) {
        fs.readFile('test/data/lynx-hares2.xml', function(err, data) {
            cb(err, data);
        });
    }

    var requirejs = require('requirejs');
    requirejs.config({
        nodeRequire: require,
        baseUrl: '.',
    });

    $ = require('jquery');

    requirejs(['test/testsuite'], function(suite){
        exports.suite = suite;
    });

} else {
    dataStore.getFile = function(path, cb) {
        $.ajax(path, {
            'dataType': 'text',
            'success': function(data) {
                cb(null, data);
            }
        });
    }

    require(['./testsuite'], function(suite){
        //run the tests when document is ready
        $(function(){
            nodeunit.run({
                'Engine Tests': suite
            });
        });
    });

}
