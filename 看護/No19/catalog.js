'use strict';
const ItemCatalog=(()=>{
 const base=ITEMS.filter(i=>!i.custom).map(i=>({...i,options:[...i.options]}));
 const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
 const active=(item,date)=>!item.custom||date>=item.activeFrom;
 function validate(item,existing){
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(item.id)||existing.some(i=>i.id===item.id))throw Error('項目IDが不正または重複しています。');
  if(typeof item.name!=='string'||!item.name.trim()||item.name.length>40||existing.some(i=>i.name.normalize('NFKC').replace(/\s/g,'')===item.name.normalize('NFKC').replace(/\s/g,'')))throw Error('項目名は重複しない40文字以内の名前にしてください。');
  if(!Array.isArray(item.options)||item.options.length<2||item.options.length>8||item.options.some(v=>typeof v!=='string'||!v.trim()||v.length>30)||new Set(item.options).size!==item.options.length)throw Error('評価の選択肢は重複しない2〜8個、各30文字以内で入力してください。');
  if(!Array.isArray(item.terms)||!item.terms.length||item.terms.length>20||item.terms.some(v=>typeof v!=='string'||!v.trim()||v.length>40))throw Error('読み取り語句は1〜20個、各40文字以内で入力してください。');
  if(!validDate(item.activeFrom))throw Error('適用開始日を正しく入力してください。');
 }
 function signature(s){const v={values:s.values,records:s.records,reviews:s.reviews};if(s.otherRecords?.length)v.otherRecords=s.otherRecords;return JSON.stringify(v);}
 function restore(data){
  const custom=data.catalog||[];if(!Array.isArray(custom))throw Error('項目データが不正です。');
  const items=[...base];for(const item of custom){validate(item,items);items.push({...item,custom:true});}
  for(const [key,s] of Object.entries(data.states)){
   if(!Array.isArray(s.values)||s.values.length<base.length||s.values.length>items.length)throw Error('評価データの項目数が不正です。');
   const oldLength=s.values.length,wasComplete=s.completion?.signature===signature(s);
   s.values.push(...Array(items.length-oldLength).fill(''));
   if(wasComplete&&items.slice(oldLength).every(i=>!active(i,key.slice(key.lastIndexOf('|')+1))))s.completion.signature=signature(s);
  }
  ITEMS.splice(0,ITEMS.length,...items);return items;
 }
 function add(data,item){
  const all=[...base,...(data.catalog||[])];validate(item,all);const entry={...item,custom:true};
  for(const [key,s] of Object.entries(data.states)){
   const wasComplete=s.completion?.signature===signature(s);s.values.push('');
   if(wasComplete&&!active(entry,key.slice(key.lastIndexOf('|')+1)))s.completion.signature=signature(s);
  }
  data.catalog??=[];data.catalog.push(entry);return entry;
 }
 return {validDate,active,validate,restore,add,signature,baseCount:base.length};
})();
