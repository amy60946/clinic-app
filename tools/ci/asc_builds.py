# App Store Connect'teki son derlemelerin durumunu yazdırır (TestFlight'ta neden görünmediğini anlamak için).
# Kullanım: python3 asc_builds.py <p8_dosyası> <bundle_id>   (ortam: ASC_KEY_ID, ASC_ISSUER_ID)
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
import jwt

p8, bundle = sys.argv[1], sys.argv[2]
now = int(time.time())
tok = jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 900, 'aud': 'appstoreconnect-v1'},
                 open(p8).read(), algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})

def get(path):
    req = urllib.request.Request('https://api.appstoreconnect.apple.com/v1' + path, headers={'Authorization': 'Bearer ' + tok})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        print('::error::App Store Connect API', e.code, e.read().decode()[:500]); sys.exit(1)

apps = get('/apps?filter[bundleId]=' + urllib.parse.quote(bundle))['data']
if not apps:
    print('::error::App Store Connect\'te %s kimlikli uygulama YOK. Apps → + → New App ile oluşturulmalı.' % bundle); sys.exit(1)
app = apps[0]
print('Uygulama: %s (Apple ID %s, bundle %s)' % (app['attributes']['name'], app['id'], bundle))
builds = get('/builds?filter[app]=%s&sort=-uploadedDate&limit=10&include=preReleaseVersion,buildBetaDetail' % app['id'])
inc = {(i['type'], i['id']): i['attributes'] for i in builds.get('included', [])}
if not builds['data']:
    print('Hiç derleme yok: Apple yüklemeyi kabul etmemiş ya da henüz listelemiyor (yüklemeden sonra birkaç dakika sürebilir).')
for b in builds['data']:
    a, rel = b['attributes'], b.get('relationships', {})
    ver = inc.get(('preReleaseVersions', (rel.get('preReleaseVersion', {}).get('data') or {}).get('id')), {}).get('version', '?')
    beta = inc.get(('buildBetaDetails', (rel.get('buildBetaDetail', {}).get('data') or {}).get('id')), {})
    print('- %s (%s) · yüklendi %s · işleme: %s · süre dolmuş: %s · şifreleme beyanı: %s · iç test: %s · dış test: %s' % (
        ver, a.get('version'), a.get('uploadedDate'), a.get('processingState'), a.get('expired'),
        a.get('usesNonExemptEncryption'), beta.get('internalBuildState'), beta.get('externalBuildState')))

# TestFlight çöküş geri bildirimleri (test eden kişi çöküş penceresinde "Paylaş" dediyse) ve çöküş kayıtları
subs = get('/apps/%s/betaFeedbackCrashSubmissions?limit=5' % app['id']).get('data', [])
print('\nTestFlight çöküş geri bildirimi: %d' % len(subs))
for s in subs:
    a = s['attributes']
    print('- %s · cihaz %s · iOS %s · yorum: %s' % (a.get('createdDate'), a.get('deviceModel'), a.get('osVersion'), a.get('comment')))
    log = get('/betaFeedbackCrashSubmissions/%s/crashLog' % s['id']).get('data', {}).get('attributes', {}).get('logText', '')
    print('\n'.join(log.splitlines()[:120]))
