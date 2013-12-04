
all: build

build: build/sd.js
	cp test/data/lynx-hares2.xml build
	cp examples/tester.html build/index.html

lib/runtime.js: lib/runtime_src.js
	python quote_runtime.py >$@

build/sd.js: lib/*.js build.js lib/vendor/*.js lib/runtime.js
	mkdir -p build
	node_modules/.bin/r.js -o build.js
	cat lib/vendor/{mustache,q,snapsvg}.js build/sd.nakid.js >build/sd.js

jsdeps:
	mkdir -p lib/vendor
	curl -o lib/vendor/require.js    'http://requirejs.org/docs/release/2.1.9/comments/require.js'

clean:
	rm -rf build
	rm -f lib/runtime.js

check:
	node_modules/.bin/nodeunit test/runner.js

.PHONY: check all
