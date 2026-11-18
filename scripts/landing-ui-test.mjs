// Landing-day line and the bags time (src/views/arrivalLine.ts), with and without the planner's `arrival`.
// `node scripts/landing-ui-test.mjs`
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [join(root, 'src/views/arrivalLine.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const { roundUp5, arrivalOf, arrivalLine } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

const tr = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, n) => String(v[n]))
const fmt = (v) => tr('מהשדה עד המלון כ-{n} דק׳. אחרי הגבול והמזוודות, שם בסביבות {time}', v)
let fails = 0
const check = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  got: ' + JSON.stringify(got)}`)
  if (!ok) fails++
}
const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), got)

eq('11:21 -> 11:25', roundUp5('11:21'), '11:25')
eq('11:20 stays', roundUp5('11:20'), '11:20')
eq('11:56 -> 12:00', roundUp5('11:56'), '12:00')
eq('9:01 -> 09:05', roundUp5('9:01'), '09:05')
eq('23:58 wraps to 00:00', roundUp5('23:58'), '00:00')
eq('garbage -> null', roundUp5('soon'), null)
eq('undefined -> null', roundUp5(undefined), null)

const day = { 'Maor': { airport: 'HND', ride_min: 46, ready: '11:21' } }
const line = arrivalLine(day.Maor, fmt)
eq('line with arrival', line, 'מהשדה עד המלון כ-46 דק׳. אחרי הגבול והמזוודות, שם בסביבות 11:25')
check('no "undefined" in the line', !String(line).includes('undefined'), line)
eq('arrivalOf by name', arrivalOf(day, 'Maor')?.airport, 'HND')
eq('arrivalOf no owner, one party', arrivalOf(day, null)?.airport, 'HND')
eq('arrivalOf other party -> null', arrivalOf(day, 'Dana'), null)
eq('arrivalOf no owner, two parties -> null', arrivalOf({ ...day, Dana: day.Maor }, null), null)

// missing arrival: nothing shows, nothing throws
eq('arrival undefined', arrivalLine(undefined, fmt), null)
eq('arrival null', arrivalLine(null, fmt), null)
eq('day undefined', arrivalOf(undefined, 'Maor'), null)
eq('day null', arrivalOf(null, 'Maor'), null)
eq('day {}', arrivalOf({}, 'Maor'), null)
eq('ride_min missing', arrivalLine({ airport: 'HND', ready: '11:21' }, fmt), null)
eq('ready missing', arrivalLine({ airport: 'HND', ride_min: 46 }, fmt), null)
eq('ride_min 0', arrivalLine({ airport: 'HND', ride_min: 0, ready: '11:21' }, fmt), null)
eq('bags time without arrival', roundUp5(arrivalOf(undefined, 'Maor')?.ready), null)
eq('bags time with arrival', roundUp5(arrivalOf(day, 'Maor')?.ready), '11:25')

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
