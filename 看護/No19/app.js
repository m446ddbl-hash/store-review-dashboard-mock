'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const db=PatientStore.load();
PATIENTS.splice(0,PATIENTS.length,...db.patients);
const states=db.states;
let unsaved=false,activeTab='compare',showAllCoverage=false;
let evaluationItem=ITEMS.some(x=>x.id===db.ui.evaluationItem)?db.ui.evaluationItem:ITEMS[0].id,evaluationFilter='all',evaluationUndo=null;
let upload=null, sourceMode="none", ocrJob=null, ocrSerial=0, uploadSerial=0;
let batchDraft=null,batchSourceText='';
const recordImage=r=>r.image||(r.imageRef&&db.images?.[r.imageRef])||null;
const key=()=>`${$('patient').value}|${$('date').value}`;
function state(){return states[key()]??= {values:ITEMS.map(()=>""),records:[],reviews:{},imported:false};}
function rows(){const s=state();return ITEMS.map((item,i)=>({...evaluate(item,s.values[i],s.records),item,index:i,input:s.values[i],review:s.reviews[item.id]||{status:'未確認',memo:''}})).filter(r=>!r.item.custom||$('date').value>=r.item.activeFrom);}
const badge=r=>`<span class="badge ${r.kind}">${r.label}</span>`;
const notes=rs=>rs.length?rs.map(r=>`<div class="note"><small>${esc(r.id)} · ${esc(r.time)} · ${esc($('date').value)}</small>${esc(r.text)}</div>`).join(''):'<span class="muted">この項目の関連記録なし</span>';
function announce(t){$('announce').textContent=t;persist();}
function render(){
 const rs=rows(), issues=rs.filter(r=>r.kind!=='same'), open=issues.filter(r=>r.review.status!=='確認済み').length;
 renderDateCoverage();
 renderDayChanges();
 $('room').textContent=PATIENTS.find(p=>p.uid===$('patient').value).room;
 $('summary').innerHTML=[['対象項目',rs.length,'項目',''],['要確認候補',issues.length,'項目',''],['未確認・保留',open,'項目','attention'],['確認済み',issues.length-open,'項目','']].map(([label,value,unit,cl])=>`<div class="metric ${cl}"><span>${label}</span><b>${value}</b><small>${unit}</small></div>`).join('');
 $('comparison').innerHTML=rs.map(r=>{const times=r.notes.map(n=>n.time).filter(Boolean).sort();const recordSummary=r.notes.length?`${r.notes.length}件${times.length?` · ${times.length===1?esc(times[0]):`${esc(times[0])}–${esc(times[times.length-1])}`}`:''}`:'記録なし';return `<tr><td><strong>${esc(r.item.name)}</strong></td><td><strong>${esc(r.input||"未入力")}</strong></td><td><span class="record-count">${recordSummary}</span></td><td>${badge(r)}${r.kind!=='same'?`<div class="muted">${esc(r.review.status)}</div>`:''}</td></tr>`}).join('');
 $('issuecount').textContent=`${issues.length}項目`;
 const filtered=issues.filter(r=>($('kind').value==='all'||r.kind===$('kind').value)&&($('status').value==='all'||($('status').value==='open'?r.review.status!=='確認済み':r.review.status===$('status').value)));
 $('issues').innerHTML=filtered.length?filtered.map((r,i)=>`<article class="issue"><div class="issue-main"><div class="issue-title"><span class="issue-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(r.item.name)}</h3><span class="current">評価：${esc(r.input||'未選択')}</span></div>${badge(r)}</div><div class="excerpt">${notes(r.notes)}</div><p class="issue-reason"><strong>確認理由</strong>${esc(r.reason)}</p><span class="issue-rule">モック用の仮ルール ${r.kind==='mixed'?'R3':r.kind==='missing'?'R2':r.kind==='missingInput'?'R0':'R1'}</span></div><div class="actions"><div class="action-top"><label>対応状況<select data-review="${r.item.id}" aria-label="${esc(r.item.name)}の対応状況">${['未確認','保留','確認済み'].map(v=>`<option ${v===r.review.status?'selected':''}>${esc(v)}</option>`).join('')}</select></label><button class="secondary evaluation-action" data-edit-evaluation="${r.item.id}">評価を確認・修正</button></div><label class="memo-label">確認メモ（任意・自動保存）<textarea data-memo="${r.item.id}" maxlength="300" placeholder="確認内容を記録">${esc(r.review.memo)}</textarea></label><p class="muted">確認済みは対応状況の記録です。</p></div></article>`).join(''):`<div class="empty"><strong>${issues.length===0?'確認候補はありません':open===0&&$('status').value==='open'?'未確認・保留の項目はありません':'この絞り込み条件に該当する項目はありません'}</strong>${issues.length===0?'入力の正しさや記録の十分性を保証するものではありません。記録全体を人が確認してください。':'「対応状況：すべて」で確認済み項目も見られます。'}</div>`;
 $('recordcount').textContent=`（${state().records.length}件）`;
 $('allrecords').innerHTML=notes(state().records);
 renderManagement();
}
function renderDayChanges(){
 const [year,month,day]=$('date').value.split('-').map(Number),previousDate=new Date(Date.UTC(year,month-1,day-1)).toISOString().slice(0,10);
 const previous=states[`${$('patient').value}|${previousDate}`],current=state();
 if(!previous){$('day-changes').innerHTML='<p class="muted">前日の評価データはありません。</p>';return;}
 const changed=ITEMS.flatMap((item,i)=>{
  const before=previous.values[i]||'未入力',after=current.values[i]||'未入力';
  if(before===after)return [];
  const evidence=current.records.filter(r=>r.item===item.id);
  return [`<article class="day-change-row"><strong>${esc(item.name)}</strong><div class="day-change-values"><span>${esc(previousDate.slice(5).replace('-','/'))}　${esc(before)}</span><b aria-hidden="true">→</b><span>${esc($('date').value.slice(5).replace('-','/'))}　${esc(after)}</span></div><div class="day-change-evidence">${evidence.length?evidence.map(r=>`<p><time>${esc(r.time)}</time>${esc(r.text)}</p>`).join(''):'<span class="muted">当日の関連記録はありません。</span>'}</div></article>`];
 });
 $('day-changes').innerHTML=changed.length?`<div class="day-change-list">${changed.join('')}</div>`:'<p class="muted">前日から変化した評価項目はありません。</p>';
}
function renderDateCoverage(){
 const uid=$('patient').value,p=PATIENTS.find(x=>x.uid===uid),prefix=`${uid}|`;
 const days=Object.entries(states).filter(([k,s])=>k.startsWith(prefix)&&(s.values.some(Boolean)||s.records.length||s.otherRecords?.length||Object.keys(s.reviews).length)).map(([k,s])=>{
  const date=k.slice(prefix.length),active=ITEMS.map((item,i)=>({item,i})).filter(({item})=>!item.custom||date>=item.activeFrom),count=active.filter(({i})=>s.values[i]).length;
  return {date,count,total:active.length,records:s.records.length+(s.otherRecords?.filter(r=>!r.linkedRecordId).length||0)};
 }).sort((a,b)=>a.date.localeCompare(b.date));
 const recent=days.slice(-3),recentDates=new Set(recent.map(d=>d.date));
 const compact=!showAllCoverage,visible=compact?days.filter(d=>recentDates.has(d.date)||d.date===$('date').value):days;
 const olderCount=days.filter(d=>!recentDates.has(d.date)&&d.date!==$('date').value).length;
 $('date-coverage').innerHTML=`<strong>${esc(p?.name||'患者')}の登録データ</strong>${days.length?`<div class="date-coverage-content">${compact?'<span class="date-coverage-caption">直近3日分</span>':''}<div class="date-coverage-days">${visible.map(d=>`<button type="button" class="date-chip ${d.date===$('date').value?'selected':''}" data-date-coverage="${esc(d.date)}" aria-pressed="${d.date===$('date').value}" aria-label="${esc(d.date)} 評価${d.count}項目、記録${d.records}件">${d.date.slice(5).replace('-','/')}<small>評価 ${d.count}/${d.total} · 記録 ${d.records}件</small></button>`).join('')}</div>${olderCount?`<button type="button" class="coverage-toggle" data-coverage-toggle>${showAllCoverage?'直近3日に戻す':`過去の登録日を表示（${olderCount}日）`}</button>`:''}</div>`:'<span class="muted">登録済みデータはありません。日付を選び、評価または記録を入力してください。</span>'}`;
}
function refreshPatients(selected){$('patient').innerHTML=PATIENTS.map(p=>`<option value="${esc(p.uid)}">${esc(p.name)} · ${esc(p.id)}</option>`).join('');if(selected)$('patient').value=selected;}
refreshPatients(PATIENTS.some(p=>p.uid===db.ui.patient)?db.ui.patient:PATIENTS[0].uid);
$('date').value=db.ui.date||DATES[0];let lastDate=$('date').value;
['patient','date','kind','status'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test($('date').value)){$('date').value=lastDate;announce('対象日を選択してください。');return;}lastDate=$('date').value;}if(id==='patient'||id==='date'){clearImport();evaluationUndo=null;evaluationFilter='all';}render();if(id==='patient'||id==='date')announce('対象を切り替えました。対象ごとの入力値・対応状況を保持しています。');}));
$('date-coverage').addEventListener('click',e=>{if(e.target.closest?.('[data-coverage-toggle]')){showAllCoverage=!showAllCoverage;renderDateCoverage();return;}const date=e.target.closest?.('[data-date-coverage]')?.dataset.dateCoverage;if(date){$('date').value=date;$('date').dispatchEvent(new Event('change',{bubbles:true}));}});
const evaluationRecordSignature=s=>JSON.stringify(s.records.map(r=>[r.id,r.item,r.time,r.value,r.text]));
function canUndoEvaluation(){
 const u=evaluationUndo;if(!u||u.key!==key())return false;
 return state().values[u.index]===u.after&&evaluationRecordSignature(state())===u.records&&!state().reviews[ITEMS[u.index].id];
}
function changeEvaluation(i,value){
 const item=ITEMS[i];if(!item||!['',...item.options].includes(value)||state().values[i]===value)return;
 const s=state(),before=s.values[i];evaluationItem=item.id;
 evaluationUndo={key:key(),index:i,before,after:value,review:s.reviews[item.id]?{...s.reviews[item.id]}:null,records:evaluationRecordSignature(s)};
 s.values[i]=value;delete s.reviews[item.id];s.history??=[];s.history.push({at:new Date().toISOString(),by:db.reviewer||'',action:'評価を変更',detail:`${item.name}：${before||'未入力'} → ${value||'未入力'}`});render();
 announce(`${item.name}：${before||'未入力'} → ${value||'未入力'}。再照合し、この項目の対応状況を未確認に戻しました。`);
 document.querySelector(`#evaluations [data-input="${i}"][value="${value}"]`)?.focus();
}
$('evaluations').addEventListener('change',e=>{if(e.target.dataset.input!==undefined)changeEvaluation(Number(e.target.dataset.input),e.target.value);});
$('evaluations').addEventListener('click',e=>{
 const d=(e.target.closest?.('button')||e.target).dataset||{};
 if(d.evalItem){evaluationItem=d.evalItem;renderEvaluation();persist();}
 if(d.evalFilter){evaluationFilter=d.evalFilter;renderEvaluation();}
 if(d.evalBack!==undefined){switchTab('compare');persist();document.querySelector(`#comparison [data-edit-evaluation="${evaluationItem}"]`)?.focus();}
 if(d.evalUndo!==undefined&&canUndoEvaluation()){
  const u=evaluationUndo,s=state(),item=ITEMS[u.index];s.values[u.index]=u.before;
  if(u.review)s.reviews[item.id]={...u.review};else delete s.reviews[item.id];
  evaluationUndo=null;evaluationItem=item.id;render();announce(`${item.name}を変更前の「${u.before||'未入力'}」に戻しました。`);
 }
});
function openEvaluation(id){
 if(!ITEMS.some(x=>x.id===id))return;evaluationItem=id;evaluationFilter='all';switchTab('evaluation');renderEvaluation();persist();
 document.querySelector('#evaluation-detail-title')?.focus();
}
$('comparison').addEventListener('click',e=>{const d=(e.target.closest?.('button')||e.target).dataset||{};if(d.editEvaluation)openEvaluation(d.editEvaluation);});
$('issues').addEventListener('change',e=>{const id=e.target.dataset.review;if(id){const old=state().reviews[id]||{memo:''};state().reviews[id]={...old,status:e.target.value};render();announce('対応状況を更新しました。入力値と登録済み記録は変更していません。');}});
$('issues').addEventListener('input',e=>{const id=e.target.dataset.memo;if(id){state().reviews[id]={...state().reviews[id],status:'未確認',memo:e.target.value};delete state().reviews[id].by;delete state().reviews[id].at;persist();}});
$('issues').addEventListener('click',e=>{const d=(e.target.closest?.('button')||e.target).dataset||{};if(d.editEvaluation)openEvaluation(d.editEvaluation);});
$('reset').addEventListener('click',()=>{if(confirm('現在選択している患者・日付の入力値、対応状況、メモを初期状態に戻しますか？')){evaluationUndo=null;delete states[key()];if(initial[key()])states[key()]={values:ITEMS.map((_,i)=>initial[key()][i]||''),records:(RECORDS[key()]||[]).map(r=>({...r})),reviews:{},imported:false};clearImport();render();announce('現在の対象を初期状態に戻しました。');}});
function switchTab(name){
 activeTab=name;
 $('view-'+name).prepend($('target-selection'));
 ['compare','evaluation','records'].forEach(t=>{$('view-'+t).hidden=t!==name;$('tab-'+t).setAttribute('aria-selected',String(t===name));$('tab-'+t).tabIndex=t===name?0:-1;});
 renderDateCoverage();
}
function clearImport(){
 batchDraft=null;renderBatch();
 cancelOCR();sourceMode='none';upload=null;uploadSerial++;$('image-file').value='';$('image-name').textContent='画像未選択';$('run-ocr').disabled=true;
 $('import-form').hidden=true;$('read-empty').hidden=false;$('read-empty').textContent='画像を選ぶと読み取りを始めます';$('source-checked').checked=false;$('import-feedback').textContent='';
 $('import-patient').value='';$('import-date').value='';$('import-time').value='';$('import-text').value='';$('import-item').value='';$('import-value').innerHTML='<option value="">項目を選択してください</option>';
}
function renderEvaluation(){
 const rs=rows(),missing=rs.filter(r=>!r.input).length,issues=rs.filter(r=>r.kind!=='same').length;
 const shown=rs.filter(r=>evaluationFilter==='missing'?!r.input:evaluationFilter==='issues'?r.kind!=='same':true);
 let selected=rs.find(r=>r.item.id===evaluationItem);
 if(!shown.some(r=>r.item.id===evaluationItem))selected=shown[0];
 if(selected)evaluationItem=selected.item.id;
 const u=canUndoEvaluation()?evaluationUndo:null;
 const filters=[['all','すべて',rs.length],['missing','未入力',missing],['issues','確認候補',issues]];
 $('evaluations').innerHTML=`<div class="evaluation-overview"><div><strong>入力済み ${rs.length-missing}<span> / ${rs.length}項目</span></strong><div class="evaluation-progress" role="progressbar" aria-label="評価の入力状況" aria-valuenow="${rs.length-missing}" aria-valuemin="0" aria-valuemax="${rs.length}"><span style="width:${100*(rs.length-missing)/rs.length}%"></span></div></div><span class="muted">未入力 ${missing}件 · 確認候補 ${issues}件</span><button class="secondary" data-eval-undo ${u?'':'disabled'}>直前の変更を戻す</button><button class="secondary" data-eval-back>比較・確認へ戻る</button></div><div class="evaluation-filters" role="group" aria-label="評価項目の絞り込み">${filters.map(([id,label,count])=>`<button class="secondary" data-eval-filter="${id}" aria-pressed="${evaluationFilter===id}">${label}<span>${count}</span></button>`).join('')}</div><div class="evaluation-columns"><nav class="evaluation-list" aria-label="評価項目">${shown.map(r=>`<button class="evaluation-item" data-eval-item="${r.item.id}" aria-pressed="${evaluationItem===r.item.id}"><strong>${esc(r.item.name)}</strong><span class="evaluation-current">${esc(r.input||'未入力')}</span>${badge(r)}</button>`).join('')||'<div class="empty">該当する項目はありません。</div>'}</nav><div class="evaluation-detail">${selected?`<div class="evaluation-detail-heading"><div><p class="eyebrow">ASSESSMENT</p><h3 id="evaluation-detail-title" tabindex="-1">${esc(selected.item.name)}</h3></div>${badge(selected)}</div><fieldset class="evaluation-options"><legend>評価の入力値</legend>${['',...selected.item.options].map(value=>`<label><input type="radio" name="evaluation-${selected.item.id}" data-input="${selected.index}" value="${esc(value)}" ${selected.input===value?'checked':''} aria-label="${esc(selected.item.name)}の評価値：${esc(value||'未入力')}"><span>${esc(value||'未入力')}</span></label>`).join('')}</fieldset><div class="evaluation-result ${selected.kind}" role="status">${esc(selected.reason)}</div><div class="evaluation-evidence-head"><h4>当日の関連記録</h4><span>${selected.notes.length}件</span></div><div class="evaluation-evidence">${[...selected.notes].sort((a,b)=>a.time.localeCompare(b.time)).map(r=>`<article><div class="evidence-time"><strong>${esc(r.time)}</strong><span>${esc(r.value||'状態未確認')}</span></div><p>${esc(r.text)}</p><small>${esc(r.id)} · ${r.source==='ocr'?'メモから取り込み':r.source==='csv'?'CSVから取り込み':'登録済み記録'}</small></article>`).join('')||'<div class="empty">この項目の関連記録はありません。<br>実施なしを意味するものではありません。</div>'}</div>`:'<div class="empty">絞り込み条件に該当する項目はありません。<br>「すべて」から評価項目を選択できます。</div>'}</div></div>`;
}
function importOptions(){
 if($('import-item').value==='other'){$('import-value').innerHTML='<option value="">人が内容を確認</option>';$('import-value').disabled=true;$('import-value').required=false;return;}
 $('import-value').disabled=false;$('import-value').required=true;
 const item=ITEMS.find(x=>x.id===$('import-item').value)||ITEMS[4];
 $('import-value').innerHTML='<option value="">状態を選択してください</option>'+item.options.map(v=>'<option>'+esc(v)+'</option>').join('');$('import-value').value='';
}
function renderBatch(){
 const batch=Array.isArray(batchDraft);
 $('batch-editor').hidden=!batch;$('single-time').hidden=batch;$('single-item').hidden=batch;
 ['import-time','import-item','import-value'].forEach(id=>$(id).disabled=batch);
 $('import-submit').textContent=batch?'選択した記録をまとめて取り込む':'確認して記録に取り込む';
 if(!batch)return;
 $('batch-count').textContent=`${batchDraft.length}件の記録候補`;
 $('batch-rows').innerHTML=batchDraft.map((r,i)=>`<section class="memo-entry"><div class="memo-entry-head"><label class="check"><input type="checkbox" data-row="${i}" data-field="included" ${r.included?'checked':''}>記録 ${i+1} を取り込む</label><button type="button" class="secondary" data-remove="${i}">削除</button></div><div class="route-grid"><label>記録 ${i+1} の時刻<input type="time" data-row="${i}" data-field="time" value="${esc(r.time)}"></label><label>記録 ${i+1} の項目<select data-row="${i}" data-field="itemId"><option value="">項目を選択</option><option value="other" ${r.itemId==='other'?'selected':''}>その他（人が確認）</option>${ITEMS.map(item=>`<option value="${item.id}" ${r.itemId===item.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label></div><label>記録 ${i+1} の状態<select data-row="${i}" data-field="value" ${r.itemId==='other'?'disabled':''}><option value="">${r.itemId==='other'?'人が内容を確認':'状態を選択'}</option>${(ITEMS.find(item=>item.id===r.itemId)?.options||[]).map(v=>`<option ${r.value===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>記録 ${i+1} の文章<textarea data-row="${i}" data-field="text" maxlength="20000">${esc(r.text)}</textarea></label></section>`).join('');
}
$('batch-rows').addEventListener('input',e=>{
 const {row,field}=e.target.dataset;if(row===undefined||!batchDraft?.[+row])return;
 batchDraft[+row][field]=field==='included'?e.target.checked:e.target.value;$('source-checked').checked=false;
});
$('batch-rows').addEventListener('change',e=>{
 const {row,field}=e.target.dataset;if(row===undefined||!batchDraft?.[+row])return;
 batchDraft[+row][field]=field==='included'?e.target.checked:e.target.value;
 if(field==='itemId'){batchDraft[+row].value='';renderBatch();}$('source-checked').checked=false;
});
$('batch-rows').addEventListener('click',e=>{
 if(e.target.dataset.remove===undefined)return;batchDraft.splice(+e.target.dataset.remove,1);renderBatch();$('source-checked').checked=false;
});
$('add-memo-row').addEventListener('click',()=>{
 if(!batchDraft)batchDraft=[{time:$('import-time').value,itemId:$('import-item').value,value:$('import-value').value,text:$('import-text').value,included:true}];
 batchDraft.push({time:'',itemId:'',value:'',text:'',included:true});renderBatch();$('source-checked').checked=false;
});
function submitBatch(){
 if($('import-text').value!==batchSourceText){$('import-feedback').textContent='読み取った文章が変更されています。「文章から候補を再判定」を押してから確認してください。';return;}
 const patient=PATIENTS.find(p=>p.uid===$('import-patient').value),date=$('import-date').value;
 const selected=batchDraft.filter(r=>r.included);
 const dateOK=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
 if(!patient||!dateOK||!$('source-checked').checked||!selected.length){$('import-feedback').textContent='患者・対象日・取り込む記録を選び、元画像の確認チェックを入れてください。';return;}
 const bad=selected.find(r=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)||!r.text.trim()||(r.itemId!=='other'&&(!ITEMS.find(item=>item.id===r.itemId)?.options.includes(r.value)||ITEMS.find(item=>item.id===r.itemId)?.custom&&date<ITEMS.find(item=>item.id===r.itemId).activeFrom)));
 if(bad){$('import-feedback').textContent=`記録 ${batchDraft.indexOf(bad)+1} の時刻・項目・状態・文章を確認してください。未完成の記録は選択を外せます。`;return;}
 const targetKey=patient.uid+'|'+date,s=states[targetKey]??={values:ITEMS.map(()=>''),records:[],reviews:{},imported:false};
 const savedImage=upload.archiveUrl||upload.url;
 const pending=[],same=(r,c)=>r.time===c.time&&r.item===c.item&&r.value===c.value&&r.text===c.text&&recordImage(r)===savedImage;
 for(const row of selected){const candidate={time:row.time,item:row.itemId,value:row.itemId==='other'?'':row.value,text:row.text.trim(),image:savedImage},existing=row.itemId==='other'?(s.otherRecords||[]):s.records;if(!existing.some(r=>same(r,candidate))&&!pending.some(r=>same(r,candidate)))pending.push(candidate);}
 if(!pending.length){$('import-feedback').textContent='選択した記録はすべて取り込み済みです。';return;}
 db.images??={};let imageRef=Object.keys(db.images).find(k=>db.images[k]===savedImage);
 if(!imageRef){imageRef='memo-'+Date.now()+'-'+Object.keys(db.images).length;db.images[imageRef]=savedImage;}
 for(const row of pending){delete row.image;if(row.item==='other'){s.otherRecords??=[];s.otherRecords.push({...row,id:'other_'+crypto.randomUUID(),subject:row.text.split(/\r?\n/)[0].slice(0,60),source:'ocr',imageRef,rawText:upload.rawText||''});}else{s.records.push({...row,id:'MEMO-'+targetKey+'-'+s.records.length,source:'ocr',imageRef,rawText:upload.rawText||''});delete s.reviews[row.item];}}
 const count=pending.length,skipped=selected.length-count;
 $('patient').value=patient.uid;$('date').value=date;lastDate=date;clearImport();render();
 $('read-empty').textContent=`${count}件の記録を取り込みました。${skipped?`取り込み済みの${skipped}件は追加していません。`:''}`;
 announce(`${count}件の記録を取り込み、該当項目を再照合しました。`);
}
function renderManagement(){
 renderEvaluation();
 const patient=PATIENTS.find(p=>p.uid===$('patient').value);
 $('paper').innerHTML=upload?`<img src="${upload.url}" alt="選択したメモ画像">`:'<div class="paper-empty">メモ画像は未選択です。<br>選ぶとここに表示されます。</div>';
 $('record-manager').innerHTML=state().records.map((r,i)=>{const item=ITEMS.find(x=>x.id===r.item);return `<div class="record-edit"><div><strong>${esc(r.time)} · ${esc(item.name)}</strong><small>${esc(r.id)}</small><small>${r.source==='ocr'?'画像から取り込み':r.source==='csv'?'CSVから取り込み':r.source==='other'?'その他の記録から追加':r.source==='manual'?'手入力':'登録済み記録'}</small></div><label>記録の文章<textarea id="record-text-${i}" maxlength="20000" aria-label="${esc(r.id)}の文章">${esc(r.text)}</textarea></label><label>状態（照合用）<select id="record-value-${i}" aria-label="${esc(r.id)}の比較用状態"><option value="" ${!r.value?'selected':''}>状態未確認</option>${item.options.map(v=>`<option ${v===r.value?'selected':''}>${esc(v)}</option>`).join('')}</select></label><div class="other-buttons"><button class="secondary" data-record-save="${i}">変更を保存</button><button type="button" class="secondary" data-record-delete="${esc(r.id)}">この記録を削除</button></div>${recordImage(r)?`<details class="record-source"><summary>取り込み元の画像・読み取り原文</summary><img src="${recordImage(r)}" alt="取り込み時の元画像"><p class="muted">画像とOCR結果を確認して取り込んだ記録です。</p><pre>${esc(r.rawText||"")}</pre></details>`:""}</div>`;}).join('')||'<div class="empty">この患者・対象日の看護記録はまだありません。上の画像取り込みから追加できます。</div>';
}
['compare','evaluation','records'].forEach((name,i)=>{
 $('tab-'+name).addEventListener('click',()=>switchTab(name));
 $('tab-'+name).addEventListener('keydown',e=>{const tabs=['compare','records'],position=tabs.indexOf(name);let next;if(e.key==='ArrowRight')next=(position+1)%2;else if(e.key==='ArrowLeft')next=(position+1)%2;else if(e.key==='Home')next=0;else if(e.key==='End')next=1;else return;e.preventDefault();switchTab(tabs[next]);$('tab-'+tabs[next]).focus();});
});
$('import-item').addEventListener('change',()=>{importOptions();$('route-item-status').textContent='選択した項目を確認してください。';$('source-checked').checked=false;});
$('reroute-memo').addEventListener('click',()=>{applyRouting();$('source-checked').checked=false;$('import-feedback').textContent='文章から候補を更新しました。元画像と照合してください。';});
$('import-patient').addEventListener('change',()=>{$('route-patient-status').textContent='患者候補を選びました。確認してください。';$('source-checked').checked=false;});
$('import-date').addEventListener('change',()=>{$('route-date-status').textContent='対象日を選びました。確認してください。';$('source-checked').checked=false;});
$('import-time').addEventListener('change',()=>{$('route-time-status').textContent='時刻を選びました。確認してください。';$('source-checked').checked=false;});
$('import-value').addEventListener('change',()=>{$('route-value-status').textContent='状態候補を選びました。確認してください。';$('source-checked').checked=false;});
$('import-form').addEventListener('submit',e=>{
 e.preventDefault();const item=$('import-item').value==='other'?{id:'other',options:['']}:ITEMS.find(x=>x.id===$('import-item').value),value=$('import-value').value,time=$('import-time').value,text=$('import-text').value.trim(),patient=PATIENTS.find(p=>p.uid===$('import-patient').value),date=$('import-date').value;
 if(ocrJob)return;
 if(sourceMode!=='ocr'||!upload){$('import-feedback').textContent='画像を選択してOCRを実行してください。';return;}
 if(batchDraft){submitBatch();return;}
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
 if(!patient||!validDate||!item||!$('source-checked').checked||!text||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!item.options.includes(value)){$('import-feedback').textContent='患者・日付・時刻・項目・状態を確認し、元画像の確認チェックを入れてください。';return;}
 const targetKey=patient.uid+'|'+date;const targetState=states[targetKey]??={values:ITEMS.map(()=>''),records:[],reviews:{},imported:false};
 if(item.custom&&date<item.activeFrom){$('import-feedback').textContent='この項目は適用開始日以降の対象日で使えます。';return;}
 if(item.id==='other'){targetState.otherRecords??=[];if(targetState.otherRecords.some(r=>r.time===time&&r.text===text&&recordImage(r)===upload.url)){$('import-feedback').textContent='このその他の記録は取り込み済みです。';return;}targetState.otherRecords.push({id:'other_'+crypto.randomUUID(),item:'other',value:'',subject:text.split(/\r?\n/)[0].slice(0,60),text,time,source:'ocr',image:upload.url,rawText:upload.rawText||''});$('patient').value=patient.uid;$('date').value=date;lastDate=date;clearImport();render();announce('その他の記録を取り込みました。内容を人が確認してください。');return;}
 if(targetState.records.some(r=>r.time===time&&r.item===item.id&&r.text===text&&r.source==='ocr'&&r.image===upload?.url)){$('import-feedback').textContent='同じ画像・項目・時刻・文章の記録は取り込み済みです。';return;}
 targetState.records.push({id:'MEMO-'+targetKey+'-'+targetState.records.length,time,item:item.id,value,text,source:'ocr',image:upload?.url||null,rawText:upload?.rawText||null});
 delete targetState.reviews[item.id];$('patient').value=patient.uid;$('date').value=date;lastDate=date;clearImport();render();
 $('read-empty').textContent='取り込み済み。下の記録一覧と「比較・確認」に反映しました。';announce('確認したメモを記録に取り込み、該当項目を再照合しました。');
});
$('record-manager').addEventListener('click',e=>{
 if(e.target.dataset.recordDelete!==undefined){const r=state().records.find(x=>x.id===e.target.dataset.recordDelete);if(!r)return;if(!confirm('この看護記録を削除しますか？評価値は変更されません。'))return;const snapshot=structuredClone(state()),item=ITEMS.find(x=>x.id===r.item);state().records=state().records.filter(x=>x.id!==r.id);delete state().reviews[r.item];if(r.otherRef){const original=state().otherRecords?.find(x=>x.id===r.otherRef);if(original){delete original.linkedRecordId;delete original.linkedItem;}}state().history??=[];state().history.push({at:new Date().toISOString(),by:db.reviewer||'',action:'看護記録を削除',detail:`${item?.name||r.item} ${r.time}：${r.text.slice(0,120)}`});const saved=persist();if(!saved)states[key()]=snapshot;render();$('announce').textContent=saved?'看護記録を削除しました。該当項目を再確認してください。':`削除を保存できませんでした。${PatientStore.error}`;return;}
 if(e.target.dataset.recordSave===undefined)return;
 const i=Number(e.target.dataset.recordSave),r=state().records[i],text=$('record-text-'+i).value.trim(),value=$('record-value-'+i).value;
 if(!text){announce('記録の文章を入力してください。');return;}
 const item=ITEMS.find(x=>x.id===r.item);if(value&&!item.options.includes(value))return;
 if(r.text===text&&(r.value||'')===value){announce('変更はありません。');return;}
 const beforeText=r.text,beforeValue=r.value||'状態未確認';r.text=text;r.value=value||null;delete state().reviews[r.item];state().history??=[];state().history.push({at:new Date().toISOString(),by:db.reviewer||'',action:'記録を変更',detail:`${item.name} ${r.time}：${beforeValue}／${beforeText} → ${value||'状態未確認'}／${text}`});render();announce('記録を更新しました。該当項目の対応状況を未確認に戻しました。');
});
$('copy-records').addEventListener('click',async()=>{
 const p=PATIENTS.find(x=>x.uid===$('patient').value),text=`【記録確認用】${p.name} (${p.id}) / ${$('date').value}\n`+state().records.map(r=>`${r.time} ${r.text}`).join('\n');
 try{await navigator.clipboard.writeText(text);announce('記録確認用の文章をコピーしました。電子カルテへの登録は行っていません。');}catch{announce('この環境ではコピーできませんでした。記録一覧の文章を選択してコピーしてください。');}
});

function ocrControls(busy){
 ['patient','date','reset','image-file'].forEach(id=>$(id).disabled=busy);
 $('run-ocr').disabled=busy||!upload;
 $('cancel-ocr').hidden=!busy;$('ocr-meter').hidden=!busy;$('import-submit').disabled=busy;
}
function cancelOCR(){
 if(ocrJob){const job=ocrJob;ocrJob=null;job.cancelled=true;job.cancel?.(new Error('cancelled'));job.worker?.terminate().catch(()=>{});ocrControls(false);$('ocr-progress').textContent='読み取りを中止しました。画像を選び直すか再実行できます。';}
}
function applyRouting(){
 batchSourceText=$('import-text').value;
 const guess=MemoRouting.analyze($('import-text').value,PATIENTS,$('patient').value,$('date').value);
 $('import-patient').innerHTML='<option value="">患者を選択してください</option>'+PATIENTS.map(p=>'<option value="'+esc(p.uid)+'">'+esc(p.name)+' · '+esc(p.id)+'</option>').join('');
 $('import-patient').value=guess.patientUid;$('import-date').value=guess.date;$('import-time').value=guess.time;
 $('route-patient-status').textContent=guess.patientStatus;$('route-date-status').textContent=guess.dateStatus;$('route-time-status').textContent=guess.timeStatus;
 $('import-item').innerHTML='<option value="">項目を選択してください</option><option value="other">その他（人が確認）</option>'+ITEMS.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
 $('import-item').value=guess.itemId;importOptions();$('import-value').value=guess.value;
 $('route-item-status').textContent=guess.itemStatus;$('route-value-status').textContent=guess.valueStatus;
  const parsed=MemoRouting.analyzeMany($('import-text').value,PATIENTS,$('patient').value,$('date').value);
  // Use all OCR text for editable suggestions; all candidates still require visual confirmation.
  batchDraft=parsed.entries.length>1?parsed.entries:null;
 renderBatch();
}
function prepareOCRForm(text){
 $('read-empty').hidden=true;$('import-form').hidden=false;
 $('import-time').value='';$('import-text').value=text;applyRouting();
 $('source-checked').checked=false;$('result-description').textContent='患者・日付と、時刻ごとの記録候補を自動入力しました。元画像と照合して修正してください。';
 $('import-feedback').textContent='すべての候補は未確定です。目視で確認してください。'
}
$('image-file').addEventListener('change',async e=>{
 cancelOCR();const file=e.target.files?.[0],serial=++uploadSerial;upload=null;sourceMode='ocr';$('run-ocr').disabled=true;$('import-form').hidden=true;$('read-empty').hidden=false;$('ocr-progress').textContent='';$('source-checked').checked=false;
 if(!file){renderManagement();$('image-name').textContent='画像未選択';return;}
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){$('image-name').textContent='PNG・JPEG・WebPで8MB以下の画像を選んでください。';$('image-file').value='';renderManagement();return;}
 $('image-name').textContent='画像を確認中…';
 try{
  const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  const dimensions=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
   let archiveUrl=url;
   // OCR uses the original. Keep a legible, smaller reference copy for browser storage.
   if(img.naturalWidth*img.naturalHeight<=24000000)try{
    const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const compressed=canvas.toDataURL('image/jpeg',.86);if(compressed.length<url.length)archiveUrl=compressed;
   }catch{}
   resolve([img.naturalWidth,img.naturalHeight,archiveUrl]);
  };img.onerror=reject;img.src=url;});
  if(serial!==uploadSerial)return;
  if(!dimensions[0]||!dimensions[1]||dimensions[0]*dimensions[1]>24000000)throw new Error('size');
  upload={url,archiveUrl:dimensions[2],rawText:''};$('image-name').textContent='画像を選択しました（このブラウザ内で処理します）';$('run-ocr').disabled=false;$('read-empty').textContent='「選んだ画像を文字起こし」を押すと読み取りを開始します。';renderManagement();persist();
 }catch{if(serial!==uploadSerial)return;$('image-name').textContent='画像を開けませんでした。24メガピクセル以下のPNG・JPEG・WebPで試してください。';$('image-file').value='';renderManagement();}
});
$('run-ocr').addEventListener('click',async()=>{
 if(!upload||ocrJob)return;
 const image=upload,selectedKey=key(),job={id:++ocrSerial,cancelled:false,worker:null,cancel:null};ocrJob=job;sourceMode='ocr';ocrControls(true);$('import-form').hidden=true;$('read-empty').hidden=false;$('ocr-meter').value=0;$('ocr-progress').textContent='OCRを準備中。初回は読み取りデータの取得に時間がかかります…';
 let timer;
 const aborted=new Promise((_,reject)=>{job.cancel=reject;timer=setTimeout(()=>reject(new Error('timeout')),120000);});
 try{
  const work=async()=>{
   const w=await MemoOCR.create();
   job.worker=w;if(job.cancelled){await w.terminate();throw new Error('cancelled');}
   return w.recognize(image.url,(stage,progress)=>{if(ocrJob!==job)return;$('ocr-meter').value=progress;$('ocr-progress').textContent=stage;});
  };
  const result=await Promise.race([work(),aborted]),text=String(result.text||'').trim();
  if(ocrJob!==job||selectedKey!==key()||upload!==image)return;
  if(!text){$('read-empty').textContent='文字を検出できませんでした。明るく鮮明な画像や、印刷した文字の画像で試してください。';$('ocr-progress').textContent='読み取り終了：文字の検出なし。記録には取り込んでいません。';return;}
  if(text.length>20000){$('read-empty').textContent='読み取り結果が長すぎます。画像を項目や範囲ごとに分けて試してください。';return;}
   image.rawText=text;prepareOCRForm(text);$('ocr-meter').value=1;$('ocr-progress').textContent=result.lowCount?`読み取りが不確かな箇所が${result.lowCount}件あります。候補にも仮反映しています。すべて未確定です。元画像と確認・修正してください。`:'読み取り完了。元画像と文章・候補を確認してください。';
 }catch(err){
  if(ocrJob!==job)return;
  console.error('OCR failed:',err);
  $('ocr-progress').textContent=err?.message==='timeout'?'読み取りが時間内に完了しませんでした。小さな画像で再実行してください。':'読み取りに失敗しました。画像形式やネット接続、ブラウザの対応を確認して再実行してください。';
 }finally{
  clearTimeout(timer);job.cancelled=true;if(job.worker)await job.worker.terminate().catch(()=>{});
  if(ocrJob===job){ocrJob=null;ocrControls(false);persist();}
 }
});
$('cancel-ocr').addEventListener('click',cancelOCR);
$('import-form').addEventListener('input',e=>{if(e.target.id!=='source-checked')$('source-checked').checked=false;});
$('import-form').addEventListener('change',e=>{if(e.target.id!=='source-checked')$('source-checked').checked=false;});

