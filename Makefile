
TSLINT    ?= node_modules/.bin/tslint

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

# quiet output, but allow us to look at what commands are being
# executed by passing 'V=1' to make, without requiring temporarily
# editing the Makefile.
ifneq ($V, 1)
MAKEFLAGS += -s
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

$(LIB): node_modules
	@echo "  YARN  $@"
	yarn build

$(LIB_MIN): $(LIB)
	@echo "  TODO  $@"
	cp $(LIB) $(LIB_MIN)

$(RTEST_CMD): $(RTEST_DIR) .gitmodules
	@echo "  GIT   $<"
	git submodule update --init
	touch $@

test check: $(LIB)
	@echo "  TEST"
	yarn test

rtest: $(LIB) $(RTEST_CMD)
	./$(RTEST_CMD) ./bin/mdl.js $(RTEST_DIR)

clean:
	rm -rf build build-rt lib
	rm -f sd.js sd.min.js sd.js.map sd.min.js.map
	rm -f test/*.d.ts test/*.js
	find . -name '*~' | xargs rm -f

distclean: clean
	rm -rf node_modules

bump-tests: $(RTEST_CMD)
	cd $(RTEST_DIR) && git pull origin master
	git commit $(RTEST_DIR) -m 'test: bump test-models'

.PHONY: all clean distclean test rtest check bump-tests
