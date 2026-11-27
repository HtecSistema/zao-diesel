// TA VENDO ISSO> SO FAZ OQUE VOU FALAR PRA FAZER. NAO FAÇA NADA POR CONTA PROPRIA E NEM SEM AUTORIZAÇAO
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

/* ===== MENSAGENS DO PRÓPRIO SISTEMA ZDIESIL - SUBSTITUI alert E confirm DO NAVEGADOR ===== */
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
function anoAtual(){ return new Date().getFullYear(); }
function formatarNum(seq){ return 'ZD-' + anoAtual() + '.' + String(seq).padStart(4,'0'); }
function extrairSeq(numero){ if(!numero) return 0; const m = String(numero).match(/(\d{4})\s*$/); return m ? parseInt(m[1]) : (parseInt(numero)||0); }
function fmt(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parsePreco(v){ if(typeof v === 'number') return v; return parseFloat(String(v||"0").replace(/\./g,"").replace(",",".")) || 0; }
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
function getVendedor(){ const el = document.getElementById('vendedorSel'); return el ? el.value || '' : ''; }
function selecionarLinha(tr, textoSelecionado, idFaixa){
  if(!tr) return;
  const tb = tr.closest('tbody');
  if(tb) tb.querySelectorAll('tr').forEach(r=>r.classList.remove('selecionado'));
  tr.classList.add('selecionado');
  if(idFaixa && textoSelecionado){ const f = document.getElementById(idFaixa); if(f){ f.style.display='block'; f.innerText = textoSelecionado; } }
}

let indiceProdutos = [];
let timerBusca = null;

function prepararIndice(){
  indiceProdutos = produtos.map((p,i)=>({
    idx: i,
    texto: ((p.cod||'')+' '+(p.nome||'')+' '+(p.referencia||'')).toLowerCase()
  }));
}

function filtrarProdutosTop(){
  clearTimeout(timerBusca);
  timerBusca = setTimeout(()=>{
    const termo = document.getElementById('buscaProdutoTop').value.trim().toLowerCase();
    const box = document.getElementById('listaBuscaProduto');
    idxSetaLista = -1;
    if(!termo){ box.style.display='none'; box.innerHTML=''; return; }
    const achados = [];
    for(let i=0;i<indiceProdutos.length && achados.length<20;i++){
      if(indiceProdutos[i].texto.includes(termo)) achados.push(produtos[indiceProdutos[i].idx]);
    }
    if(!achados.length){ box.style.display='block'; box.innerHTML='<div class="tabela-vazio">NENHUM PRODUTO</div>'; return; }
    box.style.display='block';
    box.innerHTML = `<table class="tabela-sistema"><thead><tr><th>NOME</th><th>CÓD.</th><th>REF.</th><th>LOTE</th><th>SALDO</th><th>VALOR</th></tr></thead><tbody>` + achados.map(p=>{
      const idx = produtos.indexOf(p);
      return `<tr class="item-lista-prod" data-idx="${idx}" onclick="selecionarProdutoTop(${idx})"><td>${p.nome}</td><td>${p.cod||'-'}</td><td>${p.referencia||'-'}</td><td>${p.lote||'-'}</td><td>${p.saldo||0}</td><td>R$ ${fmt(p.valor)}</td></tr>`;
    }).join('') + `</tbody></table>`;
  }, 80);
}

function moverSetaLista(dir){
  const linhas = document.querySelectorAll('.item-lista-prod');
  if(!linhas.length) return;
  idxSetaLista += dir;
  if(idxSetaLista < 0) idxSetaLista = 0;
  if(idxSetaLista >= linhas.length) idxSetaLista = linhas.length - 1;
  linhas.forEach(l => l.classList.remove('linha-seta'));
  linhas[idxSetaLista].classList.add('linha-seta');
  linhas[idxSetaLista].scrollIntoView({block:'nearest'});
}

document.getElementById('buscaProdutoTop').addEventListener('keydown', function(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); moverSetaLista(1); }
  if(e.key === 'ArrowUp'){ e.preventDefault(); moverSetaLista(-1); }
  if(e.key === 'Enter'){
    e.preventDefault();
    const linhas = document.querySelectorAll('.item-lista-prod');
    if(!linhas.length) return;
    if(idxSetaLista < 0) idxSetaLista = 0;
    const idx = parseInt(linhas[idxSetaLista].getAttribute('data-idx'));
    selecionarProdutoTop(idx);
  }
  if(e.key === 'Escape'){ document.getElementById('listaBuscaProduto').style.display='none'; }
});

function selecionarProdutoTop(idx){
  produtoSelecionadoTop = idx;
  document.getElementById('listaBuscaProduto').style.display='none';
  document.getElementById('listaBuscaProduto').innerHTML='';
  document.getElementById('buscaProdutoTop').value = produtos[idx].nome;
  abrirModalQtd(idx);
}

