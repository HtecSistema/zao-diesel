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

let produtos = []; let vendedores = []; let clientes = []; let ultimoNum = 0; let produtoSelecionadoTop = null;
let idxSetaLista = -1; let idxSetaCliente = -1;
let itemOrcSelecionado = null;
let indiceProdutos = []; let timerBusca = null;

function anoAtual(){ return new Date().getFullYear(); }
function formatarNum(seq){ return 'ZD-' + anoAtual() + '.' + String(seq).padStart(4,'0'); }
function extrairSeq(numero){ if(!numero) return 0; const m = String(numero).match(/(\d{4})\s*$/); return m ? parseInt(m[1]) : (parseInt(numero)||0); }
function fmt(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parsePreco(v){ if(typeof v === 'number') return v; return parseFloat(String(v||"0").replace(/\./g,"").replace(",",".")) || 0; }
function el(id){ return document.getElementById(id); }
function mostrarAba(q){
  if(el('aba-orc')) el('aba-orc').style.display = q==='orc'?'block':'none';
  if(el('aba-hist')) el('aba-hist').style.display = q==='hist'?'block':'none';
  if(el('tabOrc')) el('tabOrc').className = q==='orc'?'ativo':'';
  if(el('tabHist')) el('tabHist').className = q==='hist'?'ativo':'';
  if(el('tabCli')) el('tabCli').className = q==='cli'?'ativo':'';
}
function getVendedor(){ const e = el('vendedorSel'); return e ? e.value || '' : ''; }
function selecionarLinha(tr, texto, idFaixa){
  if(!tr) return;
  const tb = tr.closest('tbody');
  if(tb) tb.querySelectorAll('tr').forEach(r=>r.classList.remove('selecionado'));
  tr.classList.add('selecionado');
  if(idFaixa && texto){ const f = el(idFaixa); if(f){ f.style.display='block'; f.innerText = texto; } }
}
function prepararIndice(){
  indiceProdutos = produtos.map((p,i)=>({ idx:i, texto: ((p.cod||'')+' '+(p.nome||'')+' '+(p.referencia||'')).toLowerCase() }));
}

// --- BUSCA PRODUTO ---
function filtrarProdutosTop(){
  clearTimeout(timerBusca);
  timerBusca = setTimeout(()=>{
    const termo = el('buscaProdutoTop').value.trim().toLowerCase();
    const box = el('listaBuscaProduto');
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
el('buscaProdutoTop').addEventListener('keydown', function(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); moverSetaLista(1); }
  if(e.key === 'ArrowUp'){ e.preventDefault(); moverSetaLista(-1); }
  if(e.key === 'Enter'){
    e.preventDefault();
    const linhas = document.querySelectorAll('.item-lista-prod');
    if(!linhas.length) return;
    if(idxSetaLista < 0) idxSetaLista = 0;
    selecionarProdutoTop(parseInt(linhas[idxSetaLista].getAttribute('data-idx')));
  }
  if(e.key === 'Escape'){ el('listaBuscaProduto').style.display='none'; }
});
function selecionarProdutoTop(idx){
  produtoSelecionadoTop = idx;
  el('listaBuscaProduto').style.display='none';
  el('listaBuscaProduto').innerHTML='';
  el('buscaProdutoTop').value = produtos[idx].nome;
  abrirModalQtd(idx);
}

// --- MODAL QTD ---
function abrirModalQtd(idx){
  window.produtoModalIdx = idx;
  const p = produtos[idx]; if(!p) return;
  el('modalQtdNome').innerText = p.nome;
  el('modalQtdValor').innerText = 'CÓD ' + (p.cod||'-') + ' | R$ ' + fmt(p.valor);
  el('modalQtd').style.display = 'flex';
  const inp = el('inputQtdModal'); inp.value = 1;
  setTimeout(()=>{ inp.focus(); inp.select(); }, 100);
}
function fecharModalQtd(){
  el('modalQtd').style.display = 'none';
  el('buscaProdutoTop').value = '';
  el('buscaProdutoTop').focus();
}
async function confirmarQtdModal(){
  const input = el('inputQtdModal');
  const qtd = parseFloat(input.value);
  if(!qtd || qtd <= 0){ input.style.border = '2px solid red'; input.focus(); return; }
  input.style.border = '';
  const prod = produtos[window.produtoModalIdx]; if(!prod) return;
  let linhaExistente = null;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{
    const d = (tr.cells[2]?.querySelector('input')?.value || '').toUpperCase().trim();
    if(d === (prod.nome||'').toUpperCase().trim()) linhaExistente = tr;
  });
  if(linhaExistente){
    fecharModalQtd();
    await mostrarMsgSistema('ESSE PRODUTO JÁ ESTÁ NA LISTA!');
    document.querySelectorAll('tr.destaque-qtd').forEach(t=>t.classList.remove('destaque-qtd'));
    linhaExistente.classList.add('destaque-qtd');
    linhaExistente.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  if(!prod.saldo || prod.saldo <= 0) await mostrarMsgSistema('SEM SALDO! O produto ' + prod.nome + ' está com saldo 0.');
  if(!prod.valor || prod.valor <= 0) await mostrarMsgSistema('SEM PREÇO! O produto ' + prod.nome + ' está com valor R$ 0,00. Vou lançar mesmo assim.');
  adicionarLinha(qtd, prod.referencia||prod.cod||'', prod.nome, prod.valor, true);
  fecharModalQtd();
}
el('inputQtdModal').addEventListener('keydown', function(e){ if(e.key === 'Enter') confirmarQtdModal(); });

// --- BUSCA CLIENTE ---
function filtrarClientesTop(){
  const termo = el('cliente').value.trim().toLowerCase();
  const box = el('listaBuscaCliente'); idxSetaCliente = -1;
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
  const linhas = document.querySelectorAll('.item-lista-cli'); if(!linhas.length) return;
  idxSetaCliente += dir;
  if(idxSetaCliente < 0) idxSetaCliente = 0;
  if(idxSetaCliente >= linhas.length) idxSetaCliente = linhas.length - 1;
  linhas.forEach(l => l.classList.remove('linha-seta'));
  linhas[idxSetaCliente].classList.add('linha-seta');
  linhas[idxSetaCliente].scrollIntoView({block:'nearest'});
}
el('cliente').addEventListener('keydown', function(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); moverSetaCliente(1); }
  if(e.key === 'ArrowUp'){ e.preventDefault(); moverSetaCliente(-1); }
  if(e.key === 'Enter'){
    e.preventDefault();
    const linhas = document.querySelectorAll('.item-lista-cli');
    if(idxSetaCliente >= 0 && linhas[idxSetaCliente]){
      selecionarClienteTop(parseInt(linhas[idxSetaCliente].getAttribute('data-idx')));
      setTimeout(()=> el('buscaProdutoTop').focus(), 100);
    }
  }
  if(e.key === 'Escape'){ el('listaBuscaCliente').style.display='none'; }
});
function selecionarClienteTop(idx){ const c = clientes[idx]; if(!c) return; el('listaBuscaCliente').style.display='none'; el('listaBuscaCliente').innerHTML=''; el('cliente').value = c.nome; usarCliente(idx); }
function usarCliente(i){ const c = clientes[i]; if(!c) return; el('cliente').value = c.nome || ''; el('foneCliente').value = c.fone || ''; el('endereco').value = c.endereco || ''; el('cidade').value = c.cidade || ''; el('estado').value = c.estado || ''; mostrarAba('orc'); }
document.addEventListener('click', (e)=>{
  const boxC = el('listaBuscaCliente'); const boxP = el('listaBuscaProduto');
  if(boxC && !e.target.closest('#cliente') && !e.target.closest('#listaBuscaCliente')) boxC.style.display='none';
  if(boxP && !e.target.closest('#buscaProdutoTop') && !e.target.closest('#listaBuscaProduto')) boxP.style.display='none';
});

