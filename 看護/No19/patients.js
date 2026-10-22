'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db=PatientStore.load(),editing=null,dirty=false;
function message(text,bad=false){$('db-message').textContent=text;$('db-message').classList.toggle('save-error',bad);}
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
