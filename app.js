const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'data.json');
let DB = { groups: [], messages: [], sessions: {} };
if (fs.existsSync(DB_FILE)) try { DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) {}
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
const uid = () => crypto.randomBytes(6).toString('hex');
const now = () => Date.now();

if (!DB.groups.length) {
  DB.groups.push({ id: 'g_geral', name: 'Geral', desc: 'Grupo padrão', created: now() });
  DB.messages.push({ id: uid(), group: 'g_geral', author: 'NEXO', text: 'Bem-vindo ao NEXO! 👋', created: now() });
  save();
}

const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEXO</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,sans-serif}
body{background:#F7F8FA;color:#111827;height:100vh;display:flex;overflow:hidden}
.sidebar{width:220px;background:#fff;border-right:1px solid #E5E7EB;display:flex;flex-direction:column}
.logo{padding:20px;font-weight:800;font-size:20px;color:#6366F1;display:flex;align-items:center;gap:10px}
.logo::before{content:'N';width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}
.groups{flex:1;overflow-y:auto;padding:0 10px}
.group{padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:2px;font-size:14px;color:#4B5563}
.group:hover{background:#F0F2F5}
.group.active{background:#EEF2FF;color:#6366F1;font-weight:600}
.add-group{margin:10px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-weight:600;text-align:center;cursor:pointer;font-size:14px}
.main{flex:1;display:flex;flex-direction:column}
.header{padding:16px 24px;background:#fff;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px}
.header h2{font-size:16px;font-weight:700}
.header .sub{font-size:12px;color:#9CA3AF}
.ai-btn{margin-left:auto;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer}
.messages{flex:1;overflow-y:auto;padding:20px;background:#F7F8FA}
.msg{padding:10px 14px;background:#fff;border-radius:12px;margin-bottom:10px;max-width:80%;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.msg .author{font-weight:600;font-size:13px;color:#6366F1;margin-bottom:4px}
.msg .text{font-size:14px;line-height:1.5;color:#374151;white-space:pre-wrap}
.msg.mine{margin-left:auto;background:#6366F1}
.msg.mine .author,.msg.mine .text{color:#fff}
.input-wrap{padding:16px 20px;background:#fff;border-top:1px solid #E5E7EB}
.input-row{display:flex;gap:10px;background:#F7F8FA;border:1px solid #E5E7EB;border-radius:12px;padding:8px 8px 8px 16px}
.input-row input{flex:1;border:none;background:transparent;outline:none;font-size:14px;color:#111827}
.input-row button{width:38px;height:38px;border-radius:10px;background:#6366F1;color:#fff;border:none;cursor:pointer;font-size:16px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:20px;z-index:100}
.modal.show{display:flex}
.modal-box{background:#fff;border-radius:16px;padding:24px;width:100%;max-width:400px}
.modal-box h3{margin-bottom:16px;font-size:18px;color:#111827}
.modal-box input,.modal-box textarea{width:100%;padding:10px 14px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none;font-family:inherit}
.modal-box input:focus,.modal-box textarea:focus{border-color:#6366F1}
.modal-box button{width:100%;padding:12px;border-radius:8px;background:#6366F1;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px}
.modal-box .cancel{background:#F0F2F5;color:#4B5563;margin-top:8px}
@media(max-width:700px){.sidebar{width:60px}.sidebar .logo{font-size:0;padding:12px}.group{padding:12px 6px;text-align:center;font-size:12px;overflow:hidden}.add-group{padding:10px;font-size:16px;writing-mode:vertical-lr;text-orientation:mixed;height:60px}}
</style></head><body>
<div class="sidebar">
  <div class="logo">NEXO</div>
  <div class="groups" id="groups"></div>
  <div class="add-group" onclick="openNew()">+ Grupo</div>
</div>
<div class="main">
  <div class="header">
    <div><h2 id="group-title">Geral</h2><div class="sub" id="group-sub">Carregando...</div></div>
    <button class="ai-btn" onclick="openAI()">✨ IA</button>
  </div>
  <div class="messages" id="messages"></div>
  <div class="input-wrap">
    <form class="input-row" onsubmit="sendMsg(event)">
      <input id="msg-input" placeholder="Escreva uma mensagem..." autocomplete="off">
      <button type="submit">➤</button>
    </form>
  </div>
</div>
<div class="modal" id="modal">
  <div class="modal-box" id="modal-content"></div>
</div>
<script>
let state = { groups: [], messages: [], currentGroup: 'g_geral' };
const api = async (m, p, b) => {
  const r = await fetch(p, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined });
  return r.json();
};
async function load() {
  const d = await api('GET', '/api/state');
  state = d;
  if (!state.groups.find(g => g.id === state.currentGroup)) state.currentGroup = state.groups[0]?.id;
  render();
}
function render() {
  document.getElementById('groups').innerHTML = state.groups.map(g =>
    '<div class="group ' + (g.id === state.currentGroup ? 'active' : '') + '" onclick="pickGroup(\\'' + g.id + '\\')">' + esc(g.name) + '</div>'
  ).join('');
  const g = state.groups.find(x => x.id === state.currentGroup);
  if (g) {
    document.getElementById('group-title').textContent = g.name;
    document.getElementById('group-sub').textContent = (g.desc || '') + ' · ' + state.messages.filter(m => m.group === g.id).length + ' mensagens';
  }
  const msgs = state.messages.filter(m => m.group === state.currentGroup);
  const el = document.getElementById('messages');
  el.innerHTML = msgs.length === 0 ? '<div style="text-align:center;color:#9CA3AF;padding:40px;">Nenhuma mensagem ainda.</div>' :
    msgs.map(m => '<div class="msg ' + (m.author === 'Você' ? 'mine' : '') + '"><div class="author">' + esc(m.author) + '</div><div class="text">' + esc(m.text) + '</div></div>').join('');
  el.scrollTop = el.scrollHeight;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pickGroup(id) { state.currentGroup = id; render(); }
async function sendMsg(e) {
  e.preventDefault();
  const inp = document.getElementById('msg-input');
  const t = inp.value.trim(); if (!t) return;
  inp.value = '';
  await api('POST', '/api/message', { group: state.currentGroup, text: t, author: 'Você' });
  await load();
}
function openNew() {
  document.getElementById('modal-content').innerHTML =
    '<h3>Novo grupo</h3>' +
    '<input id="ng-name" placeholder="Nome do grupo">' +
    '<textarea id="ng-desc" rows="2" placeholder="Descrição (opcional)"></textarea>' +
    '<button onclick="createGroup()">Criar grupo</button>' +
    '<button class="cancel" onclick="closeModal()">Cancelar</button>';
  document.getElementById('modal').classList.add('show');
}
async function createGroup() {
  const n = document.getElementById('ng-name').value.trim(); if (!n) return;
  await api('POST', '/api/group', { name: n, desc: document.getElementById('ng-desc').value.trim() });
  closeModal(); await load();
}
function openAI() {
  document.getElementById('modal-content').innerHTML =
    '<h3>✨ Assistente IA</h3>' +
    '<div id="ai-conv" style="max-height:300px;overflow-y:auto;margin-bottom:12px;padding:8px;background:#F7F8FA;border-radius:8px;font-size:14px;line-height:1.6;">Olá! Diga: "criar grupo Trabalho" ou "criar grupo Jogos"</div>' +
    '<input id="ai-input" placeholder="Pergunte algo..." onkeydown="if(event.key===\\'Enter\\')askAI()">' +
    '<button onclick="askAI()">Enviar</button>' +
    '<button class="cancel" onclick="closeModal()">Fechar</button>';
  document.getElementById('modal').classList.add('show');
}
async function askAI() {
  const inp = document.getElementById('ai-input');
  const t = inp.value.trim(); if (!t) return; inp.value = '';
  const conv = document.getElementById('ai-conv');
  conv.innerHTML += '<div style="margin:8px 0;color:#6366F1;font-weight:600;">Você: ' + esc(t) + '</div>';
  const r = await api('POST', '/api/ai', { msg: t });
  conv.innerHTML += '<div style="margin:8px 0;color:#374151;">' + esc(r.reply) + '</div>';
  conv.scrollTop = conv.scrollHeight;
  await load();
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
load();
setInterval(load, 3000);
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/nexo') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  if (url === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ groups: DB.groups, messages: DB.messages, currentGroup: 'g_geral' }));
  }
  if (url === '/api/message' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const d = JSON.parse(b);
      DB.messages.push({ id: uid(), group: d.group, author: d.author || 'Anônimo', text: d.text, created: now() });
      save();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }
  if (url === '/api/group' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const d = JSON.parse(b);
      DB.groups.push({ id: 'g_' + uid(), name: d.name, desc: d.desc || '', created: now() });
      save();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }
  if (url === '/api/ai' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const d = JSON.parse(b);
      const m = (d.msg || '').toLowerCase();
      let reply = '';
      if (m.includes('criar grupo') || m.includes('novo grupo')) {
        const nome = d.msg.match(/grupo\s+([a-zá-ú0-9 ]+)/i);
        const n = nome ? nome[1].trim() : 'Novo Grupo';
        DB.groups.push({ id: 'g_' + uid(), name: n, desc: 'Criado pela IA', created: now() });
        save();
        reply = '✅ Grupo "' + n + '" criado!';
      } else if (m.includes('oi') || m.includes('olá')) {
        reply = '👋 Olá! Posso criar grupos pra você. Diga: "criar grupo Trabalho"';
      } else {
        reply = 'Entendi! Diga "criar grupo NOME" e eu crio na hora.';
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    });
    return;
  }
  res.writeHead(404); res.end('Não encontrado');
});

server.listen(process.env.PORT || 4000, () => console.log('NEXO rodando'));