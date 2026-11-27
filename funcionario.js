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
function renderVendedores(){
  const sel=document.getElementById('vendedorSel'); sel.innerHTML='<option value="">-- escolher funcionário --</option>';
  vendedores.forEach(v=>{ sel.innerHTML+=`<option value="${v.nome}">${v.nome}</option>`; });
  const msg=document.getElementById('msgVendedores'); if(msg) msg.innerText=vendedores.length+' funcionários';
  document.getElementById('listaVendedores').innerHTML = vendedores.length? vendedores.map((v,i)=>{
    const idx = vendedores.indexOf(v);
    return `<tr onclick="selecionarLinha(this, 'FUNCIONÁRIO SELECIONADO: ${v.nome} | MAT ${v.mat} | ${v.fone||''}', 'selecionadoFunc');selecionarFuncionario(${idx})"><td>${String(i+1).padStart(3,'0')}</td><td><b>${v.nome}</b></td><td>${v.mat||'-'}</td><td>${v.fone||'-'}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="tabela-vazio">NENHUM FUNCIONÁRIO</td></tr>';
}
function selecionarFuncionario(i){ const v = vendedores[i]; if(!v) return; editFuncMat = v.mat; document.getElementById('vNome').value = v.nome || ''; document.getElementById('vFone').value = v.fone || ''; const b = document.getElementById('btnSalvarFuncionario'); if(b) b.innerText = '✏️ Alterar'; }
function limparFuncionario(){ editFuncMat = null; document.getElementById('vNome').value=''; document.getElementById('vFone').value=''; const b = document.getElementById('btnSalvarFuncionario'); if(b) b.innerText = '💾 Salvar'; }
async function excluirFuncionarioAtual(){ if(!editFuncMat){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirFuncionario(editFuncMat); limparFuncionario(); }
async function usarFuncionarioAtual(){ if(!editFuncMat){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const v = vendedores.find(v=>String(v.mat)===String(editFuncMat)); if(!v) return; const sel = document.getElementById('vendedorSel'); if(sel) sel.value = v.nome; mostrarAba('orc'); }
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
apiLeitura('dados').then(d=>{ vendedores = d.funcionarios || []; renderVendedores(); }).catch(e=>mostrarMsgSistema('Erro ao carregar dados: '+e.message));