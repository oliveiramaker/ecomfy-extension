/* Shared by Ecomfy and the extension. Suggestions are product-to-activity inferences. */
(function(root){
  'use strict';
  const catalog=typeof module!=='undefined'&&module.exports?require('./cnae-catalog.js'):root.EcomfyCnaeCatalog;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const stops=new Set('para com sem por uma uns das dos seu sua kit kits cor cores preto preta branco branca azul rosa tamanho cm mm kg ml unidades unidade pecas peca produto produtos novo nova oferta original premium qualidade frete gratis shopee descricao tipo tipos feminina feminino masculino masculina basica basico infantil universal'.split(' '));
  const stem=s=>s.length>5?s.replace(/oes$/,'ao').replace(/ais$/,'al').replace(/s$/,''):s;
  const tokens=text=>[...new Set(normalize(text).split(' ').filter(s=>s.length>2&&!stops.has(s)&&!/^\d+$/.test(s)).map(stem))];
  const rules=[
    {terms:['sacola','saco de lixo','saco para lixo','saco de gelo','saco para gelo','embalagem plastica','saco plastico'],codes:['2222600','4686902']},
    {terms:['cropped','camiseta','blusa','vestido','calca','legging','short','bermuda','saia','suplex'],codes:['1412601','4642701']},
    {terms:['calcinha','cueca','lingerie','sutia'],codes:['1411801','4642701']},
    {terms:['vassoura','rodo','escova de limpeza'],codes:['3291400','4649408']},
    {terms:['batom','maquiagem','lapis de olho','shampoo','perfume','cosmetico'],codes:['2063100','4646001']},
    {terms:['mochila','bolsa','carteira'],codes:['1521100','4643502']},
    {terms:['panela','frigideira','assadeira'],codes:['2593400','4649499']},
    {terms:['brinquedo','boneca','carrinho de brinquedo'],codes:['3240099','4649406']},
    {terms:['carregador','cabo usb','fone de ouvido','suporte celular'],codes:['4652400']},
    {terms:['caderno','lapis','caneta','papelaria'],codes:['4647801']}
  ];
  const prepared=catalog.items.map(row=>({...row,search:new Set(tokens(row.label+' '+row.terms)),description:new Set(tokens(row.label))}));
  const frequency=new Map();
  prepared.forEach(row=>row.search.forEach(t=>frequency.set(t,(frequency.get(t)||0)+1)));
  function infer(product,kind='todos'){
    const title=String(product.title||'').slice(0,500),category=String(product.category||'').slice(0,400),description=String(product.description||'').slice(0,1500);
    const head=' '+normalize(title+' '+category)+' ';
    const evidence=[...tokens(title).map(t=>[t,4]),...tokens(category).map(t=>[t,2]),...tokens(description).map(t=>[t,.35])];
    const boosted=new Map();
    rules.forEach(rule=>{
      if(rule.codes.includes('2222600')&&/\b(algodao|tecido|papel|juta|tnt)\b/.test(head))return;
      const hit=rule.terms.find(t=>((t!=='camiseta'||!head.includes(' alca camiseta '))&&(head.includes(' '+t+' ')||head.includes(' '+t+'s '))));
      if(hit)rule.codes.forEach(code=>boosted.set(code,hit));
    });
    const ranked=prepared.filter(row=>kind==='todos'||row.kind===kind).map(row=>{
      let score=0;const matched=[];
      for(const [term,weight] of evidence)if(row.search.has(term)){
        score+=weight*(1+Math.log(1+prepared.length/(frequency.get(term)||1)))*(row.description.has(term)?1.4:1);
        if(!matched.includes(term))matched.push(term);
      }
      const rule=boosted.get(row.code);
      if(rule)score+=100;
      return {code:row.code,label:row.label,kind:row.kind,score,reason:rule?'Termo relacionado: '+rule:matched.length?'Termos relacionados: '+matched.slice(0,4).join(', '):'',method:rule?'regra de produto':'correspondência de termos',inferred:true};
    }).filter(row=>row.score>=8).sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code));
    if(!ranked.length)return [];
    return ranked.filter(row=>row.score>=ranked[0].score*.45).slice(0,6);
  }
  function find(code){return catalog.items.find(r=>r.code===String(code).replace(/\D/g,''))||null;}
  function format(code){const s=String(code);return /^\d{7}$/.test(s)?s.slice(0,4)+'-'+s[4]+'/'+s.slice(5):s;}
  function context(input){return {title:String(input?.title||'').slice(0,500),category:String(input?.category||'').slice(0,400),description:String(input?.description||'').slice(0,1500),brand:String(input?.brand||'').slice(0,100)};}
  const api={infer,find,format,context,normalize,source:catalog.source};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EcomfyCnae=api;
})(typeof globalThis!=='undefined'?globalThis:this);
