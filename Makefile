
all: build

build: build/sd.js
	cp -r deps build
	cp test/data/lynx-hares2.xml build
	cp examples/tester.html build/index.html

build/sd.js: lib/*.js
	mkdir -p build
	node_modules/.bin/r.js -o build.js

jsdeps:
	mkdir -p libh/vendor
	curl -o lib/vendor/backbone.js   'http://backbonejs.org/backbone.js'
	curl -o lib/vendor/require.js    'http://requirejs.org/docs/release/2.1.9/comments/require.js'
	curl -o lib/vendor/underscore.js 'http://underscorejs.org/underscore.js'
	curl -o lib/vendor/jquery.js     'http://code.jquery.com/jquery-2.0.3.js'
	curl -o lib/vendor/raphael.js    'https://raw.github.com/DmitryBaranovskiy/raphael/master/raphael.js'
	curl -o lib/vendor/task.js       'https://raw.github.com/mozilla/task.js/master/lib/task.js'
	curl -o lib/vendor/q.js          'https://raw.github.com/kriskowal/q/v0.9/q.js'
	curl -o lib/vendor/mustache.js   'https://raw.github.com/janl/mustache.js/master/mustache.js'

clean:
	rm -rf build

check:
	node_modules/.bin/nodeunit test/runner.js

.PHONY: check all
