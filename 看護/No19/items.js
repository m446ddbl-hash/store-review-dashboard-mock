'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let db=PatientStore.load(),dirty=false;const params=new URLSearchParams(location.search),contextDate=params.get('date');
 const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 $('item-from').value=ItemCatalog.validDate(contextDate||'')?contextDate:localDate();
 function render(){ $('catalog-list').innerHTML=ITEMS.map(i=>`<tr><td><strong>${esc(i.name)}</strong>${i.custom?`<small>${esc(i.id)}</small>`:''}</td><td>${i.options.map(esc).join('／')}</td><td>${i.custom?i.terms.map(esc).join('、'):'登録済みの語句'}</td><td>${i.custom?esc(i.activeFrom):'登録済み'}</td></tr>`).join(''); }
 $('item-form').addEventListener('input',()=>{dirty=true;});
 $('item-form').addEventListener('submit',e=>{
  e.preventDefault();const split=id=>[...new Set($(id).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
  const item={id:'custom_'+crypto.randomUUID().replace(/-/g,''),name:$('item-name').value.trim(),options:split('item-options'),terms:split('item-terms'),activeFrom:$('item-from').value,custom:true};
  try{const candidate=structuredClone(db);ItemCatalog.add(candidate,item);if(!PatientStore.save(candidate))throw Error(PatientStore.error);db=candidate;ItemCatalog.restore(db);render();dirty=false;$('item-name').value='';$('item-options').value='';$('item-terms').value='';$('item-message').textContent=`「${item.name}」を保存しました。${item.activeFrom}以降の評価・CSV・読み取り候補に反映されます。`;$('item-message').classList.remove('save-error');}
  catch(error){$('item-message').textContent=error.message;$('item-message').classList.add('save-error');}
 });
 $('items-back').addEventListener('click',e=>{if(dirty&&!confirm('入力中の項目設定を取り消して戻りますか？'))e.preventDefault();});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 render();if(PatientStore.error){$('item-message').textContent=PatientStore.error;$('item-message').classList.add('save-error');}
})();
