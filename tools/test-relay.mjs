// A bare-bones Nostr relay for testing the backup route locally:
//   node tools/test-relay.mjs 7777   then open the app with ?relay=ws://127.0.0.1:7777&nopeer
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] || 7777);
const wss = new WebSocketServer({ host: '127.0.0.1', port });
const subs = new Map(); // socket -> Map(subId -> filters)

const matches = (ev, f) =>
  (!f.kinds || f.kinds.includes(ev.kind)) &&
  (!f.since || ev.created_at >= f.since - 5) &&
  Object.entries(f).every(([k, v]) => !k.startsWith('#') || ev.tags.some((t) => t[0] === k.slice(1) && v.includes(t[1])));

wss.on('connection', (ws) => {
  subs.set(ws, new Map());
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const [type, a, ...rest] = msg;
    if (type === 'EVENT') {
      ws.send(JSON.stringify(['OK', a.id, true, '']));
      for (const [sock, map] of subs) for (const [id, filters] of map) if (filters.some((f) => matches(a, f))) sock.send(JSON.stringify(['EVENT', id, a]));
    } else if (type === 'REQ') {
      subs.get(ws).set(a, rest);
      ws.send(JSON.stringify(['EOSE', a]));
    } else if (type === 'CLOSE') subs.get(ws).delete(a);
  });
  ws.on('close', () => subs.delete(ws));
});
console.log(`test relay on ws://127.0.0.1:${port}`);