// --- ITENS / CALCULAR ---
async function adicionarProduto(){ if(produtoSelecionadoTop===null || !produtos[produtoSelecionadoTop]){ await mostrarMsgSistema('Busca e clica no produto primeiro'); return; } const p=produtos[produtoSelecionadoTop]; const qtd=parseFloat(el('qtdAdd').value)||1; adicionarLinha(qtd, p.referencia||p.cod||'', p.nome, p.valor, true); el('buscaProdutoTop').value=''; produtoSelecionadoTop=null; }
function adicionarLinhaVazia(){ adicionarLinha(1,'','',0,false); }
function adicionarLinha(qtd, ref, desc, preco, travado){
  const tb=el('tabelaItens'); const tr=document.createElement('tr');
  const num = String(tb.children.length+1).padStart(3,'0');
  tr.onclick = ()=>{ selecionarLinha(tr, 'ITEM SELECIONADO: '+desc, 'selecionadoOrc'); itemOrcSelecionado = tr; };
  const ehMao = String(desc||'').toUpperCase().includes('MAO DE OBRA') || String(desc||'').toUpperCase().includes('MÃO DE OBRA');
  const ro = (travado && !ehMao) ? 'readonly' : '';
  tr.innerHTML=`<td>${num}</td><td><input class="ref-in" value="${ref||''}" ${ro}></td><td><input class="desc-in" value="${desc||''}" ${ro}></td><td class="qtd"><input type="number" value="${qtd}" min="0" oninput="calcular()"></td><td class="preco"><input type="text" value="${fmt(preco)}" oninput="calcular()"></td><td class="total">0,00</td>`;
  tb.appendChild(tr); const m = el('msgItensOrc'); if(m) m.innerText = tb.children.length + ' itens'; calcular();
}
function calcular(){
  let sub=0;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const q=parseFloat(tr.cells[3].querySelector('input').value)||0; const pr=parsePreco(tr.cells[4].querySelector('input').value); const tot=q*pr; sub+=tot; tr.cells[5].innerText=fmt(tot); });
  const pct=parseFloat(el('descontoPct').value)||0; const desc=sub*(pct/100); const total=sub-desc;
  el('subtotal').innerText=fmt(sub); el('valorDesconto').innerText=fmt(desc); el('totalGeral').innerText=fmt(total);
}
function getItens(){ let arr=[]; document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ arr.push({ref:tr.cells[1].querySelector('input').value, desc:tr.cells[2].querySelector('input').value, qtd:tr.cells[3].querySelector('input').value, preco:parsePreco(tr.cells[4].querySelector('input').value), total:tr.cells[5].innerText}); }); return arr; }
async function excluirItemOrcSelecionado(){ if(!itemOrcSelecionado){ await mostrarMsgSistema('Clica numa linha do orçamento primeiro'); return; } itemOrcSelecionado.remove(); itemOrcSelecionado=null; calcular(); }
async function limparOrcamento(){ if(!await perguntarSistema('Limpar o orçamento atual?')) return; el('tabelaItens').innerHTML=''; el('descontoPct').value=0; ['cliente','motor','veiculo','endereco','foneCliente','cidade','estado'].forEach(id=>el(id).value=''); calcular(); }
async function excluirOrcamentoAtual(){ const num = el('numOrc').innerText; if(!await perguntarSistema('Excluir o orçamento '+num+'?')) return; try{ await api('excluirOrcamento', null, num); await mostrarMsgSistema('Orçamento excluído!'); limparOrcamento(); carregarHistorico(); }catch(e){ await mostrarMsgSistema('Erro: '+e.message); } }

