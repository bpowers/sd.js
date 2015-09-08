// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

declare module "xmldom" {
	export var DOMParser: {
		prototype: DOMParser;
		new(): DOMParser;
	};
	export var XMLSerializer: {
		prototype: XMLSerializer;
		new(): XMLSerializer;
	};
	export var DOMImplementation: {
		prototype: DOMImplementation;
		new(): DOMImplementation;
	}
}
