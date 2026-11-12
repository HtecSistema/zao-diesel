let produtos = [];
let vendedores = [];
let clientes = [];
let historico = [];
let ultimoNum = 725;

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

function renderProdutos(){
  const sel=document.getElementById('selProduto'); sel.innerHTML='<option value="">-- escolher produto do cadastro --</option>';
  produtos.forEach((p,i)=>{ sel.innerHTML+=`<option value="${i}">${p.nome} - R$ ${fmt(p.valor)} ${p.codigo?' - '+p.codigo:''}</option>`; });
  document.getElementById('listaProdutos').innerHTML = produtos.length? produtos.map((p,i)=>`<div><span><b>${p.nome}</b> | Cód: ${p.codigo||'-'} | Lote: ${p.lote||'-'} | R$ ${fmt(p.valor)}</span><button onclick="excluirProduto('${p.nome}')">X</button></div>`).join('') : 'Nenhum produto ainda.';
}
function renderVendedores(){
  const sel=document.getElementById('vendedorSel'); sel.innerHTML='<option value="">-- escolher funcionário --</option>';
  vendedores.forEach(v=>{ sel.innerHTML+=`<option value="${v.nome}">${v.nome}</option>`; });
  document.getElementById('listaVendedores').innerHTML = vendedores.length? vendedores.map(v=>`<div><span><b>${v.nome}</b> ${v.fone?' - '+v.fone:''}</span><button onclick="excluirFuncionario('${v.nome}')">X</button></div>`).join('') : 'Nenhum funcionário ainda.';
}
function salvarProduto(){
  const nome=document.getElementById('pNome').value.trim().toUpperCase();
  const valor=parseFloat(document.getElementById('pValor').value);
  if(!nome||!valor){ alert('Preencha nome e valor'); return; }
  const p={nome, codigo:document.getElementById('pCodigo').value.trim(), lote:document.getElementById('pLote').value.trim(), valor};
  google.script.run.withSuccessHandler(()=>{ produtos.push(p); renderProdutos(); document.getElementById('pNome').value=''; document.getElementById('pCodigo').value=''; document.getElementById('pLote').value=''; document.getElementById('pValor').value=''; alert('Produto salvo na guia Produto!'); }).salvarProduto(p);
}
function excluirProduto(nome){ if(!confirm('Excluir?')) return; google.script.run.withSuccessHandler(()=>{ produtos=produtos.filter(p=>p.nome!==nome); renderProdutos(); }).excluirProduto(nome); }
function salvarFuncionario(){
  const nome=document.getElementById('vNome').value.trim();
  if(!nome){ alert('Preencha o nome'); return; }
  const f={nome, fone:document.getElementById('vFone').value.trim()};
  google.script.run.withSuccessHandler(()=>{ vendedores.push(f); renderVendedores(); document.getElementById('vNome').value=''; document.getElementById('vFone').value=''; alert('Funcionário salvo na guia Funcionario!'); }).salvarFuncionario(f);
}
function excluirFuncionario(nome){ if(!confirm('Excluir?')) return; google.script.run.withSuccessHandler(()=>{ vendedores=vendedores.filter(v=>v.nome!==nome); renderVendedores(); }).excluirFuncionario(nome); }

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
  document.getElementById('listaClientes').innerHTML = clientes.length ? clientes.map((c,i)=>`<div><span><b>${c.nome}</b> | ${c.doc} | ${c.fone||'-'} | ${c.endereco||''} ${c.cidade||''}/${c.estado||''}</span><button onclick="usarCliente(${i})">Usar</button> <button onclick="excluirCliente(${i})">X</button></div>`).join('') : 'Nenhum cliente ainda.';
}
function salvarCliente(){
  const nome = document.getElementById('cNome').value.trim().toUpperCase();
  const doc = document.getElementById('cDoc').value.trim();
  if(!nome || !doc){ alert('Preencha nome e CPF/CNPJ'); return; }
  if(!validaDoc(doc)){ alert('CPF ou CNPJ inválido! Confere os números.'); return; }
  const c = { nome, doc, fone: document.getElementById('cFone').value.trim(), endereco: document.getElementById('cEndereco').value.trim(), cidade: document.getElementById('cCidade').value.trim(), estado: document.getElementById('cEstado').value.trim() };
  google.script.run.withSuccessHandler(()=>{ clientes.push(c); renderClientes(); document.getElementById('cNome').value=''; document.getElementById('cDoc').value=''; document.getElementById('cFone').value=''; document.getElementById('cEndereco').value=''; document.getElementById('cCidade').value=''; document.getElementById('cEstado').value=''; alert('Cliente salvo!'); }).salvarCliente(c);
}
function excluirCliente(i){
  if(!confirm('Excluir cliente?')) return;
  const doc = clientes[i].doc;
  google.script.run.withSuccessHandler(()=>{ clientes.splice(i,1); renderClientes(); }).excluirCliente(doc);
}
function usarCliente(i){
  const c = clientes[i];
  document.getElementById('cliente').value = c.nome;
  document.getElementById('foneCliente').value = c.fone || '';
  document.getElementById('endereco').value = c.endereco || '';
  document.getElementById('cidade').value = c.cidade || '';
  document.getElementById('estado').value = c.estado || '';
  mostrarAba('orc');
  calcular();
}

