/*! BunnyMetrics v1 - cookie-less analytics, no PII */
(function(){var s=document.currentScript,d=(s&&s.dataset)||{},id=d.site,h=(d.api||(s&&s.src)||"").split("/tracking")[0],
V="bm_",n=Date.now(),v,sd,pt="",t0=n,l=localStorage;if(!id||!h)return;
var x=+l.getItem(V+"x")||0;
if(n>x||!l.getItem(V)){v=n.toString(36)+Math.random().toString(36).slice(2,10);l.setItem(V,v);l.setItem(V+"x",n+2592e6)}else v=l.getItem(V);
sd=l.getItem(V+"s")||Math.random().toString(36).slice(2,12);l.setItem(V+"s",sd);
function D(){var u=navigator.userAgent,w=innerWidth;return{br:/Edg\//i.test(u)?"Edge":/OPR\//i.test(u)?"Opera":/Firefox/i.test(u)?"Firefox":/Chrome/i.test(u)?"Chrome":/Safari/i.test(u)?"Safari":"Other",
os:/Android/i.test(u)?"Android":/iP(hone|od|ad)/i.test(u)?"iOS":/Win/i.test(u)?"Windows":/Mac/i.test(u)?"macOS":/Linux/i.test(u)?"Linux":"Other",
dv:/iPad|Tablet/i.test(u)?"tablet":/Mobi|Android|iPhone/i.test(u)?"mobile":"desktop",w:innerWidth,h:innerHeight}}
function S(t,e){var q=new URLSearchParams({site:id,type:t,path:pt||location.pathname,vid:v,sid:sd,ref:document.referrer,lang:navigator.language}),k;for(k in e)q.set(k,e[k]);
var u=h+"/api/collect?"+q;if(navigator.sendBeacon&&t!="pageview")navigator.sendBeacon(u);else(new Image()).src=u}
function P(){var q=location.pathname+location.search;if(q===pt)return;pt=q;t0=Date.now();var m=D();m.path=q;m.title=document.title;S("pageview",m)}
var T,z={};addEventListener("click",function(e){for(var a=e.target;a&&a.tagName!=="A";a=a.parentElement);var c=a&&a.getAttribute&&a.getAttribute("data-bm");if(c)S("event",{name:c})},true);
addEventListener("scroll",function(){clearTimeout(T);T=setTimeout(function(){var b=document.body.scrollHeight||1,c=Math.min(100,Math.floor((scrollY+innerHeight)/b*100/25)*25);if(c&&!z[c]){z[c]=1;S("engagement",{scroll:c})}},400)},{passive:true});
addEventListener("pagehide",function(){S("engagement",{dur:Math.round((Date.now()-t0)/1000)})});
addEventListener("popstate",P);document.readyState<"i"?addEventListener("DOMContentLoaded",P):P()})();
