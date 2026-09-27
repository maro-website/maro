// Isolated UI fixture. Never served by the application; no real API access.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { V1ToolWorkspace } from '../../src/components/admin/v1/V1ToolWorkspace';
import { V1Operations } from '../../src/components/admin/v1/V1Operations';
import { LogoContentContext } from '../../src/components/marologo/LogoContent';
import { StepBrand } from '../../src/components/marologo/steps/StepBrand';
import { DEFAULT_LOGO_CONTENT } from '../../src/lib/marologo/content';
import { DEFAULT_WIZARD_STATE } from '../../src/lib/marologo/defaults';
const fixture={ models:[{key:'flare',label:'Flare',descriptor:'Fast · Recommended',enabled:true,isDefault:true,order:0,customerCredits:5},{key:'sunburst',label:'Sunburst',descriptor:'Alternative · More deliberate',enabled:true,isDefault:false,order:1,customerCredits:5}],versions:[{id:'live',versionLabel:'v1',status:'live',content:'Synthetic production prompt for UI verification.',createdAt:'2026-09-17T00:00:00Z'}],content:structuredClone(DEFAULT_LOGO_CONTENT),calls:[]};
window.phase6Fixture=fixture;
window.fetch=async(url,init={})=>{
 const body=init.body?JSON.parse(init.body):null;fixture.calls.push({url,method:init.method??'GET',body});
 const json=data=>Promise.resolve({ok:true,json:async()=>structuredClone(data)});
 if(url.includes('/v1/configuration'))return json({modules:['maro_imazh','maro_logo'].map(module=>({module,models:module==='maro_logo'?[fixture.models[0]]:fixture.models}))});
 if(url.includes('/system-prompts')&&init.method==='PATCH'){const v=fixture.versions.find(v=>url.includes(v.id));v.content=body.content;return json({version:v});}
 if(url.endsWith('/publish')){fixture.versions.forEach(v=>v.status=url.includes(v.id)?'live':'archived');return json({});}
 if(url.endsWith('/system-prompts')){if(init.method==='POST'){const v={...fixture.versions.find(v=>v.status==='live'),id:'draft',versionLabel:'test-draft',status:'draft'};fixture.versions.unshift(v);return json({version:v});}return json({versions:fixture.versions});}
 if(url.endsWith('/models')){fixture.models=body.models;return json({models:fixture.models});}
 if(url.endsWith('/prompt-layers'))return json({layers:[{id:'layer',name:'Square format',layer_key:'v1.production.format.square',status:'live',enabled:true,instructions:'Compose a square image.',conditions:[{field:'selections.format',equals:['fb-post']}]}]});
 if(url.endsWith('/compile'))return json({canonical:{prompt:fixture.versions.find(v=>v.id===(body.draftId??'live')).content,provenance:{promptHash:'synthetic-ui-fixture'}},estimatedCredits:{total:fixture.models[0].customerCredits}});
 if(url.endsWith('/logo-content')){if(body)fixture.content=body.content;return json({content:fixture.content});}
 if(url.includes('/v1/operations'))return json({counts:{total:2,failed:1,pending:0,stale:0,settlementPending:0},jobs:[{id:'synthetic-completed',createdAt:'2026-09-17T00:00:00Z',userId:'internal-test-user',module:'maro_imazh',model:'flare',provider:'openai',providerModelId:'gpt-image-2.5-flare',status:'completed',generationId:'synthetic-generation',configuredCredits:5,charged:5,reserved:0,output:'stored',history:'saved',settlement:'charged',phase:'completed',latencyMs:1000,eligible:false},{id:'synthetic-failed',createdAt:'2026-09-17T00:00:00Z',userId:'internal-test-user',module:'maro_imazh',model:'flare',provider:'openai',status:'failed',generationId:null,configuredCredits:5,charged:0,reserved:0,output:'stored',history:'missing',settlement:'released',failure:'history_failed',retainedOrphan:true,eligible:false}],recentReconciliation:[]});
 throw Error('Unexpected fixture request');
};
function App(){const [page,setPage]=React.useState('imazh');return <div className="mx-auto max-w-[1200px]"><nav className="flex gap-4 p-5">{['imazh','logo','operations','wizard'].map(p=><button key={p} onClick={()=>setPage(p)}>{p}</button>)}</nav>{page==='operations'?<V1Operations/>:page==='wizard'?<LogoContentContext.Provider value={fixture.content}><StepBrand step={1} highestStepReached={1} wizard={DEFAULT_WIZARD_STATE} errors={{}} onChange={()=>{}} onNext={()=>{}}/></LogoContentContext.Provider>:<V1ToolWorkspace key={page} toolId={page==='logo'?'maro_logo':'maro_imazh'}/>}</div>;}
createRoot(document.getElementById('root')).render(<App/>);
