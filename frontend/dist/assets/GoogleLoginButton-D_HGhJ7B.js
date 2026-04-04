import{c as r,r as i,j as u}from"./index-5y_6qbkX.js";/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=r("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=r("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]),g="658179994478-t1trka6uolpo2b2i0uqcch1dd6vg956f.apps.googleusercontent.com";function h({onSuccess:n,onError:t,text:o="signin_with"}){const c=i.useRef(null),s=i.useRef(!1);return i.useEffect(()=>{if(s.current)return;const a=()=>{var e,l;(l=(e=window.google)==null?void 0:e.accounts)!=null&&l.id&&(window.google.accounts.id.initialize({client_id:g,callback:d=>{d.credential?n(d.credential):t==null||t("Google Login fehlgeschlagen")}}),c.current&&window.google.accounts.id.renderButton(c.current,{type:"standard",theme:"outline",size:"large",width:c.current.offsetWidth||320,text:o,shape:"pill",logo_alignment:"center"}),s.current=!0)};if(document.getElementById("google-gsi-script"))a();else{const e=document.createElement("script");e.id="google-gsi-script",e.src="https://accounts.google.com/gsi/client",e.async=!0,e.defer=!0,e.onload=a,document.head.appendChild(e)}},[n,t,o]),u.jsx("div",{ref:c,className:"w-full flex justify-center"})}export{p as E,h as G,y as a};