// --- SALVAR / NOVO / COMPARTILHAR ---
async function salvarOrcamentoAtual(){
  let achouMao = false;
  document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const desc = tr.cells[2].querySelector('input').value.toUpperCase(); const preco = parsePreco(tr.cells[4].querySelector('input').value); if(desc.includes('MAO DE OBRA') || desc.includes('MÃO DE OBRA')){ if(!preco || preco <= 0){ achouMao = true; } } });
  if(achouMao){ await mostrarMsgSistema('Coloca o valor da MÃO DE OBRA antes de salvar!'); return false; }
  const o={ numero: el('numOrc').innerText, data: el('dataOrc').innerText, cliente: el('cliente').value, foneCliente: el('foneCliente').value, endereco: el('endereco').value, cidade: el('cidade').value, estado: el('estado').value, motor: el('motor').value, veiculo: el('veiculo').value, vendedor: getVendedor(), execucao: el('execucao').value, subtotal: el('subtotal').innerText, descontoPct: el('descontoPct').value, descontoValor: el('valorDesconto').innerText, total: el('totalGeral').innerText, itens: getItens() };
  try{ await api('salvarOrcamento', o); await mostrarMsgSistema('Orçamento Nº ' + o.numero + ' salvo!'); ultimoNum = extrairSeq(o.numero); el('numOrc').innerText = formatarNum(ultimoNum + 1); return true; }catch(e){ await mostrarMsgSistema('Erro ao salvar orçamento: '+e.message); return false; }
}
async function novoOrcamento(){ if(!await perguntarSistema('Gerar novo orçamento? Vai salvar o atual e subir o número.')) return; const salvou = await salvarOrcamentoAtual(); if(!salvou) return; el('tabelaItens').innerHTML=''; el('descontoPct').value=0; ['cliente','motor','veiculo','endereco','foneCliente','cidade','estado','buscaProdutoTop'].forEach(id=>el(id).value=''); el('execucao').value='EM ESPERA'; calcular(); window.scrollTo({top:0,behavior:'smooth'}); }
function textoOrcamento(){
  let linhas=[]; document.querySelectorAll('#tabelaItens tr').forEach(tr=>{ const q=tr.cells[3].querySelector('input').value||''; const d=tr.cells[2].querySelector('input').value||''; const t=tr.cells[5].innerText||'0,00'; if(d) linhas.push(`${q}x ${d} - R$ ${t}`); });
  const pct=el('descontoPct').value||0;
  return `*ZÃO DIESEL - ORÇAMENTO Nº ${el('numOrc').innerText}*\nData: ${el('dataOrc').innerText}\nCliente: ${el('cliente').value}\nMotor: ${el('motor').value} | Veículo: ${el('veiculo').value}\nPreenchido por: ${getVendedor()||'-'}\nAv. Cícero Ávila, 1495 - Olga Moreira - Promissão - Paragominas - PA\nFone: 99191-2610 / 99210-7642\n\n*ITENS:*\n${linhas.join('\n')}\n\nSubtotal: R$ ${el('subtotal').innerText}\nDesconto: ${pct}% - R$ ${el('valorDesconto').innerText}\n*TOTAL: R$ ${el('totalGeral').innerText}*\n\nObrigado pela preferência! Zão Diesel`;
}
function enviarWhatsApp(){ salvarOrcamentoAtual(); window.open('https://wa.me/?text='+encodeURIComponent(textoOrcamento()),'_blank'); }
async function compartilhar(){ const t=textoOrcamento(); salvarOrcamentoAtual(); if(navigator.share){ try{ await navigator.share({title:'Orçamento ZDiesil', text:t}); }catch(e){} } else enviarWhatsApp(); }

