// Run against a development server. Test records remain intentionally so the
// same history can be verified after a server restart. No real data is touched.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const base = process.env.FLOWBOARD_API || 'http://localhost:5000';
const stateFile = new URL('../.chat-test-state.json', import.meta.url);
const content = Buffer.from('%PDF-1.4\nFlowBoard attachment verification\n');
async function request(path, method = 'GET', token, body, expected = 200, binary = false) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = binary && res.ok ? Buffer.from(await res.arrayBuffer()) : await res.json();
  assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const login = async account => (await request('/api/auth/login', 'POST', null, account)).token;
const chat = id => `/api/tasks/${id}/chat`;
async function verify(state) {
  // New logins prove history is shared independently of the original sessions.
  const tokens = await Promise.all(state.accounts.map(login));
  const [one, two] = state.cards;
  for (const token of tokens.slice(0, 3)) {
    const first = (await request(chat(one), 'GET', token)).messages;
    const second = (await request(chat(two), 'GET', token)).messages;
    assert.deepEqual(first.map(m => m.text), ['Card 1 message', 'Card 1 work update']);
    assert.deepEqual(second.map(m => m.text), ['Card 2 only']);
    assert.equal(first[1].kind, 'work');
    assert.equal(first[0].authorName, 'Chat test owner');
    assert.equal(first[1].authorName, 'Chat test member A');
    assert.equal(second[0].authorName, 'Chat test member B');
    assert.ok(first[0].createdAt && first[1].createdAt);
    assert.ok(first[0].createdAt <= first[1].createdAt);
    assert.equal(first[0].attachments[0].name, 'work.pdf');
    assert.equal(first[0].attachments[0].data, undefined, 'File bytes must not be returned in history');
    assert.equal(second[0].attachments.length, 0);
    const suffix = `/${first[0]._id}/files/${first[0].attachments[0]._id}`;
    assert.deepEqual(await request(chat(one)+suffix, 'GET', token, undefined, 200, true), content);
    await request(chat(two)+suffix, 'GET', token, undefined, 404);
    await request(chat(one)+suffix, 'GET', tokens[3], undefined, 403);
    await request(chat(one)+suffix, 'GET', null, undefined, 401);
  }
  await request(chat(one), 'GET', tokens[3], undefined, 403);
  await request(chat(one), 'POST', tokens[3], { text: 'Unauthorized' }, 403);
  await request(chat(one), 'GET', null, undefined, 401);
  console.log('PASS: shared history, independent card rooms, file bytes, work updates, chronology, authenticated downloads and access denial.');
}
if (process.argv.includes('--verify')) {
  await verify(JSON.parse(readFileSync(stateFile, 'utf8')));
  console.log('PASS: previously created records survived.');
} else {
  const id = randomUUID();
  const accounts = ['owner', 'member A', 'member B', 'outsider'].map((role,i) => ({ name: `Chat test ${role}`, email: `chat-${id}-${i}@example.invalid`, password: randomUUID() }));
  const tokens = [];
  for (const account of accounts) tokens.push((await request('/api/auth/register','POST',null,account,201)).token);
  const project = (await request('/api/projects','POST',tokens[0],{ name: `Card chat acceptance ${id}` },201)).project;
  for (const account of accounts.slice(1,3)) await request(`/api/projects/${project._id}/members`,'POST',tokens[0],{ email: account.email });
  const cards = [];
  for (const title of ['Card 1','Card 2']) cards.push((await request(`/api/tasks/project/${project._id}`,'POST',tokens[0],{ title },201)).task._id);
  await request(chat(cards[0]),'POST',tokens[0],{text:'Card 1 message', attachments:[{name:'work.pdf',data:content.toString('base64')}]},201);
  await request(chat(cards[0]),'POST',tokens[1],{text:'Card 1 work update',kind:'work'},201);
  await request(chat(cards[1]),'POST',tokens[2],{text:'Card 2 only'},201);
  await request(chat(cards[0]),'POST',tokens[0],{text:''},400);
  await request(chat(cards[0]),'POST',tokens[0],{attachments:[{name:'bad.pdf',data:'!!!'}]},400);
  const state = {accounts, cards, project:project._id};
  writeFileSync(stateFile, JSON.stringify(state,null,2), { mode: 0o600 });
  await verify(state);
  console.log('Restart the server with the SAME database, then run npm run test:chat -- --verify. The test project and credentials are retained for this purpose.');
}
