'use strict';
(()=>{
 const W=ReviewWorkflow;let importPlan=null,importText='',importFilename='',previousTarget='',previousDataSignature='';
 const emptyState=()=>({values:ITEMS.map(()=>''),records:[],reviews:{}});
 const currentSummary=()=>W.summary(state(),ITEMS,evaluate,$('date').value);
 const previousState=()=>states[$('patient').value+'|'+W.previousDay($('date').value)];
 const readableTime=t=>new Date(t).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const reviewLabel=r=>W.resolved(r)?'対応記録済み':r.status==='確認済み'?'対応内容の記録が必要':r.status;
 const audit=(s,action,detail,by)=>{s.history??=[];s.history.push({at:new Date().toISOString(),by:by||db.reviewer||'',action,detail});};
 function download(name,content){const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const csvCell=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 $('summary').insertAdjacentHTML('beforebegin',`<section class="panel worklist"><div class="sectionhead"><div><p class="eyebrow">DAILY REVIEW</p><h2>対象日の確認一覧</h2><p class="muted">評価・記録の準備状況と確認の進み具合から、患者を選びます。</p></div><label>表示<select id="worklist-filter"><option value="all">すべての患者</option><option value="pending">未完了の患者</option><option value="ready">データ登録済み・確認待ち</option></select></label></div><div id="worklist-rows" class="tablewrap"></div></section>`);
 $('view-evaluation').insertAdjacentHTML('afterbegin',`<section class="panel csv-panel"><div class="sectionhead"><div><h2>評価データを取り込む</h2><p class="muted">既存の評価をCSVで受け取り、項目ごとに確認・修正します。</p></div><button class="secondary" data-open-csv="evaluation">評価CSVを取り込む</button></div></section>`);
 $('view-records').insertAdjacentHTML('afterbegin',`<section class="panel csv-panel"><div class="sectionhead"><div><h2>看護記録を取り込む</h2><p class="muted">文章データはCSV、紙のメモは画像から取り込めます。</p></div><button class="secondary" data-open-csv="records">記録CSVを取り込む</button></div></section>`);
 const recordsImagePanel=$('view-records').querySelector('.import-layout').closest('.panel');recordsImagePanel.insertAdjacentElement('afterend',$('view-records').querySelector('.csv-panel'));
 $('view-compare').insertAdjacentHTML('beforeend',`<section class="panel completion-panel"><div class="sectionhead"><div><p class="eyebrow">REVIEW RESULT</p><h2>対象日の確認を終える</h2></div><button class="secondary" id="export-review">確認結果をCSVで保存</button></div><div class="completion-body"><div id="completion-state"></div><div class="completion-controls"><label>確認者（入力名）<input id="reviewer-name" maxlength="40" placeholder="確認者名を入力"></label><label class="check"><input type="checkbox" id="whole-review">評価と当日の記録全体を確認した</label><button id="complete-review">この対象日の確認を完了</button></div><p id="completion-feedback" role="status" class="muted"></p><details><summary>対応履歴</summary><div id="review-history"></div></details></div></section>`);
 document.querySelector('main').insertAdjacentHTML('beforeend',`<dialog id="csv-dialog" class="csv-dialog" aria-labelledby="csv-title"><form method="dialog" class="dialog-heading"><h2 id="csv-title">CSVの取り込み</h2><button class="secondary" aria-label="閉じる">閉じる</button></form><p id="csv-description" class="muted"></p><details><summary>CSVの列と項目を確認</summary><p id="csv-columns"></p><p>文字コード：UTF-8。対象日はYYYY-MM-DD、項目は次の名前またはIDを使います。</p><ul>${ITEMS.map(i=>`<li>${esc(i.name)}（${i.id}）：${i.options.map(esc).join('／')}</li>`).join('')}</ul><button type="button" id="csv-template" class="secondary">見出し行をダウンロード</button></details><label>CSVファイル<input id="csv-file" type="file" accept=".csv,text/csv"></label><label>CSVの内容<textarea id="csv-text" rows="7" spellcheck="false" placeholder="見出し行を含むCSVを貼り付けることもできます"></textarea></label><div class="csv-actions"><button id="csv-preview">取り込み内容を確認</button></div><div id="csv-preview-result" aria-live="polite"></div><label class="check" id="csv-overwrite-label" hidden><input type="checkbox" id="csv-overwrite">表示された既存評価の変更を確認し、更新する</label><button id="csv-commit" hidden>確認した内容を取り込む</button><p id="csv-feedback" role="status"></p></dialog>`);
 $('reviewer-name').value=db.reviewer||'';
 const oldRender=render,oldEvaluation=renderEvaluation,oldCoverage=renderDateCoverage;
 renderDateCoverage=function(){oldCoverage();const caption=$('date-coverage').querySelector('.date-coverage-caption');if(caption)caption.textContent='最近の登録日';};
 renderEvaluation=function(){oldEvaluation();const prev=previousState(),index=ITEMS.findIndex(i=>i.id===evaluationItem),detail=$('evaluations').querySelector('.evaluation-options');if(detail&&index>=0){const before=prev?.values[index]||'未入力',after=state().values[index]||'未入力';detail.insertAdjacentHTML('beforebegin',`<div class="previous-assessment"><span>前日 ${esc(W.previousDay($('date').value).slice(5).replace('-','/'))}</span><strong>${prev?esc(before):'評価データなし'}</strong><span aria-hidden="true">→</span><span>当日</span><strong>${esc(after)}</strong></div>`);} };
 render=function(){oldRender();renderWorkflow();};
 const oldPersist=persist;persist=function(){const ok=oldPersist();renderProgress();return ok;};
 function renderWorkflow(){
  const target=key(),snapshot=W.signature(state());if(previousTarget!==target||previousDataSignature!==snapshot){$('whole-review').checked=false;$('completion-feedback').textContent='';previousTarget=target;previousDataSignature=snapshot;}
  const data=currentSummary(),prev=previousState();
  renderProgress(data);renderIssues(data,prev);
  const table=$('comparison').closest('table');table.querySelector('thead').innerHTML='<tr><th>項目</th><th>前日の評価</th><th>当日の評価</th><th>関連記録</th><th>照合状況</th></tr>';
  $('comparison').innerHTML=data.rows.map(r=>`<tr><td><button class="table-item-link" data-edit-evaluation="${r.item.id}">${esc(r.item.name)}</button></td><td>${esc(prev?.values[r.index]||'—')}</td><td><strong>${esc(r.input||'未入力')}</strong>${prev?.values[r.index]&&prev.values[r.index]!==r.input?'<small class="value-change">前日から変更</small>':''}</td><td>${r.notes.length}件</td><td>${badge(r)}${r.kind!=='same'?`<small>${esc(reviewLabel(r.review))}</small>`:''}</td></tr>`).join('');
 }
 function renderProgress(data=currentSummary()){
  const s=state();
  $('summary').innerHTML=[['評価入力済み',data.rows.length-data.missing,' / '+data.rows.length+'項目'],['確認候補',data.candidates.length,'項目'],['未確認・保留',data.pendingCount,'項目'],['対応記録済み',data.candidates.length-data.pending.length,'項目']].map(([label,n,unit])=>`<div class="metric"><span>${label}</span><b>${n}</b><small>${unit}</small></div>`).join('');
  renderWorklist();
  const reasons=[];if(data.missing)reasons.push(`評価未入力 ${data.missing}項目`);if(!(s.records.length+(s.otherRecords?.filter(r=>!r.linkedRecordId).length||0)))reasons.push('当日の記録が未登録');if(data.pendingCount)reasons.push(`未確認・保留 ${data.pendingCount}項目`);
  $('completion-state').innerHTML=unsaved?'<p><strong>変更は未保存です</strong></p><p class="muted">画面下部の保存エラーを確認し、保存を再試行してください。</p>':data.complete?`<p class="completion-success"><strong>確認完了</strong> ${esc(s.completion.by)} · ${esc(readableTime(s.completion.at))}</p>`:`<p><strong>${data.recheck?'更新後の再確認が必要':data.ready?'確認を完了できます':'確認・対応が残っています'}</strong></p><p class="muted">${reasons.length?reasons.map(esc).join(' ／ '):'確認候補への対応がそろいました。評価と記録全体を確認して完了してください。'}</p>`;
  $('complete-review').disabled=!data.ready||data.complete;
  $('review-history').innerHTML=(s.history||[]).slice().reverse().map(h=>`<article><small>${esc(readableTime(h.at))} · ${esc(h.by||'入力操作')}</small><strong>${esc(h.action)}</strong><p>${esc(h.detail)}</p></article>`).join('')||'<p class="muted">対応履歴はまだありません。</p>';
 }
 function renderWorklist(){
  const date=$('date').value,filter=$('worklist-filter').value;
  const entries=PATIENTS.map(p=>{const s=states[p.uid+'|'+date]||emptyState();return {p,s,data:W.summary(s,ITEMS,evaluate,date)};}).filter(({s,data})=>filter==='pending'?(!data.complete||unsaved):filter==='ready'?!data.complete&&!data.missing&&(s.records.length+(s.otherRecords?.filter(r=>!r.linkedRecordId).length||0)):true);
  $('worklist-rows').innerHTML=`<table class="worklist-table"><thead><tr><th>患者／病棟・病室</th><th>評価入力</th><th>記録</th><th>未確認・保留</th><th>確認状況</th><th></th></tr></thead><tbody>${entries.map(({p,s,data})=>`<tr class="${p.uid===$('patient').value?'current-target':''}"><td><strong>${esc(p.name)}</strong><small>${esc(p.id)} · ${esc(p.room)}</small></td><td>${data.rows.length-data.missing}/${data.rows.length}項目</td><td>${s.records.length+(s.otherRecords?.filter(r=>!r.linkedRecordId).length||0)}件</td><td>${data.pendingCount}項目</td><td><span class="workflow-state ${data.complete&&!unsaved?'done':''}">${unsaved?'未保存':data.complete?'確認完了':data.recheck?'再確認が必要':data.missing||!(s.records.length+(s.otherRecords?.filter(r=>!r.linkedRecordId).length||0))?'データ準備中':'確認待ち'}</span></td><td><button class="secondary" data-review-patient="${esc(p.uid)}">${p.uid===$('patient').value?'選択中':'確認する'}</button></td></tr>`).join('')||'<tr><td colspan="6">該当する患者はいません。</td></tr>'}</tbody></table>`;
 }
 function renderIssues(data,prev){
  const filtered=data.candidates.filter(r=>($('kind').value==='all'||r.kind===$('kind').value)&&($('status').value==='all'||($('status').value==='open'?!W.resolved(r.review):r.review.status===$('status').value)));
  $('issues').innerHTML=filtered.map((r,i)=>`<article class="issue"><div class="issue-main"><div class="issue-title"><span class="issue-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(r.item.name)}</h3>${badge(r)}</div><div class="issue-values"><div><span>前日の評価</span><strong>${esc(prev?.values[r.index]||'データなし')}</strong></div><div><span>当日の評価</span><strong>${esc(r.input||'未入力')}</strong></div></div><div class="excerpt">${notes(r.notes)}</div><p class="issue-reason"><strong>確認理由</strong>${esc(r.reason)}</p><span class="issue-rule">照合はモック用の仮ルール</span></div><div class="actions"><span class="workflow-state">${esc(reviewLabel(r.review))}</span><label>対応内容<select data-result="${r.item.id}"><option value="">選択してください</option>${W.results.map(value=>`<option ${r.review.result===value?'selected':''}>${esc(value)}</option>`).join('')}</select></label><button class="secondary" data-edit-evaluation="${r.item.id}">評価を確認・修正</button><button class="secondary" data-open-records="${r.item.id}">関連記録を確認</button><label class="memo-label">対応メモ<textarea data-memo="${r.item.id}" maxlength="300" placeholder="変更しない理由や、確認待ちの内容">${esc(r.review.memo||'')}</textarea></label><button data-confirm-item="${r.item.id}">対応を記録する</button>${r.review.by?`<small>${esc(r.review.by)} · ${esc(readableTime(r.review.at))}</small>`:''}<p id="review-feedback-${r.item.id}" role="status" class="muted"></p></div></article>`).join('')||`<div class="empty"><strong>${data.candidates.length?'この表示条件の確認候補はありません':'仮ルールによる確認候補はありません'}</strong><p>評価・記録全体を確認して、下の「対象日の確認を終える」へ進んでください。</p></div>`;
 }
 $('worklist-filter').addEventListener('change',renderWorklist);
 $('worklist-rows').addEventListener('click',e=>{const uid=e.target.closest('[data-review-patient]')?.dataset.reviewPatient;if(!uid)return;if(ocrJob){$('announce').textContent='OCRを完了または中止してから対象を変更してください。';return;}$('patient').value=uid;$('patient').dispatchEvent(new Event('change',{bubbles:true}));$('target-selection').scrollIntoView({block:'start',behavior:'smooth'});});
 $('reviewer-name').addEventListener('input',()=>{db.reviewer=$('reviewer-name').value.trim();persist();});
 $('issues').addEventListener('input',e=>{if(!e.target.dataset.memo)return;const badge=e.target.closest('.actions').querySelector('.workflow-state');if(badge)badge.textContent='未確認';$('whole-review').checked=false;renderProgress();});
 $('retry-save').addEventListener('click',()=>renderProgress());
 $('issues').addEventListener('change',e=>{const id=e.target.dataset.result;if(!id)return;const r=state().reviews[id]||{memo:''};state().reviews[id]={...r,result:e.target.value,status:'未確認'};delete state().reviews[id].by;delete state().reviews[id].at;persist();render();});
 $('issues').addEventListener('click',e=>{
  const recordId=e.target.closest('[data-open-records]')?.dataset.openRecords;if(recordId){switchTab('records');$('record-manager').scrollIntoView({block:'start',behavior:'smooth'});return;}
  const id=e.target.closest('[data-confirm-item]')?.dataset.confirmItem;if(!id)return;
  const s=state(),r=s.reviews[id]||{},feedback=$('review-feedback-'+id),by=$('reviewer-name').value.trim();
  if(!by){feedback.textContent='画面下部の確認者名を入力してください。';$('reviewer-name').focus();return;}
  if(!W.results.includes(r.result)){feedback.textContent='対応内容を選択してください。';return;}
  if(!r.memo?.trim()){feedback.textContent='対応内容・理由をメモに残してください。';return;}
  r.status=r.result===W.results[2]?'保留':'確認済み';r.by=by;r.at=new Date().toISOString();s.reviews[id]=r;
  audit(s,r.status==='保留'?'確認を保留':'項目の対応を記録',ITEMS.find(x=>x.id===id).name+'：'+r.result+'／'+r.memo,by);
  const ok=persist();render();$('announce').textContent=ok?'対応内容を保存しました。':PatientStore.error;
 });
 $('complete-review').addEventListener('click',()=>{
  const data=currentSummary(),by=$('reviewer-name').value.trim();
  if(!data.ready||data.complete){$('completion-feedback').textContent='未入力・未確認・保留の項目を確認してください。';return;}
  if(!by||!$('whole-review').checked){$('completion-feedback').textContent='確認者名を入力し、評価と記録全体の確認にチェックを入れてください。';return;}
  const s=state();s.completion={by,at:new Date().toISOString(),signature:W.signature(s)};audit(s,'対象日の確認完了','評価と当日の記録全体を確認',by);
  const ok=persist();render();$('completion-feedback').textContent=ok?'確認結果をこのブラウザに保存しました。':PatientStore.error;
 });
 $('export-review').addEventListener('click',()=>{const p=PATIENTS.find(x=>x.uid===$('patient').value),data=currentSummary(),head=['患者ID','患者名','対象日','項目','前日評価','当日評価','照合状況','対応状況','対応内容','対応メモ','確認者','確認日時','対象日の確認状況'];const csv=[head,...data.rows.map(r=>[p.id,p.name,$('date').value,r.item.name,previousState()?.values[r.index]||'',r.input,r.label,r.review.status,r.review.result||'',r.review.memo||'',r.review.by||'',r.review.at||'',data.complete?'確認完了':'未完了']),...(state().otherRecords||[]).map(r=>[p.id,p.name,$('date').value,'その他：'+r.subject,'','','人による確認',r.linkedRecordId?'項目へ追加済み':r.review?.status||'未確認',r.linkedItem?ITEMS.find(i=>i.id===r.linkedItem)?.name||'':'その他の記録',r.text,r.review?.by||'',r.review?.at||'',data.complete?'確認完了':'未完了'])].map(row=>row.map(csvCell).join(',')).join('\r\n');download('確認結果_'+p.id+'_'+$('date').value+'.csv',csv);});
 const headers=kind=>kind==='evaluation'?['患者ID','対象日','項目','評価']:['患者ID','対象日','時刻','項目','状態','記録'];
 let importKind='evaluation';
 document.addEventListener('click',e=>{const button=e.target.closest('[data-open-csv]');if(!button)return;if(ocrJob){$('announce').textContent='OCRを完了または中止してからCSVを取り込んでください。';return;}importKind=button.dataset.openCsv;importPlan=null;importFilename='';$('csv-title').textContent=importKind==='evaluation'?'評価CSVの取り込み':'記録CSVの取り込み';$('csv-description').textContent='患者IDと対象日で登録先を照合し、取り込み前に内容を確認します。';$('csv-columns').textContent=headers(importKind).join(',');$('csv-text').value='';$('csv-file').value='';resetPreview();$('csv-dialog').showModal();});
 function resetPreview(){importPlan=null;$('csv-preview-result').innerHTML='';$('csv-overwrite-label').hidden=true;$('csv-overwrite').checked=false;$('csv-commit').hidden=true;$('csv-feedback').textContent='';}
 $('csv-template').addEventListener('click',()=>download((importKind==='evaluation'?'評価':'記録')+'_CSV見出し.csv',headers(importKind).join(',')+'\r\n'));
 $('csv-text').addEventListener('input',resetPreview);
 $('csv-file').addEventListener('change',async e=>{resetPreview();const file=e.target.files[0];if(!file)return;if(file.size>2000000){$('csv-feedback').textContent='CSVは2MB以内にしてください。';return;}try{const text=await file.text();if(text.includes('\uFFFD'))throw Error('UTF-8で保存したCSVを選択してください。');$('csv-text').value=text;importFilename=file.name;}catch(error){$('csv-feedback').textContent=error.message||'ファイルを読み込めませんでした。';}});
 $('csv-preview').addEventListener('click',()=>{resetPreview();try{
  importText=$('csv-text').value;const plan=W.prepareImport(importText,importKind,PATIENTS,states,ITEMS);
  if(plan.errors.length){$('csv-feedback').textContent=plan.errors.slice(0,12).join('\n')+'\n一部だけの取り込みは行っていません。';return;}
  importPlan=plan;$('csv-preview-result').innerHTML=`<h3>${plan.entries.length}行・${plan.keys.length}対象</h3><div class="tablewrap"><table><thead><tr><th>患者／対象日</th><th>項目</th><th>取り込み内容</th><th>処理</th></tr></thead><tbody>${plan.entries.map(r=>`<tr><td>${esc(r.patientName)} · ${esc(r.patientId)}<small>${esc(r.date)}</small></td><td>${esc(r.itemName)}</td><td>${importKind==='evaluation'?`${esc(r.before||'未入力')} → <strong>${esc(r.value)}</strong>`:`${esc(r.time)} · ${esc(r.value||'状態未確認')}<small>${esc(r.text)}</small>`}</td><td>${r.skip?'登録済み・追加なし':r.overwrite?'既存評価を更新':'取り込み'}</td></tr>`).join('')}</tbody></table></div>`;
  $('csv-overwrite-label').hidden=!plan.overwrites;$('csv-commit').hidden=false;$('csv-feedback').textContent='まだ登録していません。患者・日付・内容を確認してください。';
 }catch(error){$('csv-feedback').textContent=error.message;}});
 $('csv-commit').addEventListener('click',()=>{if(!importPlan)return;try{
  const fresh=W.prepareImport(importText,importKind,PATIENTS,states,ITEMS);if(fresh.baseline!==importPlan.baseline)throw Error('プレビュー後にデータが変わりました。取り込み内容を確認し直してください。');
  const count=W.applyImport(fresh,states,ITEMS,importFilename||'貼り付けCSV',$('csv-overwrite').checked);
  for(const target of fresh.keys)audit(states[target],importKind==='evaluation'?'評価CSVを取り込み':'記録CSVを取り込み',importFilename||'貼り付けCSV');
  evaluationUndo=null;const ok=persist();render();importPlan=null;$('csv-commit').hidden=true;$('csv-overwrite-label').hidden=true;$('csv-feedback').textContent=ok?`${count}件を取り込み、保存しました。変更した項目を再照合しました。`:`取り込み内容は未保存です。${PatientStore.error}`;
 }catch(error){$('csv-feedback').textContent=error.message;}});
 const reset=$('reset'),maintenance=document.createElement('details');maintenance.className='target-maintenance';maintenance.innerHTML='<summary>その他の操作</summary>';$('room').after(maintenance);maintenance.append(reset);
 const changePanel=$('day-changes').closest('.day-change-panel');if(changePanel)changePanel.hidden=true;
 document.querySelector('.steps').innerHTML='<span>01 確認対象を探す</span><span>02 評価と記録を照合する</span><span>03 対応を記録して完了</span>';
 $('whole-review').checked=false;render();
})();