// --- PDF ---
const ELEMENTOS_FIXOS = ["ELEMENTOS","BICOS INJETORES","VÁLVULA DE PRESSÃO","REPAROS","CABEÇOTE HIDRÁULICO","CORPO DISTRIBUIDOR","ANEL DE RESSALTO","CAINE DE COMANDO","PISTÃO","PALHETA","MOLAS","VÁLVULA DE RETORNO","SAPATA E ROLETE","EIXO DE COMANDO","PARAFUSO OUT","ARRASTADOR","BOMBA MANUAL","KIT DISCO, PINO, MOLA","ROLAMENTOS","BUCHAS","ROLDANAS","VÁLVULA DOSIFICADORA","ANELEX CÊNTRICO","PLACA FINAL","MONTAGEM E REGULAGEM","MÃO DE OBRA"];
function imprimirOrcamento(){
  const get = id => el(id)?.value || "";
  el("p-nome").textContent = get("cliente"); el("p-endereco").textContent = get("endereco"); el("p-fone").textContent = get("foneCliente"); el("p-cidade").textContent = get("cidade"); el("p-estado").textContent = get("estado"); el("p-motor").textContent = get("motor"); el("p-veiculo").textContent = get("veiculo");
  el("p-data").textContent = el("dataOrc")?.innerText || new Date().toLocaleDateString("pt-BR");
  el("p-num").textContent = el("numOrc")?.innerText || "";
  el("p-total").textContent = el("totalGeral")?.textContent || "0,00";
  let mapa = {};
  document.querySelectorAll("#tabelaItens tr").forEach(tr=>{ let tds = tr.querySelectorAll("td"); let ref = tds[1]?.querySelector("input")?.value || ""; let desc = tds[2]?.querySelector("input")?.value?.toUpperCase().trim() || ""; let qtd = tds[3]?.querySelector("input")?.value || ""; let preco = tds[4]?.querySelector("input")?.value || "0,00"; let total = tds[5]?.textContent || "0,00"; if(desc) mapa[desc] = {ref,qtd,preco,total}; });
  let html = "";
  ELEMENTOS_FIXOS.forEach(nome => { let it = mapa[nome] || {ref:"",qtd:"",preco:"",total:""}; html += `<tr><td>${it.ref}</td><td>${nome}</td><td>${it.qtd}</td><td>${it.preco}</td><td>${it.total}</td></tr>`; });
  Object.keys(mapa).forEach(desc=>{ if(!ELEMENTOS_FIXOS.includes(desc)){ let it = mapa[desc]; html += `<tr><td>${it.ref}</td><td>${desc}</td><td>${it.qtd}</td><td>${it.preco}</td><td>${it.total}</td></tr>`; } });
  el("p-itens").innerHTML = html; window.print();
}
document.addEventListener("blur", e=>{ if(e.target.closest("td.preco input")){ e.target.value = fmt(parsePreco(e.target.value)); calcular(); } }, true);
el('tabelaItens').addEventListener('keydown', function(e){
  if(e.target.closest('td.qtd input') && (e.key === 'Enter' || e.key === 'Tab')){ e.preventDefault(); calcular(); el('buscaProdutoTop').focus(); }
});
async function atualizarDados(){
  const btn = document.querySelector('button[onclick="atualizarDados()"]');
  if(btn) btn.innerText = '⏳';
  try{
    const d = await apiLeitura('dados');
    produtos = d.produtos || []; vendedores = d.funcionarios || []; clientes = d.clientes || [];
    prepararIndice(); renderVendedores();
    await mostrarMsgSistema('Atualizado! ' + produtos.length + ' produtos');
  }catch(e){ await mostrarMsgSistema('Erro ao atualizar: '+e.message); }
  if(btn) btn.innerText = '🔄';
}
function renderVendedores(){
  const sel=el('vendedorSel'); if(!sel) return;
  sel.innerHTML='<option value="">-- escolher funcionário --</option>';
  vendedores.forEach(v=>{ sel.innerHTML+=`<option value="${v.nome}">${v.nome}</option>`; });
}

