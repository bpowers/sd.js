
all: build

build: build/sd.js
	cp -r deps build
	cp test/data/lynx-hares2.xml build
	cp examples/tester.html build/index.html

build/sd.js: lib/*.js
	mkdir -p build
	node_modules/.bin/r.js -o name=lib/sd out=build/sd.js baseUrl=. paths.requireLib=deps/require include=requireLib

clean:
	rm -rf build

check:
	node_modules/.bin/nodeunit test/runner.js

.PHONY: check all
