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
function usarCliente(i){ const c = clientes[i]; if(!c) return; document.getElementById('cliente').value = c.nome || ''; document.getElementById('foneCliente').value = c.fone || ''; document.getElementById('endereco').value = c.endereco || ''; document.getElementById('cidade').value = c.cidade || ''; document.getElementById('estado').value = c.estado || ''; mostrarAba('orc'); }
function renderClientes(){
  const msg=document.getElementById('msgClientes'); if(msg) msg.innerText=clientes.length+' clientes';
  document.getElementById('listaClientes').innerHTML = clientes.length ? clientes.map((c,i)=>{
    const idx = clientes.indexOf(c);
    return `<tr onclick="selecionarLinha(this, 'CLIENTE SELECIONADO: ${c.nome} | COD ${c.cod} | ${c.fone||''}', 'selecionadoCliente');selecionarCliente(${idx})"><td>${String(i+1).padStart(3,'0')}</td><td><b>${c.nome}</b></td><td>${c.cod}</td><td>${c.fone||'-'}</td><td>${c.cidade||''} / ${c.estado||''}</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="tabela-vazio">NENHUM CLIENTE</td></tr>';
}
function selecionarCliente(i){ const c = clientes[i]; if(!c) return; editClienteCod = c.cod; document.getElementById('cNome').value = c.nome || ''; document.getElementById('cDoc').value = c.cod || ''; document.getElementById('cFone').value = c.fone || ''; document.getElementById('cEndereco').value = c.endereco || ''; document.getElementById('cCidade').value = c.cidade || ''; document.getElementById('cEstado').value = c.estado || ''; const b = document.getElementById('btnSalvarCliente'); if(b) b.innerText = '✏️ Alterar'; }
function limparCliente(){ editClienteCod = null; ['cNome','cDoc','cFone','cEndereco','cCidade','cEstado'].forEach(id=>document.getElementById(id).value=''); const b = document.getElementById('btnSalvarCliente'); if(b) b.innerText = '💾 Salvar'; }
async function excluirClienteAtual(){ if(!editClienteCod){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } await excluirCliente(editClienteCod); limparCliente(); }
async function usarClienteAtual(){ if(editClienteCod==null){ await mostrarMsgSistema('Clica numa linha da tabela primeiro'); return; } const idx = clientes.findIndex(c=>String(c.cod)===String(editClienteCod)); if(idx>=0) usarCliente(idx); }
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