// --- SINCRONIA ---
function lerFila(){ try{ return JSON.parse(localStorage.getItem('zd_fila_sync') || '[]'); }catch(e){ return []; } }
function salvarFila(fila){ localStorage.setItem('zd_fila_sync', JSON.stringify(fila)); }
function atualizarBarraSync(){
  const fila = lerFila(); const barra = el('barraSync'); if(!barra) return;
  if(navigator.onLine && fila.length > 0){ el('qtdSync').textContent = fila.length; barra.style.display = 'block'; } else barra.style.display = 'none';
}
async function sincronizarAgora(){
  const fila = lerFila(); if(!fila.length || !navigator.onLine) return;
  const resto = [];
  for(const item of fila){ try{ await fetch(API_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(item) }); }catch(e){ resto.push(item); } }
  salvarFila(resto); atualizarBarraSync();
}
window.addEventListener('online', atualizarBarraSync);
window.addEventListener('offline', atualizarBarraSync);
document.addEventListener('DOMContentLoaded', atualizarBarraSync);

// --- INICIO ---
el('dataOrc').innerText = new Date().toLocaleDateString('pt-BR');
apiLeitura('dados').then(d=>{ produtos = d.produtos || []; vendedores = d.funcionarios || []; clientes = d.clientes || []; ultimoNum = extrairSeq(d.ultimoNum); el('numOrc').innerText = formatarNum(ultimoNum + 1); prepararIndice(); renderVendedores(); calcular(); }).catch(e=>mostrarMsgSistema('Erro ao carregar dados: '+e.message));

function alternarEndereco(){
  const mostrar = document.getElementById('chkOcultarEnd').checked;
  document.getElementById('blocoEndereco').style.display = mostrar ? 'block' : 'none';
}
