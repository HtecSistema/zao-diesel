const API_URL = 'https://script.google.com/macros/s/AKfycbyrQupOirl8tGA1oT6yirFvACSw-UBtAgILdgE4AZMtd4yju1rC0NJNdKRVJ1LA9bg6/exec';
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
  if(acao==='salvarProduto'){ const max = produtos.length ? Math.max(...produtos.map(p=>parseInt(p.cod)||0)) : 0; return {cod: max+1}; }
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
let editProdutoCod = null; let editClienteCod = null; let editFuncMat = null;
let histSelecionadoIdx = null; let itemOrcSelecionado = null;
function fmt(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parsePreco(v){ if(typeof v === 'number') return v; return parseFloat(String(v||"0").replace(/\./g,"").replace(",",".")) || 0; }
function selecionarLinha(tr, textoSelecionado, idFaixa){
  if(!tr) return;
  const tb = tr.closest('tbody');
  if(tb) tb.querySelectorAll('tr').forEach(r=>r.classList.remove('selecionado'));
  tr.classList.add('selecionado');
  if(idFaixa && textoSelecionado){ const f = document.getElementById(idFaixa); if(f){ f.style.display='block'; f.innerText = textoSelecionado; } }
}
function mostrarAba(q){
  document.getElementById('aba-orc').style.display = q==='orc'?'block':'none';
  document.getElementById('aba-prod').style.display = q==='prod'?'block':'none';
  document.getElementById('aba-vend').style.display = q==='vend'?'block':'none';
  document.getElementById('aba-hist').style.display = q==='hist'?'block':'none';
  document.getElementById('aba-cli').style.display = q==='cli'?'block':'none';
  document.getElementById('tabOrc').className = q==='orc'?'ativo':'';
  document.getElementById('tabProd').className = q==='prod'?'ativo':'';
  document.getElementById('tabVend').className = q==='vend'?'ativo':'';
  document.getElementById('tabHist').className = q==='hist'?'ativo':'';
  document.getElementById('tabCli').className = q==='cli'?'ativo':'';
}
let filtroProdutoLista = '';
function filtrarProdutosLista(){ filtroProdutoLista = document.getElementById('buscaProdutoLista').value.trim().toLowerCase(); renderProdutos(); }
function renderProdutos(){
  const tb = document.getElementById('listaProdutos'); if(!tb) return;
  let lista = produtos;
  if(filtroProdutoLista){ lista = produtos.filter(p => (p.nome||'').toLowerCase().includes(filtroProdutoLista) || (p.cod||'').toString().toLowerCase().includes(filtroProdutoLista) || (p.referencia||'').toLowerCase().includes(filtroProdutoLista) || (p.lote||'').toLowerCase().includes(filtroProdutoLista)); }
  const msg = document.getElementById('msgProdutos'); if(msg) msg.innerText = lista.length + ' produtos';
  if(!lista.length){ tb.innerHTML = '<tr><td colspan="8" class="tabela-vazio">NENHUM PRODUTO ENCONTRADO</td></tr>'; return; }
  tb.innerHTML = lista.map((p,i)=>{
    const idx = produtos.indexOf(p); const verde = (p.saldo||0) > 0 ? 'linha-verde' : '';
    return `<tr class="${verde}" onclick="selecionarLinha(this, 'PRODUTO SELECIONADO: ${p.nome} | COD ${p.cod} | R$ ${fmt(p.valor)}', 'selecionadoProduto');selecionarProduto(${idx})"><td>${String(i+1).padStart(3,'0')}</td><td>${p.cod||'-'}</td><td>${p.nome}</td><td>${p.referencia||'-'}</td><td>${p.lote||'-'}</td><td>${p.validade||'-'}</td><td>${p.saldo||0}</td><td>R$ ${fmt(p.valor)}</td></tr>`;
  }).join('');
}
function buscarSaldoPorReferencia(){
  const ref = (document.getElementById('pReferencia')?.value || '').trim().toUpperCase();
  const lote = (document.getElementById('pLote')?.value || '').trim().toUpperCase();
  const validade = document.getElementById('pValidade')?.value || '';
  const campoSaldo = document.getElementById('pSaldo');
  if(!campoSaldo) return;
  if(!ref){ return; }
  let achados = produtos.filter(p => String(p.referencia || '').trim().toUpperCase() === ref);
  if(lote) achados = achados.filter(p => String(p.lote || '').trim().toUpperCase() === lote);
  if(validade) achados = achados.filter(p => String(p.validade || '').trim() === validade || String(p.validade || '').trim() === validade.split('-').reverse().join('/'));
  if(!achados.length){ campoSaldo.value = ''; return; }
  campoSaldo.value = achados.reduce((s,p) => s + (Number(p.saldo) || 0), 0);
}
function selecionarProduto(i){ const p = produtos[i]; if(!p) return; editProdutoCod = p.cod; document.getElementById('pNome').value = p.nome || ''; document.getElementById('pCodigo').value = p.referencia || ''; document.getElementById('pLote').value = p.lote || ''; document.getElementById('pValor').value = p.valor || ''; const b = document.getElementById('btnSalvarProduto'); if(b) b.innerText = '✏️ Alterar'; }
function limparProduto(){ editProdutoCod = null; document.getElementById('pNome').value=''; document.getElementById('pCodigo').value=''; document.getElementById('pLote').value=''; document.getElementById('pValor').value=''; const b = document.getElementById('btnSalvarProduto'); if(b) b.innerText = '💾 Salvar'; }
async function excluirProdutoAtual(){ if(!editProdutoCod){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirProduto(editProdutoCod); limparProduto(); }
async function usarProdutoAtual(){ if(editProdutoCod==null){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const idx = produtos.findIndex(p=>String(p.cod)===String(editProdutoCod)); if(idx<0) return; produtoSelecionadoTop = idx; document.getElementById('buscaProdutoTop').value = produtos[idx].nome; adicionarProduto(); mostrarAba('orc'); }
async function salvarProduto(){
  const nome=document.getElementById('pNome').value.trim().toUpperCase(); const valor=parseFloat(document.getElementById('pValor').value);
  if(!nome||!valor){ await mostrarMsgSistema('Preencha nome e valor'); return; }
  const p={nome, referencia:document.getElementById('pCodigo').value.trim(), lote:document.getElementById('pLote').value.trim(), valor};
  try{
    if(editProdutoCod){ p.cod = editProdutoCod; await api('salvarProduto', p); const idx = produtos.findIndex(x=>String(x.cod)===String(editProdutoCod)); if(idx>=0) produtos[idx]=p; await mostrarMsgSistema('Produto alterado!'); }
    else { const r=await api('salvarProduto', p); p.cod=r.cod; p.saldo=0; produtos.push(p); await mostrarMsgSistema('Produto salvo! Cod: '+r.cod); }
    renderProdutos(); limparProduto();
  }catch(e){ await mostrarMsgSistema('Erro: '+e.message); }
}
async function excluirProduto(cod){ if(!await perguntarSistema('Excluir?')) return; try{ await api('excluirProduto', null, cod); produtos=produtos.filter(p=>String(p.cod)!==String(cod)); renderProdutos(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
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
  document.getElementById('avisoValor').style.display = 'none';
  if(!produtoEncontrado) return;
  document.getElementById('pNome').value = produtoEncontrado.nome || '';
  document.getElementById('pSaldo').value = produtoEncontrado.saldo ?? '';
  document.getElementById('pClassificacao').value = produtoEncontrado.classificacao || '';
  const v = document.getElementById('pValor');
  if(!v.value) v.value = produtoEncontrado.valor || '';
  verificarValor();
}
function verificarValor(){
  const aviso = document.getElementById('avisoValor');
  const v = document.getElementById('pValor');
  if(!produtoEncontrado || !v.value){
    aviso.style.display = 'none';
    return;
  }
  const digitado = parseFloat(String(v.value).replace(',', '.'));
  const cadastrado = parseFloat(String(produtoEncontrado.valor).replace(',', '.'));
  aviso.style.display = (digitado !== cadastrado) ? 'block' : 'none';
}
function filtrarProdutosPorNome(){
  const termo = document.getElementById('pNome').value.trim().toLowerCase();
  const box = document.getElementById('listaBuscaProdutoNome');
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
  document.getElementById('listaBuscaProdutoNome').style.display='none';
  document.getElementById('listaBuscaProdutoNome').innerHTML='';
  if(document.getElementById('pNome')) document.getElementById('pNome').value = p.nome || '';
  if(document.getElementById('pCodigo')) document.getElementById('pCodigo').value = p.referencia || '';
  if(document.getElementById('pReferencia')) document.getElementById('pReferencia').value = p.referencia || '';
  if(document.getElementById('pLote')) document.getElementById('pLote').value = p.lote || '';
  if(document.getElementById('pValidade')){
    let v = String(p.validade || '');
    if(v.includes('/')){ const a = v.split('/'); v = a[2] + '-' + a[1] + '-' + a[0]; }
    document.getElementById('pValidade').value = v;
  }
  if(document.getElementById('pValor')) document.getElementById('pValor').value = p.valor || '';
  if(document.getElementById('pEntrada')) document.getElementById('pEntrada').value = p.entrada ?? '';
  if(document.getElementById('pSaida')) document.getElementById('pSaida').value = p.saida ?? '';
  if(document.getElementById('pSaldo')) document.getElementById('pSaldo').value = p.saldo ?? '';
  if(document.getElementById('pClassificacao')) document.getElementById('pClassificacao').value = p.classificacao || '';
  produtoEncontrado = p;
}
document.getElementById('pNome').addEventListener('input', filtrarProdutosPorNome);
['pReferencia','pLote','pValidade'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', function(){
    buscarPorReferencia(document.getElementById('pReferencia').value);
    buscarSaldoPorReferencia();
  });
});
apiLeitura('dados').then(d=>{ produtos = d.produtos || []; renderProdutos(); }).catch(e=>mostrarMsgSistema('Erro ao carregar dados: '+e.message));