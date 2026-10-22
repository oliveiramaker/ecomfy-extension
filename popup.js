const $=id=>document.getElementById(id);
let currentTab=null;
let capture=null;
let screenshotUrl=null;

function setState(text,type=''){
  const el=$('state');
  el.textContent=text;
  el.className='badge'+(type?' '+type:'');
}
function setError(msg){
  const el=$('error');
  el.textContent=msg;
  el.classList.toggle('hidden',!msg);
}
function setValue(id,value){
  $(id).value=value===null||value===undefined?'':value;
}
function parsePrice(text){
  const m=String(text||'').match(/R\$\s*([0-9.]+(?:,[0-9]{1,2})?)/i);
  if(!m)return null;
  const n=Number(m[1].replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n)&&n>0?n:null;
}
async function screenshotOcr(dataUrl){
  if(!('TextDetector' in window))return null;
  try{
    const blob=await fetch(dataUrl).then(r=>r.blob());
    const bitmap=await createImageBitmap(blob);
    const detector=new TextDetector();
    const blocks=await detector.detect(bitmap);
    const candidates=[];
    for(const b of blocks){
      const value=parsePrice(b.rawValue);
      if(!value)continue;
      const box=b.boundingBox||{};
      let score=0;
      if((box.y||0)<bitmap.height*.7)score+=20;
      score+=Math.min(Number(box.height||0),50);
      if(String(b.rawValue).trim().startsWith('R$'))score+=10;
      candidates.push({value,score,text:b.rawValue});
    }
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]||null;
  }catch(e){
    console.warn('OCR nativo indisponível',e);
    return null;
  }
}
function fill(data,source){
  capture=data||{};
  setValue('title',capture.title);
  setValue('price',capture.price);
  setValue('sold',capture.sold);
  setValue('rating',capture.rating);
  setValue('reviews',capture.reviews);
  setValue('images',capture.images);
  $('video').checked=Boolean(capture.video);
  $('source').textContent=source;
  $('send').disabled=!Number($('price').value);
}
async function capturePage(){
  setError('');
  setState('Capturando');
  $('send').disabled=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    currentTab=tab;
    if(!tab?.id||!/^https:\/\/(?:[a-z0-9-]+\.)*shopee\.com\.br\//i.test(tab.url||'')){
      throw new Error('Abra um produto da Shopee Brasil e clique novamente na extensão.');
    }

    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    const result=await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func:()=>window.__ECOMFY_RADAR_CAPTURE__||null
    });
    capture=result?.[0]?.result||{url:tab.url,title:tab.title};

    try{
      screenshotUrl=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
      if(screenshotUrl){
        $('screenshot').src=screenshotUrl;
        $('preview').classList.remove('hidden');
      }
    }catch(e){
      console.warn('Não foi possível capturar a aba',e);
    }

    let source='Dados lidos da página renderizada. Vendas abreviadas são aproximadas; campos não encontrados ficam vazios para revisão.';
    if(!capture.price&&screenshotUrl){
      const ocr=await screenshotOcr(screenshotUrl);
      if(ocr?.value){
        capture.price=ocr.value;
        source='Preço encontrado no print pelo OCR nativo do navegador; confira antes de analisar.';
      }else{
        source='O preço não foi identificado automaticamente. Use o print acima para conferir e preencher.';
      }
    }

    fill(capture,source);
    setState(capture.price?'Capturado':'Revisar',capture.price?'ok':'warn');
  }catch(e){
    setState('Erro','warn');
    setError(e.message||'Não foi possível capturar esta página.');
  }
}
async function sendToEcomfy(){
  if(!currentTab||!capture)return;
  setError('');
  const price=Number($('price').value);
  const cost=Number($('cost').value);
  if(!price||price<=0){
    setError('Confira e informe o preço atual.');
    return;
  }
  if(!cost||cost<=0){
    setError('Informe seu custo de compra.');
    $('cost').focus();
    return;
  }
  const payload={
    url:capture.url||currentTab.url||'',
    title:$('title').value.trim().slice(0,500),
    price,
    cost,
    sold:$('sold').value||null,
    rating:$('rating').value||null,
    reviews:$('reviews').value||null,
    images:$('images').value||null,
    video:$('video').checked
  };
  try{
    setState('Abrindo');
    $('send').disabled=true;
    const data=encodeURIComponent(JSON.stringify({v:1,...payload}));
    await chrome.tabs.create({url:'https://www.ecomfy.com.br/radar-produtos.html#ecomfy-capture='+data,active:true});
    setState('Enviado','ok');
  }catch(e){
    console.error(e);
    setState('Erro','warn');
    setError('Não consegui preencher automaticamente. Abra o Radar do Ecomfy e tente novamente.');
    $('send').disabled=false;
  }
}
$('send').addEventListener('click',sendToEcomfy);
$('recapture').addEventListener('click',capturePage);
['price','cost'].forEach(id=>$(id).addEventListener('input',()=>{
  $('send').disabled=!(Number($('price').value)>0);
}));
capturePage();
