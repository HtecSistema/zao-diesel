const API_URL = 'https://script.google.com/macros/s/AKfycbyrQupOirl8tGA1oT6yirFvACSw-UBtAgILdgE4AZMtd4yju1rC0NJNdKRVJ1LA9bg6/exec';

// LEITURA com JSONP - não dá Failed to fetch
function apiLeitura(acao){
  return new Promise((resolve, reject)=>{
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    window[cb] = (dados)=>{
      delete window[cb];
      script.remove();
      if(dados.erro) reject(new Error(dados.erro));
      else resolve(dados);
    };
    const script = document.createElement('script');
    script.src = API_URL + '?acao=' + acao + '&callback=' + cb + '&_=' + Date.now();
    script.onerror = ()=>{ delete window[cb]; script.remove(); reject(new Error('Falha ao conectar')); };
    document.body.appendChild(script);
  });
}

// SALVAR com no-cors - manda e não espera resposta
async function api(acao, dados, cod){
  await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({acao, dados, cod})
  });
  if(acao==='salvarProduto'){
    const max = produtos.length ? Math.max(...produtos.map(p=>parseInt(p.cod)||0)) : 0;
    return {cod: max+1};
  }
  if(acao==='salvarFuncionario'){
    const max = vendedores.length ? Math.max(...vendedores.map(v=>parseInt(v.mat)||0)) : 0;
    return {mat: max+1};
  }
  return {ok:true};
}

let produtos = [];
let vendedores = [];
let clientes = [];
let historico = [];
let ultimoNum = 0;
let produtoSelecionadoTop = null;

function anoAtual(){ return new Date().getFullYear(); }
function formatarNum(seq){ return 'ZD-' + anoAtual() + '.' + String(seq).padStart(4,'0'); }
function extrairSeq(numero){
  if(!numero) return 0;
  const m = String(numero).match(/(\d{4})\s*$/);
  return m ? parseInt(m[1]) : (parseInt(numero)||0);
}
function proximoNum(){
  return formatarNum(extrairSeq(document.getElementById('numOrc').innerText) + 1);
}

