/* ============================================================================
   NEXO v3 — Comunidades + Canais
   Salva no navegador. Tema claro. IA melhorada. Sem dependências.
   ============================================================================ */

const http = require('http');

// ============================================================
// IA
// ============================================================
function runAI(msg, ctx) {
  const m = (msg || '').toLowerCase().trim();
  const tools = [];
  const { communities = [], currentCommunity, userName } = ctx || {};

  // Criar comunidade
  const mCreate = msg.match(/(?:criar|nova|cria)\s+(?:comunidade|servidor|grupo)\s+(?:chamada?|com nome|de)?\s*["']?([^"',.\n]{2,40})["']?/i);
  if (mCreate) {
    const nome = mCreate[1].trim();
    tools.push({ name: 'criar_comunidade', args: { nome } });
    return {
      reply: `🏘️ Comunidade **"${nome}"** criada!\n\nAgora toque em **"+ Nova comunidade"** e depois crie canais dentro dela (#geral, #dúvidas...).`,
      tools,
      action: { type: 'create_community', nome }
    };
  }

  // Criar canal
  const mChannel = msg.match(/(?:criar|novo|cria)\s+(?:canal|#)\s*["']?([a-z0-9_-]{2,30})["']?/i);
  if (mChannel) {
    if (!currentCommunity) return { reply: '⚠️ Primeiro selecione uma comunidade na lateral esquerda.', tools: [] };
    const nome = mChannel[1].toLowerCase().replace(/\s+/g, '-');
    tools.push({ name: 'criar_canal', args: { nome } });
    return {
      reply: `📢 Canal **#${nome}** criado em **${currentCommunity.name}**!`,
      tools,
      action: { type: 'create_channel', nome, communityId: currentCommunity.id }
    };
  }

  // Listar comunidades
  if (/(listar|ver|quais|minhas)\s+(comunidades|servidores|grupos)/i.test(m)) {
    if (!communities.length) return { reply: '📭 Você não tem comunidades ainda.\n\nDiga: *criar comunidade GameDev*', tools: [] };
    const lista = communities.map((c, i) => {
      const canais = (c.channels || []).length;
      return `${i + 1}. **${c.name}** — ${c.members?.length || 1} membros · ${canais} canal(is)`;
    }).join('\n');
    return { reply: `🏘️ **Suas comunidades (${communities.length}):**\n\n${lista}`, tools: [] };
  }

  // Ajuda
  if (/(ajuda|help|o que (você|voce)|pode fazer|comandos)/i.test(m)) {
    return {
      reply: `✨ **O que eu faço:**\n\n• *criar comunidade GameDev* — cria uma comunidade\n• *criar canal dúvidas* — cria canal na comunidade atual\n• *listar comunidades* — mostra todas\n• *como usar* — explica o básico\n\nOu pergunte qualquer coisa!`,
      tools: []
    };
  }

  // Como usar
  if (/(como|explica|tutorial).*(usar|funciona|fazer)/i.test(m)) {
    return {
      reply: `📖 **Como usar o NEXO:**\n\n**1. Comunidade** — toque em **"+ Nova comunidade"** ou diga *criar comunidade X*\n\n**2. Canal** — dentro da comunidade, toque em **"+ Canal"** ou diga *criar canal geral*\n\n**3. Conversar** — clique num canal e escreva embaixo\n\n💡 Tudo que você criar fica salvo no seu celular!`,
      tools: []
    };
  }

  // Saudação
  if (/^(ol[áa]|oi|opa|bom dia|boa tarde|boa noite|e a[ií]|hey|hi)/i.test(m)) {
    const h = new Date().getHours();
    const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    return {
      reply: `${s}, ${userName || 'amigo'}! 👋\n\nPosso te ajudar com:\n• *criar comunidade Trabalho*\n• *criar canal geral*\n• *listar comunidades*\n• *como usar*`,
      tools: []
    };
  }

  // Obrigado
  if (/(obrigad|valeu|vlw|thanks)/i.test(m)) {
    return { reply: '😊 De nada!', tools: [] };
  }

  // Fallback
  return {
    reply: `Não entendi 100%. Tente:\n\n• *criar comunidade Trabalho*\n• *criar canal geral*\n• *listar comunidades*\n• *como usar*\n\nOu reformule! 💡`,
    tools: []
  };
}

// ============================================================
// HTML — Interface completa
// ============================================================
const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>NEXO</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:#F7F8FA;color:#111827;height:100vh;display:flex;overflow:hidden;font-size:14px;line-height:1.5}
button{cursor:pointer;border:none;background:none;font-family:inherit;font-size:inherit;color:inherit}
input,textarea{font-family:inherit;font-size:14px;outline:none;color:inherit}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:3px}

/* Layout: 3 colunas */
.app{display:grid;grid-template-columns:220px 220px 1fr;width:100%;height:100vh}

/* Sidebar 1: Comunidades */
.side-com{background:#1F2937;color:#E5E7EB;display:flex;flex-direction:column;overflow:hidden}
.side-com-header{padding:14px 12px;font-weight:800;font-size:15px;letter-spacing:.5px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);color:#fff}
.side-com-header::before{content:'N';width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.com-list{flex:1;overflow-y:auto;padding:10px 6px}
.com{padding:10px 12px;border-radius:9px;cursor:pointer;margin-bottom:3px;font-size:13.5px;color:#D1D5DB;display:flex;align-items:center;gap:10px;transition:all .15s;font-weight:500;text-align:left;width:100%}
.com:hover{background:rgba(255,255,255,.08);color:#fff}
.com.active{background:rgba(99,102,241,.35);color:#fff;font-weight:600}
.com-avatar{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;color:#fff}
.com-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.add-com{margin:10px;padding:11px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-weight:600;text-align:center;cursor:pointer;font-size:13.5px;box-shadow:0 2px 8px rgba(99,102,241,.4);transition:all .15s}
.add-com:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,.5)}
.add-com:active{transform:scale(.97)}

/* Sidebar 2: Canais */
.side-ch{background:#F9FAFB;border-right:1px solid #E5E7EB;display:flex;flex-direction:column;overflow:hidden}
.side-ch-header{padding:14px 16px;border-bottom:1px solid #E5E7EB;background:#fff}
.side-ch-header .cname{font-weight:700;font-size:14.5px;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.side-ch-header .csub{font-size:11.5px;color:#9CA3AF;margin-top:2px}
.side-ch-header .c-actions{margin-top:10px;display:flex;gap:6px}
.side-ch-header .c-actions button{flex:1;padding:6px;border-radius:7px;background:#F0F2F5;color:#4B5563;font-size:11.5px;font-weight:600;transition:all .15s}
.side-ch-header .c-actions button:hover{background:#E5E7EB}
.side-ch-body{flex:1;overflow-y:auto;padding:10px 8px}
.section-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9CA3AF;font-weight:800;padding:10px 10px 6px}
.ch{padding:8px 12px;border-radius:7px;cursor:pointer;font-size:13.5px;color:#4B5563;display:flex;align-items:center;gap:8px;transition:all .15s;text-align:left;width:100%;font-weight:500}
.ch:hover{background:#F0F2F5}
.ch.active{background:#EEF2FF;color:#6366F1;font-weight:600}
.ch::before{content:'#';color:#9CA3AF;font-weight:700}
.ch.active::before{color:#6366F1}
.add-ch{margin:6px 8px 10px;padding:8px;border-radius:7px;background:#F0F2F5;color:#4B5563;font-size:12.5px;font-weight:600;text-align:center;cursor:pointer;transition:all .15s}
.add-ch:hover{background:#E5E7EB;color:#6366F1}

/* Área principal: chat */
.chat{display:flex;flex-direction:column;background:#fff;overflow:hidden}
.chat-header{padding:14px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;flex-shrink:0;background:#fff}
.chat-header h2{font-size:15px;font-weight:700;color:#111827;display:flex;align-items:center;gap:6px}
.chat-header h2::before{content:'#';color:#9CA3AF;font-weight:700}
.chat-header .sub{font-size:11.5px;color:#9CA3AF;margin-top:1px}
.ai-btn{margin-left:auto;padding:9px 16px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(99,102,241,.35);white-space:nowrap;transition:all .15s}
.ai-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,.45)}
.messages{flex:1;overflow-y:auto;padding:18px 20px;background:#F7F8FA;display:flex;flex-direction:column;gap:8px}
.msg{padding:10px 14px;background:#fff;border-radius:12px;max-width:78%;box-shadow:0 1px 3px rgba(0,0,0,.05);word-wrap:break-word;position:relative;animation:fadeIn .15s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.msg .author{font-weight:700;font-size:12px;color:#6366F1;margin-bottom:3px}
.msg .text{font-size:14px;line-height:1.5;color:#374151;white-space:pre-wrap;word-break:break-word}
.msg.mine{margin-left:auto;background:#6366F1}
.msg.mine .author,.msg.mine .text{color:#fff}
.msg .time{font-size:10px;color:#9CA3AF;margin-top:4px;opacity:.75}
.msg.mine .time{color:#fff;opacity:.75}
.msg .del{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:6px;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.06);color:#6B7280;font-size:12px;cursor:pointer}
.msg:hover .del{display:flex}
.msg.mine .del{background:rgba(255,255,255,.2);color:#fff}
.empty{text-align:center;color:#9CA3AF;padding:60px 20px;font-size:14px;line-height:1.7}
.empty-icon{font-size:42px;margin-bottom:10px;opacity:.6}
.input-wrap{padding:14px 20px;background:#fff;border-top:1px solid #E5E7EB;flex-shrink:0}
.input-row{display:flex;gap:10px;background:#F7F8FA;border:1px solid #E5E7EB;border-radius:12px;padding:6px 6px 6px 16px;transition:all .15s}
.input-row:focus-within{border-color:#6366F1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.input-row input{flex:1;border:none;background:transparent;color:#111827;padding:9px 0;font-size:14px}
.input-row input::placeholder{color:#9CA3AF}
.input-row button{width:38px;height:38px;border-radius:10px;background:#6366F1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;transition:all .15s}
.input-row button:hover{background:#4F46E5}
.input-row button:disabled{opacity:.4;cursor:not-allowed}

/* Modal */
.modal{position:fixed;inset:0;background:rgba(17,24,39,.55);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:18px;z-index:100}
.modal.show{display:flex;animation:fadeIn .15s ease-out}
.modal-box{background:#fff;border-radius:16px;padding:24px;width:100%;max-width:440px;box-shadow:0 20px 40px -10px rgba(0,0,0,.3);max-height:85vh;overflow-y:auto}
.modal-box h3{margin-bottom:16px;font-size:18px;font-weight:700;color:#111827;display:flex;align-items:center;gap:8px}
.modal-box label{display:block;font-size:12px;color:#6B7280;font-weight:700;margin-bottom:6px;margin-top:12px;text-transform:uppercase;letter-spacing:.03em}
.modal-box input,.modal-box textarea{width:100%;padding:11px 14px;border:1px solid #D1D5DB;border-radius:9px;background:#F9FAFB;transition:border-color .15s;color:#111827}
.modal-box input:focus,.modal-box textarea:focus{border-color:#6366F1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.modal-box button.primary{width:100%;padding:12px;border-radius:9px;background:#6366F1;color:#fff;font-weight:600;margin-top:16px;transition:all .15s}
.modal-box button.primary:hover{background:#4F46E5}
.modal-box button.cancel{width:100%;padding:11px;border-radius:9px;background:#F0F2F5;color:#4B5563;font-weight:500;margin-top:8px}
.modal-box button.cancel:hover{background:#E5E7EB}

/* IA */
.ai-conv{max-height:300px;overflow-y:auto;padding:14px;background:#F7F8FA;border-radius:10px;margin-bottom:14px;font-size:14px;line-height:1.65;border:1px solid #E5E7EB}
.ai-conv .u{color:#6366F1;font-weight:700;margin-top:12px;font-size:13.5px}
.ai-conv .a{color:#374151;margin-top:6px;white-space:pre-wrap;font-size:13.5px}
.ai-conv .a strong{font-weight:700;color:#111827}
.ai-conv .a em{font-style:italic;color:#6B7280}

/* Toast */
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:12px 20px;border-radius:10px;font-size:13.5px;font-weight:500;z-index:999;box-shadow:0 10px 25px rgba(0,0,0,.2);animation:slideDown .25s ease-out;max-width:90vw;text-align:center}
@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%)}}

/* Responsivo */
.mobile-tab{display:none}
@media(max-width:800px){
.app{grid-template-columns:72px 1fr}
.side-ch{display:none}
.side-ch.mobile-open{display:flex;position:fixed;left:72px;top:0;bottom:0;width:220px;z-index:200;box-shadow:4px 0 20px rgba(0,0,0,.15)}
.side-com-header{font-size:0;padding:14px;justify-content:center}
.com{justify-content:center;padding:10px 6px}
.com-name{display:none}
.com.active{background:rgba(99,102,241,.45)}
.add-com{font-size:22px;font-weight:700;padding:8px}
.mobile-tab{display:flex;padding:8px 14px;border-bottom:1px solid #E5E7EB;background:#fff;gap:8px;align-items:center;flex-shrink:0}
.mobile-tab button{padding:6px 12px;border-radius:7px;background:#F0F2F5;font-size:12.5px;font-weight:600;color:#4B5563}
}
</style>
</head>
<body>
<div class="app" id="app"></div>

<div class="modal" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal-box" id="modal-content"></div>
</div>

<script>
// ============================================================
// ESTADO — TUDO salvo no navegador
// ============================================================
const KEY = 'nexo_v3_data';

function defaultState() {
  const now = Date.now();
  return {
    userName: 'Você',
    communities: [{
      id: 'com_' + Math.random().toString(36).substring(2, 10),
      name: 'Geral',
      desc: 'Comunidade inicial',
      icon: '💬',
      created: now,
      members: ['Você'],
      channels: [
        { id: 'ch_' + Math.random().toString(36).substring(2, 10), name: 'geral', created: now },
        { id: 'ch_' + Math.random().toString(36).substring(2, 10), name: 'apresentações', created: now }
      ]
    }],
    messages: [{
      id: 'welcome',
      channelId: null, // será preenchido abaixo
      communityId: null,
      author: 'NEXO',
      text: 'Bem-vindo ao NEXO! 👋\\n\\nAqui você cria **comunidades** e **canais** — tipo Discord.\\n\\nTudo fica salvo no seu celular! Experimente:\\n• Criar uma comunidade\\n• Criar um canal\\n• Mandar mensagens',
      created: now
    }],
    currentCommunity: null,
    currentChannel: null,
    aiMessages: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Garante que as chaves existem
      if (!s.communities) s.communities = [];
      if (!s.messages) s.messages = [];
      if (!s.aiMessages) s.aiMessages = [];
      // Seta defaults se vazio
      if (!s.currentCommunity && s.communities[0]) s.currentCommunity = s.communities[0].id;
      if (!s.currentChannel && s.communities[0]?.channels[0]) s.currentChannel = s.communities[0].channels[0].id;
      return s;
    }
  } catch (e) { console.error(e); }
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}

let state = loadState();

// Corrige o welcome message com IDs reais
const firstCom = state.communities[0];
if (firstCom && firstCom.channels[0]) {
  const welcome = state.messages.find(m => m.id === 'welcome');
  if (welcome && !welcome.channelId) {
    welcome.channelId = firstCom.channels[0].id;
    welcome.communityId = firstCom.id;
    saveState();
  }
}

// ============================================================
// HELPERS
// ============================================================
function uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).substring(2, 11); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(ts) {
  const d = new Date(ts), t = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === t.toDateString()) return hh + ':' + mm;
  return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + hh + ':' + mm;
}
function toast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2500);
}
function currentCom() { return state.communities.find(c => c.id === state.currentCommunity); }
function currentChannelObj() {
  const c = currentCom();
  if (!c) return null;
  return c.channels.find(ch => ch.id === state.currentChannel);
}

// ============================================================
// RENDER
// ============================================================
function render() {
  const app = document.getElementById('app');
  const coms = state.communities;
  const com = currentCom();
  const ch = currentChannelObj();
  const msgs = state.messages.filter(m => m.channelId === state.currentChannel);

  app.innerHTML =
    // Coluna 1: comunidades
    '<aside class="side-com">' +
      '<div class="side-com-header">NEXO</div>' +
      '<div class="com-list">' +
        coms.map(c =>
          '<button class="com ' + (c.id === state.currentCommunity ? 'active' : '') + '" onclick="pickCom(\\'' + c.id + '\\')">' +
            '<div class="com-avatar">' + esc((c.icon || c.name[0] || '?')) + '</div>' +
            '<span class="com-name">' + esc(c.name) + '</span>' +
          '</button>'
        ).join('') +
      '</div>' +
      '<div class="add-com" onclick="openNewCom()">+ Nova</div>' +
    '</aside>' +

    // Coluna 2: canais
    '<aside class="side-ch ' + (state.sideChOpen ? 'mobile-open' : '') + '">' +
      (com ?
        '<div class="side-ch-header">' +
          '<div class="cname">' + esc(com.name) + '</div>' +
          '<div class="csub">' + (com.members?.length || 1) + ' membro(s)</div>' +
          '<div class="c-actions">' +
            '<button onclick="openNewChannel()">+ Canal</button>' +
            '<button onclick="openRenameCom()">Renomear</button>' +
          '</div>' +
        '</div>' +
        '<div class="side-ch-body">' +
          '<div class="section-lbl">Canais</div>' +
          com.channels.map(ch =>
            '<button class="ch ' + (ch.id === state.currentChannel ? 'active' : '') + '" onclick="pickChannel(\\'' + ch.id + '\\')">' +
              esc(ch.name) +
            '</button>'
          ).join('') +
          '<div class="add-ch" onclick="openNewChannel()">+ Novo canal</div>' +
        '</div>'
        : '<div class="side-ch-header"><div class="cname">Sem comunidade</div></div>' +
          '<div class="side-ch-body"><p style="padding:16px;color:#9CA3AF;font-size:13px;text-align:center;">Crie uma comunidade primeiro</p></div>'
      ) +
    '</aside>' +

    // Coluna 3: chat
    '<main class="chat">' +
      '<div class="chat-header">' +
        '<div>' +
          '<h2>' + (ch ? esc(ch.name) : 'Nenhum canal') + '</h2>' +
          '<div class="sub">' + (com ? esc(com.name) : '') + (ch ? ' · ' + msgs.length + ' mensagem(ns)' : '') + '</div>' +
        '</div>' +
        '<button class="ai-btn" onclick="openAI()">✨ IA</button>' +
      '</div>' +
      '<div class="messages" id="messages">' +
        (msgs.length === 0 ?
          '<div class="empty"><div class="empty-icon">💬</div>Nenhuma mensagem ainda.<br>Seja o primeiro a escrever!</div>'
          :
          msgs.map(m =>
            '<div class="msg ' + ((m.author === state.userName || m.author === 'Você') ? 'mine' : '') + '">' +
              '<div class="author">' + esc(m.author) + '</div>' +
              '<div class="text">' + esc(m.text) + '</div>' +
              '<div class="time">' + fmt(m.created) + '</div>' +
              '<div class="del" onclick="delMsg(\\'' + m.id + '\\')">×</div>' +
            '</div>'
          ).join('')
        ) +
      '</div>' +
      (ch ?
        '<div class="input-wrap">' +
          '<form class="input-row" onsubmit="sendMsg(event)">' +
            '<input id="msg-input" placeholder="Mensagem em #' + esc(ch.name) + '..." autocomplete="off" required>' +
            '<button type="submit">➤</button>' +
          '</form>' +
        '</div>'
        : '<div class="input-wrap" style="text-align:center;color:#9CA3AF;font-size:13px;padding:20px;">Crie um canal para começar a conversar</div>'
      ) +
    '</main>';

  // Scroll automático
  const msgsEl = document.getElementById('messages');
  if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;

  // Foco no input
  if (ch) {
    const inp = document.getElementById('msg-input');
    if (inp && document.activeElement !== inp) { /* não força */ }
  }
}

// ============================================================
// AÇÕES — comunidades e canais
// ============================================================
function pickCom(id) {
  state.currentCommunity = id;
  const com = currentCom();
  if (com && com.channels[0]) state.currentChannel = com.channels[0].id;
  saveState();
  render();
}

function pickChannel(id) {
  state.currentChannel = id;
  state.sideChOpen = false;
  saveState();
  render();
}

function openNewCom() {
  openModal(
    '<h3>🏘️ Nova comunidade</h3>' +
    '<label>Nome</label>' +
    '<input id="nc-name" placeholder="Ex: GameDev, Trabalho, Estudos..." autofocus maxlength="30">' +
    '<label>Descrição (opcional)</label>' +
    '<input id="nc-desc" placeholder="Sobre o que é?" maxlength="80">' +
    '<label>Ícone (emoji opcional)</label>' +
    '<input id="nc-icon" placeholder="💬" maxlength="2">' +
    '<button class="primary" onclick="createCom()">Criar comunidade</button>' +
    '<button class="cancel" onclick="closeModal()">Cancelar</button>'
  );
}

function createCom() {
  const name = (document.getElementById('nc-name').value || '').trim();
  if (!name) return toast('Digite um nome');
  const desc = (document.getElementById('nc-desc').value || '').trim();
  const icon = (document.getElementById('nc-icon').value || '').trim() || name[0].toUpperCase();
  const com = {
    id: uid('com'), name, desc: desc || 'Nova comunidade', icon,
    created: Date.now(), members: [state.userName],
    channels: [{ id: uid('ch'), name: 'geral', created: Date.now() }]
  };
  state.communities.push(com);
  state.currentCommunity = com.id;
  state.currentChannel = com.channels[0].id;
  saveState();
  closeModal();
  render();
  toast('Comunidade "' + name + '" criada!');
}

function openRenameCom() {
  const com = currentCom();
  if (!com) return;
  openModal(
    '<h3>✏️ Renomear comunidade</h3>' +
    '<label>Nome</label>' +
    '<input id="rn-name" value="' + esc(com.name) + '" maxlength="30">' +
    '<label>Ícone</label>' +
    '<input id="rn-icon" value="' + esc(com.icon || '') + '" maxlength="2">' +
    '<button class="primary" onclick="renameCom()">Salvar</button>' +
    '<button class="cancel" onclick="closeModal()">Cancelar</button>'
  );
}

function renameCom() {
  const com = currentCom();
  if (!com) return;
  const n = document.getElementById('rn-name').value.trim();
  if (!n) return toast('Nome inválido');
  com.name = n;
  com.icon = document.getElementById('rn-icon').value.trim() || n[0].toUpperCase();
  saveState(); closeModal(); render(); toast('Comunidade renomeada');
}

function openNewChannel() {
  const com = currentCom();
  if (!com) return toast('Crie uma comunidade primeiro');
  openModal(
    '<h3>📢 Novo canal</h3>' +
    '<label>Nome do canal</label>' +
    '<input id="nch-name" placeholder="Ex: geral, dúvidas, dev..." autofocus maxlength="25">' +
    '<button class="primary" onclick="createChannel()">Criar canal</button>' +
    '<button class="cancel" onclick="closeModal()">Cancelar</button>'
  );
}

function createChannel() {
  const com = currentCom();
  if (!com) return;
  let name = (document.getElementById('nch-name').value || '').trim().toLowerCase().replace(/\\s+/g, '-');
  if (!name) return toast('Digite um nome');
  if (com.channels.some(ch => ch.name === name)) return toast('Esse canal já existe');
  const ch = { id: uid('ch'), name, created: Date.now() };
  com.channels.push(ch);
  state.currentChannel = ch.id;
  saveState(); closeModal(); render(); toast('Canal #' + name + ' criado');
}

// ============================================================
// AÇÕES — mensagens
// ============================================================
function sendMsg(e) {
  e.preventDefault();
  const inp = document.getElementById('msg-input');
  const text = (inp.value || '').trim();
  if (!text) return;
  const com = currentCom();
  if (!com) return;
  state.messages.push({
    id: uid('m'),
    channelId: state.currentChannel,
    communityId: com.id,
    author: state.userName || 'Você',
    text, created: Date.now()
  });
  saveState();
  inp.value = '';
  render();
}

function delMsg(id) {
  if (!confirm('Apagar essa mensagem?')) return;
  state.messages = state.messages.filter(m => m.id !== id);
  saveState();
  render();
}

// ============================================================
// IA
// ============================================================
function openAI() {
  openModal(
    '<h3>✨ Assistente IA</h3>' +
    '<div class="ai-conv" id="ai-conv">' +
      '<div class="a">Olá! Sou o assistente do NEXO. 👋\\n\\nPosso:<br>• <strong>criar comunidade Trabalho</strong><br>• <strong>criar canal dúvidas</strong><br>• <strong>listar comunidades</strong><br>• <strong>como usar</strong></div>' +
    '</div>' +
    '<label>Sua mensagem</label>' +
    '<input id="ai-input" placeholder="Digite aqui..." onkeydown="if(event.key===\\'Enter\\'){event.preventDefault();askAI();}">' +
    '<button class="primary" onclick="askAI()">Enviar</button>' +
    '<button class="cancel" onclick="closeModal()">Fechar</button>'
  );
  setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
}

async function askAI() {
  const inp = document.getElementById('ai-input');
  const text = (inp.value || '').trim();
  if (!text) return;
  inp.value = '';

  const conv = document.getElementById('ai-conv');
  conv.innerHTML += '<div class="u">Você: ' + esc(text) + '</div>';
  const lid = 'l_' + Date.now();
  conv.innerHTML += '<div class="a" id="' + lid + '">✨ Pensando...</div>';
  conv.scrollTop = conv.scrollHeight;

  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg: text,
        communities: state.communities,
        currentCommunity: currentCom(),
        userName: state.userName
      })
    });
    const data = await r.json();
    document.getElementById(lid)?.remove();

    let formatted = esc(data.reply || '');
    formatted = formatted.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\\n/g, '<br>');

    conv.innerHTML += '<div class="a">' + formatted + '</div>';
    conv.scrollTop = conv.scrollHeight;

    // Executa ações da IA
    if (data.action) {
      if (data.action.type === 'create_community') {
        const name = data.action.nome;
        const com = { id: uid('com'), name, desc: 'Criada pela IA', icon: name[0].toUpperCase(), created: Date.now(), members: [state.userName], channels: [{ id: uid('ch'), name: 'geral', created: Date.now() }] };
        state.communities.push(com);
        state.currentCommunity = com.id;
        state.currentChannel = com.channels[0].id;
        saveState();
        render();
      } else if (data.action.type === 'create_channel') {
        const com = state.communities.find(c => c.id === data.action.communityId);
        if (com) {
          const ch = { id: uid('ch'), name: data.action.nome, created: Date.now() };
          com.channels.push(ch);
          state.currentChannel = ch.id;
          saveState();
          render();
        }
      }
    }
  } catch (e) {
    document.getElementById(lid)?.remove();
    conv.innerHTML += '<div class="a" style="color:#DC2626">Erro: ' + esc(e.message) + '</div>';
    conv.scrollTop = conv.scrollHeight;
  }
}

// ============================================================
// MODAL
// ============================================================
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').classList.add('show');
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

// ============================================================
// INICIALIZA
// ============================================================
render();
</script>
</body>
</html>`;

// ============================================================
// SERVIDOR
// ============================================================
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];

  if (u === '/' || u === '/nexo') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }

  if (u === '/api/ai' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const result = runAI(d.msg, {
          communities: d.communities,
          currentCommunity: d.currentCommunity,
          userName: d.userName
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: 'Erro: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Não encontrado');
});

server.listen(process.env.PORT || 4000, () => {
  console.log('NEXO v3 rodando');
});
```