# src altındaki her supabase.rpc('ad', { anahtarlar }) çağrısını gerçek şemadaki işlev imzasıyla karşılaştırır.
import re, glob, json, subprocess, collections
def q(db, sql):
    out = subprocess.run(['psql', '-d', db, '-At', '-F', '\t', '-c', sql], capture_output=True, text=True).stdout
    return [l.split('\t') for l in out.strip().split('\n') if l]
def fns(db):
    d = collections.defaultdict(list)
    for name, args, nargs, ndef in q(db, "select p.proname, coalesce(array_to_string(p.proargnames, ','), ''), p.pronargs, p.pronargdefaults from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"):
        names = [x for x in args.split(',') if x][: int(nargs)]
        d[name].append((names, int(nargs) - int(ndef)))
    return d
import os, sys
LIVE, PROP = (sys.argv[1:3] + ['qa_canli', 'qa_onerili'][len(sys.argv[1:3]):])[:2]
live, prop = fns(LIVE), fns(PROP)
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src')
calls = []
for f in glob.glob(SRC + '/**/*.ts*', recursive=True):
    src = open(f).read()
    for m in re.finditer(r"\.rpc\(\s*'([\w]+)'\s*(?:,\s*(\{))?", src):
        name = m.group(1); keys = []
        if m.group(2):
            i = m.end() - 1; depth = 0; j = i
            while j < len(src):
                if src[j] == '{': depth += 1
                elif src[j] == '}':
                    depth -= 1
                    if depth == 0: break
                j += 1
            body = src[i + 1:j]
            # yalnız en üst düzey anahtarlar
            depth = 0; cur = ''
            for ch in body:
                if ch in '{[(': depth += 1
                if ch in '}])': depth -= 1
                if ch == ',' and depth == 0: keys.append(cur); cur = ''
                else: cur += ch
            keys.append(cur)
            keys = [re.match(r"\s*(?:\.\.\.)?\s*([\w]+)", k).group(1) for k in keys if re.match(r"\s*([\w]+)\s*(:|,|$)", k)]
        calls.append((f.split('src/')[1], src[:m.start()].count('\n') + 1, name, keys))
def ok(d, name, keys):
    if name not in d: return 'yok'
    for names, req in d[name]:
        if set(keys) <= set(names) and all(n in keys for n in names[:req]): return None
    return f"parametre uymuyor: kod {keys} · şema {[n for n, _ in d[name]]}"
bad = []
for f, line, name, keys in calls:
    l, p = ok(live, name, keys), ok(prop, name, keys)
    if l and p: bad.append(f'GERÇEK? {f}:{line} {name} → {p}')
    elif l: bad.append(f'bekleyen SQL {f}:{line} {name}')
print(f'{len(calls)} çağrı, {len(set(c[2] for c in calls))} işlev')
for b in sorted(set(bad)): 
    if b.startswith('GERÇEK'): print(b)
print('bekleyen SQL\'e bağlı:', len([b for b in bad if b.startswith('bekleyen')]))
