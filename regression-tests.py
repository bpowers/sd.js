#!/usr/bin/env python

import csv
import os
import os.path
import re
import subprocess
import sys

BASE = 'test/compat'
EXTS = ['stmx', 'itmx', 'STMX', 'ITMX', 'mdl', 'MDL', 'xmile']

# from rainbow
def make_reporter(verbosity, quiet, filelike):
    if not quiet:
        def report(level, msg, *args):
            if level <= verbosity:
                if len(args):
                    filelike.write(msg % args + '\n')
                else:
                    filelike.write('%s\n' % (msg,))
    else:
        def report(level, msg, *args): pass
    return report

ERROR = 0
WARN = 1
INFO = 2
DEBUG = 3
log = make_reporter(DEBUG, False, sys.stderr)

def run_cmd(cmd):
    '''
    Runs a shell command, waits for it to complete, and returns stdout.
    '''
    call = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    out, err = call.communicate()
    return (call.returncode, out, err)

def slurp(file_name):
    with open(file_name, 'r') as f:
        return f.read().strip()

def load_csv(f, delimiter=','):
    result = []
    reader = csv.reader(f, delimiter=delimiter)
    header = reader.next()
    for i in range(len(header)):
        result.append([header[i]])
    for row in reader:
        for i in range(len(row)):
            result[i].append(row[i])
    series = {}
    for i in range(len(result)):
        series[result[i][0]] = result[i][1:]
    return series

def read_data(path):
    with open(path, 'r') as f:
        return load_csv(f)

NAME_RE = re.compile('\s+')

def e_name(n):
    return NAME_RE.sub('_', n)

def compare(reference, simulated):
    time = reference['time']
    steps = len(time)
    err = False
    for i in range(steps):
        for n, series in reference.items():
            n = e_name(n)
            ref = series[i]
            sim = simulated[n][i]
            if float(ref) == float(sim):
                continue
            if '.' in ref and '.' in sim and len(ref) != len(sim):
                ref_dec = ref.split('.')[1]
                sim_dec = sim.split('.')[1]
                decimals = min(len(ref_dec), len(sim_dec))
                ref = round(float(ref), decimals)
                sim = round(float(sim), decimals)
            if ref != sim:
                log(ERROR, 'time %s mismatch in %s (%s != %s)', time[i], n, ref, sim)
                err = True
        if err:
            break


def main():
    for model in os.listdir(BASE):
        for mpath in [os.path.join(BASE, model, 'model.' + ext) for ext in EXTS]:
            if not os.access(mpath, os.R_OK):
                continue
            log(DEBUG, 'testing %s', model)
            err, mdata, err_out = run_cmd('./xmilerun %s' % mpath)
            if err:
                log(ERROR, 'xmilerun failed: %s', err_out)
                break
            simulated = load_csv(mdata.split('\n'), '\t')
            dpath = os.path.join(BASE, model, 'data.csv')
            reference = read_data(dpath)
            compare(reference, simulated)
            break
if __name__ == '__main__':
    exit(main())
