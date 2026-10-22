/* 全件架空。項目・選択肢・記録との対応はモック用の仮設定。公式基準ではない。 */
const ITEMS = [
 {id:'oxygen',name:'酸素療法の実施',options:['あり','なし']},
 {id:'infusion',name:'点滴の実施',options:['あり','なし']},
 {id:'meal',name:'食事の介助',options:['介助あり','自立']},
 {id:'move',name:'移動の介助',options:['介助あり','自立']},
 {id:'turn',name:'寝返りの介助',options:['介助あり','自立']}
];
const PATIENTS = [{id:'D001',name:'一ノ瀬 由良',kana:'いちのせ ゆら',room:'東3病棟・101'},{id:'D002',name:'七瀬 千景',kana:'ななせ ちかげ',room:'東3病棟・102'},{id:'D003',name:'月島 藍',kana:'つきしま あい',room:'西2病棟・203'}];
const DATES=['2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14'];
const legacyInitial = {
 'D001|2026-10-19':['あり','あり','介助あり','自立','介助あり'],
 'D001|2026-10-18':['なし','あり','自立','介助あり','自立'],
 'D002|2026-10-19':['なし','なし','自立','自立','自立'],
 'D002|2026-10-18':['あり','なし','介助あり','介助あり','自立'],
 'D003|2026-10-19':['あり','なし','介助あり','介助あり','自立'],
 'D003|2026-10-18':['なし','あり','自立','自立','介助あり']
};
// 自由文の意味解析は行わず、各架空記録に付与した項目IDと状態タグを比較する。
const n=(id,time,item,value,text)=>({id,time,item,value,text});
const legacyRECORDS={
 'D001|2026-10-19':[
 n('A19-01','09:00','oxygen','なし','酸素療法の実施なし。室内気で過ごす。'),
 n('A19-02','09:15','infusion','あり','点滴を実施。刺入部を観察した。'),
 n('A19-03','12:10','meal','自立','昼食は自立して摂取。介助なし。'),
 n('A19-04','10:00','move','自立','病室内の移動は自立。'),
 n('A19-05','14:00','turn',null,'体位に関する観察を実施。介助の有無は未記載。')],
 'D001|2026-10-18':[
 n('A18-01','09:00','oxygen','なし','酸素療法の実施なし。'),n('A18-02','10:00','infusion','あり','点滴を実施した。'),n('A18-03','12:00','meal','自立','昼食は自立して摂取した。'),n('A18-04','13:00','move','介助あり','車椅子への移動を介助した。'),n('A18-05','15:00','turn','自立','寝返りは自立。')],
 'D002|2026-10-19':[
 n('B19-01','09:00','oxygen','なし','酸素療法の実施なし。'),n('B19-02','09:30','infusion','なし','本日の点滴実施なし。'),n('B19-03','12:00','meal','自立','昼食は自立して摂取した。'),n('B19-04','10:00','move','自立','午前の移動は自立。'),n('B19-05','16:00','move','介助あり','午後の移動には介助を行った。'),n('B19-06','14:00','turn','自立','寝返りは自立。')],
 'D002|2026-10-18':[
 n('B18-01','09:00','oxygen','あり','酸素療法を実施した。'),n('B18-02','09:30','infusion','なし','点滴の実施なし。'),n('B18-03','12:00','meal','介助あり','食事の介助を行った。'),n('B18-04','13:00','move','介助あり','移動を介助した。'),n('B18-05','14:00','turn','自立','寝返りは自立。')],
 'D003|2026-10-19':[
 n('C19-01','09:00','oxygen','あり','酸素療法を実施した。'),n('C19-02','10:00','infusion','あり','点滴を実施した。'),n('C19-03','12:00','meal','介助あり','食事の介助を行った。'),n('C19-04','14:00','turn','自立','寝返りは自立。')],
 'D003|2026-10-18':[
 n('C18-01','09:00','oxygen','なし','酸素療法の実施なし。'),n('C18-02','10:00','infusion','なし','本日の点滴実施なし。'),n('C18-03','12:00','meal','自立','食事は自立。'),n('C18-04','13:00','move','自立','移動は自立。'),n('C18-05','14:00','turn',null,'体位を観察。介助に関する記載はない。')]
};
const initial={},RECORDS={},previousInitial={},previousRECORDS={};
const transitions={
 D001:{index:4,item:'turn',value:'自立',text:'寝返りは自立して行う。'},
 D002:{index:2,item:'meal',value:'介助あり',text:'昼食時に一部介助を行った。'},
 D003:{index:1,item:'infusion',value:'なし',text:'本日の点滴実施なし。'}
};
for(const [patientIndex,p] of PATIENTS.entries())for(const [dayIndex,date] of DATES.entries()){
 const targetKey=`${p.id}|${date}`,sourceKey=`${p.id}|2026-10-19`,legacySourceDate=dayIndex%2===0?'2026-10-19':'2026-10-18',legacySourceKey=`${p.id}|${legacySourceDate}`;
 const prefix=String.fromCharCode(65+patientIndex),suffix=date.slice(-2);
 previousInitial[targetKey]=[...legacyInitial[legacySourceKey]];
 previousRECORDS[targetKey]=legacyRECORDS[legacySourceKey].map((r,index)=>({...r,id:`${prefix}${suffix}-${String(index+1).padStart(2,'0')}`}));
 const values=[...legacyInitial[sourceKey]],records=legacyRECORDS[sourceKey].map((r,index)=>({...r,id:`${prefix}${suffix}-${String(index+1).padStart(2,'0')}`}));
 const change=transitions[p.id];
 if(dayIndex>=2&&change){
  values[change.index]=change.value;
  const record=records.find(r=>r.item===change.item);
  if(record){record.value=change.value;record.text=change.text;}
 }
 initial[targetKey]=values;RECORDS[targetKey]=records;
}
function evaluate(item,input,records){
 const notes=records.filter(r=>r.item===item.id), values=[...new Set(notes.map(r=>r.value).filter(Boolean))];
 if(!input)return {kind:'missingInput',label:'入力未選択',reason:'入力値が未選択です。記録とあわせて入力内容を確認してください。',notes};
 if(!values.length)return {kind:'missing',label:'根拠未発見',reason:notes.length?'関連記録はありますが、比較できる状態タグがありません。記録不足や内容を人が確認してください。':'対象日の記録に、この項目の根拠が見つかりません。「実施なし」を意味しません。',notes};
 if(values.length>1)return {kind:'mixed',label:'複数の状態あり',reason:'同じ日に複数の状態が記録されています。時刻による変化も含め、当日の評価に採用する内容を確認してください。',notes};
 if(values[0]!==input)return {kind:'mismatch',label:'食い違い候補',reason:`入力「${input}」と、記録の状態「${values[0]}」が異なります。どちらが正しいかは確定していません。`,notes};
 return {kind:'same',label:'仮ルールで差異なし',reason:'記録に設定された状態と入力値が一致。入力の正しさや記録の十分性を保証するものではありません。',notes};
}
if(typeof module!=='undefined')module.exports={ITEMS,PATIENTS,DATES,initial,RECORDS,legacyInitial,legacyRECORDS,previousInitial,previousRECORDS,evaluate};
