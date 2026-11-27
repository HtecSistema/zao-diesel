const API_URL = 'https://script.google.com/macros/s/AKfycbz-_4-7ZaNyVI0xGBks51S5hn1LkgN8zMRcAqpL7uHJbL-WBJeE95EJIbKpSzboBA/exec';

function apiLeitura(acao){
  return new Promise((resolve, reject)=>{
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    window[cb] = (dados)=>{ delete window[cb]; script.remove(); if(dados.erro) reject(new Error(dados.erro)); else resolve(dados); };
    const script = document.createElement('script');
    script.src = API_URL + '?acao=' + acao + '&callback=' + cb + '&_=' + Date.now();
    script.onerror = ()=>{ delete window[cb]; script.remove(); reject(new Error('Falha ao conectar')); };
    document.body.appendChild(script);
  });
}
async function api(acao, dados, cod){
  await fetch(API_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({acao, dados, cod}) });
  if(acao==='salvarFuncionario'){ const max = vendedores.length ? Math.max(...vendedores.map(v=>parseInt(v.mat)||0)) : 0; return {mat: max+1}; }
  return {ok:true};
}
function garantirModalMsg(){
  if(document.getElementById('modalMsgSistema')) return;
  const div = document.createElement('div');
  div.id = 'modalMsgSistema';
  div.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;justify-content:center;align-items:center';
  div.innerHTML = '<div style="background:#fff;width:90%;max-width:360px;border-radius:12px;overflow:hidden;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3)"><div style="background:#1a4a8a;color:#fff;padding:12px;font-weight:900;font-size:14px">ZÃO <span style="background:#f2b705;color:#1a4a8a;padding:2px 8px;border-radius:4px">DIESEL</span></div><div id="msgSistemaTexto" style="padding:18px 14px;font-size:14px;font-weight:700;color:#111;line-height:1.4;text-transform:uppercase;white-space:pre-line"></div><div style="display:flex;gap:8px;padding:0 14px 14px"><button id="btnMsgSistemaSim" style="flex:1;background:#22b45a;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900;display:none">SIM</button><button id="btnMsgSistemaOk" style="flex:1;background:#1a4a8a;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900">OK</button><button id="btnMsgSistemaNao" style="flex:1;background:#fee2e2;color:#991b1b;border:none;padding:13px;border-radius:10px;font-weight:900;display:none">NÃO</button></div></div>';
  document.body.appendChild(div);
}
function mostrarMsgSistema(texto){
  return new Promise((resolve)=>{
    garantirModalMsg();
    const modal = document.getElementById('modalMsgSistema');
    document.getElementById('msgSistemaTexto').innerText = texto;
    document.getElementById('btnMsgSistemaSim').style.display = 'none';
    document.getElementById('btnMsgSistemaNao').style.display = 'none';
    const btnOk = document.getElementById('btnMsgSistemaOk');
    btnOk.style.display = 'block';
    btnOk.innerText = 'OK';
    modal.style.display = 'flex';
    btnOk.onclick = ()=>{ modal.style.display = 'none'; resolve(); };
  });
}
function perguntarSistema(texto){
  return new Promise((resolve)=>{
    garantirModalMsg();
    const modal = document.getElementById('modalMsgSistema');
    document.getElementById('msgSistemaTexto').innerText = texto;
    const btnOk = document.getElementById('btnMsgSistemaOk');
    btnOk.style.display = 'none';
    const btnSim = document.getElementById('btnMsgSistemaSim');
    const btnNao = document.getElementById('btnMsgSistemaNao');
    btnSim.style.display = 'block';
    btnNao.style.display = 'block';
    modal.style.display = 'flex';
    btnSim.onclick = ()=>{ modal.style.display = 'none'; resolve(true); };
    btnNao.onclick = ()=>{ modal.style.display = 'none'; resolve(false); };
  });
}
let produtos = []; let vendedores = []; let clientes = []; let historico = []; let ultimoNum = 0; let produtoSelecionadoTop = null;
let idxSetaLista = -1;
let idxSetaCliente = -1;
let editProdutoRef = null; let editClienteCod = null; let editFuncMat = null;
let histSelecionadoIdx = null; let itemOrcSelecionado = null;
function fmt(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parsePreco(v){ if(typeof v === 'number') return v; return parseFloat(String(v||"0").replace(/\./g,"").replace(",",".")) || 0; }
function el(id){ return document.getElementById(id); }
function setVal(id, v){ const e = el(id); if(e) e.value = v ?? ''; }
function getVal(id){ const e = el(id); return e ? e.value : ''; }
function selecionarLinha(tr, textoSelecionado, idFaixa){
  if(!tr) return;
  const tb = tr.closest('tbody');
  if(tb) tb.querySelectorAll('tr').forEach(r=>r.classList.remove('selecionado'));
  tr.classList.add('selecionado');
  if(idFaixa && textoSelecionado){ const f = document.getElementById(idFaixa); if(f){ f.style.display='block'; f.innerText = textoSelecionado; } }
}
function mostrarAba(q){
  if(el('aba-orc')) el('aba-orc').style.display = q==='orc'?'block':'none';
  if(el('aba-prod')) el('aba-prod').style.display = q==='prod'?'block':'none';
  if(el('aba-vend')) el('aba-vend').style.display = q==='vend'?'block':'none';
  if(el('aba-hist')) el('aba-hist').style.display = q==='hist'?'block':'none';
  if(el('aba-cli')) el('aba-cli').style.display = q==='cli'?'block':'none';
  if(el('tabOrc')) el('tabOrc').className = q==='orc'?'ativo':'';
  if(el('tabProd')) el('tabProd').className = q==='prod'?'ativo':'';
  if(el('tabVend')) el('tabVend').className = q==='vend'?'ativo':'';
  if(el('tabHist')) el('tabHist').className = q==='hist'?'ativo':'';
  if(el('tabCli')) el('tabCli').className = q==='cli'?'ativo':'';
}
let filtroProdutoLista = '';
function filtrarProdutosLista(){ filtroProdutoLista = getVal('buscaProdutoLista').trim().toLowerCase(); renderProdutos(); }

// COLUNAS NA MESMA ORDEM DO THEAD:
// REFERENCIA | NOME | LOTE | VALIDADE | VALOR | ENTRADA | SAIDA | SALDO | CLASSIFICAÇÃO

function fmtData(v){
  if(!v) return '-';
  let s = String(v).trim();
  // 1) Se já for DD/MM/AAAA, devolve do jeito que tá
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // 2) Se for AAAA-MM-DD ou com T
  if(s.includes('T')) s = s.split('T')[0];
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const a = s.split('-');
    return a[2] + '/' + a[1] + '/' + a[0];
  }
  // 3) Se for WED MAY 30 2029 00:00:00 GMT... / FRI JUN 01 2029...
  const meses = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const m = s.toUpperCase().match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s+(\d{4})/);
  if(m){
    const dia = m[2].padStart(2,'0');
    return dia + '/' + meses[m[1]] + '/' + m[3];
  }
  // 4) Última tentativa: new Date()
  const d = new Date(v);
  if(!isNaN(d)){
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  return s;
}

