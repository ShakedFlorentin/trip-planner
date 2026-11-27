#!/usr/bin/env node
// Context handoff trigger - PostToolUse hook (taken from the Siliqa repo, HDLcompiler, 2026-11-27).
// When this session's context crosses THRESHOLD %, tell the agent (once) to run the
// `toogo-auto-handoff` skill, so a handoff file exists before the context compacts.
//
// Signal, best first:
//  1. ~/.claude/token-optimizer/live-fill.json (the token-optimizer status line), only when its
//     session_id is this session's and it is fresh. The desktop app does not run the status
//     line, so this is often missing.
//  2. The last token usage in this session's transcript (transcript_path), against a window of
//     TOOGO_CONTEXT_WINDOW tokens (default 200000, the org agents' autoCompactWindow; a session
//     already past that is measured against 1000000).
// Anything missing or odd -> silent exit. A hook problem must never block a tool call.
// Re-arms when fill drops under REARM % (after a compact), so a long session can hand off again.

const fs = require('fs');
const os = require('os');
const path = require('path');

const THRESHOLD = 70;
const REARM = 50;
const STALE_MS = 120000;
const TAIL_BYTES = 400000;

function fromLiveFill(sid) {
  try {
    const fill = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'token-optimizer', 'live-fill.json'), 'utf8'));
    if (fill.session_id !== sid || Date.now() - fill.timestamp > STALE_MS) return null;
    const used = Number(fill.used_percentage);
    return Number.isFinite(used) ? used : null;
  } catch (e) { return null; }
}

function fromTranscript(p) {
  try {
    if (!p || typeof p !== 'string') return null;
    const size = fs.statSync(p).size;
    const fd = fs.openSync(p, 'r');
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.includes('"usage"')) continue;
      let row;
      try { row = JSON.parse(line); } catch (e) { continue; }
      const u = row && row.message && row.message.usage;
      if (!u || row.isSidechain) continue;
      const tokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      if (!tokens) continue;
      let win = Number(process.env.TOOGO_CONTEXT_WINDOW) || 200000;
      if (tokens > win) win = 1000000;
      return (tokens / win) * 100;
    }
  } catch (e) {}
  return null;
}

let input = '';
const guard = setTimeout(() => process.exit(0), 4000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  clearTimeout(guard);
  try {
    const data = JSON.parse(input);
    const sid = data.session_id;
    if (!sid || /[/\\]|\.\./.test(sid)) process.exit(0);

    let used = fromLiveFill(sid);
    if (used === null) used = fromTranscript(data.transcript_path);
    if (used === null) process.exit(0);

    const marker = path.join(os.tmpdir(), `toogo-handoff-fired-${sid}`);
    if (used < REARM) {
      try { fs.unlinkSync(marker); } catch (e) {}
      process.exit(0);
    }
    if (used < THRESHOLD || fs.existsSync(marker)) process.exit(0);

    fs.writeFileSync(marker, String(Date.now()));
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `CONTEXT HANDOFF: context is at about ${Math.round(used)}% (threshold ${THRESHOLD}%). ` +
          'The owner asked for an automatic handoff at this point. Invoke the `toogo-auto-handoff` ' +
          'skill now, write the handoff file, tell the owner its path in one line, then continue ' +
          'the current task.'
      }
    }));
  } catch (e) {
    process.exit(0);
  }
});
