'use strict';
const MemoOCR={create:async()=>{
 const {createReader}=await import('./ocr-paddle/reader.js');
 return createReader();
}};
