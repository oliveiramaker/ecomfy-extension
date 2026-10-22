(() => {
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const visible = el => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) > 0;
  };
  const parseBRL = s => {
    const m = String(s || '').match(/R\$\s*([0-9.]+(?:,[0-9]{1,2})?)/i);
    if (!m) return null;
    const n = Number(m[1].replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const human = s => {
    if (s == null || s === '') return null;
    const m = String(s).toLowerCase().replace(/\s/g,'').match(/^([0-9.,]+)\+?(mil|k|m|milhão|milhões)?\+?$/i);
    if (!m) return null;
    const decimal = m[2] ? m[1].replace(',','.') : m[1].replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n = Number(decimal) * (m[2] ? (/^(mil|k)$/.test(m[2]) ? 1000 : 1000000) : 1);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const bodyText = clean(document.body?.innerText || '');
  const title = clean(
    document.querySelector('h1')?.innerText ||
    document.querySelector('meta[property="og:title"]')?.content ||
    document.title.replace(/\s*[|–-]\s*Shopee.*$/i,'')
  );

  const h1 = document.querySelector('h1');
  const h1Rect = h1?.getBoundingClientRect();
  const candidates = [];
  const nodes = Array.from(document.querySelectorAll('div,span,strong,p'));
  for (const el of nodes) {
    if (!visible(el)) continue;
    const text = clean(el.innerText);
    if (!text || text.length > 48 || !/R\$/i.test(text)) continue;
    const value = parseBRL(text);
    if (!value) continue;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const font = parseFloat(cs.fontSize) || 0;
    let score = Math.min(font, 40);
    if (rect.top >= 0 && rect.top < innerHeight) score += 20;
    if (h1Rect && Math.abs(rect.top - h1Rect.bottom) < 320) score += 30;
    if ((cs.textDecorationLine || '').includes('line-through')) score -= 35;
    if ((el.parentElement && getComputedStyle(el.parentElement).textDecorationLine || '').includes('line-through')) score -= 20;
    if ((text.match(/R\$/g)||[]).length === 1) score += 8;
    if (value < 1) score -= 20;
    candidates.push({value, text, score, top:rect.top, font});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const price = candidates[0]?.value || null;

  // Prefer the compact product summary near the title, not shop totals/recommendations.
  let summary = h1?.parentElement;
  while (summary?.parentElement && summary.innerText.length < 4000 && !/vendid|avalia|sold/i.test(summary.innerText)) summary = summary.parentElement;
  const summaryText = summary && summary.innerText.length < 12000 ? clean(summary.innerText) : '';
  const count = '([0-9][0-9.,]*\\s*\\+?\\s*(?:milhões|milhão|mil|k|m)?\\s*\\+?)';
  function countByLabel(text, label) {
    const after = text.match(new RegExp(count+'\\s*(?:'+label+')','i'));
    const before = text.match(new RegExp('(?:'+label+')\\s*[:：]?\\s*'+count,'i'));
    return human((after || before)?.[1]);
  }
  const texts = [summaryText, bodyText.split(/Descrição do produto|Produtos relacionados|Da mesma loja/i)[0]].filter(Boolean);
  let sold = null, reviews = null, rating = null;
  for (const text of texts) {
    sold ??= countByLabel(text, 'vendid[oa]s?|sold');
    reviews ??= countByLabel(text, 'avalia[çc][õo]es|reviews|ratings');
    for (const pattern of [
      /(?:^|[^0-9.,])([0-5](?:[.,]\d{1,2})?)\s*(?:de|out of|\/)\s*5(?:\D|$)/i,
      /(?:^|[^0-9.,])([0-5](?:[.,]\d{1,2})?)\s*(?:estrelas?|stars?)/i,
      /(?:^|[^0-9.,])([0-5][.,]\d{1,2})\s+[0-9.,]+\s*(?:mil|k)?\+?\s*avalia[çc][õo]es/i,
      /(?:nota|avaliação do produto)\s*:?\s*([0-5](?:[.,]\d{1,2})?)/i
    ]) {
      const m = text.match(pattern);
      if (m && rating == null) rating = Number(m[1].replace(',','.'));
    }
  }
  for (const el of document.querySelectorAll('[aria-label], [data-rating], [itemprop="ratingValue"]')) {
    if (rating != null || !visible(el)) continue;
    const label = el.getAttribute('aria-label') || '';
    const m = label.match(/([0-5](?:[.,]\d{1,2})?)\s*(?:de\s*5|out of\s*5|estrelas?|stars?)/i);
    const value = m?.[1] || el.getAttribute('data-rating') || (el.getAttribute('itemprop')==='ratingValue' ? el.textContent : null);
    if (value != null && value !== '') { const n=Number(String(value).replace(',','.')); if(n>=0 && n<=5)rating=n; }
  }
  // Public structured product data; never read private account state or call Shopee APIs.
  function readProduct(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(readProduct); return; }
    if ([].concat(node['@type'] || []).includes('Product')) {
      const aggregate=node.aggregateRating;
      if(aggregate) {
        const n=Number(String(aggregate.ratingValue ?? '').replace(',','.'));
        if(rating==null && aggregate.ratingValue!=null && n>=0 && n<=5)rating=n;
        reviews ??= human(aggregate.reviewCount ?? aggregate.ratingCount);
      }
    }
    if(node['@graph'])readProduct(node['@graph']);
  }
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { readProduct(JSON.parse(script.textContent)); } catch {}
  }
  if (!(rating>=0 && rating<=5)) rating=null;

  const productRegionTop = h1Rect ? Math.max(0, h1Rect.top - 500) : 0;
  const productImages = new Set();
  for (const img of Array.from(document.images)) {
    if (!visible(img)) continue;
    const r = img.getBoundingClientRect();
    if (r.top < productRegionTop || r.top > 1200) continue;
    const src = img.currentSrc || img.src || '';
    if (/susercontent|shopee/i.test(src) && r.width >= 80 && r.height >= 80) productImages.add(src.split('?')[0]);
  }

  let variations = null;
  const varText = bodyText.match(/(\d+)\s+varia(?:ç|c)[õo]es?/i);
  if (varText) variations = Number(varText[1]);

  window.__ECOMFY_RADAR_CAPTURE__ = {
    url: location.href,
    title,
    price,
    sold,
    rating: Number.isFinite(rating) ? rating : null,
    reviews,
    images: productImages.size || null,
    variations,
    video: Boolean(document.querySelector('video')),
    priceCandidates: candidates.slice(0,5)
  };
})();