// Persist committed work and navigation preferences; OCR uploads and review drafts stay temporary.
function capture(){
 db.ui={patient:$('patient').value,date:$('date').value,tab:activeTab,evaluationItem,fields:{
  kind:{value:$('kind').value},status:{value:$('status').value}
 }};
}
function persist(){
 capture();const ok=PatientStore.save(db);unsaved=!ok;
 $('save-status').textContent=ok?'ブラウザ内に保存しました。':PatientStore.error;
 $('save-status').classList.toggle('save-error',!ok);$('retry-save').hidden=ok;
 return ok;
}
const savedFields=db.ui.fields||{},savedFilters={};
for(const id of ['kind','status'])if(savedFields[id])savedFilters[id]=savedFields[id];
const draftFields=['import-patient','import-date','import-time','import-text','import-item','import-value','source-checked'];
const discardSavedImport=db.ui.sourceMode==='sample'||db.ui.sourceMode==='ocr'||!!db.ui.upload||!!db.ui.importVisible||draftFields.some(id=>Object.prototype.hasOwnProperty.call(savedFields,id));
db.ui.fields=savedFilters;
if(discardSavedImport){delete db.ui.sourceMode;delete db.ui.upload;delete db.ui.importVisible;delete db.ui.itemOptions;delete db.ui.valueOptions;}
render();switchTab(db.ui.tab||'compare');clearImport();
for(const [id,field] of Object.entries(savedFilters))$(id).value=field.value;
$('save-status').textContent=PatientStore.error||'評価・記録・対応状況をこのブラウザに保存します。';
$('save-status').classList.toggle('save-error',!!PatientStore.error);
$('retry-save').hidden=!PatientStore.error;
$('retry-save').addEventListener('click',persist);
// Run after the original handlers so the snapshot includes their changes.
['input','change','click'].forEach(type=>document.addEventListener(type,()=>queueMicrotask(persist)));
$('patient-db-link').addEventListener('click',e=>{if(ocrJob){e.preventDefault();$('announce').textContent='OCRを完了または中止してから患者DBへ移動してください。';return;}if(!persist())e.preventDefault();});
window.addEventListener('beforeunload',e=>{if(unsaved||ocrJob){e.preventDefault();e.returnValue='';}});
window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
if(discardSavedImport)persist();