function converterValidadeParaInput(v){
  if(!v) return '';
  let s = String(v).trim();
  // Já é AAAA-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if(s.includes('T')) s = s.split('T')[0];
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Já é DD/MM/AAAA
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){
    const a = s.split('/');
    return a[2] + '-' + a[1] + '-' + a[0];
  }
  // WED MAY 30 2029...
  const meses = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const m = s.toUpperCase().match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s+(\d{4})/);
  if(m){
    return m[3] + '-' + meses[m[1]] + '-' + m[2].padStart(2,'0');
  }
  const d = new Date(v);
  if(!isNaN(d)){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  return '';
}
// COLUNAS NA MESMA ORDEM DO THEAD:
// REFERENCIA | NOME | LOTE | VALIDADE | VALOR | ENTRADA | SAIDA | SALDO | CLASSIFICAÇÃO
function renderProdutos(){
  const tb = document.getElementById('listaProdutos'); if(!tb) return;
  let lista = produtos;
  if(filtroProdutoLista){ lista = produtos.filter(p => (p.nome||'').toLowerCase().includes(filtroProdutoLista) || String(p.referencia||'').toLowerCase().includes(filtroProdutoLista) || (p.lote||'').toLowerCase().includes(filtroProdutoLista)); }
  const msg = document.getElementById('msgProdutos'); if(msg) msg.innerText = lista.length + ' produtos';
  if(!lista.length){ tb.innerHTML = '<tr><td colspan="9" class="tabela-vazio">NENHUM PRODUTO ENCONTRADO</td></tr>'; return; }
  tb.innerHTML = lista.map((p)=>{
    const idx = produtos.indexOf(p);
    const verde = (p.saldo||0) > 0 ? 'linha-verde' : '';
    return `<tr class="${verde}" onclick="selecionarLinha(this, 'PRODUTO SELECIONADO: ${p.nome} | REF ${p.referencia} | R$ ${fmt(p.valor)}', 'selecionadoProduto');selecionarProduto(${idx})">`
      + `<td>${p.referencia||'-'}</td>`
      + `<td>${p.nome||''}</td>`
      + `<td>${p.lote||'-'}</td>`
      + `<td>${fmtData(p.validade)}</td>`
      + `<td>R$ ${fmt(p.valor)}</td>`
      + `<td>${p.entrada||0}</td>`
      + `<td>${p.saida||0}</td>`
      + `<td>${p.saldo||0}</td>`
      + `<td>${p.classificacao||'-'}</td>`
      + `</tr>`;
  }).join('');
}

