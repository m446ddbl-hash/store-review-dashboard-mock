const demoSkuData=[
 {store:'A',category:'アウター',id:'AW26-OUT-001-BLK-M',name:'ライトダウンジャケット',variant:'黒 M',start:80,current:18,history:[14,15,16,17],markdown:0,markdownDate:null,sellout:'2026-10-18',endStock:0,reason:'直近の販売ペースでシーズン終了前に完売する想定です。',curve:[0,17.5,36.3,56.3,77.5,92.5,100,100,100,100,100,100,100,100,100,100]},
 {store:'B',category:'アウター',id:'AW26-OUT-002-NVY-M',name:'ウールブレンドコート',variant:'紺 M',start:100,current:68,history:[8,8,8,8],markdown:20,markdownDate:'2026-10-15',sellout:'2026-11-30',endStock:0,reason:'プロパーの販売ペースではシーズン終了時に在庫が残る想定です。',curve:[0,8,16,24,32,36,46,56,66,76,86,96,100,100,100,100]},
 {store:'C',category:'アウター',id:'AW26-OUT-003-KHK-L',name:'キルトブルゾン',variant:'カーキ L',start:120,current:98,history:[7,6,5,4],markdown:30,markdownDate:'2026-10-15',sellout:'2026-12-20',endStock:14,reason:'30％OFF後もシーズン終了時点で在庫が残る想定です。',curve:[0,5.8,10.8,15.8,18.3,21.7,30,38.3,46.7,55,63.3,71.7,80,88.3,96.7,100]},
 {store:'D',category:'アウター',id:'AW26-OUT-004-GRY-M',name:'中綿ショートコート',variant:'グレー M',start:90,current:64,history:[7,7,6,6],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-06',endStock:0,reason:'10％OFFを行うとシーズン終了間際に完売する想定です。',curve:[0,7.8,15.6,22.2,28.9,34.4,43.3,52.2,61.1,70,78.9,87.8,96.7,100,100,100]},
 {store:'A',category:'アウター',id:'AW26-OUT-005-BEG-L',name:'シャツジャケット',variant:'ベージュ L',start:100,current:65,history:[10,10,8,7],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-06',endStock:0,reason:'プロパーを続けるとシーズン終了時に在庫が残る想定です。',curve:[0,10,20,28,35,41,49,57,65,73,81,89,97,100,100,100]},
 {store:'B',category:'アウター',id:'AW26-OUT-006-KHK-L',name:'ロングダウン',variant:'カーキ L',start:120,current:84,history:[10,9,9,8],markdown:30,markdownDate:'2026-10-15',sellout:'2026-11-30',endStock:0,reason:'プロパーを続けると在庫が多く残る想定です。値下げ後はシーズン内に完売する見込みです。',curve:[0,8.3,15.8,23.3,30,34.2,44.2,54.2,64.2,74.2,84.2,94.2,100,100,100,100]},
 {store:'C',category:'アウター',id:'AW26-OUT-007-IVO-M',name:'ボアベスト',variant:'アイボリー M',start:90,current:60,history:[8,8,7,7],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-02',endStock:0,reason:'10％OFFを行うとシーズン内に完売する想定です。',curve:[0,8.9,17.8,25.6,33.3,40,48.9,57.8,66.7,75.6,84.4,93.3,100,100,100,100]},
 {store:'D',category:'アウター',id:'AW26-OUT-008-BLK-L',name:'フードコート',variant:'黒 L',start:100,current:82,history:[4,4,5,5],markdown:30,markdownDate:'2026-10-15',sellout:'2026-11-30',endStock:0,reason:'プロパーの販売ペースでは大きく在庫が残る想定です。',curve:[0,4,8,13,18,22,34,46,58,70,82,94,100,100,100,100]},
 {store:'A',category:'トップス',id:'AW26-TOP-009-CRM-M',name:'ニットプルオーバー',variant:'クリーム M',start:120,current:50,history:[16,17,18,19],markdown:0,markdownDate:null,sellout:'2026-10-29',endStock:0,reason:'現在の販売ペースでシーズン終了前に完売する想定です。',curve:[0,13.3,27.5,42.5,58.3,71.7,85,98.3,100,100,100,100,100,100,100,100]},
 {store:'B',category:'トップス',id:'AW26-TOP-010-BRN-L',name:'リブタートルニット',variant:'ブラウン L',start:100,current:78,history:[6,6,5,5],markdown:20,markdownDate:'2026-10-15',sellout:'2026-12-06',endStock:0,reason:'プロパーの販売ペースではシーズン終了時に在庫が残る想定です。',curve:[0,6,12,17,22,26,36,46,56,66,76,86,96,100,100,100]},
 {store:'C',category:'トップス',id:'AW26-TOP-011-GRY-M',name:'スウェットプルオーバー',variant:'グレー M',start:90,current:62,history:[8,7,7,6],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-03',endStock:0,reason:'10％OFFを行うとシーズン内に完売する想定です。',curve:[0,8.9,16.7,24.4,31.1,37.8,46.7,55.6,64.4,73.3,82.2,91.1,98.9,100,100,100]},
 {store:'D',category:'トップス',id:'AW26-TOP-012-NVY-L',name:'フリースパーカー',variant:'ネイビー L',start:100,current:82,history:[5,5,4,4],markdown:30,markdownDate:'2026-10-15',sellout:'2026-11-30',endStock:0,reason:'プロパーの販売ペースでは多く在庫が残る想定です。',curve:[0,5,10,14,18,21,33,45,57,69,81,93,100,100,100,100]},
 {store:'A',category:'ボトムス',id:'AW26-BTM-013-BLK-M',name:'テーパードパンツ',variant:'ブラック M',start:100,current:56,history:[10,11,11,12],markdown:0,markdownDate:null,sellout:'2026-11-16',endStock:0,reason:'現在の販売ペースでシーズン内に完売する想定です。',curve:[0,10,21,32,44,54,64,74,84,94,100,100,100,100,100,100]},
 {store:'B',category:'ボトムス',id:'AW26-BTM-014-DNM-M',name:'ストレートデニム',variant:'インディゴ M',start:120,current:92,history:[8,7,7,6],markdown:30,markdownDate:'2026-10-15',sellout:'2026-12-06',endStock:0,reason:'プロパーの販売ペースではシーズン終了時に在庫が残る想定です。',curve:[0,6.7,12.5,18.3,23.3,26.7,36.7,46.7,56.7,66.7,76.7,86.7,96.7,100,100,100]},
 {store:'C',category:'ボトムス',id:'AW26-BTM-015-BEG-S',name:'ワイドパンツ',variant:'ベージュ S',start:80,current:47,history:[9,9,8,7],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-03',endStock:0,reason:'10％OFFを行うとシーズン内に完売する想定です。',curve:[0,11.3,22.5,32.5,41.3,47.5,55,62.5,70,77.5,85,92.5,98.8,100,100,100]},
 {store:'D',category:'ボトムス',id:'AW26-BTM-016-GRY-M',name:'コーデュロイパンツ',variant:'グレー M',start:100,current:82,history:[5,5,4,4],markdown:20,markdownDate:'2026-10-15',sellout:'2026-12-09',endStock:0,reason:'プロパーの販売ペースでは在庫が残る想定です。',curve:[0,5,10,14,18,22,32,42,52,62,72,82,92,100,100,100]},
 {store:'A',category:'トップス',id:'TEST-TOP-COMMON-A',name:'共通テスト用ニット',variant:'ネイビー M',start:90,current:56,history:[10,9,9,8],markdown:0,markdownDate:null,sellout:'2026-11-25',endStock:0,reason:'店舗切り替え時の商品選択維持を確認するための共通テスト商品です。',curve:[0,11.1,22.2,32.2,37.8,46.7,56.7,66.7,76.7,86.7,96.7,100,100,100,100,100]},
 {store:'B',category:'トップス',id:'TEST-TOP-COMMON-B',name:'共通テスト用ニット',variant:'ネイビー M',start:100,current:72,history:[7,7,6,6],markdown:10,markdownDate:'2026-10-15',sellout:'2026-12-03',endStock:0,reason:'店舗切り替え時の商品選択維持を確認するための共通テスト商品です。',curve:[0,7,14,20,28,34,43,52,61,70,79,88,97,100,100,100]},
 {store:'C',category:'トップス',id:'TEST-TOP-COMMON-C',name:'共通テスト用ニット',variant:'ネイビー M',start:110,current:91,history:[4,4,4,3],markdown:20,markdownDate:'2026-10-15',sellout:'2026-12-16',endStock:8,reason:'店舗切り替え時の商品選択維持を確認するための共通テスト商品です。',curve:[0,4.5,8.2,11.8,17.3,20.9,29.1,37.3,45.5,53.6,61.8,70,78.2,91,96,100]},
 {store:'D',category:'トップス',id:'TEST-TOP-COMMON-D',name:'共通テスト用ニット',variant:'ネイビー M',start:95,current:61,history:[8,8,7,7],markdown:0,markdownDate:null,sellout:'2026-12-02',endStock:0,reason:'店舗切り替え時の商品選択維持を確認するための共通テスト商品です。',curve:[0,8.4,16.8,24.2,30.5,36.8,45.3,53.7,62.1,70.5,78.9,87.4,95.8,100,100,100]}
];
const storeInfo={A:{name:'店舗A',area:'北エリア'},B:{name:'店舗B',area:'北エリア'},C:{name:'店舗C',area:'中部エリア'},D:{name:'店舗D',area:'関西エリア'}};
const demoEvents=[{id:'DEMO-EVENT-001',name:'サンプル：秋の週末セール',startDate:'2026-10-15',endDate:'2026-10-18',store:'all',category:'アウター',skuId:'',discountPct:20,upliftPct:50}];
const no10ForecastDates=['2026-09-10','2026-09-17','2026-09-24','2026-10-01','2026-10-07','2026-10-14','2026-10-21','2026-10-28','2026-11-04','2026-11-11','2026-11-18','2026-11-25','2026-12-02','2026-12-09','2026-12-16','2026-12-20'];
const no10SeasonEnd='2026-12-09';
function escapeNo10Html(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function no10EventApplies(event,item){return (event.store==='all'||event.store===item.store)&&(event.category==='all'||event.category===item.category)&&(!event.skuId||event.skuId===item.id)}
function no10EventOverlap(event,start,end){const a=Math.max(Date.parse(`${event.startDate}T00:00:00Z`),Date.parse(`${start}T00:00:00Z`)),b=Math.min(Date.parse(`${event.endDate}T23:59:59Z`),Date.parse(`${end}T23:59:59Z`));return Math.max(0,(b-a+1)/86400000)}
function calculateNo10Forecast(item,events=[]){
 const curve=Array.isArray(item.curve)?[...item.curve]:Array(16).fill(0),baseIndex=4,seasonIndex=no10ForecastDates.indexOf(no10SeasonEnd),history=(item.history||[]).slice(-4).map(Number).filter(value=>Number.isFinite(value)&&value>=0),average=history.length?history.reduce((a,b)=>a+b,0)/history.length:0,applicable=events.filter(event=>no10EventApplies(event,item)&&event.endDate>=no10ForecastDates[baseIndex]&&event.startDate<=no10SeasonEnd);
 if(item.start>0)curve[baseIndex]=Math.round((item.start-item.current)/item.start*1000)/10;
 if(!history.length||average<=0)return {...item,curve,markdown:0,markdownDate:null,sellout:null,endStock:item.current,forecastStatus:'実績不足',averageWeeklySales:average,applicableEvents:applicable,reason:'週次販売実績がないため、予測を表示できません。販売数を登録してください。'};
 let stock=Math.max(0,Number(item.current)||0),sellout=null,endStock=null;
 if(stock===0)sellout=no10ForecastDates[baseIndex];
 for(let index=baseIndex+1;index<no10ForecastDates.length;index++){
   if(index>seasonIndex){curve[index]=curve[seasonIndex];continue}
   const start=no10ForecastDates[index-1],end=no10ForecastDates[index],days=(Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000;
   let expected=average*days/7;
   for(const event of applicable){const overlap=no10EventOverlap(event,start,end);if(overlap>0)expected+=average*overlap/7*(Number(event.upliftPct)||0)/100}
   const before=stock,sold=Math.min(stock,expected);stock=Math.max(0,stock-sold);curve[index]=Math.min(100,Math.round((item.start-stock)/item.start*1000)/10);
   if(!sellout&&before>0&&stock===0){const ratio=sold?Math.min(1,before/sold):1;sellout=new Date(Date.parse(`${start}T00:00:00Z`)+(Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))*ratio).toISOString().slice(0,10)}
   if(index===seasonIndex)endStock=stock;
 }
 if(endStock===null)endStock=stock;
 const remainingRate=item.start?endStock/item.start:0,markdown=endStock<=0?0:remainingRate>0.3?20:remainingRate>0.1?10:0,forecastStatus=endStock<=0?'完売見込み':markdown?'値下げ推奨':'要注意';
 const eventText=applicable.length?`予定イベント${applicable.length}件の販売増加見込みを反映。`:'予定イベントなし。';
 const reason=`直近${history.length}週の平均販売数は週${average.toFixed(1)}点。${eventText}12/9時点で約${Math.round(endStock)}点の在庫が残る見込みです。`;
 return {...item,curve,markdown,markdownDate:markdown?'2026-10-14':null,sellout,endStock:Math.round(endStock),forecastStatus,averageWeeklySales:average,applicableEvents:applicable,reason};
}
