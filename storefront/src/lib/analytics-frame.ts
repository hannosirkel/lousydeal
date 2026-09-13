import { ANALYTICS_EVENT_NAMES } from "./analytics";

export const ANALYTICS_FRAME_TITLE = "Analytics measurement";
const FIXED_LOCATION = "https://analytics.invalid/measurement";

/**
 * The only document that executes vendor code. Its opaque sandbox origin and
 * no-referrer embedding keep parent route, title, forms and storage out of
 * the vendor context. It accepts only the parent-owned narrow event protocol.
 */
export function analyticsFrameDocument(): string {
  return `<!doctype html><meta name="referrer" content="no-referrer"><title>${ANALYTICS_FRAME_TITLE}</title><script>
let GOOGLE_ID=null,META_ID=null,configured=false;
const NAMES=${JSON.stringify(ANALYTICS_EVENT_NAMES)};
const FIXED_LOCATION=${JSON.stringify(FIXED_LOCATION)},FIXED_TITLE=${JSON.stringify(ANALYTICS_FRAME_TITLE)};
// Google's SDK reads cookies even in denied-storage mode. Expose an empty jar;
// the native opaque-origin boundary still denies all actual browser storage.
Object.defineProperty(document,'cookie',{get:()=>'',set:()=>{}});
window.dataLayer=[];function gtag(){dataLayer.push(arguments)}
let fbq;
function configure(data){
  if(configured)return;configured=true;
  GOOGLE_ID=typeof data.googleTagId==='string'&&/^G-[A-Z0-9]{4,20}$/.test(data.googleTagId)?data.googleTagId:null;
  META_ID=typeof data.metaPixelId==='string'&&/^[0-9]{5,20}$/.test(data.metaPixelId)?data.metaPixelId:null;
  try{if(GOOGLE_ID){
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('js',new Date);
    gtag('config',GOOGLE_ID,{send_page_view:false,page_location:FIXED_LOCATION,page_title:FIXED_TITLE,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false,url_passthrough:false});
    const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';script.src='https://www.googletagmanager.com/gtag/js?id='+GOOGLE_ID;document.head.append(script);
  }}catch{}
  try{if(META_ID){
    fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments)};
    fbq.queue=[];fbq.loaded=true;fbq.version='2.0';fbq.push=fbq;fbq.disablePushState=true;window.fbq=fbq;window._fbq=fbq;
    fbq('set','autoConfig',false,META_ID);fbq('init',META_ID);
    const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
  }}catch{}
}
function clean(input){
  const p={};if(!input||typeof input!=='object'||Array.isArray(input))return p;
  if(['landing','tier','goods','cart','checkout','certificate','withdrawal','legal','other'].includes(input.route_class))p.route_class=input.route_class;
  if(typeof input.product_handle==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.product_handle)&&input.product_handle.length<=80)p.product_handle=input.product_handle;
  if(typeof input.currency==='string'&&/^[A-Z]{3}$/.test(input.currency))p.currency=input.currency;
  if(Number.isSafeInteger(input.amount)&&input.amount>=0)p.amount=input.amount;
  return p;
}
addEventListener('message',event=>{
  if(parent===window||event.source!==parent||!event.data)return;
  if(event.data.kind==='lousydeal.analytics.configure'){configure(event.data);return}
  if(!configured||event.data.kind!=='lousydeal.analytics'||!NAMES.includes(event.data.name))return;
  const name=event.data.name,payload=clean(event.data.payload);
  try{if(GOOGLE_ID)gtag('event',name,{...payload,page_location:FIXED_LOCATION,page_title:FIXED_TITLE,page_referrer:''})}catch{}
  try{if(META_ID)fbq('trackCustom',name,payload)}catch{}
});
parent.postMessage({kind:'lousydeal.analytics.ready'},'*');
</script>`;
}
