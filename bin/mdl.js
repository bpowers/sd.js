#!/bin/bash
set -e

work=no
model=''

while (( $# > 0 )); do
    arg="$1"
    shift
    case $arg in
    -work)
	work=yes
	;;
    -*)
	echo "unknown flag: $arg"
	exit 1
	;;
    *)
	model="$arg"
        ;;
    esac
done

pushd "`dirname $0`" >/dev/null
SDJS_DIR="`pwd -P`"
popd >/dev/null


OUT=`mktemp --suffix=.js`

node "$SDJS_DIR/emit_sim.js" "$model" >"$OUT"
#time ~/src/v8/out/native/d8 --use-strict --harmony worker.js
node "$OUT"

if [ $work = 'yes' ]; then
    echo "$OUT" >&2
else
    rm -f "$OUT"
fi
