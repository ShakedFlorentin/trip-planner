// Tests for sending review photos (src/views/photoSend.ts): `node scripts/photo-send-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [join(root, 'src/views/photoSend.ts')], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\.\.\/supabase$/ }, () => ({ path: 'supabase', namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = new Proxy({}, { get: (_, k) => globalThis.sb[k] })' }))
  } }],
})
// the photo is "drawn" by a stub canvas
globalThis.createImageBitmap = async () => ({ width: 100, height: 50, close() {} })
globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: (cb) => cb(new Blob(['x'])) }) }
const { sendPhotos, MAX_PHOTOS_PER_REVIEW } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

console.error = () => {}
let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m) } else console.log('  ok   ' + m) }

/** a stub client: uploadFails / insertFails are 1-based call numbers that error */
const stub = ({ uploadFails = [], insertFails = [], insertError = { code: 'x', message: 'boom' } } = {}) => {
  const log = { uploads: [], inserts: [], removed: [] }
  globalThis.sb = {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    storage: { from: () => ({
      upload: async (path) => { log.uploads.push(path); return uploadFails.includes(log.uploads.length) ? { error: new Error('up') } : { error: null } },
      remove: async (paths) => { log.removed.push(...paths); return { error: null } },
    }) },
    from: () => ({ insert: async (row) => { log.inserts.push(row); return insertFails.includes(log.inserts.length) ? { error: insertError } : { error: null } } }),
  }
  return log
}
const files = ['f1', 'f2', 'f3'].map((n) => ({ name: n }))
const o = { tripId: 't1', libraryId: 'l1' }

ok(MAX_PHOTOS_PER_REVIEW === 5, 'at most 5 photos per review')

let log = stub()
let r = await sendPhotos(files, o)
ok(r.sent === 3 && r.failed.length === 0 && !r.capped, 'all three sent')
ok(log.inserts.every((x) => x.library_id === 'l1' && x.trip_id === 't1' && x.rights_confirmed === true), 'rows carry card, trip and the rights tick')
ok(log.uploads.every((p) => p.startsWith('t1/u1/') && p.endsWith('.jpg')), 'path is trip/user/uuid.jpg')

log = stub({ uploadFails: [2] })
r = await sendPhotos(files, o)
ok(r.sent === 2 && r.failed.length === 1 && r.failed[0] === files[1] && !r.capped, 'upload of file 2 fails: 2 sent, file 2 kept for retry')

log = stub({ insertFails: [2], insertError: { code: '42501', message: 'new row violates row-level security policy' } })
r = await sendPhotos(files, o)
ok(r.sent === 1 && r.capped && r.failed.length === 2 && r.failed[0] === files[1] && r.failed[1] === files[2], 'cap on file 2: 1 sent, files 2 and 3 kept, capped')
ok(log.uploads.length === 2, 'nothing is uploaded after the cap')
ok(log.removed.length === 1 && log.removed[0] === log.uploads[1], 'the stored file of the rejected insert is removed')

log = stub({ insertFails: [1] })
r = await sendPhotos([files[0]], o)
ok(log.removed.length === 1 && log.removed[0] === log.uploads[0] && !r.capped && r.failed.length === 1, 'other insert error: file removed, not capped, kept for retry')

// retry sends only what failed: nothing twice
log = stub({ uploadFails: [2] })
r = await sendPhotos(files, o)
const first = log.inserts.length
log = stub()
const again = await sendPhotos(r.failed, o)
ok(first === 2 && again.sent === 1 && log.inserts.length === 1, 'retry of the failed file sends one row only')

console.log(bad ? `${bad} failed` : 'all passed')
process.exit(bad ? 1 : 0)