function abrirModalQtd(idx){
  window.produtoModalIdx = idx;
  const p = produtos[idx];
  if(!p) return;
  document.getElementById('modalQtdNome').innerText = p.nome;
  document.getElementById('modalQtdValor').innerText = 'CÓD ' + (p.cod||'-') + ' | R$ ' + fmt(p.valor);
  document.getElementById('modalQtd').style.display = 'flex';
  const inp = document.getElementById('inputQtdModal');
  inp.value = 1;
  setTimeout(()=>{ inp.focus(); inp.select(); }, 100);
}
function fecharModalQtd(){
  document.getElementById('modalQtd').style.display = 'none';
  document.getElementById('buscaProdutoTop').value = '';
  document.getElementById('buscaProdutoTop').focus();
}

async function confirmarQtdModal(){
  const input = document.getElementById('inputQtdModal');
  const qtd = parseFloat(input.value);
  if(!qtd || qtd <= 0){
    input.style.border = '2px solid red';
    input.focus();
    return;
  }
  input.style.border = '';
  const idx = window.produtoModalIdx;
  const prod = produtos[idx];
  if(!prod) return;
  let linhaExistente = null;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{
    const descLinha = (tr.cells[2]?.querySelector('input')?.value || '').toUpperCase().trim();
    if(descLinha === (prod.nome||'').toUpperCase().trim()) linhaExistente = tr;
  });
  if(linhaExistente){
    fecharModalQtd();
    await mostrarMsgSistema('ESSE PRODUTO JÁ ESTÁ NA LISTA!');
    document.querySelectorAll('tr.destaque-qtd').forEach(t=>t.classList.remove('destaque-qtd'));
    linhaExistente.classList.add('destaque-qtd');
    linhaExistente.scrollIntoView({behavior:'smooth', block:'center'});
    const inputQtd = linhaExistente.cells[3]?.querySelector('input');
    if(inputQtd){ setTimeout(()=>{ inputQtd.focus(); inputQtd.select(); }, 300); }
    return;
  }
  if(!prod.saldo || prod.saldo <= 0){
    await mostrarMsgSistema('SEM SALDO! O produto ' + prod.nome + ' está com saldo 0.');
  }
  if(!prod.valor || prod.valor <= 0){
    await mostrarMsgSistema('SEM PREÇO! O produto ' + prod.nome + ' está com valor R$ 0,00. Vou lançar mesmo assim.');
  }
  adicionarLinha(qtd, prod.referencia||prod.cod||'', prod.nome, prod.valor, true);
  fecharModalQtd();
}

function filtrarClientesTop(){
  const termo = document.getElementById('cliente').value.trim().toLowerCase();
  const box = document.getElementById('listaBuscaCliente');
  idxSetaCliente = -1;
  if(!termo){ box.style.display='none'; box.innerHTML=''; return; }
  const achados = clientes.filter(c => (c.cod||'').toString().toLowerCase().includes(termo) || (c.nome||'').toLowerCase().includes(termo));
  if(!achados.length){ box.style.display='block'; box.innerHTML='<div class="tabela-vazio">NENHUM CLIENTE</div>'; return; }
  box.style.display='block';
  box.innerHTML = `<table class="tabela-sistema"><thead><tr><th>NOME</th><th>COD.</th><th>FONE</th><th>CIDADE</th></tr></thead><tbody>` + achados.map(c=>{
    const idx = clientes.indexOf(c);
    return `<tr class="item-lista-cli" data-idx="${idx}" onclick="selecionarClienteTop(${idx})"><td>${c.nome}</td><td>${c.cod||'-'}</td><td>${c.fone||''}</td><td>${c.cidade||''}/${c.estado||''}</td></tr>`;
  }).join('') + `</tbody></table>`;
}

function moverSetaCliente(dir){
  const linhas = document.querySelectorAll('.item-lista-cli');
  if(!linhas.length) return;
  idxSetaCliente += dir;
  if(idxSetaCliente < 0) idxSetaCliente = 0;
  if(idxSetaCliente >= linhas.length) idxSetaCliente = linhas.length - 1;
  linhas.forEach(l => l.classList.remove('linha-seta'));
  linhas[idxSetaCliente].classList.add('linha-seta');
  linhas[idxSetaCliente].scrollIntoView({block:'nearest'});
}

document.getElementById('cliente').addEventListener('keydown', function(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); moverSetaCliente(1); }
  if(e.key === 'ArrowUp'){ e.preventDefault(); moverSetaCliente(-1); }
  if(e.key === 'Enter'){
    e.preventDefault();
    const linhas = document.querySelectorAll('.item-lista-cli');
    if(idxSetaCliente >= 0 && linhas[idxSetaCliente]){
      const idx = parseInt(linhas[idxSetaCliente].getAttribute('data-idx'));
      selecionarClienteTop(idx);
      setTimeout(()=> document.getElementById('buscaProdutoTop').focus(), 100);
    }
  }
  if(e.key === 'Escape'){ document.getElementById('listaBuscaCliente').style.display='none'; }
});