function buscarSaldoPorReferencia(){
  const ref = getVal('pReferencia').trim().toUpperCase();
  const lote = getVal('pLote').trim().toUpperCase();
  const validade = getVal('pValidade') || '';
  const campoSaldo = el('pSaldo');
  if(!campoSaldo) return;
  if(!ref){ return; }
  let achados = produtos.filter(p => String(p.referencia || '').trim().toUpperCase() === ref);
  if(lote) achados = achados.filter(p => String(p.lote || '').trim().toUpperCase() === lote);
  if(validade) achados = achados.filter(p => String(p.validade || '').trim() === validade || String(p.validade || '').trim() === validade.split('-').reverse().join('/'));
  if(!achados.length){ campoSaldo.value = ''; return; }
  campoSaldo.value = achados.reduce((s,p) => s + (Number(p.saldo) || 0), 0);
}

function selecionarProduto(i){
  const p = produtos[i]; if(!p) return;
  editProdutoRef = p.referencia;
  produtoEncontrado = p;
  // CADA COLUNA VAI PRO CAMPO CERTO, NA MESMA ORDEM DO THEAD
  setVal('pReferencia', p.referencia);
  setVal('pNome', p.nome);
  setVal('pLote', p.lote);
  setVal('pValidade', converterValidadeParaInput(p.validade));
  setVal('pValor', p.valor);
  setVal('pEntrada', p.entrada ?? '');
  setVal('pSaida', p.saida ?? '');
  setVal('pSaldo', p.saldo ?? '');
  setVal('pClassificacao', p.classificacao);
  const b = el('btnSalvarProduto'); if(b) b.innerText = '✏️ Alterar';
}
function limparProduto(){
  editProdutoRef = null; produtoEncontrado = null;
  setVal('pReferencia',''); setVal('pNome',''); setVal('pLote',''); setVal('pValor','');
  setVal('pValidade',''); setVal('pEntrada',''); setVal('pSaida',''); setVal('pSaldo',''); setVal('pClassificacao','');
  const b = el('btnSalvarProduto'); if(b) b.innerText = '💾 Salvar';
}
async function excluirProdutoAtual(){ if(!editProdutoRef){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirProduto(editProdutoRef); limparProduto(); }
async function usarProdutoAtual(){ if(editProdutoRef==null){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const idx = produtos.findIndex(p=>String(p.referencia)===String(editProdutoRef)); if(idx<0) return; produtoSelecionadoTop = idx; if(el('buscaProdutoTop')) el('buscaProdutoTop').value = produtos[idx].nome; adicionarProduto(); mostrarAba('orc'); }
async function salvarProduto(){
  const nome=getVal('pNome').trim().toUpperCase();
  const referencia=getVal('pReferencia').trim().toUpperCase();
  const valor=parseFloat(getVal('pValor'));
  if(!nome||!referencia||!valor){ await mostrarMsgSistema('Preencha referencia, nome e valor'); return; }
  const p={
    referencia,
    nome,
    lote:getVal('pLote').trim().toUpperCase(),
    validade:getVal('pValidade') || '',
    valor,
    entrada:parseFloat(getVal('pEntrada')) || 0,
    saida:parseFloat(getVal('pSaida')) || 0,
    saldo:parseFloat(getVal('pSaldo')) || 0,
    classificacao:getVal('pClassificacao').trim().toUpperCase()
  };
  try{
    if(editProdutoRef){
      await api('salvarProduto', p, editProdutoRef);
      const idx = produtos.findIndex(x=>String(x.referencia)===String(editProdutoRef));
      if(idx>=0) produtos[idx]=p;
      await mostrarMsgSistema('Produto alterado!');
    } else {
      if(produtos.some(x=>String(x.referencia)===String(referencia))){ await mostrarMsgSistema('Já existe produto com essa referencia!'); return; }
      await api('salvarProduto', p, referencia);
      produtos.push(p);
      await mostrarMsgSistema('Produto salvo! Ref: '+referencia);
    }
    renderProdutos(); limparProduto();
  }catch(e){ await mostrarMsgSistema('Erro: '+e.message); }
}
async function excluirProduto(ref){ if(!await perguntarSistema('Excluir?')) return; try{ await api('excluirProduto', null, ref); produtos=produtos.filter(p=>String(p.referencia)!==String(ref)); renderProdutos(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
let produtoEncontrado = null;
function lerProdutosSalvos(){
  if(window.produtos && window.produtos.length) return window.produtos;
  const chaves = ['produtos', 'zd_produtos', 'zdProdutos', 'produtos_zao'];
  for(const k of chaves){
    try{
      const v = JSON.parse(localStorage.getItem(k) || '[]');
      if(Array.isArray(v) && v.length) return v;
    }catch(e){}
  }
  return [];
}
function buscarPorReferencia(ref){
  ref = String(ref || '').trim().toUpperCase();
  produtoEncontrado = produtos.find(p => String(p.referencia || '').trim().toUpperCase() === ref) || null;
  const aviso = el('avisoValor'); if(aviso) aviso.style.display = 'none';
  if(!produtoEncontrado) return;
  setVal('pNome', produtoEncontrado.nome);
  setVal('pSaldo', produtoEncontrado.saldo ?? '');
  setVal('pClassificacao', produtoEncontrado.classificacao);
  const v = el('pValor');
  if(v && !v.value) v.value = produtoEncontrado.valor || '';
  verificarValor();
}
function verificarValor(){
  const aviso = el('avisoValor');
  const v = el('pValor');
  if(!aviso || !v) return;
  if(!produtoEncontrado || !v.value){ aviso.style.display = 'none'; return; }
  const digitado = parseFloat(String(v.value).replace(',', '.'));
  const cadastrado = parseFloat(String(produtoEncontrado.valor).replace(',', '.'));
  aviso.style.display = (digitado !== cadastrado) ? 'block' : 'none';
}
function filtrarProdutosPorNome(){
  const termo = getVal('pNome').trim().toLowerCase();
  const box = el('listaBuscaProdutoNome'); if(!box) return;
  if(!termo){ box.style.display='none'; box.innerHTML=''; return; }
  const achados = produtos.filter(p => (p.nome||'').toLowerCase().includes(termo) || String(p.referencia||'').toLowerCase().includes(termo));
  if(!achados.length){ box.style.display='block'; box.innerHTML='<div class="tabela-vazio">NENHUM PRODUTO</div>'; return; }
  box.style.display='block';
  box.innerHTML = `<table class="tabela-sistema"><thead><tr><th>NOME</th><th>REF.</th><th>LOTE</th><th>SALDO</th><th>VALOR</th></tr></thead><tbody>` + achados.map(p=>{
    const idx = produtos.indexOf(p);
    return `<tr onmousedown="selecionarProdutoPorNome(${idx}); event.preventDefault();"><td>${p.nome}</td><td>${p.referencia||'-'}</td><td>${p.lote||'-'}</td><td>${p.saldo||0}</td><td>R$ ${fmt(p.valor)}</td></tr>`;
  }).join('') + `</tbody></table>`;
}
function selecionarProdutoPorNome(idx){
  const p = produtos[idx];
  if(!p) return;
  const box = el('listaBuscaProdutoNome'); if(box){ box.style.display='none'; box.innerHTML=''; }
  setVal('pNome', p.nome);
  setVal('pReferencia', p.referencia);
  setVal('pLote', p.lote);
  setVal('pValidade', converterValidadeParaInput(p.validade));
  setVal('pValor', p.valor);
  setVal('pEntrada', p.entrada ?? '');
  setVal('pSaida', p.saida ?? '');
  setVal('pSaldo', p.saldo ?? '');
  setVal('pClassificacao', p.classificacao);
  produtoEncontrado = p;
  editProdutoRef = p.referencia;
  const b = el('btnSalvarProduto'); if(b) b.innerText = '✏️ Alterar';
}
if(el('pNome')) el('pNome').addEventListener('input', filtrarProdutosPorNome);
['pReferencia','pLote','pValidade'].forEach(id => {
  const elm = el(id);
  if(elm) elm.addEventListener('input', function(){
    buscarPorReferencia(getVal('pReferencia'));
    buscarSaldoPorReferencia();
  });
});

apiLeitura('dados').then(d=>{ produtos = d.produtos || []; renderProdutos(); }).catch(e=>mostrarMsgSistema('Erro ao carregar dados: '+e.message));
