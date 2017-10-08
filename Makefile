
TSLINT    ?= node_modules/.bin/tslint
TSC       ?= node_modules/.bin/tsc
MOCHA     ?= node_modules/.bin/mocha
ROLLUP    ?= node_modules/.bin/rollup

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
CONFIG     = Makefile $(TSC) $(TSLINT)

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

$(TSC) $(TSLINT) $(ROLLUP): node_modules
	touch -c $@

build-rt: $(RT_SRCS) $(CONFIG)
	@echo "  TS    $@"
	$(TSLINT) -c .tslint.json $(RT_SRCS)
	$(TSC) -p .tsconfig.rt.json
	touch $@

$(RUNTIME): build-rt support/build-runtime.js
	@echo "  RT    $@"
	./support/build-runtime.js $@

# commonjs-based node target.  JS is an endless sea of sadness - we
# need to run tsc twice, once for node's commonjs require style, and
# another time for require.js and the browser.
lib: $(LIB_SRCS) $(RUNTIME) $(CONFIG)
	@echo "  TS    $@"
	$(TSC) -p .tsconfig.lib.json
	touch $@

$(LIB): lib $(ROLLUP)
	@echo "  ROLL  $@"
	$(ROLLUP) -c .rollup.lib.js

$(LIB_MIN): lib $(ROLLUP)
	@echo "  TODO  $@"
#	$(ROLLUP) -c .rollup.lib-min.js

$(RTEST_CMD): $(RTEST_DIR) .gitmodules
	@echo "  GIT   $<"
	git submodule update --init
	touch $@

$(TEST): lib node_modules $(TEST_SRCS)
	@echo "  TS    test"
#	$(TSLINT) -c tslint.json $(TEST_SRCS)
	$(TSC) -p .tsconfig.test.json
	touch $@

test check: $(TEST)
	@echo "  TEST"
	$(MOCHA)

rtest: lib $(RTEST_CMD)
	./$(RTEST_CMD) ./bin/mdl.js $(RTEST_DIR)

clean:
	rm -rf build-rt lib
	rm -f sd.js sd.min.js
	rm -f test/*.d.ts test/*.js
	find . -name '*~' | xargs rm -f

distclean: clean
	rm -rf node_modules

bump-tests: $(RTEST_CMD)
	cd $(RTEST_DIR) && git pull origin master
	git commit $(RTEST_DIR) -m 'test: bump test-models'

.PHONY: all clean distclean test rtest check bump-tests
