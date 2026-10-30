'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db=PatientStore.load(),editing=null,dirty=false,pendingPatients=null;
function message(text,bad=false){$('db-message').textContent=text;$('db-message').classList.toggle('save-error',bad);}
function importMessage(text,bad=false){$('patient-import-status').textContent=text;$('patient-import-status').classList.toggle('save-error',bad);}
function render(){
 $('patient-count').textContent=`（${db.patients.length}人）`;
 $('patient-list').innerHTML=db.patients.map(p=>`<tr><td><strong>${esc(p.name)}</strong><div class="muted">${esc(p.kana||'ふりがな未登録')}</div></td><td>${esc(p.id)}</td><td>${esc(p.room||'未設定')}</td><td><button class="secondary" data-edit="${esc(p.uid)}" aria-label="${esc(p.name)}の基本情報を編集">編集</button></td></tr>`).join('');
}
function clear(){
 editing=null;dirty=false;$('editor-title').textContent='新しい患者を追加';
 $('patient-name').value='';$('patient-kana').value='';$('patient-room').value='';
 let n=1;while(db.patients.some(p=>p.id.toUpperCase()==='D'+String(n).padStart(3,'0')))n++;
 $('patient-id').value='D'+String(n).padStart(3,'0');
}
function discard(){return !dirty||confirm('入力中の基本情報を取り消しますか？');}
function parseCsv(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;continue;}
  if(c==='"'&&field===''){quoted=true;continue;}
  if(c===','){row.push(field);field='';continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';continue;}
  field+=c;
 }
 if(quoted)throw Error('CSVの引用符が閉じられていません。');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function resetImport(){
 pendingPatients=null;$('patient-csv').value='';$('patient-import-preview').hidden=true;$('patient-import-summary').textContent='';$('patient-import-rows').innerHTML='';$('patient-import-confirm').disabled=true;importMessage('');
}
function renderPreview(rows,errors){
 $('patient-import-preview').hidden=false;
 $('patient-import-summary').textContent=errors.length?`${errors.length}件の問題があります。内容を修正したCSVを選び直してください。`:`登録予定：${rows.length}人`;
 $('patient-import-rows').innerHTML=rows.map(r=>`<tr><td>${esc(r.patient.name||'')}</td><td>${esc(r.patient.id||'')}</td><td>${esc(r.patient.kana||'')}</td><td>${esc(r.patient.room||'')}</td><td>${r.error?`<span class="patient-import-error">${esc(r.error)}</span>`:'登録可能'}</td></tr>`).join('');
 $('patient-import-confirm').disabled=errors.length>0||!pendingPatients?.length;
}
async function readPatientCsv(file){
 if(file.size>1024*1024)throw Error('CSVは1MB以下にしてください。');
 const buffer=await file.arrayBuffer();let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{text=new TextDecoder('shift_jis').decode(buffer);}
 text=text.replace(/^\uFEFF/,'');const table=parseCsv(text);
 if(table.length<2)throw Error('患者情報の行がありません。');
 const headers=table[0].map(x=>x.trim());
 const nameCol=headers.indexOf('患者名'),idCol=headers.indexOf('患者ID');
 if(nameCol<0||idCol<0)throw Error('見出しに「患者名」と「患者ID」が必要です。CSVひな形を使ってください。');
 if(table.length-1>500)throw Error('一度に取り込める患者は500人までです。');
 const kanaCol=headers.indexOf('ふりがな'),roomCol=headers.indexOf('病棟・病室');
 const seen=new Set(db.patients.map(p=>p.id.toLowerCase())),preview=[],accepted=[],errors=[];
 table.slice(1).forEach((cells,index)=>{
  const p={name:(cells[nameCol]||'').trim(),id:(cells[idCol]||'').trim(),kana:PatientStore.normalizeKana((cells[kanaCol]||'').trim()),room:(cells[roomCol]||'').trim()};
  const rowNo=index+2;let error='';
  if(cells.length>headers.length)error='列数が見出しと合いません。';
  else if(p.id&&seen.has(p.id.toLowerCase()))error='患者IDが既存またはCSV内で重複しています。';
  else error=PatientStore.validate(p,[...db.patients,...accepted],null);
  if(p.id)seen.add(p.id.toLowerCase());
  if(error){errors.push(`行${rowNo}: ${error}`);preview.push({patient:p,error:`行${rowNo}: ${error}`});}
  else{accepted.push(p);preview.push({patient:p,error:''});}
 });
 if(!preview.length)throw Error('取り込める患者情報がありません。');
 pendingPatients=errors.length?null:accepted;renderPreview(preview,errors);
 importMessage(errors.length?errors.slice(0,5).join(' ')+(errors.length>5?' ほかにも問題があります。':''):'内容を確認し、「確認した患者を登録」を押してください。',errors.length>0);
}
$('patient-template').href=URL.createObjectURL(new Blob(['\uFEFF患者名,患者ID,ふりがな,病棟・病室\r\n'],{type:'text/csv;charset=utf-8'}));
$('patient-csv').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file){resetImport();return;}
 if(dirty){resetImport();importMessage('先に入力中の患者情報を保存するか、取り消してください。',true);return;}
 try{await readPatientCsv(file);}catch(err){pendingPatients=null;$('patient-import-preview').hidden=true;importMessage(err.message||'CSVを読み込めませんでした。',true);}
});
$('patient-import-cancel').addEventListener('click',resetImport);
$('patient-import-confirm').addEventListener('click',()=>{
 if(dirty){importMessage('先に入力中の患者情報を保存するか、取り消してください。',true);return;}
 if(!pendingPatients?.length)return;
 const candidate=JSON.parse(JSON.stringify(db));
 candidate.patients.push(...pendingPatients.map(p=>({...p,uid:'patient_'+crypto.randomUUID()})));
 if(!PatientStore.save(candidate)){importMessage(PatientStore.error,true);return;}
 const count=pendingPatients.length;db=candidate;render();clear();resetImport();message(`${count}人をブラウザ内に保存しました。メイン画面の患者選択に反映されます。`);
});
$('new-patient').addEventListener('click',()=>{if(discard()){clear();$('patient-name').focus();}});
$('cancel-edit').addEventListener('click',()=>{if(discard())clear();});
$('patient-form').addEventListener('input',()=>{dirty=true;});
$('patient-list').addEventListener('click',e=>{
 const uid=e.target.dataset.edit;if(!uid||!discard())return;
 const p=db.patients.find(x=>x.uid===uid);editing=uid;dirty=false;
 $('editor-title').textContent='患者の基本情報を編集';$('patient-name').value=p.name;$('patient-kana').value=p.kana||'';$('patient-id').value=p.id;$('patient-room').value=p.room;$('patient-name').focus();
});
$('patient-form').addEventListener('submit',e=>{
 e.preventDefault();
 const p={name:$('patient-name').value.trim(),kana:PatientStore.normalizeKana($('patient-kana').value.trim()),id:$('patient-id').value.trim(),room:$('patient-room').value.trim()};
 const error=PatientStore.validate(p,db.patients,editing);if(error){message(error,true);return;}
 const candidate=JSON.parse(JSON.stringify(db));
 if(editing)Object.assign(candidate.patients.find(x=>x.uid===editing),p);
 else candidate.patients.push({...p,uid:'patient_'+crypto.randomUUID()});
 if(!PatientStore.save(candidate)){message(PatientStore.error,true);return;}
 db=candidate;render();clear();message('ブラウザ内に保存しました。メイン画面の患者選択に反映されます。');
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
render();clear();message(PatientStore.error||'基本情報の追加・編集後に「保存する」を押してください。',!!PatientStore.error);
