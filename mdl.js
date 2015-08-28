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


OUT=`mktemp --suffix=.js`

node emit_sim.js "$model" >"$OUT"
#time ~/src/v8/out/native/d8 --use-strict --harmony worker.js
node "$OUT"

if [ $work = 'yes' ]; then
    echo "$OUT"
else
    rm -f "$OUT"
fi
