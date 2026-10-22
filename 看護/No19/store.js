'use strict';
// One atomic snapshot. Patient display IDs are never used as relationship keys.
const PatientStore = (() => {
 const storageKey='kango-no19-local-db-v1';
 let revision=0, blocked=false, error='';
 const normalizeKana=s=>String(s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
 function fresh(){
  const patients=PATIENTS.map(p=>({...p,uid:p.id}));
  const states={};
  for(const key of Object.keys(initial))states[key]={values:ITEMS.map((_,i)=>initial[key][i]||''),records:(RECORDS[key]||[]).map(r=>({...r})),reviews:{},imported:false};
  return {version:1,revision:0,patients,states,ui:{}};
 }
 function load(){
  try{
   const raw=localStorage.getItem(storageKey);
   if(!raw)return fresh();
   const data=JSON.parse(raw);
   if(data.version!==1||!Array.isArray(data.patients)||!data.patients.length||!data.states||!data.ui||!Number.isInteger(data.revision))throw Error();
   const ids=new Set(),uids=new Set();
   for(const p of data.patients){
    if(typeof p.uid!=='string'||!/^[A-Za-z0-9_-]+$/.test(p.uid)||typeof p.name!=='string'||typeof p.room!=='string'||typeof p.id!=='string'||ids.has(p.id.toLowerCase())||uids.has(p.uid))throw Error();
    ids.add(p.id.toLowerCase());uids.add(p.uid);
   }
   if(typeof ItemCatalog!=='undefined')ItemCatalog.restore(data);
   for(const s of Object.values(data.states))if(!Array.isArray(s.values)||s.values.length!==ITEMS.length||!Array.isArray(s.records)||!s.reviews||(s.otherRecords!==undefined&&!Array.isArray(s.otherRecords)))throw Error();
   for(const s of Object.values(data.states))for(const r of s.otherRecords||[])if(!r||typeof r.id!=='string'||typeof r.subject!=='string'||typeof r.text!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))throw Error();
   const formerDefaults=[['D001','サンプル患者 A','サンプル病棟・101'],['D002','サンプル患者 B','サンプル病棟・102'],['D003','サンプル患者 C','サンプル病棟・103']];
   for(const p of data.patients){
    const previous=formerDefaults.find(x=>x[0]===p.uid&&p.id===x[0]&&p.name===x[1]&&p.room===x[2]),current=PATIENTS.find(x=>x.id===p.uid);
    if(previous&&current){p.name=current.name;p.room=current.room;}
    if(p.kana===undefined&&current&&p.name===current.name)p.kana=current.kana;
   }
   if(data.sampleDateVersion!==2){
    for(const [key,values] of Object.entries(legacyInitial)){
     const saved=data.states[key];
     if(saved&&JSON.stringify(saved.values)===JSON.stringify(values)&&JSON.stringify(saved.records)===JSON.stringify(legacyRECORDS[key])&&!Object.keys(saved.reviews).length&&saved.imported===false)delete data.states[key];
    }
    for(const [key,values] of Object.entries(previousInitial)){
     const saved=data.states[key];
     if(saved&&JSON.stringify(saved.values)===JSON.stringify(values)&&JSON.stringify(saved.records)===JSON.stringify(previousRECORDS[key])&&!Object.keys(saved.reviews).length&&saved.imported===false)data.states[key]={values:[...initial[key]],records:(RECORDS[key]||[]).map(r=>({...r})),reviews:{},imported:false};
    }
    for(const [key,values] of Object.entries(initial))if(!data.states[key])data.states[key]={values:ITEMS.map((_,i)=>values[i]||''),records:(RECORDS[key]||[]).map(r=>({...r})),reviews:{},imported:false};
    if(['2026-10-18','2026-10-19'].includes(data.ui.date)&&!data.states[`${data.ui.patient}|${data.ui.date}`])data.ui.date=DATES[0];
    data.sampleDateVersion=2;
   }
   revision=data.revision;return data;
  }catch{blocked=true;error='保存データを読み込めません。上書きを停止しています。ブラウザの保存設定を確認してください。';return fresh();}
 }
 function save(data){
  if(blocked)return false;
  try{
   const current=localStorage.getItem(storageKey);
   if((current?JSON.parse(current).revision:0)!==revision){error='別のタブでデータが更新されています。この画面の変更は未保存です。変更内容を控えてから再読み込みしてください。';return false;}
   const next={...data,revision:revision+1};
   localStorage.setItem(storageKey,JSON.stringify(next));
   revision=next.revision;data.revision=revision;error='';return true;
  }catch{error='保存できませんでした。変更は未保存です。ブラウザの保存設定・空き容量を確認し、この画面を閉じずに再試行してください。';return false;}
 }
 function validate(p,patients,uid){
  if(!p.name||p.name.length>40)return '患者名を1〜40文字で入力してください。';
  if(p.kana&&(p.kana.length>80||!/^[ぁ-ゖー\s・]+$/u.test(normalizeKana(p.kana))))return 'ふりがなはひらがな・カタカナで80文字以内にしてください。';
  if(!/^[A-Za-z0-9_-]{1,30}$/.test(p.id))return '患者IDは半角英数字・ハイフン・アンダーバーの1〜30文字で入力してください。';
  if(patients.some(x=>x.uid!==uid&&x.id.toLowerCase()===p.id.toLowerCase()))return 'その患者IDは登録済みです。別のIDを入力してください。';
  if(p.room.length>80)return '病棟／病室は80文字以内で入力してください。';
  return '';
 }
 return {load,save,validate,normalizeKana,get error(){return error;}};
})();