function selecionarClienteTop(idx){ const c = clientes[idx]; if(!c) return; document.getElementById('listaBuscaCliente').style.display='none'; document.getElementById('listaBuscaCliente').innerHTML=''; document.getElementById('cliente').value = c.nome; usarCliente(idx); }
function usarCliente(i){ const c = clientes[i]; if(!c) return; document.getElementById('cliente').value = c.nome || ''; document.getElementById('foneCliente').value = c.fone || ''; document.getElementById('endereco').value = c.endereco || ''; document.getElementById('cidade').value = c.cidade || ''; document.getElementById('estado').value = c.estado || ''; mostrarAba('orc'); }
document.addEventListener('click', (e)=>{
  const boxC = document.getElementById('listaBuscaCliente'); const boxP = document.getElementById('listaBuscaProduto');
  if(boxC && !e.target.closest('#cliente') && !e.target.closest('#listaBuscaCliente')) boxC.style.display='none';
  if(boxP && !e.target.closest('#buscaProdutoTop') && !e.target.closest('#listaBuscaProduto')) boxP.style.display='none';
});

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

function renderVendedores(){
  const sel=document.getElementById('vendedorSel'); sel.innerHTML='<option value="">-- escolher funcionário --</option>';
  vendedores.forEach(v=>{ sel.innerHTML+=`<option value="${v.nome}">${v.nome}</option>`; });
  const msg=document.getElementById('msgVendedores'); if(msg) msg.innerText=vendedores.length+' funcionários';
  document.getElementById('listaVendedores').innerHTML = vendedores.length? vendedores.map((v,i)=>{
    const idx = vendedores.indexOf(v);
    return `<tr onclick="selecionarLinha(this, 'FUNCIONÁRIO SELECIONADO: ${v.nome} | MAT ${v.mat} | ${v.fone||''}', 'selecionadoFunc');selecionarFuncionario(${idx})"><td>${String(i+1).padStart(3,'0')}</td><td><b>${v.nome}</b></td><td>${v.mat||'-'}</td><td>${v.fone||'-'}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="tabela-vazio">NENHUM FUNCIONÁRIO</td></tr>';
}


function renderClientes(){
  const msg=document.getElementById('msgClientes'); if(msg) msg.innerText=clientes.length+' clientes';
  document.getElementById('listaClientes').innerHTML = clientes.length ? clientes.map((c,i)=>{
    const idx = clientes.indexOf(c);
    return `<tr onclick="selecionarLinha(this, 'CLIENTE SELECIONADO: ${c.nome} | COD ${c.cod} | ${c.fone||''}', 'selecionadoCliente');selecionarCliente(${idx})"><td>${String(i+1).padStart(3,'0')}</td><td><b>${c.nome}</b></td><td>${c.cod}</td><td>${c.fone||'-'}</td><td>${c.cidade||''} / ${c.estado||''}</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="tabela-vazio">NENHUM CLIENTE</td></tr>';
}
function selecionarProduto(i){ const p = produtos[i]; if(!p) return; editProdutoCod = p.cod; document.getElementById('pNome').value = p.nome || ''; document.getElementById('pCodigo').value = p.referencia || ''; document.getElementById('pLote').value = p.lote || ''; document.getElementById('pValor').value = p.valor || ''; const b = document.getElementById('btnSalvarProduto'); if(b) b.innerText = '✏️ Alterar'; }
function limparProduto(){ editProdutoCod = null; document.getElementById('pNome').value=''; document.getElementById('pCodigo').value=''; document.getElementById('pLote').value=''; document.getElementById('pValor').value=''; const b = document.getElementById('btnSalvarProduto'); if(b) b.innerText = '💾 Salvar'; }
async function excluirProdutoAtual(){ if(!editProdutoCod){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirProduto(editProdutoCod); limparProduto(); }
async function usarProdutoAtual(){ if(editProdutoCod==null){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const idx = produtos.findIndex(p=>String(p.cod)===String(editProdutoCod)); if(idx<0) return; produtoSelecionadoTop = idx; document.getElementById('buscaProdutoTop').value = produtos[idx].nome; adicionarProduto(); mostrarAba('orc'); }
function selecionarCliente(i){ const c = clientes[i]; if(!c) return; editClienteCod = c.cod; document.getElementById('cNome').value = c.nome || ''; document.getElementById('cDoc').value = c.cod || ''; document.getElementById('cFone').value = c.fone || ''; document.getElementById('cEndereco').value = c.endereco || ''; document.getElementById('cCidade').value = c.cidade || ''; document.getElementById('cEstado').value = c.estado || ''; const b = document.getElementById('btnSalvarCliente'); if(b) b.innerText = '✏️ Alterar'; }
function limparCliente(){ editClienteCod = null; ['cNome','cDoc','cFone','cEndereco','cCidade','cEstado'].forEach(id=>document.getElementById(id).value=''); const b = document.getElementById('btnSalvarCliente'); if(b) b.innerText = '💾 Salvar'; }
async function excluirClienteAtual(){ if(!editClienteCod){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirCliente(editClienteCod); limparCliente(); }
async function usarClienteAtual(){ if(editClienteCod==null){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const idx = clientes.findIndex(c=>String(c.cod)===String(editClienteCod)); if(idx>=0) usarCliente(idx); }
function selecionarFuncionario(i){ const v = vendedores[i]; if(!v) return; editFuncMat = v.mat; document.getElementById('vNome').value = v.nome || ''; document.getElementById('vFone').value = v.fone || ''; const b = document.getElementById('btnSalvarFuncionario'); if(b) b.innerText = '✏️ Alterar'; }
function limparFuncionario(){ editFuncMat = null; document.getElementById('vNome').value=''; document.getElementById('vFone').value=''; const b = document.getElementById('btnSalvarFuncionario'); if(b) b.innerText = '💾 Salvar'; }
async function excluirFuncionarioAtual(){ if(!editFuncMat){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirFuncionario(editFuncMat); limparFuncionario(); }
async function usarFuncionarioAtual(){ if(!editFuncMat){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const v = vendedores.find(v=>String(v.mat)===String(editFuncMat)); if(!v) return; const sel = document.getElementById('vendedorSel'); if(sel) sel.value = v.nome; mostrarAba('orc'); }
async function limparOrcamento(){ if(!await perguntarSistema('Limpar o orçamento atual?')) return; document.getElementById('tabelaItens').innerHTML=''; document.getElementById('descontoPct').value=0; document.getElementById('cliente').value=''; document.getElementById('motor').value=''; document.getElementById('veiculo').value=''; document.getElementById('endereco').value=''; document.getElementById('foneCliente').value=''; document.getElementById('cidade').value=''; document.getElementById('estado').value=''; calcular(); }
async function excluirOrcamentoAtual(){ const num = document.getElementById('numOrc').innerText; if(!await perguntarSistema('Excluir o orçamento '+num+'?')) return; try{ await api('excluirOrcamento', null, num); await mostrarMsgSistema('Orçamento excluído!'); limparOrcamento(); carregarHistorico(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
async function excluirItemOrcSelecionado(){ if(!itemOrcSelecionado){ await mostrarMsgSistema('Clica numa linha do orçamento primeiro'); return; } itemOrcSelecionado.remove(); itemOrcSelecionado=null; calcular(); }
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
async function salvarFuncionario(){
  const nome=document.getElementById('vNome').value.trim(); if(!nome){ await mostrarMsgSistema('Preencha o nome'); return; }
  const f={nome, fone:document.getElementById('vFone').value.trim()};
  try{
    if(editFuncMat){ f.mat = editFuncMat; await api('salvarFuncionario', f); const idx = vendedores.findIndex(x=>String(x.mat)===String(editFuncMat)); if(idx>=0) vendedores[idx]=f; await mostrarMsgSistema('Funcionário alterado!'); }
    else { const r=await api('salvarFuncionario', f); f.mat=r.mat; vendedores.push(f); await mostrarMsgSistema('Funcionário salvo! Mat: '+r.mat); }
    renderVendedores(); limparFuncionario();
  }catch(e){ await mostrarMsgSistema('Erro: '+e.message); }
}
async function excluirFuncionario(mat){ if(!await perguntarSistema('Excluir?')) return; try{ await api('excluirFuncionario', null, mat); vendedores=vendedores.filter(v=>String(v.mat)!==String(mat)); renderVendedores(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
function mascaraDoc(el){ let v = el.value.replace(/\D/g,''); if(v.length <= 11){ v = v.replace(/(\d{3})(\d)/,'$1.$2'); v = v.replace(/(\d{3})(\d)/,'$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/,'$1-$2'); } else { v = v.replace(/^(\d{2})(\d)/,'$1.$2'); v = v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3'); v = v.replace(/\.(\d{3})(\d)/,'.$1/$2'); v = v.replace(/(\d{4})(\d)/,'$1-$2'); } el.value = v; }
function validaDoc(doc){ let v = doc.replace(/\D/g,''); if(v.length === 11) return validaCPF(v); if(v.length === 14) return validaCNPJ(v); return false; }
function validaCPF(cpf){ if(/^(\d)\1+$/.test(cpf)) return false; let s = 0; for(let i=0;i<9;i++) s += parseInt(cpf[i]) * (10-i); let d1 = 11 - (s % 11); if(d1 >= 10) d1 = 0; if(d1 !== parseInt(cpf[9])) return false; s = 0; for(let i=0;i<10;i++) s += parseInt(cpf[i]) * (11-i); let d2 = 11 - (s % 11); if(d2 >= 10) d2 = 0; return d2 === parseInt(cpf[10]); }
function validaCNPJ(cnpj){ if(/^(\d)\1+$/.test(cnpj)) return false; let t = cnpj.length - 2, n = cnpj.substring(0,t), d = cnpj.substring(t), s = 0, p = t - 7; for(let i=t;i>=1;i--){ s += n.charAt(t-i) * p--; if(p < 2) p = 9; } let r = s % 11 < 2 ? 0 : 11 - (s % 11); if(r != d.charAt(0)) return false; t = t + 1; n = cnpj.substring(0,t); s = 0; p = t - 7; for(let i=t;i>=1;i--){ s += n.charAt(t-i) * p--; if(p < 2) p = 9; } r = s % 11 < 2 ? 0 : 11 - (s % 11); return r == d.charAt(1); }
async function salvarCliente(){
  const nome = document.getElementById('cNome').value.trim().toUpperCase(); const doc = document.getElementById('cDoc').value.trim();
  if(!nome || !doc){ await mostrarMsgSistema('Preencha nome e CPF/CNPJ'); return; }
  if(!validaDoc(doc)){ await mostrarMsgSistema('CPF ou CNPJ inválido! Confere os números.'); return; }
  const c = { cod: doc, nome, fone: document.getElementById('cFone').value.trim(), endereco: document.getElementById('cEndereco').value.trim(), cidade: document.getElementById('cCidade').value.trim(), estado: document.getElementById('cEstado').value.trim() };
  try{ await api('salvarCliente', c); if(editClienteCod){ const idx = clientes.findIndex(x=>String(x.cod)===String(editClienteCod)); if(idx>=0) clientes[idx]=c; await mostrarMsgSistema('Cliente alterado!'); } else { clientes.push(c); await mostrarMsgSistema('Cliente salvo!'); } renderClientes(); limparCliente(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); }
}
async function excluirCliente(cod){ if(!await perguntarSistema('Excluir cliente?')) return; try{ await api('excluirCliente', null, cod); clientes=clientes.filter(c=>String(c.cod)!==String(cod)); renderClientes(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
async function adicionarProduto(){ if(produtoSelecionadoTop===null || !produtos[produtoSelecionadoTop]){ await mostrarMsgSistema('Busca e clica no produto primeiro'); return; } const p=produtos[produtoSelecionadoTop]; const qtd=parseFloat(document.getElementById('qtdAdd').value)||1; adicionarLinha(qtd, p.referencia||p.cod||'', p.nome, p.valor, true); document.getElementById('buscaProdutoTop').value=''; produtoSelecionadoTop=null; }
function adicionarLinhaVazia(){ adicionarLinha(1,'','',0,false); }
function adicionarLinha(qtd, ref, desc, preco, travado){
  const tb=document.getElementById('tabelaItens'); const tr=document.createElement('tr');
  const num = String(tb.children.length+1).padStart(3,'0');
  tr.onclick = ()=>{ selecionarLinha(tr, 'ITEM SELECIONADO: '+desc, 'selecionadoOrc'); itemOrcSelecionado = tr; };
  const ehMaoDeObra = String(desc||'').toUpperCase().includes('MAO DE OBRA') || String(desc||'').toUpperCase().includes('MÃO DE OBRA');
  const travar = travado && !ehMaoDeObra; const ro = travar ? 'readonly' : '';
  tr.innerHTML=`<td>${num}</td><td><input class="ref-in" value="${ref||''}" ${ro}></td><td><input class="desc-in" value="${desc||''}" ${ro}></td><td class="qtd"><input type="number" value="${qtd}" min="0" oninput="calcular()"></td><td class="preco"><input type="text" value="${fmt(preco)}" oninput="calcular()"></td><td class="total">0,00</td>`;
  tb.appendChild(tr); const m = document.getElementById('msgItensOrc'); if(m) m.innerText = tb.children.length + ' itens'; calcular();
}
function calcular(){
  let sub=0;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const q=parseFloat(tr.cells[3].querySelector('input').value)||0; const pr=parsePreco(tr.cells[4].querySelector('input').value); const tot=q*pr; sub+=tot; tr.cells[5].innerText=fmt(tot); });
  const pct=parseFloat(document.getElementById('descontoPct').value)||0; const desc=sub*(pct/100); const total=sub-desc;
  document.getElementById('subtotal').innerText=fmt(sub); document.getElementById('valorDesconto').innerText=fmt(desc); document.getElementById('totalGeral').innerText=fmt(total);
}
function calc(){ calcular(); }
function getItens(){ let arr=[]; document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ arr.push({ref:tr.cells[1].querySelector('input').value, desc:tr.cells[2].querySelector('input').value, qtd:tr.cells[3].querySelector('input').value, preco:parsePreco(tr.cells[4].querySelector('input').value), total:tr.cells[5].innerText}); }); return arr; }
function textoOrcamento(){
  let linhas=[]; document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const q=tr.cells[3].querySelector('input').value||''; const d=tr.cells[2].querySelector('input').value||''; const t=tr.cells[5].innerText||'0,00'; if(d) linhas.push(`${q}x ${d} - R$ ${t}`); });
  const pct=document.getElementById('descontoPct').value||0;
  return `*ZÃO DIESEL - ORÇAMENTO Nº ${document.getElementById('numOrc').innerText}*\nData: ${document.getElementById('dataOrc').innerText}\nCliente: ${document.getElementById('cliente').value}\nMotor: ${document.getElementById('motor').value} | Veículo: ${document.getElementById('veiculo').value}\nPreenchido por: ${getVendedor()||'-'}\nAv. Cícero Ávila, 1495 - Olga Moreira - Promissão - Paragominas - PA\nFone: 99191-2610 / 99210-7642\n\n*ITENS:*\n${linhas.join('\n')}\n\nSubtotal: R$ ${document.getElementById('subtotal').innerText}\nDesconto: ${pct}% - R$ ${document.getElementById('valorDesconto').innerText}\n*TOTAL: R$ ${document.getElementById('totalGeral').innerText}*\n\nObrigado pela preferência! Zão Diesel`;
}
function enviarWhatsApp(){ salvarOrcamentoAtual(); window.open('https://wa.me/?text='+encodeURIComponent(textoOrcamento()),'_blank'); }
async function compartilhar(){ const t=textoOrcamento(); salvarOrcamentoAtual(); if(navigator.share){ try{ await navigator.share({title:'Orçamento ZDiesil', text:t}); }catch(e){} } else enviarWhatsApp(); }
async function salvarOrcamentoAtual(){
  let achouMaoSemValor = false;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const desc = tr.cells[2].querySelector('input').value.toUpperCase(); const preco = parsePreco(tr.cells[4].querySelector('input').value); if(desc.includes('MAO DE OBRA') || desc.includes('MÃO DE OBRA')){ if(!preco || preco <= 0){ achouMaoSemValor = true; tr.cells[4].querySelector('input').focus(); } } });
  if(achouMaoSemValor){ await mostrarMsgSistema('Coloca o valor da MÃO DE OBRA antes de salvar!'); return false; }
  const o={ numero: document.getElementById('numOrc').innerText, data: document.getElementById('dataOrc').innerText, cliente: document.getElementById('cliente').value, foneCliente: document.getElementById('foneCliente').value, endereco: document.getElementById('endereco').value, cidade: document.getElementById('cidade').value, estado: document.getElementById('estado').value, motor: document.getElementById('motor').value, veiculo: document.getElementById('veiculo').value, vendedor: getVendedor(), execucao: document.getElementById('execucao').value, subtotal: document.getElementById('subtotal').innerText, descontoPct: document.getElementById('descontoPct').value, descontoValor: document.getElementById('valorDesconto').innerText, total: document.getElementById('totalGeral').innerText, itens: getItens() };
  try{ await api('salvarOrcamento', o); await mostrarMsgSistema('Orçamento Nº ' + o.numero + ' salvo!'); ultimoNum = extrairSeq(o.numero); document.getElementById('numOrc').innerText = formatarNum(ultimoNum + 1); return true; }catch(e){ await mostrarMsgSistema('Erro ao salvar orçamento: '+e.message); return false; }
}
async function novoOrcamento(){ if(!await perguntarSistema('Gerar novo orçamento? Vai salvar o atual e subir o número.')) return; const salvou = await salvarOrcamentoAtual(); if(!salvou) return; document.getElementById('tabelaItens').innerHTML=''; document.getElementById('descontoPct').value=0; document.getElementById('cliente').value=''; document.getElementById('motor').value=''; document.getElementById('veiculo').value=''; document.getElementById('endereco').value=''; document.getElementById('foneCliente').value=''; document.getElementById('cidade').value=''; document.getElementById('estado').value=''; document.getElementById('buscaProdutoTop').value=''; document.getElementById('execucao').value='EM ESPERA'; calcular(); window.scrollTo({top:0,behavior:'smooth'}); }
async function carregarHistorico(){ try{ const d = await apiLeitura('historico'); historico = Array.isArray(d) ? d : (d.historico || d.dados || []); renderHistorico(historico); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
function renderHistorico(lista){
  const msg=document.getElementById('msgHistorico'); if(msg) msg.innerText=(lista?lista.length:0)+' orçamentos';
  if(!lista || !lista.length){ document.getElementById('listaHistorico').innerHTML = '<tr><td colspan="7" class="tabela-vazio">NENHUM ORÇAMENTO</td></tr>'; return; }
  document.getElementById('listaHistorico').innerHTML = lista.map((o,i)=>{
    const verde = (o.execucao||'').includes('EXECUTAR') ? 'linha-verde' : '';
    return `<tr class="${verde}" onclick="selecionarLinha(this, 'ORÇAMENTO SELECIONADO: ${o.numero} | ${o.cliente} | TOTAL R$ ${o.total}', 'selecionadoHist');histSelecionadoIdx=${i}"><td>${String(i+1).padStart(3,'0')}</td><td><b>${o.numero}</b></td><td>${o.data}</td><td>${o.cliente}</td><td>${o.motor||''}</td><td>${o.execucao||''}</td><td><b>R$ ${o.total}</b></td></tr>`;
  }).join('');
}
function filtrarHistorico(){ const busca = document.getElementById('buscaHist').value.toLowerCase(); const filtrado = historico.filter(o => (o.cliente||'').toLowerCase().includes(busca) || (o.numero||'').toString().includes(busca) || (o.motor||'').toLowerCase().includes(busca)); renderHistorico(filtrado); }
async function abrirOrcamentoSelecionado(){ if(histSelecionadoIdx==null){ await mostrarMsgSistema('Clica numa linha do histórico primeiro'); return; } carregarOrcamentoHist(histSelecionadoIdx); }
async function excluirOrcamentoSelecionado(){ if(histSelecionadoIdx==null){ await mostrarMsgSistema('Clica numa linha do histórico primeiro'); return; } const o = historico[histSelecionadoIdx]; if(!await perguntarSistema('Excluir o orçamento '+o.numero+'?')) return; try{ await api('excluirOrcamento', null, o.numero); historico.splice(histSelecionadoIdx,1); histSelecionadoIdx=null; renderHistorico(historico); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }
function carregarOrcamentoHist(i){ const o = historico[i]; if(!o) return; document.getElementById('numOrc').innerText = o.numero; document.getElementById('dataOrc').innerText = o.data; document.getElementById('cliente').value = o.cliente || ''; document.getElementById('foneCliente').value = o.foneCliente || ''; document.getElementById('endereco').value = o.endereco || ''; document.getElementById('cidade').value = o.cidade || ''; document.getElementById('estado').value = o.estado || ''; document.getElementById('motor').value = o.motor || ''; document.getElementById('veiculo').value = o.veiculo || ''; document.getElementById('descontoPct').value = o.descontoPct || 0; document.getElementById('execucao').value = o.execucao || 'EM ESPERA'; document.getElementById('tabelaItens').innerHTML = ''; (o.itens||[]).forEach(it=>adicionarLinha(it.qtd, it.ref, it.desc, it.preco)); calcular(); mostrarAba('orc'); }
document.getElementById('dataOrc').innerText=new Date().toLocaleDateString('pt-BR');
apiLeitura('dados').then(d=>{ produtos = d.produtos || []; vendedores = d.funcionarios || []; clientes = d.clientes || []; ultimoNum = extrairSeq(d.ultimoNum); document.getElementById('numOrc').innerText = formatarNum(ultimoNum + 1); prepararIndice(); renderProdutos(); renderVendedores(); renderClientes(); calcular(); }).catch(e=>mostrarMsgSistema('Erro ao carregar dados: '+e.message));
const ELEMENTOS_FIXOS = ["ELEMENTOS","BICOS INJETORES","VÁLVULA DE PRESSÃO","REPAROS","CABEÇOTE HIDRÁULICO","CORPO DISTRIBUIDOR","ANEL DE RESSALTO","CAINE DE COMANDO","PISTÃO","PALHETA","MOLAS","VÁLVULA DE RETORNO","SAPATA E ROLETE","EIXO DE COMANDO","PARAFUSO OUT","ARRASTADOR","BOMBA MANUAL","KIT DISCO, PINO, MOLA","ROLAMENTOS","BUCHAS","ROLDANAS","VÁLVULA DOSIFICADORA","ANELEX CÊNTRICO","PLACA FINAL","MONTAGEM E REGULAGEM","MÃO DE OBRA"];

function imprimirOrcamento(){
  const get = id => document.getElementById(id)?.value || "";
  document.getElementById("p-nome").textContent = get("cliente"); document.getElementById("p-endereco").textContent = get("endereco"); document.getElementById("p-fone").textContent = get("foneCliente"); document.getElementById("p-cidade").textContent = get("cidade"); document.getElementById("p-estado").textContent = get("estado"); document.getElementById("p-motor").textContent = get("motor"); document.getElementById("p-veiculo").textContent = get("veiculo");
  document.getElementById("p-data").textContent = document.getElementById("dataOrc")?.innerText || new Date().toLocaleDateString("pt-BR");
  document.getElementById("p-num").textContent = document.getElementById("numOrc")?.innerText || "";
  document.getElementById("p-total").textContent = document.getElementById("totalGeral")?.textContent || "0,00";
  let mapa = {};
  document.querySelectorAll("#tabelaItens tr").forEach(tr=>{ let tds = tr.querySelectorAll("td"); let ref = tds[1]?.querySelector("input")?.value || ""; let desc = tds[2]?.querySelector("input")?.value?.toUpperCase().trim() || ""; let qtd = tds[3]?.querySelector("input")?.value || ""; let preco = tds[4]?.querySelector("input")?.value || "0,00"; let total = tds[5]?.textContent || "0,00"; if(desc) mapa[desc] = {ref,qtd,preco,total}; });
  let html = "";
  ELEMENTOS_FIXOS.forEach(nome => { let it = mapa[nome] || {ref:"",qtd:"",preco:"",total:""}; html += `<tr><td>${it.ref}</td><td>${nome}</td><td>${it.qtd}</td><td>${it.preco}</td><td>${it.total}</td></tr>`; });
  Object.keys(mapa).forEach(desc=>{ if(!ELEMENTOS_FIXOS.includes(desc)){ let it = mapa[desc]; html += `<tr><td>${it.ref}</td><td>${desc}</td><td>${it.qtd}</td><td>${it.preco}</td><td>${it.total}</td></tr>`; } });
  document.getElementById("p-itens").innerHTML = html; window.print();
}
document.addEventListener("blur", e=>{ if(e.target.closest("td.preco input")){ e.target.value = fmt(parsePreco(e.target.value)); calcular(); } }, true);

document.getElementById('inputQtdModal').addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ confirmarQtdModal(); }
});

async function atualizarDados(){
  const btn = document.querySelector('button[onclick="atualizarDados()"]');
  if(btn) btn.innerText = '⏳';
  try{
    const d = await apiLeitura('dados');
    produtos = d.produtos || [];
    vendedores = d.funcionarios || [];
    clientes = d.clientes || [];
    prepararIndice();
    renderProdutos(); renderVendedores(); renderClientes();
    await mostrarMsgSistema('Atualizado! ' + produtos.length + ' produtos');
  }catch(e){ await mostrarMsgSistema('Erro ao atualizar: '+e.message); }
  if(btn) btn.innerText = '🔄';
}

// QUANDO DIGITAR REFERÊNCIA, LOTE OU VALIDADE, BUSCA O SALDO NA HORA

['pReferencia','pLote','pValidade'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', function(){
    buscarPorReferencia(document.getElementById('pReferencia').value);
    buscarSaldoPorReferencia();
  });
});


document.getElementById('tabelaItens').addEventListener('keydown', function(e){
  if(e.target.closest('td.qtd input') && (e.key === 'Enter' || e.key === 'Tab')){
    e.preventDefault();
    calcular();
    document.getElementById('buscaProdutoTop').focus();
  }
});


// ===== SINCRONIA - SÓ ISSO =====

function lerFila(){ try{ return JSON.parse(localStorage.getItem('zd_fila_sync') || '[]'); }catch(e){ return []; } }
function salvarFila(fila){ localStorage.setItem('zd_fila_sync', JSON.stringify(fila)); }

function atualizarBarraSync(){
  const fila = lerFila();
  const barra = document.getElementById('barraSync');
  if(!barra) return;
  if(navigator.onLine && fila.length > 0){
    document.getElementById('qtdSync').textContent = fila.length;
    barra.style.display = 'block';
  } else {
    barra.style.display = 'none';
  }
}

// CHAMA ISSO NO LUGAR DE SALVAR DIRETO NA BASE
// Exemplo: salvarNaBase('produto', objetoDoProduto)
async function salvarNaBase(acao, dados, cod){
  const item = { acao: acao, dados: dados, cod: cod, data: new Date().toISOString() };

  // SEM INTERNET: salva só no celular
  if(!navigator.onLine){
    const fila = lerFila();
    fila.push(item);
    salvarFila(fila);
    atualizarBarraSync();
    return { offline: true };
  }

  // COM INTERNET: tenta salvar na base
  try{
    await fetch(API_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(item) });
    atualizarBarraSync();
    return { ok: true };
  }catch(e){
    const fila = lerFila();
    fila.push(item);
    salvarFila(fila);
    atualizarBarraSync();
    return { offline: true };
  }


} // <-- COLA ESSE } AQUI

async function sincronizarAgora(){
  const fila = lerFila();
  if(!fila.length) return;
  if(!navigator.onLine) return;

  const resto = [];
  for(const item of fila){
    try{
      await fetch(API_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(item) });
    }catch(e){ resto.push(item); }
  }
  salvarFila(resto);
  atualizarBarraSync();
}

window.addEventListener('online', atualizarBarraSync);
window.addEventListener('offline', atualizarBarraSync);
document.addEventListener('DOMContentLoaded', atualizarBarraSync);


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
