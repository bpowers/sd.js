
REQUIRE   ?= node_modules/.bin/r.js
TSLINT    ?= node_modules/.bin/tslint
TSC       ?= node_modules/.bin/tsc
MOCHA     ?= node_modules/.bin/mocha

RUNTIME    = src/runtime.ts
# ensure runtime is only listed once
LIB_SRCS   = $(filter-out $(RUNTIME), $(wildcard src/*.ts)) $(RUNTIME)
RT_SRCS    = $(wildcard runtime/*.ts)
TEST_SRCS  = $(wildcard test/*.ts)

TEST       = test/.stamp

LIB        = sd.js
LIB_MIN    = sd.min.js

TARGETS    = $(LIB) $(LIB_MIN) lib
# make sure we recompile when the Makefile (and associated
# CFLAGS/LDFLAGS change) or any project files are changed.
CONFIG     = Makefile $(TSC) $(TSLINT) $(REQUIRE) build.js

RTEST_DIR  = test/test-models
RTEST_CMD  = $(RTEST_DIR)/regression-test.py

QUIET_RJS  =

# quiet output, but allow us to look at what commands are being
# executed by passing 'V=1' to make, without requiring temporarily
# editing the Makefile.
ifneq ($V, 1)
MAKEFLAGS += -s
QUIET_RJS  = >/dev/null
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
	@echo "  YARN"
	yarn install
	touch -c $@

$(TSC) $(TSLINT) $(REQUIRE): node_modules
	touch -c $@

build-rt: $(RT_SRCS) $(CONFIG)
	@echo "  TS    $@"
	$(TSLINT) -c tslint.json $(RT_SRCS)
	$(TSC) -p tsconfig.rt.json $(RT_SRCS)
	touch $@

$(RUNTIME): build-rt ./build-runtime.py
	@echo "  RT    $@"
	./build-runtime.py >$@

# commonjs-based node target.  JS is an endless sea of sadness - we
# need to run tsc twice, once for node's commonjs require style, and
# another time for require.js and the browser.
lib: $(LIB_SRCS) $(CONFIG)
	@echo "  TS    $@"
	$(TSC) -p tsconfig.lib.json $(LIB_SRCS)
	touch $@

$(LIB): build.js build $(RUNTIME) $(REQUIRE) $(ALMOND)
	@echo "  R.JS  $@"
	$(REQUIRE) -o $< $(QUIET_RJS)

$(LIB_MIN): build_min.js build $(REQUIRE) $(ALMOND)
	@echo "  R.JS  $@"
	$(REQUIRE) -o $< $(QUIET_RJS)

$(RTEST_CMD): $(RTEST_DIR) .gitmodules
	@echo "  GIT   $<"
	git submodule update --init
	touch $@

$(TEST): lib node_modules $(TEST_SRCS)
	@echo "  TS    test"
#	$(TSLINT) -c tslint.json $(TEST_SRCS)
	$(TSC) $(TSFLAGS) -d -m commonjs --outDir test $(TEST_SRCS)
	touch $@

test check: $(TEST)
	@echo "  TEST"
	$(MOCHA)

rtest: lib $(RTEST_CMD)
	./$(RTEST_CMD) ./bin/mdl.js $(RTEST_DIR)

clean:
	rm -rf build build-rt lib
	rm -f sd.js sd.min.js
	rm -f test/*.d.ts test/*.js
	find . -name '*~' | xargs rm -f

distclean: clean
	rm -rf node_modules

bump-tests: $(RTEST_CMD)
	cd $(RTEST_DIR) && git pull origin master
	git commit $(RTEST_DIR) -m 'test: bump test-models'

.PHONY: all clean distclean test rtest check bump-tests
