'use strict';
const ReviewWorkflow=(()=>{
 const results=['評価を修正した','記録を確認・変更なし','記録の追記・確認待ち'];
 function previousDay(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
 function signature(s){const value={values:s.values,records:s.records,reviews:s.reviews};if(s.otherRecords?.length)value.otherRecords=s.otherRecords;return JSON.stringify(value);}
 function resolved(r){return r?.status==='確認済み'&&results.slice(0,2).includes(r.result)&&!!r.by?.trim()&&!!r.at;}
 function summary(s,items,evaluate,date){
  const rows=items.map((item,i)=>({...evaluate(item,s.values[i],s.records),item,input:s.values[i],index:i,review:s.reviews[item.id]||{status:'未確認',memo:''}})).filter(r=>!date||!r.item.custom||date>=r.item.activeFrom);
  const candidates=rows.filter(r=>r.kind!=='same'),pending=candidates.filter(r=>!resolved(r.review));
  const missing=rows.filter(r=>!r.input).length,complete=!!s.completion&&s.completion.signature===signature(s),otherPending=(s.otherRecords||[]).filter(r=>!r.linkedRecordId&&!(r.review?.status==='確認済み'&&r.review.by&&r.review.at)),pendingCount=pending.length+otherPending.length;
  return {rows,candidates,pending,otherPending,pendingCount,missing,complete,recheck:!!s.completion&&!complete,ready:!missing&&!!(s.records.length+(s.otherRecords?.length||0))&&!pendingCount};
 }
 function parseCSV(text){
  const input=String(text).replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
  for(let i=0;i<input.length;i++){
   const c=input[i];
   if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;continue;}
   if(c==='"'){if(cell||afterQuote)throw Error('CSVの引用符の位置を確認してください。');quoted=true;continue;}
   if(c===','||c==='\r'||c==='\n'){
    row.push(cell.trim());cell='';afterQuote=false;
    if(c!==','){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}continue;
   }
   if(afterQuote&&c.trim())throw Error('CSVの引用符の後には区切り文字が必要です。');
   if(!afterQuote)cell+=c;
  }
  if(quoted)throw Error('CSVの引用符が閉じていません。');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
 }
 function prepareImport(text,kind,patients,states,items){
  const errors=[],entries=[];let csv;
  if(!['evaluation','records'].includes(kind))throw Error('取り込み種別を選んでください。');
  if(String(text).length>2000000)throw Error('CSVは2MB以内にしてください。');
  csv=parseCSV(text);if(csv.length<2)throw Error('見出し行とデータ行を入力してください。');
  if(csv.length>1001)throw Error('1回に取り込めるのは1000行までです。');
  const headers=csv[0].map(x=>x==='日付'?'対象日':x),required=kind==='evaluation'?['患者ID','対象日','項目','評価']:['患者ID','対象日','時刻','項目','状態','記録'];
  if(new Set(headers).size!==headers.length)throw Error('CSVの見出しが重複しています。');
  if(required.some(x=>!headers.includes(x)))throw Error('必要な見出し：'+required.join('、'));
  const seen=new Set();
  csv.slice(1).forEach((cells,index)=>{
   const line=index+2,read=name=>cells[headers.indexOf(name)]||'',patient=patients.find(p=>p.id.toLowerCase()===read('患者ID').toLowerCase()),date=read('対象日'),item=items.find(x=>x.id===read('項目')||x.name===read('項目'));
   const error=message=>errors.push(`${line}行目：${message}`);
   if(cells.length!==headers.length){error('列の数が見出しと一致しません。');return;}
   if(!patient){error('患者IDが患者DBに登録されていません。');return;}
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date){error('対象日は実在する日付をYYYY-MM-DDで入力してください。');return;}
   if(!item){error('項目名または項目IDを確認してください。');return;}
   if(item.custom&&date<item.activeFrom){error('この項目は'+item.activeFrom+'以降の対象日で使えます。');return;}
   const value=read(kind==='evaluation'?'評価':'状態'),time=read('時刻'),record=read('記録');
   if(!item.options.includes(value)&&!(kind==='records'&&!value)){error(item.name+'の値を確認してください（'+item.options.join('／')+'）。');return;}
   if(kind==='records'&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!record||record.length>20000)){error('時刻はHH:MM、記録は1〜20000文字で入力してください。');return;}
   const key=patient.uid+'|'+date,itemIndex=items.indexOf(item),duplicate=kind==='evaluation'?key+'|'+item.id:JSON.stringify([key,item.id,time,value,record]);
   if(seen.has(duplicate)){error('同じ対象・項目の行が重複しています。');return;}seen.add(duplicate);
   const current=states[key],before=current?.values[itemIndex]||'';
   const skip=kind==='records'&&!!current?.records.some(r=>r.item===item.id&&r.time===time&&(r.value||'')===value&&r.text===record);
   entries.push({line,key,patientName:patient.name,patientId:patient.id,date,item:item.id,itemName:item.name,itemIndex,value,time,text:record,before,overwrite:kind==='evaluation'&&!!before&&before!==value,skip});
  });
  const keys=[...new Set(entries.map(x=>x.key))];
  const baseline=JSON.stringify({patients:patients.map(p=>[p.uid,p.id]),targets:keys.map(k=>[k,states[k]||null])});
  return {kind,entries,errors,baseline,keys,overwrites:entries.filter(x=>x.overwrite).length};
 }
 function applyImport(plan,states,items,filename,allowOverwrite){
  if(plan.errors.length||!plan.entries.length)throw Error('内容に不備があるため取り込めません。');
  if(plan.overwrites&&!allowOverwrite)throw Error('既存評価の更新内容を確認してください。');
  const at=new Date().toISOString();let changed=0;
  for(const entry of plan.entries){
   if(entry.skip)continue;
   const s=states[entry.key]??={values:items.map(()=>''),records:[],reviews:{},imported:false};
   if(plan.kind==='evaluation'){
    if(s.values[entry.itemIndex]===entry.value)continue;
    s.values[entry.itemIndex]=entry.value;s.evaluationMeta??={};s.evaluationMeta[entry.item]={source:'CSV',filename,at};
   }else s.records.push({id:'CSV-'+Date.now()+'-'+changed,item:entry.item,time:entry.time,value:entry.value||null,text:entry.text,source:'csv',filename,importedAt:at});
   delete s.reviews[entry.item];changed++;
  }
  return changed;
 }
 return {results,previousDay,signature,resolved,summary,parseCSV,prepareImport,applyImport};
})();
if(typeof module!=='undefined')module.exports=ReviewWorkflow;
