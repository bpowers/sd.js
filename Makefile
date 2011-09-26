
all:

check:
	nodeunit test/runner.js

.PHONY: check