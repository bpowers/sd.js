include $(GOROOT)/src/Make.inc

TARG = serve
GOFILES = \
	serve.go

include $(GOROOT)/src/Make.cmd

.PHONY: gofmt
gofmt:
	gofmt -w $(GOFILES)
