
REQUIRE    ?= node_modules/.bin/r.js
BOWER      ?= node_modules/.bin/bower
TSLINT     ?= node_modules/.bin/tslint
TSC        ?= node_modules/.bin/tsc
MOCHA      ?= node_modules/.bin/mocha

ALMOND     = bower_components/almond
QJS        = bower_components/q/q.js
MUSTACHEJS = bower_components/mustache.js/mustache.js

TSFLAGS    = -t es5 --noImplicitAny --removeComments --sourceMap

RUNTIME    = src/runtime.ts
# ensure runtime is only listed once
LIB_SRCS   = $(filter-out $(RUNTIME), $(wildcard src/*.ts)) $(RUNTIME)
RT_SRCS    = $(wildcard runtime/*.ts)
TEST_SRCS  = $(wildcard test/*.ts)

LIB        = sd.js
LIB_MIN    = sd.min.js

TARGETS    = $(LIB) $(LIB_MIN) lib
# make sure we recompile when the Makefile (and associated
# CFLAGS/LDFLAGS change) or any project files are changed.
CONFIG     = Makefile $(TSC) $(BOWER) $(TSLINT) $(REQUIRE) build.js \
	$(shell find typings -name '*.d.ts')

QUIET_RJS =

# quiet output, but allow us to look at what commands are being
# executed by passing 'V=1' to make, without requiring temporarily
# editing the Makefile.
ifneq ($V, 1)
MAKEFLAGS += -s
QUIET_RJS = >/dev/null
endif

# GNU make, you are the worst.
.SUFFIXES:
%: %,v
%: RCS/%,v
%: RCS/%
%: s.%
%: SCCS/s.%


all: $(TARGETS)

node_modules: package.json
	@echo "  NPM"
	npm install --silent
	touch -c $@

$(TSC) $(BOWER) $(TSLINT) $(REQUIRE): node_modules
	touch -c $@

bower_components: $(BOWER) bower.json
	@echo "  BOWER"
	bower install --silent
	touch -c $@

$(ALMOND): bower_components
	touch -c $@

# AMD-based browser/requirejs target
build: $(LIB_SRCS) $(CONFIG) bower_components
	@echo "  TS    $@"
	$(TSLINT) -c .tslint.json $(LIB_SRCS)
	$(TSC) $(TSFLAGS) -m amd --outDir build $(LIB_SRCS)
	cp -a $(MUSTACHEJS) $(QJS) $@
	touch $@

build-rt: $(RT_SRCS) $(CONFIG)
	@echo "  TS    $@"
	$(TSLINT) -c .tslint.json $(RT_SRCS)
	$(TSC) $(TSFLAGS) -m commonjs --outDir build-rt $(RT_SRCS)
	touch $@

$(RUNTIME): build-rt ./build-runtime.py
	@echo "  RT    $@"
	./build-runtime.py >$@

# commonjs-based node target.  JS is an endless sea of sadness - we
# need to run tsc twice, once for node's commonjs require style, and
# another time for require.js and the browser.
lib: $(LIB_SRCS) $(CONFIG)
	@echo "  TS    $@"
	$(TSC) $(TSFLAGS) -d -m commonjs --outDir lib $(LIB_SRCS)
	touch $@

$(LIB): build.js build $(RUNTIME) $(REQUIRE) $(ALMOND)
	@echo "  R.JS  $@"
	$(REQUIRE) -o $< $(QUIET_RJS)

$(LIB_MIN): build_min.js build $(REQUIRE) $(ALMOND)
	@echo "  R.JS  $@"
	$(REQUIRE) -o $< $(QUIET_RJS)

test: lib node_modules $(TEST_SRCS)
	@echo "  TEST"
	$(TSLINT) -c .tslint.json $(TEST_SRCS)
	$(TSC) $(TSFLAGS) -d -m commonjs --outDir test $(TEST_SRCS)
	$(MOCHA)

clean:
	rm -rf build build-rt
	find . -name '*~' | xargs rm -f

distclean: clean
	rm -rf node_modules bower_components

.PHONY: all clean distclean test
