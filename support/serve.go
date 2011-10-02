// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// For quickly serving any directory to a browser, since Chrome
// doesn't like scripts on the local file system doing XHRs.
package main

import (
	"http"
	"log"
	"fmt"
	"flag"
	"exec"
)

var addr string

// if an address is specified on the command line, use it. Otherwise
// default to localhost:1337
func init() {
	flag.Parse()
	if len(flag.Args()) > 0 {
		addr = flag.Args()[0]
	} else {
		addr = ":1337"
	}
}

// Opens the given address in a browser on Linux systems.
func openInBrowser(addr string) {
	// this is a bit hacky, but make sure we have a hostname (and
	// not just a port)
	if addr[0] == ':' {
		addr = "localhost" + addr
	}
	addr = "http://" + addr

	// Simply exec xdg-open with the URL
	if err := exec.Command("xdg-open", addr).Run(); err != nil {
		log.Fatal("xdg-open: ", err.String())
	}
}

func main() {
	fmt.Printf("serving at %s\n", addr)

	http.Handle("/", http.FileServer(http.Dir(".")))
	go openInBrowser(addr)
	err := http.ListenAndServe(addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err.String())
	}
}