function adicionarProduto(){
  const idx=document.getElementById('selProduto').value;
  if(idx===''){ alert('Escolhe um produto'); return; }
  const p=produtos[idx]; const qtd=parseFloat(document.getElementById('qtdAdd').value)||1;
  adicionarLinha(qtd, p.codigo||'', p.nome, p.valor);
}
function adicionarLinhaVazia(){ adicionarLinha(1,'','',0); }
function adicionarLinha(qtd, ref, desc, preco){
  const tb=document.getElementById('tbodyItens');
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input type="number" value="${qtd}" min="0" oninput="calcular()"></td><td><input value="${ref}"></td><td><input class="desc-in" value="${desc}"></td><td><input type="number" step="0.01" value="${preco}" oninput="calcular()"></td><td class="total">0,00</td><td class="col-acao"><button class="btn-x" onclick="this.closest('tr').remove();calcular()">X</button></td></tr>`;
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
  document.getElementById('nomeAssinatura').innerText='CLIENTE - '+(document.getElementById('cliente').value||'CLIENTE');
}
function getVendedor(){
  const m=document.getElementById('vendedorManual').value.trim();
  return m || document.getElementById('vendedorSel').value || '';
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
    const pu=tr.cells[3].querySelector('input').value||'';
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
function salvarOrcamentoAtual(){
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
    subtotal: document.getElementById('subtotal').innerText,
    descontoPct: document.getElementById('descontoPct').value,
    descontoValor: document.getElementById('valorDesconto').innerText,
    total: document.getElementById('totalGeral').innerText,
    itens: getItens()
  };
  google.script.run.salvarOrcamento(o);
}
function novoOrcamento(){
  if(!confirm('Gerar novo orçamento? Vai salvar o atual e subir o número.')) return;
  salvarOrcamentoAtual();
  ultimoNum++; 
  document.getElementById('numOrc').innerText=String(ultimoNum).padStart(4,'0');
  document.getElementById('tbodyItens').innerHTML=''; document.getElementById('descontoPct').value=0;
  document.getElementById('cliente').value=''; document.getElementById('motor').value=''; document.getElementById('vendedorManual').value='';
  calcular(); window.scrollTo({top:0,behavior:'smooth'});
}
function carregarHistorico(){
  google.script.run.withSuccessHandler(d=>{
    historico = d || [];
    renderHistorico(historico);
  }).getHistorico();
}
function renderHistorico(lista){
  if(!lista || !lista.length){ document.getElementById('listaHistorico').innerHTML = 'Nenhum orçamento no histórico.'; return; }
  document.getElementById('listaHistorico').innerHTML = lista.map((o,i)=>`<div class="box-cad"><b>Nº ${o.numero}</b> - ${o.data} - ${o.cliente} - ${o.motor||''} - <b>R$ ${o.total}</b> <button onclick="carregarOrcamentoHist(${i})">Abrir</button></div>`).join('');
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
  document.getElementById('tbodyItens').innerHTML = '';
  (o.itens||[]).forEach(it=>adicionarLinha(it.qtd, it.ref, it.desc, it.preco));
  calcular();
  mostrarAba('orc');
}

document.getElementById('dataOrc').innerText=new Date().toLocaleDateString('pt-BR');
google.script.run.withSuccessHandler(d=>{
  produtos = d.produtos.length ? d.produtos : [
    {nome:'ELEMENTOS',codigo:'',lote:'',valor:130},{nome:'BICOS INJETORES',codigo:'',lote:'',valor:140},{nome:'VÁLVULA DE PRESSÃO',codigo:'',lote:'',valor:85},{nome:'REPAROS',codigo:'',lote:'',valor:105},{nome:'PISTÃO',codigo:'',lote:'',valor:80},{nome:'MOLAS',codigo:'',lote:'',valor:70},{nome:'VÁLVULA DE RETORNO',codigo:'',lote:'',valor:160},{nome:'KIT DISCO, PINO, MOLA',codigo:'',lote:'',valor:110},{nome:'BUCHAS',codigo:'',lote:'',valor:60},{nome:'MÃO DE OBRA',codigo:'',lote:'',valor:450}
  ];
  vendedores = d.funcionarios || [];
  clientes = d.clientes || [];
  ultimoNum = d.ultimoNum;
  document.getElementById('numOrc').innerText=String(ultimoNum+1).padStart(4,'0');
  renderProdutos(); renderVendedores(); renderClientes();
  [[6,'','ELEMENTOS',130],[6,'','BICOS INJETORES',140],[6,'','VÁLVULA DE PRESSÃO',85],[4,'','REPAROS',105],[1,'','PISTÃO',80],[1,'','MOLAS',70],[1,'','VÁLVULA DE RETORNO',160],[6,'','KIT DISCO, PINO, MOLA',110],[2,'','BUCHAS',60],[1,'','MÃO DE OBRA',450]].forEach(a=>adicionarLinha(a[0],a[1],a[2],a[3]));
  calcular();
}).getDadosIniciais();