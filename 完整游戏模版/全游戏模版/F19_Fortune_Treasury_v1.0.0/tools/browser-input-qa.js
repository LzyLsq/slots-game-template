async(page)=>{
 const results=[];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>{
  const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
  return {generation:a.generation,fields:a.root.getComponentsInChildren('cc.EditBox').map(e=>({
   value:e.string,label:e.textLabel.string,active:e.textLabel.node.active,
   font:e.textLabel.fontSize,hintFont:e.placeholderLabel.fontSize,align:e.textLabel.verticalAlign
  }))};
 });
 const focus=async index=>{
  const p=await page.evaluate(index=>{
   const cc=window.cc,s=cc.director.getScene(),a=s.getChildByName('Canvas').getComponent('AureliaApp');
   const e=a.root.getComponentsInChildren('cc.EditBox')[index];
   const p=s.getComponentsInChildren(cc.Camera)[0].worldToScreen(e.node.worldPosition);
   const c=document.querySelector('canvas'),r=c.getBoundingClientRect();
   return {x:r.left+p.x/c.width*r.width,y:r.top+r.height-p.y/c.height*r.height};
  },index);await page.mouse.click(p.x,p.y);
 };
 for(const screen of ['login','register']){
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4919/?debug=1&screen='+screen+'&v=f19-input');
  await page.waitForFunction(()=>{
   const c=window.cc?.director.getScene()?.getChildByName('Canvas');
   return c?.getComponent('AureliaApp')?.root&&!c.getChildByName('Loading');
  });await page.waitForTimeout(1200);
  const before=await state();
  const values=screen==='login'?['F19Player','SampleSecret123']:['F19Player','SampleSecret123','SampleSecret123','TreasureGuest'];
  for(let i=0;i<values.length;i++){
   await focus(i);await page.locator('input:visible').fill(values[i]);
   if(i===0){
    const font=await page.locator('input:visible').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
    if(font<54)throw Error('Native input too small: '+font);
    await page.setViewportSize({width:390,height:600});await page.waitForTimeout(200);
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
   }
   await page.mouse.click(8,260);await page.waitForTimeout(100);
  }
  for(const width of [320,430,390]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(200);
   const after=await state();
   if(after.generation!==before.generation)throw Error('Resize rebuilt live form');
   after.fields.forEach((f,i)=>{
    if(f.value!==values[i]||!f.active||!f.label)throw Error('Lost input '+screen+' '+i);
    if(f.font<54||f.hintFont<42||f.align!==1)throw Error('Input typography regression');
    if((i===1||i===2&&screen==='register')&&f.label===values[i])throw Error('Password visible');
   });
  }
  await page.screenshot({path:'docs/screenshots/input-'+screen+'-input-fixed.png'});
  results.push({screen,fieldsRetained:values.length,widths:[320,390,430],keyboardResize:true});
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {results,errors};
}
