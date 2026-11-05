# Önizlemede kaydedilen her veritabanı isteğini yerel PostgreSQL'deki gerçek şemayla karşılaştırır.
import json, subprocess, sys, re, collections
def q(db, sql):
    out = subprocess.run(['psql', '-d', db, '-At', '-F', '\t', '-c', sql], capture_output=True, text=True).stdout
    return [l.split('\t') for l in out.strip().split('\n') if l]
def schema(db):
    cols = collections.defaultdict(set)
    for t, c in q(db, "select table_name, column_name from information_schema.columns where table_schema='public'"): cols[t].add(c)
    fks = collections.defaultdict(list)  # (a,b) -> [(conname, column)]
    for a, b, con, col in q(db, "select c.conrelid::regclass::text, c.confrelid::regclass::text, c.conname, a.attname from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1] where c.contype='f'"):
        fks[(a, b)].append((con, col))
    fns = collections.defaultdict(list)
    for name, args, nargs, ndef in q(db, "select p.proname, coalesce(array_to_string(p.proargnames, ','), ''), p.pronargs, p.pronargdefaults from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"):
        names = [x for x in args.split(',') if x][: int(nargs)]
        fns[name].append((names, int(nargs) - int(ndef)))
    return cols, fks, fns
def split_top(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch == ',' and depth == 0: out.append(cur.strip()); cur = ''
        else: cur += ch
    if cur.strip(): out.append(cur.strip())
    return out
def check_select(table, sel, S, probs, at):
    cols, fks, _ = S
    for item in split_top(sel):
        if item == '*' or item.startswith('count'): continue
        m = re.match(r'^(?:([\w]+):)?([\w]+)(?:!([\w]+))?\((.*)\)$', item, re.S)
        if m:
            alias, rel, hint, inner = m.groups()
            links = fks.get((table, rel), []) + fks.get((rel, table), [])
            if rel not in cols: probs.add(f'{at}: {table} gömme: {rel} tablosu yok'); continue
            if not links: probs.add(f'{at}: {table} → {rel} ilişkisi yok')
            elif hint: 
                if not any(hint in (c, col) for c, col in links): probs.add(f'{at}: {table} → {rel}!{hint} ipucu eşleşmiyor ({links})')
            elif len(links) > 1: probs.add(f'{at}: {table} → {rel} BELİRSİZ ({len(links)} bağ: {[c for c, _ in links]}) — PGRST201')
            check_select(rel, inner, S, probs, at)
            continue
        name = item.split(':')[-1].split('::')[0].strip()
        if name not in cols.get(table, set()): probs.add(f'{at}: {table}.{name} sütunu yok')
def run(db, calls):
    S = schema(db); cols, fks, fns = S
    probs = set()
    for c in calls:
        at = c.get('at', '?')
        if 'rpc' in c:
            f = fns.get(c['rpc'])
            if not f: probs.add(f"rpc {c['rpc']} yok"); continue
            args = set(c['args'])
            if not any(args <= set(n) and len([x for x in n[:req] if x not in args]) == 0 for n, req in f):
                probs.add(f"rpc {c['rpc']}({','.join(sorted(args))}) parametreleri uymuyor: {[n for n, _ in f]}")
            continue
        t = c['table']
        if t not in cols: probs.add(f'{at}: tablo {t} yok'); continue
        if c.get('cols') and c['cols'] != '*': check_select(t, c['cols'], S, probs, at)
        for k in (c.get('keys') or []) + ([c['order']] if c.get('order') else []) + (c.get('payload') or []) + (c.get('conflict') or []):
            if k not in cols[t]: probs.add(f'{at}: {t}.{k} sütunu yok ({c["op"]})')
    return probs
calls = json.load(open(sys.argv[1]))
LIVE, PROP = (sys.argv[2:4] + ['qa_canli', 'qa_onerili'][len(sys.argv[2:4]):])[:2]
live = run(LIVE, calls); prop = run(PROP, calls)
print(f'istek: {len(calls)} (tekil tablo/işlev: {len(set(c.get("rpc") or c.get("table") for c in calls))})')
print('== Canlı şemada sorun, önerilerle de sorun (gerçek hata adayı):')
for p in sorted(live & prop): print('  ', p)
print('== Yalnız canlıda yok (bekleyen öneri SQL\'inde var; uygulama eski sunucuya düşmeli):')
for p in sorted(live - prop): print('  ', p)
