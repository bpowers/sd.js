
TSLINT    ?= node_modules/.bin/tslint

RUNTIME    = src/runtime.ts
# ensure runtime is only listed once
LIB_SRCS   = $(filter-out $(RUNTIME), $(wildcard src/*.ts)) $(RUNTIME)
RT_SRCS    = $(wildcard runtime/*.ts)
TEST_SRCS  = $(wildcard test/*.ts)

TEST       = test/.stamp

LIB        = lib

TARGETS    = $(LIB)
# make sure we recompile when the Makefile (and associated
# CFLAGS/LDFLAGS change) or any project files are changed.
CONFIG     = Makefile package.json $(TSC) $(TSLINT)

RTEST_DIR  = test/test-models
RTEST_CMD  = $(RTEST_DIR)/regression-test.py

RTEST_EXCLUDES = -x '(subscript|macro|initial_function|stocks_with_expressions|active_initial|smooth_and_stock|euler_step_vs_saveper|special_characters)'

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

$(LIB): node_modules $(LIB_SRCS) $(RT_SRCS) $(CONFIG)
	@echo "  YARN  $@"
	yarn build
	touch -c $@

$(RTEST_CMD): $(RTEST_DIR) .gitmodules
	@echo "  GIT   $<"
	git submodule update --init
	touch -c $@

test check: $(LIB) $(RTEST_CMD)
	@echo "  TEST"
	yarn test

rtest: $(LIB) $(RTEST_CMD)
	./$(RTEST_CMD) $(RTEST_EXCLUDES) ./bin/mdl.js $(RTEST_DIR)

clean:
	rm -rf build build-rt lib
	rm -f sd.js sd.min.js sd.js.map sd.min.js.map
	rm -f test/*.d.ts test/*.js
	find . -name '*~' | xargs rm -f

distclean: clean
	rm -rf node_modules

format:
	yarn format

pre-commit: test rtest
	yarn needs-format # we can't format in pre-commit, just check
	yarn lint

install-git-hooks:
	rm -f .git/hooks/pre-commit
	ln -s ../../support/pre-commit.hook .git/hooks/pre-commit

bump-tests: $(RTEST_CMD)
	cd $(RTEST_DIR) && git pull origin master
	git commit $(RTEST_DIR) -m 'test: bump test-models'

.PHONY: all clean distclean test rtest check format pre-commit install-git-hooks bump-tests