function fmt(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

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

// ===== ÚNICO getVendedor - SEM vendedorManual =====
function getVendedor(){
  const el = document.getElementById('vendedorSel');
  return el ? el.value || '' : '';
}

function filtrarProdutosTop(){
  const termo = document.getElementById('buscaProdutoTop').value.trim().toLowerCase();
  const box = document.getElementById('listaBuscaProduto');
  if(!termo){ box.style.display='none'; box.innerHTML=''; return; }
  const achados = produtos.filter(p => (p.cod||'').toString().toLowerCase().includes(termo) || (p.nome||'').toLowerCase().includes(termo) || (p.referencia||'').toLowerCase().includes(termo));
  if(!achados.length){ box.style.display='block'; box.innerHTML='<div>Nenhum produto encontrado</div>'; return; }
  box.style.display='block';
  box.innerHTML = achados.map(p=>{
    const idx = produtos.indexOf(p);
    return `<div onclick="selecionarProdutoTop(${idx})"><b>${p.nome}</b> | Cód: ${p.cod||'-'} | Ref: ${p.referencia||'-'} | Lote: ${p.lote||'-'} | Saldo: ${p.saldo||0} | R$ ${fmt(p.valor)}</div>`;
  }).join('');
}
function selecionarProdutoTop(idx){
  produtoSelecionadoTop = idx;
  document.getElementById('listaBuscaProduto').style.display='none';
  document.getElementById('listaBuscaProduto').innerHTML='';
  document.getElementById('buscaProdutoTop').value = produtos[idx].nome;
  adicionarProduto();
}

function filtrarClientesTop(){
  const termo = document.getElementById('cliente').value.trim().toLowerCase();
  const box = document.getElementById('listaBuscaCliente');
  if(!termo){ box.style.display='none'; box.innerHTML=''; return; }
  const achados = clientes.filter(c => (c.cod||'').toString().toLowerCase().includes(termo) || (c.nome||'').toLowerCase().includes(termo));
  if(!achados.length){ box.style.display='block'; box.innerHTML='<div>Nenhum cliente encontrado</div>'; return; }
  box.style.display='block';
  box.innerHTML = achados.map(c=>{
    const idx = clientes.indexOf(c);
    return `<div onclick="selecionarClienteTop(${idx})"><b>${c.nome}</b> | Cod: ${c.cod||'-'} | ${c.fone||''} | ${c.cidade||''}/${c.estado||''}</div>`;
  }).join('');
}
function selecionarClienteTop(idx){
  const c = clientes[idx];
  if(!c) return;
  document.getElementById('listaBuscaCliente').style.display='none';
  document.getElementById('listaBuscaCliente').innerHTML='';
  document.getElementById('cliente').value = c.nome;
  usarCliente(idx);
}
function usarCliente(i){
  const c = clientes[i];
  if(!c) return;
  document.getElementById('cliente').value = c.nome || '';
  document.getElementById('foneCliente').value = c.fone || '';
  document.getElementById('endereco').value = c.endereco || '';
  document.getElementById('cidade').value = c.cidade || '';
  document.getElementById('estado').value = c.estado || '';
  mostrarAba('orc');
}

// Fecha a lista quando clica fora
document.addEventListener('click', (e)=>{
  const boxC = document.getElementById('listaBuscaCliente');
  const boxP = document.getElementById('listaBuscaProduto');
  if(boxC && !e.target.closest('#cliente') && !e.target.closest('#listaBuscaCliente')) boxC.style.display='none';
  if(boxP && !e.target.closest('#buscaProdutoTop') && !e.target.closest('#listaBuscaProduto')) boxP.style.display='none';
});

function renderProdutos(){
  document.getElementById('listaProdutos').innerHTML = produtos.length? produtos.map((p,i)=>`<div><span><b>${p.nome}</b> | CodProduto: ${p.cod||'-'} | Ref: ${p.referencia||'-'} | Lote: ${p.lote||'-'} | Validade: ${p.validade||'-'} | Saldo: ${p.saldo||0} | R$ ${fmt(p.valor)}</span><button onclick="excluirProduto('${p.cod}')">X</button></div>`).join('') : 'Nenhum produto ainda.';
}
function renderVendedores(){
  const sel=document.getElementById('vendedorSel'); sel.innerHTML='<option value="">-- escolher funcionário --</option>';
  vendedores.forEach(v=>{ sel.innerHTML+=`<option value="${v.nome}">${v.nome}</option>`; });
  document.getElementById('listaVendedores').innerHTML = vendedores.length? vendedores.map(v=>`<div><span><b>${v.nome}</b> | Mat: ${v.mat||'-'} ${v.fone?' - '+v.fone:''}</span><button onclick="excluirFuncionario('${v.mat}')">X</button></div>`).join('') : 'Nenhum funcionário ainda.';
}
async function salvarProduto(){
  const nome=document.getElementById('pNome').value.trim().toUpperCase();
  const valor=parseFloat(document.getElementById('pValor').value);
  if(!nome||!valor){ alert('Preencha nome e valor'); return; }
  const p={nome, referencia:document.getElementById('pCodigo').value.trim(), lote:document.getElementById('pLote').value.trim(), valor};
  try{ const r=await api('salvarProduto', p); p.cod=r.cod; p.saldo=0; produtos.push(p); renderProdutos(); document.getElementById('pNome').value=''; document.getElementById('pCodigo').value=''; document.getElementById('pLote').value=''; document.getElementById('pValor').value=''; alert('Produto salvo! Cod: '+r.cod); }catch(e){ alert('Erro: '+e.message); }
}
async function excluirProduto(cod){ if(!confirm('Excluir?')) return; try{ await api('excluirProduto', null, cod); produtos=produtos.filter(p=>String(p.cod)!==String(cod)); renderProdutos(); }catch(e){ alert('Erro: '+e.message); } }
async function salvarFuncionario(){
  const nome=document.getElementById('vNome').value.trim();
  if(!nome){ alert('Preencha o nome'); return; }
  const f={nome, fone:document.getElementById('vFone').value.trim()};
  try{ const r=await api('salvarFuncionario', f); f.mat=r.mat; vendedores.push(f); renderVendedores(); document.getElementById('vNome').value=''; document.getElementById('vFone').value=''; alert('Funcionário salvo! Mat: '+r.mat); }catch(e){ alert('Erro: '+e.message); }
}
async function excluirFuncionario(mat){ if(!confirm('Excluir?')) return; try{ await api('excluirFuncionario', null, mat); vendedores=vendedores.filter(v=>String(v.mat)!==String(mat)); renderVendedores(); }catch(e){ alert('Erro: '+e.message); } }

function mascaraDoc(el){
  let v = el.value.replace(/\D/g,'');
  if(v.length <= 11){
    v = v.replace(/(\d{3})(\d)/,'$1.$2');
    v = v.replace(/(\d{3})(\d)/,'$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  } else {
    v = v.replace(/^(\d{2})(\d)/,'$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/,'.$1/$2');
    v = v.replace(/(\d{4})(\d)/,'$1-$2');
  }
  el.value = v;
}
function validaDoc(doc){
  let v = doc.replace(/\D/g,'');
  if(v.length === 11) return validaCPF(v);
  if(v.length === 14) return validaCNPJ(v);
  return false;
}
function validaCPF(cpf){
  if(/^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for(let i=0;i<9;i++) s += parseInt(cpf[i]) * (10-i);
  let d1 = 11 - (s % 11); if(d1 >= 10) d1 = 0;
  if(d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for(let i=0;i<10;i++) s += parseInt(cpf[i]) * (11-i);
  let d2 = 11 - (s % 11); if(d2 >= 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}
function validaCNPJ(cnpj){
  if(/^(\d)\1+$/.test(cnpj)) return false;
  let t = cnpj.length - 2, n = cnpj.substring(0,t), d = cnpj.substring(t), s = 0, p = t - 7;
  for(let i=t;i>=1;i--){ s += n.charAt(t-i) * p--; if(p < 2) p = 9; }
  let r = s % 11 < 2 ? 0 : 11 - (s % 11);
  if(r != d.charAt(0)) return false;
  t = t + 1; n = cnpj.substring(0,t); s = 0; p = t - 7;
  for(let i=t;i>=1;i--){ s += n.charAt(t-i) * p--; if(p < 2) p = 9; }
  r = s % 11 < 2 ? 0 : 11 - (s % 11);
  return r == d.charAt(1);
}
function renderClientes(){
  document.getElementById('listaClientes').innerHTML = clientes.length ? clientes.map((c,i)=>`<div><span><b>${c.nome}</b> | Cod: ${c.cod} | ${c.fone||'-'} | ${c.endereco||''} ${c.cidade||''}/${c.estado||''}</span><button onclick="usarCliente(${i})">Usar</button> <button onclick="excluirCliente('${c.cod}')">X</button></div>`).join('') : 'Nenhum cliente ainda.';
}
async function salvarCliente(){
  const nome = document.getElementById('cNome').value.trim().toUpperCase();
  const doc = document.getElementById('cDoc').value.trim();
  if(!nome || !doc){ alert('Preencha nome e CPF/CNPJ'); return; }
  if(!validaDoc(doc)){ alert('CPF ou CNPJ inválido! Confere os números.'); return; }
  const c = { cod: doc, nome, fone: document.getElementById('cFone').value.trim(), endereco: document.getElementById('cEndereco').value.trim(), cidade: document.getElementById('cCidade').value.trim(), estado: document.getElementById('cEstado').value.trim() };
  try{ await api('salvarCliente', c); clientes.push(c); renderClientes(); document.getElementById('cNome').value=''; document.getElementById('cDoc').value=''; document.getElementById('cFone').value=''; document.getElementById('cEndereco').value=''; document.getElementById('cCidade').value=''; document.getElementById('cEstado').value=''; alert('Cliente salvo!'); }catch(e){ alert('Erro: '+e.message); }
}
async function excluirCliente(cod){
  if(!confirm('Excluir cliente?')) return;
  try{ await api('excluirCliente', null, cod); clientes=clientes.filter(c=>String(c.cod)!==String(cod)); renderClientes(); }catch(e){ alert('Erro: '+e.message); }
}

function adicionarProduto(){
  if(produtoSelecionadoTop===null || !produtos[produtoSelecionadoTop]){ alert('Busca e clica no produto primeiro'); return; }
  const p=produtos[produtoSelecionadoTop]; const qtd=parseFloat(document.getElementById('qtdAdd').value)||1;
  adicionarLinha(qtd, p.referencia||p.cod||'', p.nome, p.valor, true);
  document.getElementById('buscaProdutoTop').value='';
  produtoSelecionadoTop=null;
}

function adicionarLinhaVazia(){ adicionarLinha(1,'','',0,false); }
function adicionarLinha(qtd, ref, desc, preco, travado){
  const tb=document.getElementById('tbodyItens');
  const tr=document.createElement('tr');
  const ehMaoDeObra = String(desc||'').toUpperCase().includes('MAO DE OBRA') || String(desc||'').toUpperCase().includes('MÃO DE OBRA');
  const travar = travado && !ehMaoDeObra;
  const ro = travar ? 'readonly' : '';
  tr.innerHTML=`<td><input type="number" value="${qtd}" min="0" oninput="calcular()"></td><td><input value="${ref}" ${ro}></td><td><input class="desc-in" value="${desc}" ${ro}></td><td><input type="number" step="0.01" value="${preco}" oninput="calcular()" ${ro}></td><td class="total">0,00</td><td class="col-acao"><button class="btn-x" onclick="this.closest('tr').remove();calcular()">X</button></td></tr>`;
  tb.appendChild(tr); calcular();
}
function calcular(){
  let sub=0;
  document.querySelectorAll('#tbodyItens tr').forEach(tr=>{
    const q=parseFloat(tr.cells[0].querySelector('input').value)||0;
    const pr=parseFloat(tr.cells[3].querySelector('input').value)||0;
    const tot=q*pr; sub+=tot; tr.cells[4].innerText=fmt(tot);
  });
  const pct=parseFloat(document.getElementById('descontoPct').value)||0;
  const desc=sub*(pct/100); const total=sub-desc;
  document.getElementById('subtotal').innerText=fmt(sub);
  document.getElementById('valorDesconto').innerText=fmt(desc);
  document.getElementById('totalGeral').innerText=fmt(total);
}
function getItens(){
  let arr=[];
  document.querySelectorAll('#tbodyItens tr').forEach(tr=>{
    arr.push({qtd:tr.cells[0].querySelector('input').value, ref:tr.cells[1].querySelector('input').value, desc:tr.cells[2].querySelector('input').value, preco:tr.cells[3].querySelector('input').value, total:tr.cells[4].innerText});
  });
  return arr;
}
function textoOrcamento(){
  let linhas=[];
  document.querySelectorAll('#tbodyItens tr').forEach(tr=>{
    const q=tr.cells[0].querySelector('input').value||'';
    const d=tr.cells[2].querySelector('input').value||'';
    const t=tr.cells[4].innerText||'0,00';
    if(d) linhas.push(`${q}x ${d} - R$ ${t}`);
  });
  const pct=document.getElementById('descontoPct').value||0;
  return `*ZÃO DIESEL - ORÇAMENTO Nº ${document.getElementById('numOrc').innerText}*\n`+
`Data: ${document.getElementById('dataOrc').innerText}\n`+
`Cliente: ${document.getElementById('cliente').value}\n`+
`Motor: ${document.getElementById('motor').value} | Veículo: ${document.getElementById('veiculo').value}\n`+
`Preenchido por: ${getVendedor()||'-'}\n`+
`Av. Cícero Ávila, 1495 - Olga Moreira - Promissão - Paragominas - PA\n`+
`Fone: 99191-2610 / 99210-7642\n\n`+
`*ITENS:*\n${linhas.join('\n')}\n\n`+
`Subtotal: R$ ${document.getElementById('subtotal').innerText}\n`+
`Desconto: ${pct}% - R$ ${document.getElementById('valorDesconto').innerText}\n`+
`*TOTAL: R$ ${document.getElementById('totalGeral').innerText}*\n\n`+
`Obrigado pela preferência! Zão Diesel`;
}
function enviarWhatsApp(){
  salvarOrcamentoAtual();
  window.open('https://wa.me/?text='+encodeURIComponent(textoOrcamento()),'_blank');
}
async function compartilhar(){
  const t=textoOrcamento(); salvarOrcamentoAtual();
  if(navigator.share){ try{ await navigator.share({title:'Orçamento ZDiesil', text:t}); }catch(e){} } else enviarWhatsApp();
}

async function salvarOrcamentoAtual(){
  let achouMaoSemValor = false;
  document.querySelectorAll('#tbodyItens tr').forEach(tr=>{
    const desc = tr.cells[2].querySelector('input').value.toUpperCase();
    const preco = parseFloat(tr.cells[3].querySelector('input').value)||0;
    if(desc.includes('MAO DE OBRA') || desc.includes('MÃO DE OBRA')){
      if(!preco || preco <= 0){
        achouMaoSemValor = true;
        tr.cells[3].querySelector('input').focus();
      }
    }
  });
  if(achouMaoSemValor){
    alert('Coloca o valor da MÃO DE OBRA antes de salvar!');
    return false;
  }
  const o={
    numero: document.getElementById('numOrc').innerText,
    data: document.getElementById('dataOrc').innerText,
    cliente: document.getElementById('cliente').value,
    foneCliente: document.getElementById('foneCliente').value,
    endereco: document.getElementById('endereco').value,
    cidade: document.getElementById('cidade').value,
    estado: document.getElementById('estado').value,
    motor: document.getElementById('motor').value,
    veiculo: document.getElementById('veiculo').value,
    vendedor: getVendedor(),
    execucao: document.getElementById('execucao').value,
    subtotal: document.getElementById('subtotal').innerText,
    descontoPct: document.getElementById('descontoPct').value,
    descontoValor: document.getElementById('valorDesconto').innerText,
    total: document.getElementById('totalGeral').innerText,
    itens: getItens()
  };
  try{
    await api('salvarOrcamento', o);
    alert('Orçamento Nº ' + o.numero + ' salvo!');
    ultimoNum = extrairSeq(o.numero);
    document.getElementById('numOrc').innerText = formatarNum(ultimoNum + 1);
    return true;
  }catch(e){ alert('Erro ao salvar orçamento: '+e.message); return false; }
}

async function novoOrcamento(){
  if(!confirm('Gerar novo orçamento? Vai salvar o atual e subir o número.')) return;
  const salvou = await salvarOrcamentoAtual();
  if(!salvou) return;
  document.getElementById('tbodyItens').innerHTML=''; document.getElementById('descontoPct').value=0;
  document.getElementById('cliente').value=''; document.getElementById('motor').value=''; document.getElementById('veiculo').value='';
  document.getElementById('endereco').value=''; document.getElementById('foneCliente').value=''; document.getElementById('cidade').value=''; document.getElementById('estado').value='';
  document.getElementById('buscaProdutoTop').value='';
  document.getElementById('execucao').value='EM ESPERA';
  calcular(); window.scrollTo({top:0,behavior:'smooth'});
}

async function carregarHistorico(){
  try{
    const d = await apiLeitura('historico');
    historico = Array.isArray(d) ? d : (d.historico || d.dados || []);
    renderHistorico(historico);
  }catch(e){ alert('Erro: '+e.message); }
}
function renderHistorico(lista){
  if(!lista || !lista.length){ document.getElementById('listaHistorico').innerHTML = 'Nenhum orçamento no histórico.'; return; }
  document.getElementById('listaHistorico').innerHTML = lista.map((o,i)=>`<div class="box-cad"><b>Nº ${o.numero}</b> - ${o.data} - ${o.cliente} - ${o.motor||''} - ${o.execucao||''} - <b>R$ ${o.total}</b> <button onclick="carregarOrcamentoHist(${i})">Abrir</button></div>`).join('');
}
function filtrarHistorico(){
  const busca = document.getElementById('buscaHist').value.toLowerCase();
  const filtrado = historico.filter(o => (o.cliente||'').toLowerCase().includes(busca) || (o.numero||'').toString().includes(busca) || (o.motor||'').toLowerCase().includes(busca));
  renderHistorico(filtrado);
}
function carregarOrcamentoHist(i){
  const o = historico[i];
  if(!o) return;
  document.getElementById('numOrc').innerText = o.numero;
  document.getElementById('dataOrc').innerText = o.data;
  document.getElementById('cliente').value = o.cliente || '';
  document.getElementById('foneCliente').value = o.foneCliente || '';
  document.getElementById('endereco').value = o.endereco || '';
  document.getElementById('cidade').value = o.cidade || '';
  document.getElementById('estado').value = o.estado || '';
  document.getElementById('motor').value = o.motor || '';
  document.getElementById('veiculo').value = o.veiculo || '';
  document.getElementById('descontoPct').value = o.descontoPct || 0;
  document.getElementById('execucao').value = o.execucao || 'EM ESPERA';
  document.getElementById('tbodyItens').innerHTML = '';
  (o.itens||[]).forEach(it=>adicionarLinha(it.qtd, it.ref, it.desc, it.preco));
  calcular();
  mostrarAba('orc');
}

document.getElementById('dataOrc').innerText=new Date().toLocaleDateString('pt-BR');
apiLeitura('dados').then(d=>{
  produtos = d.produtos || [];
  vendedores = d.funcionarios || [];
  clientes = d.clientes || [];
  ultimoNum = extrairSeq(d.ultimoNum);
  document.getElementById('numOrc').innerText = formatarNum(ultimoNum + 1);
  renderProdutos(); renderVendedores(); renderClientes();
  [[6,'','ELEMENTOS',130],[6,'','BICOS INJETORES',140],[6,'','VÁLVULA DE PRESSÃO',85],[4,'','REPAROS',105],[1,'','PISTÃO',80],[1,'','MOLAS',70],[1,'','VÁLVULA DE RETORNO',160],[6,'','KIT DISCO, PINO, MOLA',110],[2,'','BUCHAS',60],[1,'','MÃO DE OBRA',450]].forEach(a=>adicionarLinha(a[0],a[1],a[2],a[3]));
  calcular();
}).catch(e=>alert('Erro ao carregar dados: '+e.message));

let sensivelOn = false;
function alternarSensivel(){
  sensivelOn = !sensivelOn;
  document.querySelectorAll('.linha.sensivel').forEach(l=>{
    if(sensivelOn) l.classList.add('mostrar');
    else l.classList.remove('mostrar');
  });
  const olho = document.getElementById('olhoDiscreto');
  if(olho) olho.style.opacity = sensivelOn ? '0.9' : '0.2';
}
