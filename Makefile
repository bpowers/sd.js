
all: dist

dist: dist/sd.js
	@cp test/data/lynx-hares2.xml dist
	@cp examples/tester.html dist/index.html

node_modules:
	@npm install
	@touch $@

node_modules/.bin/r.js: package.json node_modules
	@touch $@

lib/runtime_ugly.js: lib/runtime_src.js Makefile
	@cp lib/runtime_src.js $@
#	node_modules/.bin/uglifyjs lib/runtime_src.js -c -m -o $@

lib/runtime.js: lib/runtime_ugly.js lib/epilogue_src.js lib/draw.css quote_runtime.py Makefile
	python quote_runtime.py >$@

dist/sd.js: lib/*.js build.js lib/vendor/*.js lib/runtime.js node_modules/.bin/r.js
	@mkdir -p dist
	@node_modules/.bin/r.js -o build.js
	@cat lib/vendor/{mustache,q,snapsvg}.js dist/sd.nakid.js >dist/sd.js

hint: lib/runtime.js
	node_modules/.bin/jshint --config .jshintrc lib/*.js

jsdeps:
	mkdir -p lib/vendor
	curl -o lib/vendor/require.js    'http://requirejs.org/docs/release/2.1.9/comments/require.js'

clean:
	rm -rf dist
	rm -f lib/runtime.js

check:
	@node_modules/.bin/nodeunit test/runner.js

.PHONY: all dist hint jsdeps clean check
