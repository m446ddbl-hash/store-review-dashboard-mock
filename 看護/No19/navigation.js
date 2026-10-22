'use strict';
(()=>{
 const header=document.querySelector('.header-actions'),settings=document.createElement('a');settings.id='item-settings-link';settings.textContent='項目設定';header.append(settings);
 function updateSettings(){settings.href='items.html?'+new URLSearchParams({date:$('date').value});}
 const oldRender=render;render=function(){oldRender();updateSettings();};
 openEvaluation=function(id){if(ocrJob){$('announce').textContent='OCRを完了または中止してから評価ページを開いてください。';return;}if(!ITEMS.some(i=>i.id===id))return;evaluationItem=id;if(!persist())return;location.href='evaluation.html?'+new URLSearchParams({patient:$('patient').value,date:$('date').value,item:id,returnTab:activeTab==='records'?'records':'compare'});};
 const oldSwitch=switchTab;switchTab=function(name){if(name==='evaluation'){openEvaluation(evaluationItem);return;}oldSwitch(name==='records'?'records':'compare');};
 $('tab-evaluation').hidden=true;
 settings.addEventListener('click',e=>{if(ocrJob||!persist()){e.preventDefault();if(ocrJob)$('announce').textContent='OCRを完了または中止してから項目設定を開いてください。';}});
 const params=new URLSearchParams(location.search),patient=params.get('patient'),date=params.get('date'),item=params.get('item');
 if(PATIENTS.some(p=>p.uid===patient)&&ItemCatalog.validDate(date||'')){$('patient').value=patient;$('date').value=date;lastDate=date;if(ITEMS.some(i=>i.id===item))evaluationItem=item;clearImport();oldSwitch(params.get('tab')==='records'?'records':'compare');render();persist();}
 else {oldSwitch(activeTab==='records'?'records':'compare');renderDateCoverage();updateSettings();}
})();
