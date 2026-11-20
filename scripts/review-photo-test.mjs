// Tests for which card galleries an approved photo goes into (supabase/functions/review-photo/gallery.ts): `node scripts/review-photo-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({ entryPoints: [join(root, 'supabase/functions/review-photo/gallery.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
const { galleryAfterApproval: g } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m) } else console.log('  ok   ' + m) }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

ok(eq(g('server', ['a'], 'u'), ['a', 'u']), 'server photo is appended')
ok(eq(g('server', ['u'], 'u'), ['u']), 'server photo is not duplicated')
ok(eq(g('server', null, 'u'), ['u']), 'server photo on a null gallery')
ok(eq(g('member', null, 'u'), ['u']), 'member photo fills a null gallery')
ok(eq(g('member', [], 'u'), ['u']), 'member photo fills an empty gallery')
ok(g('member', ['a'], 'u') === null, 'member photo leaves a gallery that has photos unchanged')
// Review Focus 5: library row has no photos, the trip copy has -> only the library row gets it, and the other way round
ok(eq(g('member', [], 'u'), ['u']) && g('member', ['a'], 'u') === null, 'library row empty + trip copy with photos: decided separately')
ok(eq(g('member', ['b'], 'u'), null) && eq(g('member', [], 'u'), ['u']), 'library row with photos + empty trip copy: decided separately')

if (bad) { console.log(bad + ' failed'); process.exit(1) }
console.log('all passed')
