'use strict';
// Conservative browser-only suggestions. Every result remains editable and unconfirmed.
const MemoRouting = (() => {
 const groups=[
  {id:'oxygen',terms:['酸素療法','酸素吸入','酸素','さんそりょうほう','さんそきゅうにゅう','さんそ'],pattern:/(?:^|[^A-Za-z0-9])O\s*2(?=$|[^A-Za-z0-9])/i},
  {id:'infusion',terms:['点滴','輸液','点滴注射','てんてき','ゆえき']},
  {id:'meal',terms:['食事介助','食事','昼食','摂食','食事摂取','食べ','たべ','しょくじ','せっしょく']},
  {id:'move',terms:['移動介助','移乗','移乘','歩行','移動','いどう','ほこう','いじょうかいじょ','いじょうのかいじょ']},
  {id:'turn',terms:['寝返り','体位変換','体位を整え','体の向き','向き整え','体位','ねがえり','たいい']}
 ];
 function unique(xs){return [...new Set(xs)];}
 const foldKana=s=>String(s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
 const compact=s=>foldKana(s).replace(/[\s・]/g,'');
 function timeMatches(text){
  const source=String(text||'').normalize('NFKC'),hits=[];
  for(const m of source.matchAll(/(?<!\d)([01]?\d|2[0-3])\s*(?:[:：÷]|時)\s*([0-5]\d)\s*(?:分)?/g))hits.push({index:m.index,length:m[0].length,time:String(+m[1]).padStart(2,'0')+':'+m[2]});
  for(const m of source.matchAll(/(?<!\d)([1-9]|1\d|2[0-3])\s*時(?!\s*[0-5]?\d\s*分?)/g)){
   if(!hits.some(h=>m.index<h.index+h.length&&m.index+m[0].length>h.index))hits.push({index:m.index,length:m[0].length,time:String(+m[1]).padStart(2,'0')+':00'});
  }
  return hits.sort((a,b)=>a.index-b.index);
 }
 function editDistanceAtMostOne(a,b){
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,d=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}
  return d+(i<a.length||j<b.length?1:0)<=1;
 }
 function resolvePatient(text,patients){
  const normalized=String(text||'').normalize('NFKC');
  const hasId=id=>new RegExp('(^|[^A-Za-z0-9_-])'+id+'($|[^A-Za-z0-9_-])','i').test(normalized);
  const exact=patients.filter(p=>hasId(p.id)||nameMatches(normalized,p));
  if(exact.length===1)return {patient:exact[0],fuzzy:false,count:1};
  if(exact.length>1)return {patient:null,fuzzy:false,count:exact.length};
  const names=normalized.split(/[\n\r]/).map(line=>line.trim().replace(/^(?:患者名|患者|氏名)[:：]?\s*/,'').match(/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/u)?.[0]||'').map(compact).filter(s=>s.length>=3);
  const near=patients.filter(p=>[p.name,p.kana].filter(Boolean).map(compact).some(alias=>names.some(name=>editDistanceAtMostOne(name,alias))));
  return near.length===1?{patient:near[0],fuzzy:true,count:1}:{patient:null,fuzzy:false,count:near.length};
 }
 const allGroups=()=>[...groups,...ITEMS.filter(i=>i.custom).map(i=>({id:i.id,terms:[i.name,...i.terms].map(foldKana)}))];
 function nameMatches(text,p){
  const aliases=[p.name,p.kana].filter(Boolean).map(compact);
  return text.split(/[\n\r]/).some(line=>{
   const name=compact(line).replace(/^(?:患者名|患者|氏名)[:：]?/,'').replace(/(?:さん|さま|様)(?=$|[\d:：])/,'').split(/20\d{2}[年./-]|\d{1,2}[:時]/)[0];
   return aliases.some(alias=>name===alias);
  });
 }
 function analyze(text,patients,currentUid,currentDate){
  const normalized=String(text||'').normalize('NFKC');
  const hasId=(id)=>new RegExp('(^|[^A-Za-z0-9_-])'+id+'($|[^A-Za-z0-9_-])','i').test(normalized);
  const patientGuess=resolvePatient(normalized,patients),p=patientGuess.patient;
  const dates=[];
  for(const m of normalized.matchAll(/(20\d{2})\s*[./\-年]\s*(\d{1,2})\s*[./\-月]\s*(\d{1,2})\s*日?/g)){
   const v=m[1]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[3]).padStart(2,'0');
   if(!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v)dates.push(v);
  }
  if(!dates.length){
   for(const m of normalized.matchAll(/(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)){
    const year=(currentDate||'').slice(0,4);if(!year)continue;
    const v=year+'-'+String(+m[1]).padStart(2,'0')+'-'+String(+m[2]).padStart(2,'0');
    if(!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v)dates.push(v);
   }
  }
  if(!dates.length){
   for(const m of normalized.matchAll(/(?<!\d)(\d{1,2})\s*[./-]\s*(\d{1,2})(?!\d)/g)){
    const year=(currentDate||'').slice(0,4);if(!year)continue;
    const v=year+'-'+String(+m[1]).padStart(2,'0')+'-'+String(+m[2]).padStart(2,'0');
    if(!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v)dates.push(v);
   }
  }
  const timeHits=unique(timeMatches(normalized).map(m=>m.time));
  const searchText=compact(normalized);
  const itemHits=allGroups().filter(g=>g.terms.some(t=>searchText.toLowerCase().includes(compact(t).toLowerCase()))||g.pattern?.test(normalized));
  const item=itemHits.length===1?ITEMS.find(i=>i.id===itemHits[0].id):null;
  let value='';
  if(item){
   const opts=item.options;
   const neg=/(?:介助\s*なし|介助なし|自立|自分で|自力|なし|中止|未実施|実施\s*なし|使用\s*なし)/;
   const pos=/(?:介助\s*あり|介助あり|一部介助|全介助|実施(?:\s*あり)?|使用(?:\s*あり)?|あり)/;
   const statusText=searchText.replace(/むせ(?:こみ)?なし/g,'').replace(/いちぶかいじょ/g,'一部介助').replace(/ぜんかいじょ/g,'全介助').replace(/かいじょ/g,'介助').replace(/じりつ/g,'自立').replace(/みじっし/g,'未実施').replace(/じっし/g,'実施').replace(/ちゅうし/g,'中止').replace(/しよう/g,'使用');
   const nv=neg.test(statusText),pv=pos.test(statusText);
   if(nv!==pv)value=opts.find(x=>nv?['なし','自立'].includes(x):['あり','介助あり'].includes(x))||'';
   if(item.custom){
    const body=[item.name,...item.terms].reduce((s,term)=>s.replaceAll(compact(term),''),statusText),hits=[];
    for(const option of opts){const term=compact(option);let at=body.indexOf(term);while(at>=0){hits.push({option,start:at,end:at+term.length});at=body.indexOf(term,at+term.length);}}
    const found=unique(hits.filter(a=>!hits.some(b=>b!==a&&b.start<=a.start&&b.end>=a.end&&(b.end-b.start>a.end-a.start))).map(x=>x.option));
    const negative=neg.test(body),positive=pos.test(body);
    value=found.length===1?found[0]:found.length?'':negative!==positive?opts.find(x=>negative?['なし','自立'].includes(x):['あり','介助あり'].includes(x))||'':'';
   }
  }
  const uniqueDates=unique(dates);
  return {
   patientUid:p?.uid||'',
   patientStatus:p?(patientGuess.fuzzy?'読み取り結果に近い患者名を候補にしました。患者名と原文を確認してください。':'患者IDまたは患者名が一致しました。候補を確認してください。'):patientGuess.count>1?'複数の患者名・IDが見つかりました。患者を選んでください。':'患者名・IDを特定できません。患者を選んでください。',
   date:uniqueDates.length===1?uniqueDates[0]:'',
   dateStatus:uniqueDates.length===1?'日付を読み取りました。対象日を確認してください。':uniqueDates.length?'複数の日付が見つかりました。対象日を選んでください。':'日付を特定できません。対象日を入力してください。',
   time:timeHits.length===1?timeHits[0]:'',
   timeStatus:timeHits.length===1?'時刻を読み取りました。時刻を確認してください。':timeHits.length?'複数の時刻が見つかりました。記録時刻を選んでください。':'時刻を特定できません。記録時刻を入力してください。',
   itemId:item?.id||'',
   itemStatus:item?'項目候補を1件検出しました。元画像と照合してください。':itemHits.length?'複数項目が見つかりました。項目ごとに分けてください。':'項目を特定できません。選択肢から選んでください。',
   value,
   valueStatus:value?'状態候補を読み取りました。記述と照合してください。':'状態を特定できません。選択肢から選んでください。'
  };
 }
 function analyzeMany(text,patients,currentUid,currentDate){
  const normalized=String(text||'').normalize('NFKC');
  const common=analyze(normalized,patients,currentUid,currentDate);
  const matches=timeMatches(normalized),blocks=[];
  if(matches.length){
   const preamble=normalized.slice(0,matches[0].index).trim();
   if(allGroups().some(g=>g.terms.some(t=>compact(preamble).includes(compact(t)))||g.pattern?.test(preamble)))blocks.push({time:'',text:preamble});
   matches.forEach((m,i)=>blocks.push({time:m.time,text:normalized.slice(m.index+m.length,matches[i+1]?.index??normalized.length).trim()}));
  }else blocks.push({time:'',text:normalized});
  const entries=[];
  for(const block of blocks){
   const parts=block.text.split(/\n|(?<=[。、;；])/).map(s=>s.trim()).filter(Boolean);
   let current=null;
   const flush=()=>{if(!current)return;const guess=analyze(current.text,patients,currentUid,currentDate);entries.push({time:block.time,itemId:guess.itemId,value:guess.value,text:current.text,included:true});current=null;};
   for(const part of parts){
    // Split distinct item mentions, including items written on the same line.
    const positions=allGroups().map(g=>{
     const hits=g.terms.map(t=>foldKana(part).indexOf(t)).filter(i=>i>=0);const match=g.pattern?.exec(part);if(match)hits.push(match.index);
     return {id:g.id,index:hits.length?Math.min(...hits):-1};
    }).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index);
    const segments=positions.length>1?positions.map((p,i)=>part.slice(i===0?0:p.index,positions[i+1]?.index??part.length).trim()):[part];
    for(const segment of segments){
     const guess=analyze(segment,patients,currentUid,currentDate);
     if(current&&guess.itemId&&current.itemId&&guess.itemId!==current.itemId)flush();
     if(!current)current={itemId:guess.itemId,text:segment};
     else {current.text+='\n'+segment;if(!current.itemId)current.itemId=guess.itemId;}
    }
   }
   flush();
  }
  return {...common,entries:entries.length?entries:[{time:'',itemId:'',value:'',text:normalized,included:true}]};
 }
 return {analyze,analyzeMany};
})();
