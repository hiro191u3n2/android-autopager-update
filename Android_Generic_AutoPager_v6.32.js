// ==UserScript==
// @name         Android 汎用オートページャー
// @namespace    https://example.local/userscripts
// @version      6.32.0
// @description  汎用オートページャー。固定URLからの直接更新に対応。Google追加ページ内の全商品カードを価格要素から特定し、実ページ配色の隔離レイアウトと検索結果区切りで重なり・色ずれ・連結表示を防止。「他の人はこちらも検索」非表示、YouTube原題復元・複数画像対策、Yahooニュース全文表示・一覧限定UA・記事動画のEdge互換UAと公式プレイヤー準備までの前面サムネ表示・ニュース一覧先行描画と初期監視軽量化・初回一括整理による高速表示・可変案内枠非表示・記事一覧の画像拡大崩れ防止・リアルタイム検索上部キャンペーン枠非表示、スマホダイジェスト・Buzzap専用の解析完了待機・定期監視・3経路取得・継続再試行対応。
// @downloadURL  https://hiro191u3n2.github.io/android-autopager-update/android-generic-autopager.user.js
// @updateURL    https://hiro191u3n2.github.io/android-autopager-update/android-generic-autopager.meta.js
// @homepageURL  https://hiro191u3n2.github.io/android-autopager-update/
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      www.youtube.com
// @connect      youtube.com
// @connect      buzzap.jp
// @connect      www.buzzap.jp
// ==/UserScript==

(()=>{"use strict";/* generic-yahoo-article-edge-ua-v632 */(function yahooArticleUaV632Runtime() {
  if (window.top !== window.self) return;
  if (!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)) return;
  if (!/^\/(?:articles|expert\/articles|feature|pickup)(?:\/|$)/i.test(location.pathname)) {
    return;
  }

  const ua =
    "Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36 EdgA/46.1.2.5140";

  function apply(targetUa, realm = window) {
    const targetNavigator = realm.navigator;
    const prototype = realm.Navigator?.prototype || Object.getPrototypeOf(targetNavigator);
    const define = (target, key, getter) => {
      if (!target) return false;
      try {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: true,
          get: getter,
        });
        return true;
      } catch {
        return false;
      }
    };
    define(prototype, "userAgent", () => targetUa) ||
      define(targetNavigator, "userAgent", () => targetUa);
    define(prototype, "appVersion", () => targetUa.replace(/^Mozilla\//, "")) ||
      define(targetNavigator, "appVersion", () => targetUa.replace(/^Mozilla\//, ""));
    define(prototype, "vendor", () => "Google Inc.") ||
      define(targetNavigator, "vendor", () => "Google Inc.");
    define(prototype, "platform", () => "Linux armv8l") ||
      define(targetNavigator, "platform", () => "Linux armv8l");
  }

  try {
    apply(ua);
  } catch {}
  try {
    if (typeof unsafeWindow === "object" && unsafeWindow && unsafeWindow !== window) {
      apply(ua, unsafeWindow);
    }
  } catch {}
  try {
    const inject = () => {
      try {
        const script = document.createElement("script");
        const parent = document.documentElement || document.head;
        if (!parent) return false;
        script.id = "generic-yahoo-article-edge-ua-v632";
        script.textContent = `;(${apply.toString()})(${JSON.stringify(ua)});`;
        parent.appendChild(script);
        script.remove();
        return true;
      } catch {
        return false;
      }
    };
    if (!inject()) {
      const retry = () => {
        if (inject()) document.removeEventListener("readystatechange", retry);
      };
      document.addEventListener("readystatechange", retry);
      window.setTimeout(retry, 0);
    }
  } catch {}
})();/* generic-yahoo-article-video-guard-v632 */(function yahooArticleVideoGuardV632Runtime() {
  if (window.top !== window.self) return;
  if (!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)) return;
  if (!/^\/(?:articles|expert\/articles|feature|pickup)(?:\/|$)/i.test(location.pathname)) {
    return;
  }

  const instanceKey = "__androidGenericYahooArticleVideoGuardV632";
  if (window[instanceKey]) return;
  window[instanceKey] = true;

  const slotMarker = "genericYahooArticleVideoSlotV632";
  const overlayMarker = "genericYahooArticleVideoOverlayV632";
  const readyMarker = "genericYahooArticleVideoReadyV632";
  const overlaySelector = '[data-generic-yahoo-article-video-overlay-v632="1"]';
  const playerScriptSelector = 'script[src*="/images/yvpub/player/js/player.js"]';
  let queued = false;
  let observer = null;

  function posterUrl() {
    const value = String(
      document.querySelector('meta[property="og:image"][content]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:image"][content]')?.getAttribute("content") ||
        "",
    ).trim();
    try {
      const url = new URL(value, location.href);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function stylePoster(node, poster) {
    node.style.setProperty("background-color", "#111", "important");
    if (poster) {
      node.style.setProperty("background-image", `url(${JSON.stringify(poster)})`, "important");
      node.style.setProperty("background-position", "center", "important");
      node.style.setProperty("background-repeat", "no-repeat", "important");
      node.style.setProperty("background-size", "cover", "important");
    }
  }

  function overlayFor(slot) {
    const overlay = slot.querySelector?.(overlaySelector);
    return overlay instanceof HTMLElement ? overlay : null;
  }

  function ensureOverlay(slot, poster) {
    if (!(slot instanceof HTMLElement)) return null;
    slot.dataset[slotMarker] = "1";
    slot.style.setProperty("position", "relative", "important");
    stylePoster(slot, poster);
    let overlay = overlayFor(slot);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.dataset[overlayMarker] = "1";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.setProperty("position", "absolute", "important");
      overlay.style.setProperty("inset", "0", "important");
      overlay.style.setProperty("z-index", "2147483646", "important");
      overlay.style.setProperty("pointer-events", "none", "important");
      stylePoster(overlay, poster);
      slot.appendChild(overlay);
    }
    overlay.style.setProperty(
      "display",
      slot.dataset[readyMarker] === "1" ? "none" : "block",
      "important",
    );
    return overlay;
  }

  function findSlot(node) {
    let current = node instanceof HTMLElement ? node : null;
    for (let depth = 0; current && depth < 8; depth += 1) {
      if (current.querySelector?.(playerScriptSelector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function setReady(slot, ready) {
    if (!(slot instanceof HTMLElement)) return;
    slot.dataset[readyMarker] = ready ? "1" : "0";
    const overlay = ready ? overlayFor(slot) : ensureOverlay(slot, posterUrl());
    if (overlay) {
      overlay.style.setProperty("display", ready ? "none" : "block", "important");
    }
  }

  function onMediaReady(event) {
    setReady(findSlot(event.target), true);
  }

  function onMediaError(event) {
    setReady(findSlot(event.target), false);
  }

  function onPlayerMessage(event) {
    if (event.origin !== "https://s.yimg.jp") return;
    let payload = event.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return;
      }
    }
    if (!payload || typeof payload !== "object") return;
    const id = String(payload.id || "");
    const name = String(payload.evt || "");
    if (!id || !name) return;
    const frame = document.getElementById(id);
    const slot = findSlot(frame);
    if (!slot) return;
    if (/(?:loadedcontentdata|startvideo|timeupdate|play|playing|isplaying)$/i.test(name)) {
      setReady(slot, true);
    } else if (/error$/i.test(name)) {
      setReady(slot, false);
    }
  }

  function scan() {
    queued = false;
    const poster = posterUrl();
    for (const script of document.querySelectorAll(
      `.article_body ${playerScriptSelector}`,
    )) {
      ensureOverlay(script.parentElement, poster);
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      try {
        scan();
      } catch {
        queued = false;
      }
    });
  }

  try {
    for (const eventName of [
      "yvpubLoadedcontentdata",
      "yvpubStartVideo",
      "yvpubTimeupdate",
      "yvpubPlay",
      "yvpubPlaying",
      "yvpubIsPlaying",
    ]) {
      document.addEventListener(eventName, onMediaReady, true);
    }
    document.addEventListener("yvpubError", onMediaError, true);
    window.addEventListener("message", onPlayerMessage, false);
    schedule();
    observer = new MutationObserver(schedule);
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
    window.addEventListener("pageshow", schedule);
    window.setTimeout(() => {
      observer?.disconnect();
      observer = null;
    }, 120000);
  } catch {}
})();!function(){
  if(window.top!==window.self)return;
  if(!/^search\.yahoo\.co\.jp$/i.test(location.hostname))return;
  if(!/^\/realtime(?:\/|$)/i.test(location.pathname))return;

  const INSTANCE_KEY="__androidGenericYahooRealtimePromoV626";
  if(window[INSTANCE_KEY])return;
  window[INSTANCE_KEY]=true;

  const STYLE_ID="generic-yahoo-realtime-promo-style-v626";
  const SELECTOR='#mhd_banner_wrapper,[data-mhd="mhdBannerWrapper"],[data-mhd="mhd"] [data-mhd="spBanner"],[data-mhd="mhd"] .spBanner,#mhd_prem_header_sp,[data-mhd="spBanner__MhdPremHeaderSp"]';
  const HEADER_SELECTOR='#msthd,[data-mhd="mhd"].mhd,[data-mhd="spHeader"].mhdSpHeader';
  const ZERO_STYLES=[
    ["display","none"],
    ["height","0"],
    ["min-height","0"],
    ["max-height","0"],
    ["margin","0"],
    ["padding","0"],
    ["border","0"],
    ["overflow","hidden"],
    ["visibility","hidden"]
  ];
  const HEADER_STYLES=[
    ["height","44px"],
    ["min-height","44px"],
    ["max-height","44px"]
  ];

  function installStyle(){
    if(document.getElementById(STYLE_ID))return true;
    const parent=document.head||document.documentElement;
    if(!parent)return false;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=SELECTOR+"{display:none!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;visibility:hidden!important}"+
      '[data-mhd="spHeader"].mhdSpHeader{height:44px!important;min-height:44px!important;max-height:44px!important}'+
      '@media screen and (max-width:989px){#msthd,[data-mhd="mhd"].mhd{height:44px!important;min-height:44px!important;max-height:44px!important}}'+
      '#msthd:has([data-mhd="spHeader"]),[data-mhd="mhd"].mhd:has([data-mhd="spHeader"]){height:44px!important;min-height:44px!important;max-height:44px!important}';
    parent.appendChild(style);
    return true;
  }

  function hidePromoFrame(){
    installStyle();
    for(const node of document.querySelectorAll(SELECTOR)){
      if(!(node instanceof HTMLElement))continue;
      for(const [name,value] of ZERO_STYLES)node.style.setProperty(name,value,"important");
      node.dataset.genericYahooRealtimePromoV626="1";
      node.setAttribute("aria-hidden","true");
    }
    const spHeader=document.querySelector('[data-mhd="spHeader"].mhdSpHeader');
    if(!spHeader)return;
    for(const node of document.querySelectorAll(HEADER_SELECTOR)){
      if(!node||1!==node.nodeType)continue;
      for(const [name,value] of HEADER_STYLES)node.style.setProperty(name,value,"important");
      if(node.matches?.('[data-mhd="spHeader"].mhdSpHeader')&&!node.classList.contains("mhdSpHeader__noBanner"))node.classList.add("mhdSpHeader__noBanner");
      if(node.matches?.('[data-mhd="mhd"].mhd')&&!node.classList.contains("mhd__noBanner"))node.classList.add("mhd__noBanner");
    }
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      try{hidePromoFrame()}catch{}
    });
  }

  try{
    installStyle();
    hidePromoFrame();
    const observer=new MutationObserver(schedule);
    observer.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:["id","class","data-mhd"]});
    document.addEventListener("DOMContentLoaded",schedule,{once:true});
    window.addEventListener("pageshow",schedule);
    window.addEventListener("popstate",schedule);
  }catch{}
}();!function(){
  if(window.top!==window.self)return;
  if(!/(^|\.)buzzap\.jp$/i.test(location.hostname))return;

  const INSTANCE_KEY="__androidGenericBuzzapPagerV624";
  if(window[INSTANCE_KEY])return;
  window[INSTANCE_KEY]=true;

  const MAX_PAGES=30;
  const PRELOAD_PX=4200;
  const loadedUrls=new Set();
  const state={
    initialized:false,
    loading:false,
    paused:false,
    done:false,
    pages:1,
    nextUrl:null,
    retryCount:0,
    retryTimer:0
  };

  let target=null;
  let sentinel=null;
  let status=null;
  let observer=null;
  let watchdogId=0;
  let scheduledCheck=0;
  let bootAttempts=0;

  function normalizeUrl(value,base){
    try{
      const url=new URL(value,base||location.href);
      url.hash="";
      return url.href;
    }catch{
      return "";
    }
  }

  function nextFrom(doc,base){
    try{
      const anchor=
        doc.querySelector('link[rel~="next"][href]')||
        doc.querySelector('nav.posts-navigation .nav-previous a[href]');
      if(!anchor)return null;
      const next=new URL(anchor.getAttribute("href"),base);
      next.hash="";
      if(!/^https?:$/.test(next.protocol))return null;
      if(next.origin!==location.origin)return null;
      const normalized=normalizeUrl(next.href);
      return normalized&&normalized!==normalizeUrl(base)?normalized:null;
    }catch{
      return null;
    }
  }

  function installStyle(){
    if(document.getElementById("generic-buzzap-pager-style-v624"))return;
    const style=document.createElement("style");
    style.id="generic-buzzap-pager-style-v624";
    style.textContent=
      "#generic-buzzap-autopager-status-v624{position:fixed!important;z-index:2147483647!important;right:max(10px,env(safe-area-inset-right))!important;bottom:max(10px,env(safe-area-inset-bottom))!important;min-width:76px!important;max-width:170px!important;box-sizing:border-box!important;padding:7px 10px!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:999px!important;background:rgba(25,25,25,.62)!important;color:#fff!important;box-shadow:0 3px 14px rgba(0,0,0,.18)!important;font:600 11.5px/1.25 system-ui,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important;touch-action:manipulation!important}"+
      ".generic-buzzap-autopager-page-v624{display:block!important;position:relative!important;max-width:100%!important}"+
      ".generic-buzzap-autopager-divider-v624{box-sizing:border-box!important;width:100%!important;margin:28px 0 20px!important;padding:9px 12px!important;border-top:2px solid rgba(127,127,127,.45)!important;border-bottom:1px solid rgba(127,127,127,.25)!important;background:rgba(127,127,127,.08)!important;text-align:center!important;font:600 13px/1.4 system-ui,sans-serif!important;clear:both!important}";
    (document.head||document.documentElement).appendChild(style);
  }

  function setPhase(label,detail){
    const root=document.documentElement;
    if(root){
      root.dataset.genericBuzzapPagerV624=label;
      root.dataset.genericBuzzapPage=String(state.pages);
      root.dataset.genericBuzzapNext=state.nextUrl||"";
    }
    if(!status)return;
    status.textContent=label;
    status.title=detail||label;
    status.setAttribute("aria-label",detail||label);
    status.dataset.page=String(state.pages);
    status.dataset.phase=label;
  }

  function ensureStatus(){
    if(status&&status.isConnected)return status;
    installStyle();
    status=document.getElementById("generic-buzzap-autopager-status-v624");
    if(!status){
      status=document.createElement("button");
      status.id="generic-buzzap-autopager-status-v624";
      status.type="button";
      status.textContent="Buzzap 自動";
      document.body.appendChild(status);
      status.addEventListener("click",function(){
        if(state.done)return;
        if(state.retryTimer){
          clearTimeout(state.retryTimer);
          state.retryTimer=0;
          state.retryCount=0;
          setPhase("再試行","手動で再試行します");
          loadNext(true);
          return;
        }
        state.paused=!state.paused;
        setPhase(
          state.paused?"停止":"自動 "+state.pages+"/"+MAX_PAGES,
          state.paused?"タップすると再開します":"Buzzap専用自動読込"
        );
        if(!state.paused)scheduleCheck();
      });
    }
    return status;
  }

  function absolutize(root,base){
    for(const element of root.querySelectorAll("[href]")){
      const value=element.getAttribute("href");
      if(!value)continue;
      try{element.setAttribute("href",new URL(value,base).href)}catch{}
    }
    for(const element of root.querySelectorAll("[src]")){
      const value=element.getAttribute("src");
      if(!value)continue;
      try{element.setAttribute("src",new URL(value,base).href)}catch{}
    }
    for(const image of root.querySelectorAll("img")){
      const lazySource=
        image.getAttribute("data-lazy-src")||
        image.getAttribute("data-src");
      const currentSource=image.getAttribute("src")||"";
      if(lazySource&&(!currentSource||/^data:/i.test(currentSource))){
        try{image.setAttribute("src",new URL(lazySource,base).href)}catch{}
      }
      const lazySourceSet=
        image.getAttribute("data-lazy-srcset")||
        image.getAttribute("data-srcset");
      if(lazySourceSet&&!image.getAttribute("srcset")){
        image.setAttribute("srcset",lazySourceSet);
      }
      image.setAttribute("loading","lazy");
      image.setAttribute("decoding","async");
      image.setAttribute("fetchpriority","low");
    }
    for(const element of root.querySelectorAll("[srcset]")){
      const value=element.getAttribute("srcset");
      if(!value)continue;
      element.setAttribute(
        "srcset",
        value.split(",").map(function(candidate){
          const match=candidate.trim().match(/^(\S+)(\s+.+)?$/);
          if(!match)return candidate;
          try{
            return new URL(match[1],base).href+(match[2]||"");
          }catch{
            return candidate;
          }
        }).join(", ")
      );
    }
  }

  async function loadWithFetch(url){
    const fetchFunction=
      typeof window.fetch==="function"
        ?window.fetch.bind(window)
        :typeof fetch==="function"
          ?fetch
          :null;
    if(!fetchFunction)throw new Error("native fetch unavailable");

    const controller=
      typeof AbortController==="function"
        ?new AbortController()
        :null;
    const timeoutId=controller?setTimeout(function(){controller.abort()},25000):0;

    try{
      const response=await fetchFunction(url,{
        method:"GET",
        credentials:"include",
        redirect:"follow",
        headers:{Accept:"text/html,application/xhtml+xml"},
        signal:controller?controller.signal:undefined
      });
      if(!response.ok)throw new Error("fetch HTTP "+response.status);
      const contentType=response.headers&&response.headers.get
        ?response.headers.get("content-type")||""
        :"";
      if(contentType&&!/text\/html|application\/xhtml\+xml/i.test(contentType)){
        throw new Error("fetch returned non-HTML");
      }
      const text=await response.text();
      if(!text)throw new Error("fetch returned empty body");
      return {text:text,url:response.url||url,via:"fetch"};
    }finally{
      if(timeoutId)clearTimeout(timeoutId);
    }
  }

  function loadWithGm(url){
    const request=
      typeof GM_xmlhttpRequest==="function"
        ?GM_xmlhttpRequest
        :typeof GM==="object"&&GM&&typeof GM.xmlHttpRequest==="function"
          ?GM.xmlHttpRequest.bind(GM)
          :null;
    if(!request)return Promise.reject(new Error("GM request unavailable"));

    return new Promise(function(resolve,reject){
      let settled=false;
      const finish=function(callback,value){
        if(settled)return;
        settled=true;
        callback(value);
      };
      try{
        request({
          method:"GET",
          url:url,
          timeout:25000,
          responseType:"text",
          headers:{Accept:"text/html,application/xhtml+xml"},
          onload:function(response){
            const statusCode=Number(response&&response.status||0);
            const text=String(
              response&&(
                response.responseText!==undefined
                  ?response.responseText
                  :response.response!==undefined
                    ?response.response
                    :""
              )
            );
            if(statusCode<200||statusCode>=400){
              finish(reject,new Error("GM HTTP "+statusCode));
              return;
            }
            if(!text){
              finish(reject,new Error("GM returned empty body"));
              return;
            }
            finish(resolve,{
              text:text,
              url:response.finalUrl||response.responseURL||url,
              via:"gm"
            });
          },
          onerror:function(){
            finish(reject,new Error("GM network error"));
          },
          ontimeout:function(){
            finish(reject,new Error("GM timeout"));
          },
          onabort:function(){
            finish(reject,new Error("GM aborted"));
          }
        });
      }catch(error){
        finish(reject,error);
      }
    });
  }

  function loadWithFrame(url){
    return new Promise(function(resolve,reject){
      const frame=document.createElement("iframe");
      let settled=false;
      let timerId=0;

      const cleanup=function(){
        frame.onload=null;
        frame.onerror=null;
        frame.remove();
      };
      const fail=function(error){
        if(settled)return;
        settled=true;
        if(timerId)clearTimeout(timerId);
        cleanup();
        reject(error instanceof Error?error:new Error(String(error||"iframe failed")));
      };

      frame.setAttribute("aria-hidden","true");
      frame.tabIndex=-1;
      frame.style.cssText=
        "position:fixed!important;left:-10000px!important;top:0!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;border:0!important";
      frame.onload=function(){
        if(settled)return;
        try{
          const frameDocument=frame.contentDocument;
          if(!frameDocument||!frameDocument.documentElement||!frameDocument.querySelector("#primary")){
            fail(new Error("iframe body unavailable"));
            return;
          }
          const html="<!doctype html>"+frameDocument.documentElement.outerHTML;
          const finalUrl=
            frame.contentWindow&&frame.contentWindow.location
              ?frame.contentWindow.location.href
              :url;
          settled=true;
          if(timerId)clearTimeout(timerId);
          cleanup();
          resolve({text:html,url:finalUrl,via:"iframe"});
        }catch(error){
          fail(error);
        }
      };
      frame.onerror=function(){
        fail(new Error("iframe load error"));
      };
      timerId=setTimeout(function(){
        fail(new Error("iframe timeout"));
      },25000);
      frame.src=url;
      (document.body||document.documentElement).appendChild(frame);
    });
  }

  async function requestPage(url){
    const errors=[];
    for(const loader of [loadWithFetch,loadWithGm,loadWithFrame]){
      try{
        return await loader(url);
      }catch(error){
        errors.push(error instanceof Error?error.message:String(error));
      }
    }
    throw new Error(errors.join(" / ")||"next page request failed");
  }

  function buildSection(pageDocument,sourceUrl,pageNumber){
    const sourceRoot=pageDocument.querySelector("#primary");
    if(!sourceRoot)throw new Error("next page #primary missing");

    const imported=document.importNode(sourceRoot,true);
    for(const element of imported.querySelectorAll(
      "nav.posts-navigation,script,noscript,template,style,#generic-autopager-sentinel"
    )){
      element.remove();
    }
    if(!imported.querySelector("article")){
      throw new Error("next page articles missing");
    }
    absolutize(imported,sourceUrl);

    const section=document.createElement("section");
    section.className="generic-buzzap-autopager-page-v624";
    section.dataset.page=String(pageNumber);
    section.dataset.sourceUrl=sourceUrl;

    const divider=document.createElement("div");
    divider.className="generic-buzzap-autopager-divider-v624";
    const link=document.createElement("a");
    link.href=sourceUrl;
    link.rel="nofollow";
    link.textContent="ページ "+pageNumber;
    divider.appendChild(link);
    section.appendChild(divider);

    while(imported.firstChild){
      section.appendChild(imported.firstChild);
    }
    return section;
  }

  function hideOriginalNavigation(){
    if(!target)return;
    for(const navigation of target.querySelectorAll("nav.posts-navigation")){
      navigation.dataset.genericAutopagerHidden="true";
      navigation.setAttribute("aria-hidden","true");
      navigation.style.setProperty("display","none","important");
    }
  }

  function markDone(detail){
    state.done=true;
    state.nextUrl=null;
    if(observer)observer.disconnect();
    if(watchdogId){
      clearInterval(watchdogId);
      watchdogId=0;
    }
    if(state.retryTimer){
      clearTimeout(state.retryTimer);
      state.retryTimer=0;
    }
    setPhase("完了",detail||"最終ページです");
  }

  function scheduleRetry(error){
    state.retryCount+=1;
    let delay=0;
    let label="";
    if(state.retryCount<=5){
      delay=Math.min(8000,800*Math.pow(2,state.retryCount-1));
      label="再試行 "+state.retryCount+"/5";
    }else{
      state.retryCount=0;
      delay=30000;
      label="通信待ち";
    }
    const detail=error instanceof Error?error.message:String(error);
    setPhase(label,detail);
    if(status)status.dataset.lastError=detail;
    if(state.retryTimer)clearTimeout(state.retryTimer);
    state.retryTimer=setTimeout(function(){
      state.retryTimer=0;
      if(!state.paused&&!state.done)loadNext(true);
    },delay);
  }

  async function loadNext(force){
    if(state.loading||state.paused||state.done||!state.nextUrl)return;
    if(state.retryTimer&&!force)return;
    if(state.pages>=MAX_PAGES){
      markDone("上限 "+MAX_PAGES+" ページ");
      return;
    }

    const requestedUrl=normalizeUrl(state.nextUrl);
    if(!requestedUrl||loadedUrls.has(requestedUrl)){
      markDone("同じページを検出しました");
      return;
    }

    state.loading=true;
    setPhase("読込 "+(state.pages+1),"次ページを取得しています");

    try{
      const result=await requestPage(requestedUrl);
      const finalUrl=normalizeUrl(result.url||requestedUrl);
      if(!finalUrl||loadedUrls.has(finalUrl)){
        markDone("同じページを検出しました");
        return;
      }

      const pageDocument=new DOMParser().parseFromString(result.text,"text/html");
      const nextPageNumber=state.pages+1;
      const section=buildSection(pageDocument,finalUrl,nextPageNumber);
      const followingUrl=nextFrom(pageDocument,finalUrl);

      target.insertBefore(section,sentinel);
      loadedUrls.add(requestedUrl);
      loadedUrls.add(finalUrl);
      state.pages=nextPageNumber;
      state.nextUrl=followingUrl;
      state.retryCount=0;
      if(state.retryTimer){
        clearTimeout(state.retryTimer);
        state.retryTimer=0;
      }

      hideOriginalNavigation();
      if(status){
        status.dataset.transport=result.via;
        status.dataset.lastError="";
      }
      try{
        document.dispatchEvent(new CustomEvent("GenericAutoPagerLoaded",{
          detail:{
            page:state.pages,
            url:finalUrl,
            container:section,
            source:result.via
          }
        }));
      }catch{}

      if(state.nextUrl){
        setPhase("自動 "+state.pages+"/"+MAX_PAGES,result.via);
        setTimeout(scheduleCheck,300);
      }else{
        markDone("最終ページです");
      }
    }catch(error){
      console.warn("[Buzzap AutoPager]",error);
      scheduleRetry(error);
    }finally{
      state.loading=false;
    }
  }

  function checkDistance(){
    if(
      document.hidden||
      state.loading||
      state.paused||
      state.done||
      state.retryTimer||
      !sentinel||
      !sentinel.isConnected
    )return;
    const viewportHeight=
      window.visualViewport&&window.visualViewport.height
        ?window.visualViewport.height
        :window.innerHeight;
    if(sentinel.getBoundingClientRect().top<=viewportHeight+PRELOAD_PX){
      loadNext(false);
    }
  }

  function scheduleCheck(){
    if(scheduledCheck)return;
    const run=function(){
      scheduledCheck=0;
      checkDistance();
    };
    if(typeof window.requestAnimationFrame==="function"){
      scheduledCheck=window.requestAnimationFrame(run);
    }else{
      scheduledCheck=window.setTimeout(run,0);
    }
  }

  function initialize(){
    if(state.initialized)return true;
    if(document.readyState==="loading"||!document.body)return false;

    const foundTarget=document.getElementById("primary");
    if(!foundTarget)return false;

    const foundNext=nextFrom(document,location.href);
    state.initialized=true;
    target=foundTarget;
    ensureStatus();

    if(!foundNext){
      markDone("次ページリンクがありません");
      return true;
    }

    state.nextUrl=foundNext;
    loadedUrls.add(normalizeUrl(location.href));
    sentinel=document.createElement("div");
    sentinel.id="generic-autopager-sentinel";
    sentinel.setAttribute("aria-hidden","true");
    sentinel.style.cssText=
      "height:1px;width:100%;pointer-events:none;clear:both;";
    target.appendChild(sentinel);
    setPhase("自動 1/"+MAX_PAGES,"Buzzap専用 v6.24");

    if(typeof window.IntersectionObserver==="function"){
      observer=new window.IntersectionObserver(function(entries){
        if(entries.some(function(entry){return entry.isIntersecting})){
          scheduleCheck();
        }
      },{
        root:null,
        rootMargin:PRELOAD_PX+"px 0px",
        threshold:0
      });
      observer.observe(sentinel);
    }

    window.addEventListener("scroll",scheduleCheck,{passive:true});
    document.addEventListener("scroll",scheduleCheck,{passive:true,capture:true});
    window.addEventListener("resize",scheduleCheck,{passive:true});
    window.addEventListener("pageshow",scheduleCheck,{passive:true});
    window.addEventListener("online",scheduleCheck,{passive:true});
    document.addEventListener("visibilitychange",function(){
      if(!document.hidden)scheduleCheck();
    });
    if(window.visualViewport){
      window.visualViewport.addEventListener("scroll",scheduleCheck,{passive:true});
      window.visualViewport.addEventListener("resize",scheduleCheck,{passive:true});
    }

    watchdogId=window.setInterval(scheduleCheck,600);
    window.setTimeout(function(){loadNext(true)},450);
    scheduleCheck();
    return true;
  }

  function boot(){
    if(state.initialized)return;
    if(initialize())return;
    bootAttempts+=1;
    if(bootAttempts<300){
      window.setTimeout(boot,100);
      return;
    }
    if(document.body){
      ensureStatus();
      setPhase("待機","Buzzap本文の準備を確認できません");
    }
  }

  document.addEventListener("DOMContentLoaded",boot,{once:true});
  boot();
}();!function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;if("/"!==location.pathname&&!/^\/categories(?:\/|$)/i.test(location.pathname))return;const t=document.documentElement;if(!t)return;t.dataset.genericYahooCompactLeadV45="1",document.getElementById("generic-yahoo-compact-lead-style-v45")?.remove();for(const t of document.querySelectorAll(".generic-yahoo-compact-lead-v45,.generic-yahoo-compact-lead-image-v45"))t.classList.remove("generic-yahoo-compact-lead-v45","generic-yahoo-compact-lead-image-v45")}();!function(){
  if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)||"/"!==location.pathname)return;
  const t="generic-yahoo-major-instant-hide-v619",
    v="data-generic-yahoo-prepaint-v619",
    g="generic-yahoo-prepaint-style-v619",
    w="generic-yahoo-initial-ready-v619",
    x="data-generic-yahoo-feed-ready-v619",
    e='[data-cl-params*="_cl_vmodule:cmt_tl"]',
    n='[data-cl-params*="_cl_vmodule:live_ch"]',
    o='[data-cl-params*="_cl_vmodule:to_video"]',
    p='[data-cl-params*="_cl_vmodule:tpc_maj"]',
    u="#newsFeed,#ualmods-newsfeed-major,#uamods-newsfeed-major,#uamods-topics,"+p,
    z=':is('+u+'):is(a[href],:has(a[href]))',
    h="genericYahooMajorInstantHideV619",
    d=[["display","none"],["height","0"],["min-height","0"],["max-height","0"],["margin","0"],["padding","0"],["border","0"],["overflow","hidden"]];
  let y=!1,E=!1,m=0,q=0,M=null;
  const f=()=>{
    if(y)return;
    y=!0;
    clearTimeout(m);
    clearTimeout(q);
    M?.disconnect();
    M=null;
    try{
      document.documentElement?.removeAttribute(v);
      document.documentElement?.removeAttribute(x);
      document.getElementById(g)?.remove();
    }catch{}
  },k=()=>{
    if(y)return!1;
    const r=document.documentElement;
    if(!r)return!1;
    if(!document.getElementById(g)){
      const t=document.createElement("style");
      t.id=g;
      t.textContent='html['+v+'="1"] #contentsWrap,html['+v+'="1"] #tab-panel-major,html['+v+'="1"] body>main,html['+v+'="1"] [role="main"]{visibility:hidden!important;pointer-events:none!important;transition:none!important}html['+v+'="1"] '+z+'{visibility:visible!important;pointer-events:auto!important;transition:none!important}html['+v+'="1"]['+x+'="1"] :is('+u+'){visibility:visible!important;pointer-events:auto!important;transition:none!important}';
      (document.head||r).appendChild(t);
    }
    r.setAttribute(v,"1");
    return!0;
  },j=r=>{
    if(y||E||!(r instanceof Element))return E;
    let t=!1;
    try{t=r.matches(z)||!!r.closest(z)||!!r.querySelector(z)}catch{}
    if(!t)return!1;
    E=!0;
    document.documentElement?.setAttribute(x,"1");
    return!0;
  },i=()=>{
    if(document.getElementById(t))return!0;
    const r=document.head||document.documentElement;
    if(!r)return!1;
    const s=document.createElement("style");
    s.id=t;
    s.textContent='#contentsWrap>:is(div,section):not(#newsFeed):not(#ualmods-newsfeed-major):not(#uamods-newsfeed-major):not(#uamods-topics):not('+p+'):not(:has('+u+')):has('+e+','+n+'),#tab-panel-major>:is(div,section):not(#newsFeed):not(#ualmods-newsfeed-major):not(#uamods-newsfeed-major):not(#uamods-topics):not('+p+'):not(:has('+u+')):has('+e+','+o+'){display:none!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}';
    r.appendChild(s);
    return!0;
  },l=t=>{
    if("1"!==t.dataset[h])return;
    for(const[e]of d)t.style.removeProperty(e);
    delete t.dataset[h];
    t.removeAttribute("aria-hidden");
  },a=r=>{
    if(!(r instanceof Element))return;
    for(const p of[r,...r.querySelectorAll(e+','+n+','+o+','+u)]){
      const t=p.closest("#contentsWrap,#tab-panel-major");
      if(!t)continue;
      let i=p;
      for(;i.parentElement&&i.parentElement!==t;)i=i.parentElement;
      if(i.parentElement!==t)continue;
      const s=i.matches(u)||i.querySelector(u);
      if(s){l(i);continue}
      const c="contentsWrap"===t.id&&(i.matches(e+','+n)||i.querySelector(e+','+n))||"tab-panel-major"===t.id&&(i.matches(e+','+o)||i.querySelector(e+','+o));
      if(!c){l(i);continue}
      for(const[t,e]of d)i.style.setProperty(t,e,"important");
      i.dataset[h]="1";
      i.setAttribute("aria-hidden","true");
    }
  },b=()=>{
    if(y)return;
    try{i();a(document.documentElement)}finally{f()}
  },c=()=>{y||(q=setTimeout(b,650))};
  m=setTimeout(b,5e3);
  try{
    k();
    i();
    a(document.documentElement);
    j(document.documentElement);
    M=new MutationObserver(r=>{
      try{
        for(const t of r){
          if("attributes"===t.type){
            a(t.target);
            j(t.target);
          }else for(const e of t.addedNodes){
            a(e);
            j(e);
          }
        }
      }catch{f()}
    });
    M.observe(document,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["data-cl-params"]});
    document.addEventListener(w,b,{once:!0});
    "loading"===document.readyState?document.addEventListener("DOMContentLoaded",c,{once:!0}):queueMicrotask(c);
    window.addEventListener("pagehide",f,{once:!0});
  }catch{f()}
}();!function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t="generic-yahoo-inf-top-style-v616",e="genericYahooInfTopV616",n=[["display","none"],["height","0"],["min-height","0"],["max-height","0"],["margin","0"],["padding","0"],["border","0"],["overflow","hidden"]];let o=!1;const r=()=>{if(document.getElementById(t))return!0;const e=document.head||document.documentElement;if(!e)return!1;const n=document.createElement("style");return n.id=t,n.textContent="#inf_top{display:none!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}",e.appendChild(n),!0},i=()=>{r();for(const t of document.querySelectorAll("#inf_top")){if(!(t instanceof HTMLElement))continue;for(const[e,o]of n)t.style.setProperty(e,o,"important");t.dataset[e]="1",t.setAttribute("aria-hidden","true")}},a=()=>{if(o)return;o=!0,queueMicrotask(()=>{o=!1;try{i()}catch{}})};try{r(),i();const t=new MutationObserver(a);t.observe(document,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["id"]}),document.addEventListener("DOMContentLoaded",a,{once:!0}),window.addEventListener("popstate",a),window.addEventListener("hashchange",a)}catch{}}();/* generic-yahoo-home-ua-v631 */(function yahooHomeUaV631Runtime() {
  if (window.top !== window.self) return;
  if (!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)) return;
  if (location.pathname !== "/" && !/^\/categories(?:\/|$)/i.test(location.pathname)) {
    return;
  }

  const nativeUa = String(navigator.userAgent || "");
  const chromeVersion = nativeUa.match(/Chrome\/([\d.]+)/i)?.[1] || "";
  const chromeMajor = Number.parseInt(chromeVersion, 10);
  const ua =
    /Android/i.test(nativeUa) && Number.isFinite(chromeMajor) && chromeMajor >= 151
      ? `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`
      : "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.173 Mobile Safari/537.36";

  function apply(targetUa, realm = window) {
    const targetNavigator = realm.navigator;
    const prototype = realm.Navigator?.prototype || Object.getPrototypeOf(targetNavigator);
    const define = (target, key, getter) => {
      if (!target) return false;
      try {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: true,
          get: getter,
        });
        return true;
      } catch {
        return false;
      }
    };
    define(prototype, "userAgent", () => targetUa) ||
      define(targetNavigator, "userAgent", () => targetUa);
    define(prototype, "appVersion", () => targetUa.replace(/^Mozilla\//, "")) ||
      define(targetNavigator, "appVersion", () => targetUa.replace(/^Mozilla\//, ""));
    define(prototype, "vendor", () => "Google Inc.") ||
      define(targetNavigator, "vendor", () => "Google Inc.");
    define(prototype, "platform", () => "Linux armv8l") ||
      define(targetNavigator, "platform", () => "Linux armv8l");
    define(prototype, "userAgentData", () => undefined) ||
      define(targetNavigator, "userAgentData", () => undefined);
  }

  try {
    apply(ua);
  } catch {}
  try {
    if (typeof unsafeWindow === "object" && unsafeWindow && unsafeWindow !== window) {
      apply(ua, unsafeWindow);
    }
  } catch {}
  try {
    const inject = () => {
      try {
        const script = document.createElement("script");
        const parent = document.documentElement || document.head;
        if (!parent) return false;
        script.id = "generic-yahoo-home-chrome-ua-v631";
        script.textContent = `;(${apply.toString()})(${JSON.stringify(ua)});`;
        parent.appendChild(script);
        script.remove();
        return true;
      } catch {
        return false;
      }
    };
    if (!inject()) {
      const retry = () => {
        if (inject()) document.removeEventListener("readystatechange", retry);
      };
      document.addEventListener("readystatechange", retry);
      window.setTimeout(retry, 0);
    }
  } catch {}
})();function e(){const t={preloadPx:1400,maxPages:30,updateAddressBar:!1,showStatus:!0,googleUseRenderedFrame:!0,googleFrameTimeoutMs:12e3,googleRemoveImageSectionsAfterFirstPage:!0,googleRemovePeopleAlsoSearchAfterFirstPage:!0,googleFixBrokenMultiImageRichResults:!0,googleForceJapaneseUi:!0,googleRestoreYouTubeOriginalTitles:!0,excludedHosts:[/(^|\.)buzzap\.jp$/i,/(^|\.)youtube\.com$/i,/(^|\.)x\.com$/i,/(^|\.)twitter\.com$/i,/(^|\.)instagram\.com$/i,/(^|\.)facebook\.com$/i,/(^|\.)tiktok\.com$/i,/^mail\.google\.com$/i,/^docs\.google\.com$/i,/^drive\.google\.com$/i],siteRules:[{host:/(^|\.)buzzap\.jp$/i,content:"#primary",next:"link[rel~=next][href],nav.posts-navigation .nav-previous a[href]",remove:"nav.posts-navigation"}]};if(window.top!==window.self)return;if(!/^https?:$/.test(location.protocol))return;if(!document.body)return;if(t.excludedHosts.some(t=>t.test(location.hostname)))return;let e=null;const n=[".generic-yahoo-comments-tab-hidden-v61",".generic-yahoo-thread-block-hidden-v27",".generic-yahoo-comment-topics-hidden-v37",".generic-yahoo-top-promo-hidden-v38",".generic-yahoo-aux-row-hidden-v35",".generic-yahoo-joint-project-hidden-v46",".generic-yahoo-trending-words-hidden-v47",".generic-yahoo-feature-promo-hidden-v47",".generic-yahoo-prerecommend-promo-hidden-v56",".generic-yahoo-pre-subnav-slot-hidden-v57",".generic-yahoo-economy-pre-subnav-hidden-v58",".generic-yahoo-empty-wrapper-hidden-v44"].join(",");document.querySelectorAll("#generic-autopager-status").forEach(t=>{"停止"===st(t.textContent)&&(t.textContent="",t.setAttribute("aria-hidden","true"),t.style.setProperty("display","none","important"))});const o=location.hostname;if(/(^|\.)news\.yahoo\.co\.jp$/i.test(o)&&(function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideYahooCommentsTabV61)return;document.documentElement.dataset.genericYahooHideYahooCommentsTabV61="1";const e="generic-yahoo-comments-tab-hidden-v61",n="generic-yahoo-comments-tab-style-v61";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n          width: 0 !important;\n          min-width: 0 !important;\n          max-width: 0 !important;\n          margin: 0 !important;\n          padding: 0 !important;\n          border: 0 !important;\n          overflow: hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),r=t=>{if(!(t instanceof HTMLElement))return;const n=t.closest('a[href],button,[role="tab"]')||t;let r=n.closest("li")||n;if(r===n&&n.parentElement instanceof HTMLElement){const t=n.parentElement,e=q(t);"ヤフコメ"===o(H(t))&&e.width>35&&e.width<Math.max(220,.35*window.innerWidth)&&e.height>24&&e.height<110&&(r=t)}r===document.body||r===document.documentElement||/^(HTML|BODY|MAIN|NAV)$/i.test(r.tagName)||(r.classList.add(e),r.setAttribute("aria-hidden","true"),r.dataset.genericYahooCommentsTabV61="1")};F(e=>{if(t())for(const t of L(e,'a[href],button,[role="tab"],li,span,div')){if(!(t instanceof HTMLElement))continue;if(k(t))continue;const e=H(t);if(e.length>20)continue;if("ヤフコメ"!==o(e))continue;const n=q(t);n.top>260||n.height<20||n.height>110||r(t)}},[0,250,900,1800],{incremental:!0,interest:/ヤフコメ/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideEveryoneThreadsV27)return;document.documentElement.dataset.genericYahooHideEveryoneThreadsV27="1";const e="generic-yahoo-everyone-threads-hidden",n="generic-yahoo-thread-block-hidden-v27",o="generic-yahoo-everyone-threads-style-v27";for(const l of document.querySelectorAll(`.${e}`))l.classList.remove(e),l.removeAttribute("aria-hidden"),l.style.removeProperty("display"),l.style.removeProperty("visibility"),l.style.removeProperty("max-height"),l.style.removeProperty("min-height"),l.style.removeProperty("height"),l.style.removeProperty("margin"),l.style.removeProperty("padding"),l.style.removeProperty("border"),l.style.removeProperty("overflow");if(document.getElementById("generic-yahoo-everyone-threads-style-v25")?.remove(),!document.getElementById(o)){const t=document.createElement("style");t.id=o,t.textContent=`\n        .${n} {\n          display: none !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const r=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),i=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.height,t.scrollHeight||0),o=Math.max(e.width,t.scrollWidth||0);return n<120||o<200||n>Math.max(1100,1.15*window.innerHeight)||t.querySelectorAll("a[href]").length>28||t.querySelectorAll("*").length>260},a=t=>{let e=0;return/みんなのスレッド(?:（β版）|\(β版\))?/.test(t)&&(e+=3),/今日のお題/.test(t)&&(e+=1),/みんなの投稿/.test(t)&&(e+=1),/スレッド一覧を見る/.test(t)&&(e+=2),/ニュースのこと、身近な疑問/.test(t)&&(e+=1),e>=5},s=t=>/ヤフコメで話題|Yahoo!?ニュースライブ|あなたにおすすめ/.test(t),c=t=>{const e=[];let n=t;for(let o=0;n&&o<7;o+=1,n=n.parentElement){if(!(n instanceof HTMLElement))continue;if(i(n))continue;const t=r(H(n,!0));if(!t||t.length>3500)continue;if(!a(t))continue;if(s(t))continue;const o=q(n),c=Math.max(1,o.width)*Math.max(1,o.height);e.push({node:n,area:c,textLength:t.length})}return e.sort((t,e)=>t.area-e.area||t.textLength-e.textLength),e[0]?.node||null};F(e=>{if(t())for(const t of(t=>{const e=[];for(const n of L(t,'h1,h2,h3,h4,h5,h6,[role="heading"],div,span,p')){if(k(n))continue;const t=H(n);t.length>60||/^みんなのスレッド(?:（β版）|\(β版\))?$/.test(r(t))&&e.push(n)}return e})(e)){const e=c(t);e&&!e.classList.contains(n)&&(e.classList.add(n),e.setAttribute("aria-hidden","true"),e.dataset.genericYahooThreadBlockV40="1")}},[350,1200,3e3],{incremental:!0,interest:/みんなのスレッド/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideCommentTopicsV37)return;document.documentElement.dataset.genericYahooHideCommentTopicsV37="1";const e="generic-yahoo-comment-topics-hidden-v37",n="generic-yahoo-comment-topics-style-v37";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<220||o<150||o>Math.max(2800,2.5*window.innerHeight)||t.querySelectorAll("*").length>320},i=t=>{let e=0;return/ヤフコメで話題/.test(t)&&(e+=3),/急上昇ワード/.test(t)&&(e+=2),/おすすめのヤフコメを見る/.test(t)&&(e+=1),/(?:^|\D)1(?:\D|$)/.test(t)&&/(?:^|\D)2(?:\D|$)/.test(t)&&/(?:^|\D)3(?:\D|$)/.test(t)&&(e+=1),e>=3},a=t=>/Yahoo!?ニュースライブ|みんなのスレッド|フォロー中のヤフコメを見る/.test(t),s=t=>{const e=[];let n=t;for(let s=0;n&&s<8;s+=1,n=n.parentElement){if(!(n instanceof HTMLElement)||r(n))continue;const t=o(H(n,!0));if(!t||t.length>5e3)continue;if(!i(t))continue;if(a(t))continue;const s=q(n),c=Math.max(1,s.width)*Math.max(1,s.height);e.push({node:n,score:c+t.length})}return e.sort((t,e)=>t.score-e.score),e[0]?.node||null};F(n=>{if(t())for(const t of(t=>{const e=[];for(const n of L(t,'a,button,[role="link"],h1,h2,h3,h4,h5,h6,div,span,p')){if(!(n instanceof HTMLElement))continue;if(k(n))continue;const t=H(n);t.length>80||"ヤフコメで話題"===o(t)&&e.push(n)}return e})(n)){const n=s(t);n&&!n.classList.contains(e)&&(n.classList.add(e),n.setAttribute("aria-hidden","true"),n.dataset.genericYahooCommentTopicsV40="1")}},[260,900,2200],{incremental:!0,interest:/ヤフコメで話題/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideTopPromoV38)return;document.documentElement.dataset.genericYahooHideTopPromoV38="1";const e="generic-yahoo-top-promo-hidden-v38",n="generic-yahoo-top-promo-style-v38";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`.${e}{display:none!important;}`,(document.head||document.documentElement).appendChild(t)}const o=t=>{const e=String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[›»＞>→]+$/g,"").trim();if(!e||e.length>180)return!1;const n=/LINE(?:ニュース|NEWS|スタンプ)/i.test(e),o=/無料|コラボ|もらえる|キャンペーン|スタンプ/.test(e);return n&&o},r=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE|SECTION)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<220||o<36||o>190||t.querySelectorAll("a[href]").length>4||t.querySelectorAll("*").length>70},i=t=>{const e=[];let n=t.closest('a[href],button,[role="link"]')||t;for(let i=0;n&&i<6;i+=1,n=n.parentElement){if(!(n instanceof HTMLElement)||r(n))continue;const t=H(n,!0);if(!o(t))continue;if(/ヤフコメで話題|主要ニュース|あなたにおすすめ/.test(t))continue;const i=q(n),a=Math.max(1,i.width)*Math.max(1,i.height);e.push({node:n,score:a})}return e.sort((t,e)=>t.score-e.score),e[0]?.node||null};F(n=>{if(!t())return;for(const t of L(n,'a,button,[role="link"],div,span,p')){if(!(t instanceof HTMLElement))continue;if(k(t))continue;const n=H(t);if(n.length>180||!o(n))continue;const r=i(t);r&&!r.classList.contains(e)&&(r.classList.add(e),r.setAttribute("aria-hidden","true"),r.dataset.genericYahooTopPromoV40="1")}},[200,700,1800],{incremental:!0,interest:/LINE/i})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideAuxRowsV35)return;document.documentElement.dataset.genericYahooHideAuxRowsV35="1";const e="generic-yahoo-aux-row-hidden-v35",n="generic-yahoo-aux-row-style-v35";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=[{key:"follow-comments",exact:/^フォロー中のヤフコメを見る$/},{key:"recommended-comments",exact:/^おすすめのヤフコメを見る$/},{key:"news-live",exact:/^Yahoo!?ニュースライブ$/i},{key:"news-tieup",exact:/^Yahoo!?ニュース ?タイアップ$/i}],i=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE|SECTION)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<180||o<32||o>190||t.querySelectorAll("a[href]").length>3||t.querySelectorAll("*").length>55},a=t=>/あなたにおすすめ|ヤフコメで話題|みんなのスレッド|主要ニュース|記事一覧/.test(t),s=(t,e)=>{const n=[];let r=t.closest('a[href],button,[role="link"]')||t;for(let s=0;r&&s<5;s+=1,r=r.parentElement){if(!(r instanceof HTMLElement)||i(r))continue;const s=o(H(r,!0));if(!e.exact.test(s)&&!s.startsWith(o(H(t))))continue;if(s.length>110||a(s))continue;if("news-live"===e.key&&!/^Yahoo!?ニュースライブ/.test(s))continue;if("news-tieup"===e.key&&!/^Yahoo!?ニュース?タイアップ/.test(s))continue;if("follow-comments"===e.key&&!/^フォロー中のヤフコメを見る$/.test(s))continue;if("recommended-comments"===e.key&&!/^おすすめのヤフコメを見る$/.test(s))continue;const c=q(r),l=Math.max(1,c.width)*Math.max(1,c.height),u=r.matches('a[href],button,[role="link"]')?-1e5:0;n.push({node:r,score:l+u})}return n.sort((t,e)=>t.score-e.score),n[0]?.node||null},c=(t,e)=>{const n=[];for(const r of L(e,'a,button,[role="link"],h1,h2,h3,h4,h5,h6,div,span,p')){if(!(r instanceof HTMLElement))continue;if(k(r))continue;const e=H(r);e.length>90||t.exact.test(o(e))&&n.push(r)}return n};F(n=>{if(t())for(const t of r)for(const o of c(t,n)){const n=s(o,t);n&&!n.classList.contains(e)&&(n.classList.add(e),n.setAttribute("aria-hidden","true"),n.dataset.genericYahooAuxRowV40=t.key)}},[250,900,2200],{incremental:!0,interest:/フォロー中のヤフコメを見る|おすすめのヤフコメを見る|Yahoo!?ニュース\s*(?:ライブ|タイアップ)/i})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideJointProjectV46)return;document.documentElement.dataset.genericYahooHideJointProjectV46="1";const e="generic-yahoo-joint-project-hidden-v46",n="generic-yahoo-joint-project-style-v46";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s 　]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=t=>{const e=o(t);if(!e||e.length>180)return!1;const n=/(?:\[|【)?共同.*?企画(?:\]|】)?/.test(e),r=/#|問い直す|普通|もっとみる|もっと見る/.test(e);return n&&r},i=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE|SECTION)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<200||o<32||o>160||t.querySelectorAll("a[href]").length>4||t.querySelectorAll("*").length>80},a=t=>{const e=[];let n=t.closest('a[href],button,[role="link"]')||t;for(let a=0;n&&a<6;a+=1,n=n.parentElement){if(!(n instanceof HTMLElement)||i(n))continue;const t=o(H(n,!0));if(!r(t))continue;if(/あなたにおすすめ|ヤフコメで話題|みんなのスレッド|主要ニュース|記事一覧/.test(t))continue;const a=q(n),s=Math.max(1,a.width)*Math.max(1,a.height),c=n.matches('a[href],button,[role="link"]')?-1e5:0;e.push({node:n,score:s+c})}return e.sort((t,e)=>t.score-e.score),e[0]?.node||null};F(n=>{if(!t())return;for(const t of L(n,'a,button,[role="link"],div,span,p')){if(!(t instanceof HTMLElement))continue;if(k(t))continue;const n=H(t);if(n.length>180||!r(n))continue;const o=a(t);o&&!o.classList.contains(e)&&(o.classList.add(e),o.setAttribute("aria-hidden","true"),o.dataset.genericYahooJointProjectV46="1")}},[250,900,2200],{incremental:!0,interest:/共同.*企画/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideTrendingWordsV47)return;document.documentElement.dataset.genericYahooHideTrendingWordsV47="1";const e="generic-yahoo-trending-words-hidden-v47",n="generic-yahoo-trending-words-style-v47";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`.${e}{display:none!important;}`,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s 　]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=t=>{const e=o(t);return!(!e||e.length>90)&&/^ウェブ検索の急上昇ワード(?:もっとみる|もっと見る)?$/i.test(e)},i=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE|SECTION)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<220||o<28||o>120||t.querySelectorAll("*").length>50},a=t=>{const e=[];let n=t.closest('a[href],button,[role="link"]')||t;for(let a=0;n&&a<6;a+=1,n=n.parentElement){if(!(n instanceof HTMLElement)||i(n))continue;const t=o(H(n,!0));if(!r(t))continue;const a=q(n),s=Math.max(1,a.width)*Math.max(1,a.height);e.push({node:n,score:s})}return e.sort((t,e)=>t.score-e.score),e[0]?.node||null};F(n=>{if(t())for(const t of L(n,'a,button,[role="link"],div,span,p')){if(!(t instanceof HTMLElement))continue;if(k(t))continue;const n=H(t);if(n.length>90||!r(n))continue;const o=a(t);o&&!o.classList.contains(e)&&(o.classList.add(e),o.setAttribute("aria-hidden","true"),o.dataset.genericYahooTrendingWordsV47="1")}},[200,700,1800],{incremental:!0,interest:/ウェブ検索の急上昇ワード/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHideFeaturePromoV47)return;document.documentElement.dataset.genericYahooHideFeaturePromoV47="1";const e="generic-yahoo-feature-promo-hidden-v47",n="generic-yahoo-feature-promo-style-v47";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`.${e}{display:none!important;}`,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s 　]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=t=>{const e=o(t);if(!e||e.length>160)return!1;const n=/特集/.test(e),r=/もっとみる|もっと見る|チェック|探そう|今週末行ける|エリア|日程/.test(e);return n&&r},i=t=>{if(!(t instanceof HTMLElement))return!0;if(t===document.documentElement||t===document.body)return!0;if(/^(HTML|BODY|MAIN|ARTICLE|SECTION)$/i.test(t.tagName))return!0;if(t.matches('[role="main"],#root,#app,#content,#main'))return!0;const e=q(t),n=Math.max(e.width,t.scrollWidth||0),o=Math.max(e.height,t.scrollHeight||0);return n<220||o<36||o>150||t.querySelectorAll("a[href]").length>4||t.querySelectorAll("*").length>70},a=t=>{const e=[];let n=t.closest('a[href],button,[role="link"]')||t;for(let a=0;n&&a<6;a+=1,n=n.parentElement){if(!(n instanceof HTMLElement)||i(n))continue;const t=o(H(n,!0));if(!r(t))continue;if(/あなたにおすすめ|ヤフコメで話題|みんなのスレッド|主要ニュース|記事一覧/.test(t))continue;const a=q(n),s=Math.max(1,a.width)*Math.max(1,a.height),c=n.matches('a[href],button,[role="link"]')?-1e5:0;e.push({node:n,score:s+c})}return e.sort((t,e)=>t.score-e.score),e[0]?.node||null};F(n=>{if(t())for(const t of L(n,'a,button,[role="link"],div,span,p')){if(!(t instanceof HTMLElement))continue;if(k(t))continue;const n=H(t);if(n.length>160||!r(n))continue;const o=a(t);o&&!o.classList.contains(e)&&(o.classList.add(e),o.setAttribute("aria-hidden","true"),o.dataset.genericYahooFeaturePromoV47="1")}},[250,900,2200],{incremental:!0,interest:/特集/})}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooHidePreRecommendPromoV56)return;document.documentElement.dataset.genericYahooHidePreRecommendPromoV56="1";const e="generic-yahoo-prerecommend-promo-hidden-v56",n="generic-yahoo-prerecommend-promo-style-v56";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n          height: 0 !important;\n          min-height: 0 !important;\n          max-height: 0 !important;\n          margin: 0 !important;\n          padding: 0 !important;\n          border: 0 !important;\n          overflow: hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),r=t=>{if(!(t instanceof HTMLElement))return!1;const e=P(t);if("none"===e.display||"hidden"===e.visibility)return!1;const n=q(t);return n.width>40&&n.height>2},i=t=>{t instanceof HTMLElement&&(t.classList.contains(e)||t!==document.documentElement&&t!==document.body&&(t.classList.add(e),t.setAttribute("aria-hidden","true"),t.dataset.genericYahooPreRecommendPromoV56="1"))},a=t=>{if(!(t instanceof HTMLElement&&r(t)))return!1;const e=q(t),n=o(H(t));return e.height<=24&&n.length<=4},s=(t,n)=>{if(!(t instanceof HTMLElement&&r(t)))return!1;if(t.classList.contains(e))return!1;const i=q(t);if(i.width<220||i.height<28||i.height>190)return!1;if(i.bottom>n+12)return!1;const a=H(t,!0),s=o(a);if(!s||/あなたにおすすめ/.test(s))return!1;if((t=>{const e=o(t);return!!e&&/(分前|時間前|日前|配信|更新|視聴回数|コメント|解説|号外|NEW|速報|\d+\+?解説)/.test(e)})(s))return!1;if(t.querySelectorAll("*").length>120)return!1;if(/ヤフコメで話題|みんなのスレッド|フォロー中のヤフコメを見る|おすすめのヤフコメを見る|Yahoo!?ニュース(?:ライブ|タイアップ)?|急上昇ワード|ウェブ検索の急上昇ワード|共同.*?企画|特集|花火|ポイント|キャンペーン|無料|LINE(?:NEWS|ニュース|スタンプ)/.test(s))return!0;const c=t.querySelectorAll("img,picture,video").length,l=t.querySelectorAll('a[href],button,[role="link"]').length,u=/[›»＞>→]$/.test((a||"").trim())||!!t.querySelector('[class*="arrow"],[class*="chevron"],[aria-label*="もっと"],[aria-label*="次"]');return c>=1&&l<=6&&s.length<=220||!!(u&&l<=6&&s.length<=220)};F(e=>{if(t())for(const t of(t=>{const e=[];for(const n of L(t,'h1,h2,h3,h4,h5,h6,[role="heading"],div,span,p')){if(!(n instanceof HTMLElement))continue;if("あなたにおすすめ"!==o(H(n)))continue;let t=n;for(let n=0;t&&n<7;n+=1,t=t.parentElement){if(!(t instanceof HTMLElement&&r(t)))continue;if(t===document.body||t===document.documentElement)continue;if(/^(HTML|BODY|MAIN)$/i.test(t.tagName))continue;const n=q(t);if(n.width<220||n.height<24||n.height>260)continue;if(!o(H(t,!0)).includes("あなたにおすすめ"))continue;const i=Math.max(1,n.width)*Math.max(1,n.height);e.push({node:t,score:i})}}return e.sort((t,e)=>t.score-e.score),e.map(t=>t.node)})(e)){const e=q(t).top;let n=t.previousElementSibling,o=0;for(;n&&o<6;){const t=n;if(n=t.previousElementSibling,o+=1,t instanceof HTMLElement){if(!a(t)){s(t,e)&&(i(t),t.previousElementSibling&&a(t.previousElementSibling)&&i(t.previousElementSibling),t.nextElementSibling&&a(t.nextElementSibling)&&i(t.nextElementSibling));break}i(t)}}}},[250,900,2200])}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooPreSubnavSlotV57)return;document.documentElement.dataset.genericYahooPreSubnavSlotV57="1";const e="generic-yahoo-pre-subnav-slot-hidden-v57",n="generic-yahoo-pre-subnav-slot-style-v57";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display:none !important;\n          height:0 !important;\n          min-height:0 !important;\n          max-height:0 !important;\n          margin:0 !important;\n          padding:0 !important;\n          border:0 !important;\n          overflow:hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),r=t=>{if(!(t instanceof HTMLElement))return!1;const e=P(t);if("none"===e.display||"hidden"===e.visibility)return!1;const n=q(t);return n.width>40&&n.height>4},i=t=>{t instanceof HTMLElement&&t!==document.body&&t!==document.documentElement&&(/^(HTML|BODY|MAIN)$/i.test(t.tagName)||(t.classList.add(e),t.setAttribute("aria-hidden","true"),t.dataset.genericYahooPreSubnavSlotV57="1"))},a=t=>{if(!(t instanceof HTMLElement))return!1;const e=o(H(t,!0));if(!e||e.length>180)return!1;const n=["新着","政治","社会","人","国内","国際","経済","経済総合","市況","株式","産業","スポーツ総合","野球","サッカー","モータースポーツ","競馬","ゴルフ","エンタメ総合","音楽","映画","ドラマ","アニメ","ゲーム","IT総合","製品","サービス","地域","北海道","東北","関東","甲信越","東海","北陸","近畿","中国","四国","九州","沖縄"];let i=0;for(const o of n)e.includes(o)&&(i+=1);if(i<3)return!1;if(t.querySelectorAll('a[href],button,[role="tab"],[role="link"]').length<3||!r(t))return!1;const a=q(t);return a.width>=Math.min(.65*window.innerWidth,260)&&a.height>=30&&a.height<=130},s=(t,n)=>{if(!(t instanceof HTMLElement&&r(t)))return!1;if(t.classList.contains(e))return!1;const i=q(t);if(i.width<Math.min(.65*window.innerWidth,240))return!1;if(i.height<28||i.height>170)return!1;if(i.bottom>n+12)return!1;const a=o(H(t,!0));if(/あなたにおすすめ/.test(a))return!1;if(/^(?:新着|政治|社会|人|国内|国際|経済|スポーツ|エンタメ|IT|地域)/.test(a)&&t.querySelectorAll('a[href],button,[role="tab"]').length>=3)return!1;const s=t.querySelectorAll('a[href],button,[role="link"]').length,c=t.querySelectorAll("img,picture,video").length;return!(/(分前|時間前|日前|配信|更新|コメント|解説|NEW|速報|\d+\+?解説)/.test(a)&&s>2)&&!(s>8||c>3)&&a.length<=260},c=t=>{const e=q(t).top;let n=t.previousElementSibling,i=0;for(;n&&i<4;){if(!(n instanceof HTMLElement)){n=n.previousElementSibling,i+=1;continue}if(s(n,e))return n;const t=q(n),a=o(H(n));if(!(r(n)&&t.height<=24&&a.length<=4)){if(n.children.length<=4)for(const t of Array.from(n.children))if(t instanceof HTMLElement&&s(t,e))return n;break}n=n.previousElementSibling,i+=1}return null};F(e=>{if(t())for(const t of(t=>{const e=[];for(const n of L(t,'nav,ul,ol,div,[role="tablist"]'))n instanceof HTMLElement&&a(n)&&e.push(n);return e.sort((t,e)=>{const n=q(t),o=q(e);return n.top-o.top||n.height-o.height}),e})(e)){const e=c(t);e&&i(e)}},[180,700,1800])}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooEconomyPreSubnavV58)return;document.documentElement.dataset.genericYahooEconomyPreSubnavV58="1";const e="generic-yahoo-economy-pre-subnav-hidden-v58",n="generic-yahoo-economy-pre-subnav-style-v58";if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n          height: 0 !important;\n          min-height: 0 !important;\n          max-height: 0 !important;\n          margin: 0 !important;\n          padding: 0 !important;\n          border: 0 !important;\n          overflow: hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const o=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),r=t=>{if(!(t instanceof HTMLElement))return!1;const e=P(t);if("none"===e.display||"hidden"===e.visibility)return!1;const n=q(t);return n.width>40&&n.height>2},i=t=>{t instanceof HTMLElement&&t!==document.body&&t!==document.documentElement&&(/^(HTML|BODY|MAIN)$/i.test(t.tagName)||(t.classList.add(e),t.setAttribute("aria-hidden","true"),t.dataset.genericYahooEconomyPreSubnavV58="1"))},a=t=>{if(!(t instanceof HTMLElement))return!1;const e=o(H(t,!0));if(!["新着","経済総合","市況","株式","産業"].every(t=>e.includes(t)))return!1;if(t.querySelectorAll('a[href],button,[role="tab"],[role="link"]').length<4||!r(t))return!1;const n=q(t);return n.width>=Math.min(.65*window.innerWidth,260)&&n.height>=28&&n.height<=120},s=(t,e)=>{if(!(t instanceof HTMLElement&&r(t)))return!1;const n=q(t);return!(n.width<Math.min(.72*window.innerWidth,280)||n.height<24||n.height>190||n.bottom>e+14||t.querySelectorAll("img,picture,video").length>3||t.querySelectorAll("a[href]").length>9)},c=t=>{const e=q(t).top;let n=t.previousElementSibling,i=0;for(;n&&i<5;){if(!(n instanceof HTMLElement)){n=n.previousElementSibling,i+=1;continue}const t=q(n),a=o(H(n));if(!(r(n)&&t.height<=24&&a.length<=6)){if(s(n,e))return n;if(n.children.length<=6)for(const t of Array.from(n.children))if(t instanceof HTMLElement&&s(t,e))return t;break}n=n.previousElementSibling,i+=1}return null};F(e=>{if(t())for(const t of(t=>{const e=[];for(const n of L(t,'nav,ul,ol,div,[role="tablist"]'))a(n)&&e.push(n);return e.sort((t,e)=>{const n=q(t),o=q(e);return n.height-o.height||t.querySelectorAll("*").length-e.querySelectorAll("*").length}),e})(e)){const e=c(t);e&&i(e)}},[120,450,1e3,2200])}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;if("/"!==location.pathname&&!/^\/categories(?:\/|$)/i.test(location.pathname))return;if("1"===document.documentElement.dataset.genericYahooSpaPulseV40)return;document.documentElement.dataset.genericYahooSpaPulseV40="1";const t=()=>B(0);window.addEventListener("popstate",()=>window.setTimeout(t,50)),window.addEventListener("hashchange",()=>window.setTimeout(t,50)),document.addEventListener("click",e=>{const n=e.target?.closest?.('a,button,[role="tab"]');if(!n)return;let o=n.matches('[role="tab"]')||Boolean(n.closest('[role="tablist"]'));if(!o&&n.matches("a[href]")&&n.closest("nav"))try{const t=new URL(n.getAttribute("href"),location.href);o=/(^|\.)news\.yahoo\.co\.jp$/i.test(t.hostname)&&("/"===t.pathname||/^\/categories(?:\/|$)/i.test(t.pathname))}catch{}o&&(window.setTimeout(t,120),window.setTimeout(t,600))},!0)}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooCompactLeadV45)return;document.documentElement.dataset.genericYahooCompactLeadV45="1";const e="generic-yahoo-compact-lead-v45",n="generic-yahoo-compact-lead-image-v45",o="generic-yahoo-compact-lead-style-v45";if(!document.getElementById(o)){const t=document.createElement("style");t.id=o,t.textContent=`\n        .${e} {\n          max-height: 180px !important;\n          min-height: 0 !important;\n          overflow: hidden !important;\n        }\n        .${e} .${n},\n        .${e} .${n} img,\n        .${e} img.${n} {\n          width: 100% !important;\n          max-height: 180px !important;\n          height: 180px !important;\n          object-fit: cover !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const r=t=>{if(!(t instanceof HTMLElement))return!1;const e=P(t);if("none"===e.display||"hidden"===e.visibility)return!1;const n=q(t);return n.width>20&&n.height>20},i=t=>H(t,!0).replace(/\s+/g," ").trim(),a=t=>{const e=i(t);return!(!e||e.length>180)&&/(新着|政治|社会|人|国内|国際|経済|IT|野球|サッカー|モータースポーツ|競馬|ゴルフ|スポーツ総合)/.test(e)};F(o=>{if(!t())return;for(const t of L(o,"."+e))t.classList.remove(e);for(const t of L(o,"."+n))t.classList.remove(n);const s=(t=>{const e=L(t,"img").filter(t=>{if(!(t instanceof HTMLImageElement&&r(t)))return!1;const e=q(t);if(e.top<0||e.top>Math.max(900,1.4*window.innerHeight))return!1;if(e.width<220||e.height<140)return!1;const n=i(t.closest("a,article,section,div"));return!/LINE|スタンプ|無料|広告|キャンペーン/.test(n)});for(const n of e){let t=n;for(let e=0;t&&e<7;e+=1,t=t.parentElement){if(!(t instanceof HTMLElement&&r(t)))continue;const e=q(t);if(e.width<260||e.height<180||e.height>520)continue;const o=i(t);if(o.length<8||o.length>260)continue;if(/あなたにおすすめ|ヤフコメで話題|みんなのスレッド/.test(o))continue;let s=t.nextElementSibling,c=!1;for(let t=0;s&&t<6;t+=1,s=s.nextElementSibling)if(s instanceof HTMLElement&&a(s)){c=!0;break}if(c||!(q(n).top>260))return{wrap:t,img:n}}}return null})(o);if(!s)return;s.wrap.classList.add(e),s.img instanceof HTMLElement&&s.img.classList.add(n);const c=s.img.closest("picture");c instanceof HTMLElement&&c.classList.add(n)},[350,1e3,2200])}(),function(){if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname))return;const t=()=>"/"===location.pathname||/^\/categories(?:\/|$)/i.test(location.pathname);if(!t())return;if("1"===document.documentElement.dataset.genericYahooEmptyWrapperV44)return;document.documentElement.dataset.genericYahooEmptyWrapperV44="1";const e="generic-yahoo-empty-wrapper-hidden-v44",n="generic-yahoo-empty-wrapper-style-v44",o=[".generic-yahoo-thread-block-hidden-v27",".generic-yahoo-comment-topics-hidden-v37",".generic-yahoo-top-promo-hidden-v38",".generic-yahoo-aux-row-hidden-v35"].join(",");if(!document.getElementById(n)){const t=document.createElement("style");t.id=n,t.textContent=`\n        .${e} {\n          display: none !important;\n        }\n      `,(document.head||document.documentElement).appendChild(t)}const r=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),i=t=>{if(!(t instanceof HTMLElement))return!0;if(t.classList.contains(e))return!0;if(t.matches(o))return!0;const n=P(t);return"none"===n.display||"hidden"===n.visibility},a=t=>{if(!(t instanceof HTMLElement))return!1;if(t===document.body||t===document.documentElement)return!1;if(/^(HTML|BODY|MAIN|ARTICLE)$/i.test(t.tagName))return!1;if(t.matches('[role="main"],#root,#app,#content,#main'))return!1;if(/あなたにおすすめ/.test(r(H(t))))return!1;const e=q(t),n=Math.max(e.width||0,t.scrollWidth||0),o=Math.max(e.height||0,t.scrollHeight||0);if(n<180||o<1||o>260)return!1;if(t.querySelectorAll("*").length>90)return!1;if((t=>{if(!(t instanceof HTMLElement))return!1;if(t.querySelector("img,video,iframe,canvas,picture")&&Array.from(t.querySelectorAll("img,video,iframe,canvas,picture")).some(t=>!i(t)))return!0;for(const e of t.childNodes)if(e.nodeType===Node.TEXT_NODE&&r(e.nodeValue))return!0;return!1})(t))return!1;const a=Array.from(t.children).filter(t=>t instanceof HTMLElement);return a.length?a.every(t=>i(t)):""===r(H(t))},s=t=>{let n=t.parentElement;for(let r=0;n&&r<4&&a(n);r+=1,n=n.parentElement)n.classList.add(e),n.setAttribute("aria-hidden","true"),n.dataset.genericYahooEmptyWrapperV44="1";const o=t.parentElement;for(const r of[o?.previousElementSibling,o?.nextElementSibling])a(r)&&(r.classList.add(e),r.setAttribute("aria-hidden","true"),r.dataset.genericYahooEmptyWrapperV44="1")};F(e=>{if(t())for(const t of L(e,o))s(t)},[300,1e3,2500],{incremental:!0})}(),function(){const t=Array.from(document.querySelectorAll('style[id^="generic-yahoo-"]')).filter(t=>"generic-yahoo-shared-style-v64"!==t.id);if(t.length<2)return;const e=document.createElement("style");e.id="generic-yahoo-shared-style-v64",e.textContent=t.map(t=>t.textContent||"").join("\n"),t[0].replaceWith(e);for(let n=1;n<t.length;n+=1)t[n].remove()}(),function(){const t=rt(location.href);return!!t&&!!/(^|\.)news\.yahoo\.co\.jp$/i.test(t.hostname)&&/^\/(?:pickup|articles|expert\/articles|feature)\//i.test(t.pathname)}()))return void function(){!function(){if("1"===document.documentElement.dataset.genericYahooVideoRecovery)return;document.documentElement.dataset.genericYahooVideoRecovery="1";const t=/(?:エラーコード\s*[:：]?\s*100110[01]|ご利用の環境では映像を視聴できません)/,e=Date.now();let n=null,o=null;const r=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g," ").trim(),i=t=>{if(n===t||document.getElementById("generic-yahoo-video-recovery"))return;n=t;const e=(t=>{let e=t,n=t.parentElement||t;for(let o=0;e&&o<8;o+=1,e=e.parentElement){if(!(e instanceof HTMLElement))continue;const t=e.getBoundingClientRect();if(t.width>=240&&t.height>=130&&(n=e),e.querySelector?.('video,iframe,[class*="player" i],[data-video-id]'))return e;if(t.width>=Math.min(.88*innerWidth,640)&&t.height>=180)return e}return n})(t);if(!(e instanceof HTMLElement))return;"static"===getComputedStyle(e).position&&(e.style.position="relative");const o=document.createElement("div");o.id="generic-yahoo-video-recovery",o.style.cssText=["position:absolute","left:50%","bottom:18px","transform:translateX(-50%)","z-index:2147483647","display:flex","gap:8px","align-items:center","justify-content:center","max-width:94%","font:600 13px/1.2 system-ui,sans-serif"].join(";");const i=(t,e)=>{const n=document.createElement("a");return n.textContent=t,n.href=e,n.rel="noopener noreferrer",n.style.cssText=["display:inline-flex","align-items:center","justify-content:center","min-height:38px","padding:0 14px","border:1px solid rgba(255,255,255,.45)","border-radius:999px","background:rgba(20,20,20,.72)","color:#fff","text-decoration:none","-webkit-backdrop-filter:blur(6px)","backdrop-filter:blur(6px)","white-space:nowrap"].join(";"),n},a=(()=>{const t=/(?:^|\.)(?:yahoo\.co\.jp|yahoo-net\.jp|google\.com|google\.co\.jp|x\.com|twitter\.com|facebook\.com|instagram\.com|youtube\.com)$/i,e=/(?:^|\.)(?:fnn\.jp|news\.ntv\.co\.jp|newsdig\.tbs\.co\.jp|news\.tv-asahi\.co\.jp|mbs\.jp|ktv\.jp|ytv\.co\.jp|tv-tokyo\.co\.jp)$/i,n=[];for(const o of document.querySelectorAll('main a[href],article a[href],[role="main"] a[href]')){let i;try{i=new URL(o.getAttribute("href"),location.href)}catch{continue}if(!/^https?:$/.test(i.protocol))continue;if(t.test(i.hostname))continue;if(/\.(?:jpg|jpeg|png|gif|webp|svg|pdf)(?:$|\?)/i.test(i.pathname))continue;const a=r([o.textContent,o.getAttribute("aria-label"),o.getAttribute("title"),o.querySelector("img")?.alt].filter(Boolean).join(" "));let s=0;e.test(i.hostname)&&(s+=1e3),/FNN|プライムオンライン|日テレ|TBS|テレ朝|テレビ朝日|MBS|関西テレビ|読売テレビ/i.test(a)&&(s+=500),/元記事|配信元|記事提供|提供元|公式|動画/i.test(a)&&(s+=300),i.pathname&&"/"!==i.pathname&&(s+=120),/広告|PR|シェア|コメント|ランキング|関連記事|お問い合わせ/i.test(a)&&(s-=800),o.closest('[class*="article" i],article')&&(s+=100),n.push({href:i.href,score:s})}return n.sort((t,e)=>e.score-t.score),n[0]?.score>300?n[0].href:""})();a?o.appendChild(i("元動画",a)):o.appendChild(i("元動画検索",(()=>{const t=r(document.querySelector("h1")?.textContent||document.title).replace(/\s*[-｜|].*Yahoo!ニュース.*$/i,"").slice(0,120),e=r(document.body?.innerText).slice(0,5e3);let n="";return/FNN|プライムオンライン/i.test(e)?n="fnn.jp":/日テレNEWS/i.test(e)?n="news.ntv.co.jp":/TBS NEWS DIG/i.test(e)?n="newsdig.tbs.co.jp":/テレ朝news|テレビ朝日/i.test(e)&&(n="news.tv-asahi.co.jp"),`https://www.google.com/search?q=${encodeURIComponent(`${n?`site:${n} `:""}"${t}"`)}`})())),o.appendChild(i("Chrome再生",`intent://${location.host}${location.pathname}${location.search}${location.hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end`)),e.appendChild(o)},a=()=>{(()=>{for(const t of document.querySelectorAll("iframe")){const e=t.getAttribute("allow")||"",n=["autoplay","fullscreen","encrypted-media","picture-in-picture"],o=new Set(e.split(";").map(t=>t.trim()).filter(Boolean));for(const t of n)o.add(t);t.setAttribute("allow",[...o].join("; ")),t.setAttribute("allowfullscreen","")}})();const n=(()=>{const e=[];for(const n of document.querySelectorAll("div,p,span")){const o=r(n.textContent);if(!o||o.length>420||!t.test(o))continue;const i=n.getBoundingClientRect();i.width<80||i.height<14||e.push({element:n,area:i.width*i.height,length:o.length})}return e.sort((t,e)=>t.area-e.area||t.length-e.length),e[0]?.element||null})();n&&i(n),Date.now()-e<45e3&&(o=window.setTimeout(a,600))},s=new MutationObserver(a);s.observe(document.documentElement,{childList:!0,subtree:!0,characterData:!0}),a(),window.setTimeout(()=>{s.disconnect(),o&&clearTimeout(o)},46500)}();const t=["記事全文を読む","記事全文を表示","記事の全文を読む","全文を読む","記事を読む","続きを読む","記事の続きを読む"],e=Date.now();let n=!1,o=null,r=null,i=null,a=0;const s=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[›»＞>→]+$/g,"").trim(),c=()=>{n=!0,o&&o.disconnect(),o=null,r&&clearTimeout(r),r=null},l=t=>{if(!(t instanceof Element))return!1;const e=getComputedStyle(t);if("none"===e.display||"hidden"===e.visibility)return!1;if(0===Number(e.opacity))return!1;const n=t.getBoundingClientRect();return n.width>0&&n.height>0},u=()=>{const t=[document],e=[document.documentElement],n=new Set(e);for(;e.length;){const o=e.shift();if(o&&o.querySelectorAll)for(const r of o.querySelectorAll("*"))r.shadowRoot&&!n.has(r.shadowRoot)&&(n.add(r.shadowRoot),t.push(r.shadowRoot),e.push(r.shadowRoot))}return t},m=t=>s([t.getAttribute?.("aria-label"),t.getAttribute?.("title"),t.getAttribute?.("alt"),t.value,t.innerText,t.textContent].filter(Boolean).join(" ")),d=e=>e?t.map(s).includes(e)?1e3:/記事(?:の)?全文(?:を)?(?:読む|表示)/.test(e)?950:/^(?:記事の)?続きを読む/.test(e)?900:/全文を読む/.test(e)?850:-1:-1,h=t=>t instanceof Element?t.closest('a[href],button,[role="button"],input[type="button"],input[type="submit"]')||t:null,f=t=>{const e=h(t);if(!e)return"";const n=[e.getAttribute?.("href"),e.getAttribute?.("data-href"),e.getAttribute?.("data-url"),e.getAttribute?.("data-link"),e.getAttribute?.("data-redirect-url")].filter(Boolean);for(const o of n)try{const t=new URL(o,location.href);if(/^https?:$/.test(t.protocol)&&t.href!==location.href)return t.href}catch{}return""},g=t=>{const e=h(t);if(!e)return!1;const n=Date.now();if(e===i&&n-a<1500)return!1;i=e,a=n;const o=f(e);if(o)return c(),location.replace(o),!0;try{e.click()}catch{try{e.dispatchEvent(new MouseEvent("click",{bubbles:!0,cancelable:!0,view:window}))}catch{return!1}}return window.setTimeout(()=>{(!document.contains(e)||d(m(e))<0)&&c()},1200),!0},p=()=>{if(n)return;const t=(()=>{const t=[],e=["a[href]","button",'[role="button"]','input[type="button"]','input[type="submit"]',"[data-href]","[data-url]"].join(",");for(const n of u())for(const o of n.querySelectorAll(e)){const e=m(o);let n=d(e);if(n<0)continue;l(o)&&(n+=100),o.closest?.('main,article,[role="main"]')&&(n+=80);const r=f(o);r&&/news\.yahoo\.co\.jp\/(?:articles|expert\/articles)\//i.test(r)&&(n+=120),t.push({element:o,score:n})}return t.sort((t,e)=>e.score-t.score),t[0]?.element||null})();if(t&&g(t))return;const o=(()=>{if(!/^\/pickup\//i.test(location.pathname))return null;const t=[];for(const e of u())for(const n of e.querySelectorAll("a[href]")){let e;try{e=new URL(n.getAttribute("href"),location.href)}catch{continue}if(!/(^|\.)news\.yahoo\.co\.jp$/i.test(e.hostname))continue;if(!/^\/(?:articles|expert\/articles)\//i.test(e.pathname))continue;let o=100;const r=m(n);o+=Math.max(0,d(r)),n.closest('main,article,[role="main"]')&&(o+=200),l(n)&&(o+=40),/コメント|ランキング|関連記事|もっと見る/.test(r)&&(o-=500),t.push({element:n,score:o})}return t.sort((t,e)=>e.score-t.score),t[0]?.element||null})();if(o&&g(o))return;const i=(()=>{if(!/^\/pickup\//i.test(location.pathname))return"";for(const t of document.querySelectorAll("script:not([src])")){const e=t.textContent||"";if(!e||e.length>5e6)continue;const n=e.match(/https?:\\?\/\\?\/news\.yahoo\.co\.jp\\?\/(?:articles|expert\\?\/articles)\\?\/[A-Za-z0-9_-]+/i);if(n)return n[0].replace(/\\\//g,"/").replace(/\\u002F/gi,"/")}return""})();if(i)return c(),void location.replace(i);Date.now()-e>=6e4?c():r=window.setTimeout(p,400)};o=new MutationObserver(()=>{n||p()}),o.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["href","data-href","data-url","style","class","hidden","aria-hidden","aria-label"]}),p()}();/(^|\.)sumahodigest\.com$/i.test(o)&&function(){if(!/(^|\.)sumahodigest\.com$/i.test(location.hostname))return;if("1"===document.documentElement.dataset.genericSumahoDigestCleanup)return;document.documentElement.dataset.genericSumahoDigestCleanup="1";const t="generic-sumahodigest-hidden",e="generic-sumahodigest-cleanup-style-v29";if(!document.getElementById(e)){const n=document.createElement("style");n.id=e,n.textContent=`\n        /* Cocoon系テーマのSNSフォロー欄（記事・一覧ページ共通） */\n        .sns-follow,\n        .sns-follow-message,\n        .sns-follow-buttons,\n        .sns-buttons-follow,\n        [class*="sns-follow" i],\n        [id*="sns-follow" i],\n\n        /* 記事本文のページ番号ナビ。リンクはDOMに残し、見た目だけ消す */\n        body.single .pagination,\n        body.single .page-numbers,\n        body.single .post-page-numbers,\n        body.single .pager-links,\n        body.single .page-links,\n        body.single nav[aria-label*="pagination" i],\n        body.single nav[aria-label*="ページ"],\n        body.single [class*="pagination" i],\n        body.single [id*="pagination" i],\n        .${t} {\n          display: none !important;\n          visibility: hidden !important;\n          max-height: 0 !important;\n          min-height: 0 !important;\n          height: 0 !important;\n          margin: 0 !important;\n          padding: 0 !important;\n          border: 0 !important;\n          overflow: hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(n)}const n=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").trim(),o=e=>{e instanceof HTMLElement&&(e.classList.add(t),e.setAttribute("aria-hidden","true"))},r=t=>{const e=t.closest('.sns-follow,[class*="sns-follow" i],[id*="sns-follow" i],section,aside');if(e instanceof HTMLElement&&e!==document.body)return e;let o=t;for(let r=0;o&&r<7;r+=1,o=o.parentElement){if(!(o instanceof HTMLElement))continue;const t=n(o.innerText||o.textContent);if(!t.includes("Sumahodigestをフォローする"))continue;if(t.length>260)continue;const e=o.getBoundingClientRect();if(e.height>=45&&e.height<=420)return o}return t.parentElement},i=()=>{(()=>{const t=document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,p,span,strong");for(const e of t){const t=e.textContent||"";t.length>80||"Sumahodigestをフォローする"===n(t)&&o(r(e))}})(),(()=>{const t=Array.from(document.querySelectorAll("a[href]")),e=t=>[t.getAttribute("href"),t.getAttribute("title"),t.getAttribute("aria-label"),t.className,t.textContent].filter(Boolean).join(" ").toLowerCase(),n=t=>{const n=e(t);return/(?:^|[\s/:.-])(?:x|twitter)(?:[\s/:.-]|$)/i.test(n)||/x\.com|twitter\.com/i.test(n)},r=t=>{const n=e(t);return/(?:rss|feed|フィード|購読)/i.test(n)};for(const i of t.filter(n)){let t=i.parentElement;for(let e=0;t&&e<5;e+=1,t=t.parentElement){if(!(t instanceof HTMLElement))continue;if(t===document.body||t===document.documentElement)break;if(t.closest(".generic-autopager-divider,.generic-autopager-page"))continue;const e=Array.from(t.querySelectorAll("a[href]"));if(e.length<2||e.length>5)continue;if(!e.some(n)||!e.some(r))continue;if(t.querySelector("article,h1,h2,.entry-card,.article-list"))continue;const i=`${t.className||""} ${t.id||""}`.toLowerCase(),a=/sns|follow|social|button/.test(i),s=2===e.length;if((a||s)&&!(t.getBoundingClientRect().height>260)){o(t);break}}}})(),(()=>{const t=[".pagination","nav.pagination","ul.page-numbers",".page-numbers",".post-page-numbers",".pager-links",".page-links",'nav[aria-label*="pagination" i]','nav[aria-label*="ページ"]','[class*="pagination" i]','[id*="pagination" i]'].join(",");for(const n of document.querySelectorAll(t)){if(!(n instanceof HTMLElement))continue;if(n.closest(".generic-autopager-divider,.generic-autopager-page"))continue;const t=n.matches("a,span,li")&&n.closest("nav,ul,ol,div")||n;o(t)}const e=document.querySelectorAll('a[aria-current="page"],span[aria-current="page"],.current.page-numbers');for(const r of e){const t=n(r.textContent);if(!/^\d+$/.test(t))continue;const e=r.closest('nav,ul,ol,[role="navigation"],div');if(!(e instanceof HTMLElement))continue;const i=e.querySelectorAll("a[href]"),a=n(e.textContent);i.length>=2&&/(?:…|\.\.\.|›|»|＞|次)/.test(a)&&o(e)}})()};let a=null;const s=()=>{null===a&&(a=window.setTimeout(()=>{a=null,document.hidden||i()},180))};i(),document.addEventListener("GenericAutoPagerLoaded",s,{passive:!0}),new MutationObserver(s).observe(document.documentElement,{childList:!0,subtree:!0})}(),/(^|\.)buzzap\.jp$/i.test(o)&&function(){if(!/(^|\.)buzzap\.jp$/i.test(location.hostname))return;if("1"===document.documentElement.dataset.genericBuzzapHidePostNavigationV35)return;document.documentElement.dataset.genericBuzzapHidePostNavigationV35="1";const t="generic-buzzap-post-navigation-hidden-v35",e="generic-buzzap-post-navigation-style-v35";if(!document.getElementById(e)){const n=document.createElement("style");n.id=e,n.textContent=`\n        .${t} {\n          display: none !important;\n          visibility: hidden !important;\n          max-height: 0 !important;\n          min-height: 0 !important;\n          height: 0 !important;\n          margin: 0 !important;\n          padding: 0 !important;\n          border: 0 !important;\n          overflow: hidden !important;\n        }\n      `,(document.head||document.documentElement).appendChild(n)}const n=t=>String(t||"").replace(/[\s\u00a0\u3000]+/g,"").replace(/[〈〉<>«»‹›]/g,"").trim(),o=t=>/^過去の投稿$/.test(n(t)),r=t=>/^新しい投稿$/.test(n(t)),i=t=>o(t)||r(t),a=e=>{e instanceof HTMLElement&&(e.classList.add(t),e.setAttribute("aria-hidden","true"))},s=t=>!(t instanceof HTMLElement&&t!==document.body&&t!==document.documentElement&&!/^(HTML|BODY|MAIN|ARTICLE)$/i.test(t.tagName)&&!t.matches('[role="main"],#root,#app,#content,#main')&&!t.querySelector("h1,h2,h3,article,img,video,iframe")),c=t=>{let e=t.closest('nav,.navigation,.post-navigation,.posts-navigation,.nav-links,.pager,.paging,[role="navigation"]')||t.parentElement;for(let i=0;e&&i<6;i+=1,e=e.parentElement){if(!(e instanceof HTMLElement)||s(e))continue;const t=Array.from(e.querySelectorAll("a[href]")),i=e.querySelectorAll("*"),a=e.getBoundingClientRect(),c=Math.max(a.height,e.scrollHeight||0);if(t.length<2||t.length>6)continue;if(i.length>60||c>260)continue;const l=t.some(t=>o(t.textContent||t.getAttribute("aria-label"))),u=t.some(t=>r(t.textContent||t.getAttribute("aria-label")));if(!l||!u)continue;const m=n(e.innerText||e.textContent);if(m.includes("過去の投稿")&&m.includes("新しい投稿")&&!(m.length>80))return e}return null},l=t=>{const e=[];let o=t;for(let r=0;o&&r<5;r+=1,o=o.parentElement){if(!(o instanceof HTMLElement)||s(o))continue;const t=n(o.innerText||o.textContent);if(!i(t))continue;const r=o.querySelectorAll("a[href]"),a=o.querySelectorAll("*"),c=o.getBoundingClientRect(),l=Math.max(c.width,o.scrollWidth||0),u=Math.max(c.height,o.scrollHeight||0);r.length<1||r.length>2||a.length>24||l<90||u<24||u>180||e.push({node:o,area:Math.max(1,l)*Math.max(1,u)})}return e.sort((t,e)=>e.area-t.area),e[0]?.node||t},u=()=>{const t=Array.from(document.querySelectorAll("a[href]"));for(const e of t){const t=e.textContent||e.getAttribute("aria-label")||"";if(!i(t))continue;const n=c(e);if(n){a(n);continue}const o=l(e);o&&a(o)}};let m=null;const d=()=>{null===m&&(m=window.setTimeout(()=>{m=null,document.hidden||u()},180))};u(),document.addEventListener("GenericAutoPagerLoaded",d,{passive:!0}),new MutationObserver(d).observe(document.documentElement,{childList:!0,subtree:!0})}();const r=Y(location.href),i=['nav[aria-label*="pagination" i]','nav[aria-label*="ページ"]',".pagination",".pager",".paging",".page-nav",".page-navi",".pagenation",'[class*="pagination" i]','[class*="pager" i]','[class*="paging" i]','[id*="pagination" i]','[id*="pager" i]','[id*="paging" i]'].join(","),a=["#search","#search-results","#results",".search-results",".searchResult",".results",".result-list",".product-list",".products",".post-list",".entries","main",'[role="main"]',"#main","#content",".main-content",".content",".main"],s=["script","noscript","template",'link[rel="canonical"]','link[rel~="next"]','link[rel~="prev"]',i].join(","),c=new Map,l={loading:!1,paused:!1,stopped:!1,pages:1,nextUrl:null,currentSourceUrl:location.href,loadedUrls:new Set,target:null,targetSelector:null,rule:null,lastError:"",contentSignatures:new Set,statusDetail:"",retryCount:0,retryTimer:0};var u;l.loadedUrls.add(ot(location.href)),l.rule=(u=location.hostname,t.siteRules.find(t=>t.host?.test(u))||null);let m=null,d=null;if(l.target=O(document,l.rule),l.targetSelector=r?null:l.rule?.content||function(t){if(!t||t===document.body)return"body";if(t.id)return`#${at(t.id)}`;const e=t.getAttribute("data-testid");if(e)return`[data-testid="${n=e,String(n).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"]`;var n;const o=Array.from(t.classList).filter(t=>t.length<=40&&!/^js-|active|current|selected/i.test(t)).slice(0,2);return o.length?`${t.tagName.toLowerCase()}${o.map(t=>`.${at(t)}`).join("")}`:t.tagName.toLowerCase()}(l.target),l.nextUrl=$(document,location.href,l.rule),r&&l.target){const t=z(l.target,location.href);t&&l.contentSignatures.add(t)}if(!l.target||!l.nextUrl)return void(l.stopped=!0);m=function(){const e=document.createElement("style");if(e.textContent="\n      .generic-autopager-page {\n        display: block !important;\n        position: relative !important;\n        max-width: 100%;\n      }\n      .generic-autopager-divider {\n        box-sizing: border-box;\n        width: 100%;\n        margin: 28px 0 20px;\n        padding: 9px 12px;\n        border-top: 2px solid rgba(127,127,127,.45);\n        border-bottom: 1px solid rgba(127,127,127,.25);\n        background: rgba(127,127,127,.08);\n        text-align: center;\n        font: 600 13px/1.4 system-ui,sans-serif;\n        clear: both;\n      }\n      .generic-autopager-divider a {\n        color: inherit !important;\n        text-decoration: none !important;\n      }\n      .generic-autopager-page img,\n      .generic-autopager-page g-img {\n        opacity: 1 !important;\n        visibility: visible !important;\n      }\n      .generic-autopager-page g-img > img {\n        display: block !important;\n      }\n      .generic-autopager-page [hidden],\n      .generic-autopager-page [inert],\n      .generic-autopager-page details:not([open]) > :not(summary) {\n        display: none !important;\n      }\n      #generic-autopager-status-v2 {\n        position: fixed !important;\n        z-index: 2147483647 !important;\n        right: max(10px, env(safe-area-inset-right)) !important;\n        bottom: max(10px, env(safe-area-inset-bottom)) !important;\n        min-width: 58px !important;\n        max-width: 118px !important;\n        box-sizing: border-box !important;\n        padding: 7px 10px !important;\n        border: 1px solid rgba(255,255,255,.18) !important;\n        border-radius: 999px !important;\n        background: rgba(25,25,25,.48) !important;\n        color: #fff !important;\n        box-shadow: 0 3px 14px rgba(0,0,0,.16) !important;\n        -webkit-backdrop-filter: blur(5px) !important;\n        backdrop-filter: blur(5px) !important;\n        font: 600 11.5px/1.25 system-ui,sans-serif !important;\n        white-space: nowrap !important;\n        overflow: hidden !important;\n        text-overflow: ellipsis !important;\n        text-align: center !important;\n        user-select: none !important;\n        -webkit-user-select: none !important;\n        touch-action: manipulation !important;\n        cursor: pointer !important;\n        transition: opacity .16s ease !important;\n      }\n      #generic-autopager-status-v2.generic-autopager-status-hidden {\n        opacity: 0 !important;\n      }\n    ",document.documentElement.appendChild(e),!t.showStatus)return null;const n=document.createElement("button");return n.id="generic-autopager-status-v2",n.type="button",n.textContent="準備",document.body.appendChild(n),n}(),d=document.createElement("div"),d.id="generic-autopager-sentinel",d.setAttribute("aria-hidden","true"),d.style.cssText="height:1px;width:100%;pointer-events:none;clear:both;",(/(^|\.)buzzap\.jp$/i.test(location.hostname)&&"primary"===l.target?.id?l.target:document.body).appendChild(d),function(t){const e=l.nextUrl;if(e)for(const n of t.querySelectorAll("a[href]")){const t=et(n,location.href);if(t&&ot(t)===ot(e)){const t=n.closest(i);t&&(t.dataset.genericAutopagerHidden="true",t.style.setProperty("display","none","important"));break}}}(document),dt(`自動 1/${t.maxPages}`);const h=/(^|\.)buzzap\.jp$/i.test(location.hostname)&&d.parentNode===l.target?Math.max(t.preloadPx,5000):t.preloadPx;async function f(){if(l.loading||l.paused||l.stopped)return;if(!l.nextUrl)return lt("最終ページです");if(l.pages>=t.maxPages)return lt(`上限${t.maxPages}ページ`);const e=ot(r&&t.googleForceJapaneseUi?b(l.nextUrl):l.nextUrl);if(l.loadedUrls.has(e))return lt("同じページを検出しました");const n=rt(e);if(!n||n.origin!==location.origin)return lt("別ドメインの次ページは読み込めません");l.loading=!0,dt(`読込 ${l.pages+1}`);let o=null;try{let n,i,a;if(r&&t.googleUseRenderedFrame){const r=await async function(e){t.googleForceJapaneseUi&&(e=b(e));const n=document.createElement("iframe");n.id="generic-autopager-google-frame",n.setAttribute("aria-hidden","true"),n.tabIndex=-1,n.style.cssText=["position:fixed!important","left:0!important","top:0!important","width:100vw!important","height:100vh!important","border:0!important","opacity:.001!important","pointer-events:none!important","z-index:-2147483647!important"].join(";");let o=!1;const r=()=>{o||(o=!0,n.remove())};try{await g(n,e,t.googleFrameTimeoutMs);const o=n.contentWindow,i=n.contentDocument;if(!o||!i)throw new Error("Googleページを参照できません");const a=o.location.href||e,s=U(i);if(s)throw new Error(s);const c=await p(i,t.googleFrameTimeoutMs);return await async function(t,e,n){const o=t=>new Promise(e=>window.setTimeout(e,t)),r=e.scrollingElement||e.documentElement,i=Math.max(0,r.scrollHeight-t.innerHeight),a=i>0?[.35,.7,1]:[0];for(const c of a)t.scrollTo(0,Math.floor(i*c)),t.dispatchEvent(new Event("scroll")),await o(180);const s=Array.from(n.querySelectorAll("img"));s.length?await Promise.race([Promise.allSettled(s.slice(0,24).map(t=>new Promise(e=>{if(t.complete)return e();t.addEventListener("load",e,{once:!0}),t.addEventListener("error",e,{once:!0})}))),o(1600)]):await o(450)}(o,i,c),function(t,e){for(const n of t.querySelectorAll("img")){const t=n.currentSrc||n.src||n.getAttribute("src")||"";t&&!K(t)&&(Z(n,"src",t,e),n.removeAttribute("srcset"));const o=n.getBoundingClientRect().width,r=n.getBoundingClientRect().height;o>1&&!n.getAttribute("width")&&n.setAttribute("width",String(Math.round(o))),r>1&&!n.getAttribute("height")&&n.setAttribute("height",String(Math.round(r))),n.setAttribute("loading","eager"),n.style.setProperty("opacity","1","important"),n.style.setProperty("visibility","visible","important"),n.style.removeProperty("display")}for(const n of t.querySelectorAll("*")){const t=n.ownerDocument.defaultView?.getComputedStyle(n).backgroundImage||"";t&&"none"!==t&&/url\(/i.test(t)&&n.style.setProperty("background-image",t,"important")}}(c,a),{document:i,root:c,url:a,cleanup:r}}catch(i){throw r(),i}}(e);n=r.document,i=r.url,a=r.root,o=r.cleanup}else{const t=await fetch(e,{method:"GET",credentials:"include",redirect:"follow",headers:{Accept:"text/html,application/xhtml+xml"}});if(!t.ok)throw new Error(`HTTP ${t.status}`);const o=t.headers.get("content-type")||"";if(o&&!/text\/html|application\/xhtml\+xml/i.test(o))throw new Error("HTMLではない応答");const r=await t.text();if(n=(new DOMParser).parseFromString(r,"text/html"),i=t.url||e,/(^|\.)supjav\.com$/i.test(location.hostname)){const t=st(n.title||""),e=st(n.body?.textContent||"").slice(0,1200);if(/404|page not found|not found/i.test(`${t} ${e}`))return l.nextUrl=null,void lt("最終ページです")}a=l.targetSelector&&it(n,l.targetSelector)||O(n,l.rule)}if(l.loadedUrls.has(ot(i)))return l.nextUrl=null,void lt("同じページを検出しました");if(r){const t=U(n);if(t)throw new Error(t)}if(!a)throw new Error("次ページの本文領域を特定できません");let c="";if(r){if(c=z(a,i),!c)throw new Error("Google検索結果を取得できません");if(l.contentSignatures.has(c))return l.nextUrl=null,void lt("同じ検索結果を検出しました")}const u=function(e,n,o){const i=document.createElement("section");i.className="generic-autopager-page",i.dataset.page=String(o),i.dataset.sourceUrl=n;const a=document.createElement("div");a.className="generic-autopager-divider";const c=document.createElement("a");c.href=n,c.textContent=`ページ ${o}`,c.rel="nofollow",a.appendChild(c),i.appendChild(a);const u=document.importNode(e,!0);for(const t of u.querySelectorAll(s))t.remove();if(r){for(const t of u.querySelectorAll('#botstuff,#bres,[role="navigation"],a#pnnext,script,noscript,template'))t.remove();o>=2&&(t.googleRemoveImageSectionsAfterFirstPage||t.googleRemovePeopleAlsoSearchAfterFirstPage)&&function(t,{removeImages:e=!0,removePeopleAlsoSearch:n=!1}={}){if(!t)return;const o=t=>String(t||"").replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g," ").trim(),r=new WeakMap,i=t=>(r.has(t)||r.set(t,o(t.textContent)),r.get(t)),a=t=>{const e=i(t);return"画像"===e||"Images"===e},s=/^(?:他の人はこちらも検索|People also search for)$/i,c=t=>s.test(i(t)),l=(e,n)=>{if(!e||e===t)return!1;if(e.matches('main,[role="main"],#search,#rso'))return!1;const r=o(e.textContent);if(!r.includes(i(n))||r.length>3500)return!1;const a=e.querySelectorAll('a[href],button,[role="button"],[role="link"],[role="listitem"]').length;return!(a<2||a>30)&&(!(e.querySelectorAll("*").length>240)&&!Array.from(e.querySelectorAll("h3")).some(t=>t!==n&&!n.contains(t)))},u=e=>{let n=e;for(let o=0;n&&n!==t&&o<8;o+=1){if(l(n,e))return n.remove(),!0;n=n.parentElement}return!1},m=e=>{if(!e||e===t)return!1;if(e.querySelectorAll("img,g-img").length<3)return!1;const n=o(e.textContent),r=/(?:その他の画像|もっと見る|Images|More images)/i.test(n),i=Array.from(e.querySelectorAll("a[href]")).some(t=>{const e=t.getAttribute("href")||"";return/(?:[?&](?:tbm=isch|udm=2)(?:&|$)|\/search\/images|images\.google\.)/i.test(e)}),a=Boolean(e.querySelector('g-scrolling-carousel,[role="list"] img:nth-of-type(3),[data-attrid*="image" i],.islrc'));return r||i||a},d=new Set,h=Array.from(t.querySelectorAll('h2,h3,[role="heading"],[aria-level],span,div')).filter(t=>e&&a(t)||n&&c(t));for(const f of h){if(!t.contains(f))continue;if(n&&c(f)){u(f);continue}if(!e||!a(f))continue;let o=f,r=null;for(;o&&o!==t;){if(m(o)){r=o;break}o=o.parentElement}r&&!d.has(r)&&(d.add(r),r.remove())}if(e)for(const f of Array.from(t.querySelectorAll("g-scrolling-carousel"))){let e=f,n=null;for(;e&&e!==t;){const t=o(e.textContent);if(/^(?:画像|Images)(?:\s|$)/i.test(t)&&m(e)){n=e;break}e=e.parentElement}n&&!d.has(n)&&(d.add(n),n.remove())}}(u,{removeImages:t.googleRemoveImageSectionsAfterFirstPage,removePeopleAlsoSearch:t.googleRemovePeopleAlsoSearchAfterFirstPage}),t.googleFixBrokenMultiImageRichResults&&o>=2&&M(u),o>=2&&function(t){if(!t)return;const e=t=>String(t||"").replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g," ").trim(),n=/(?:この動画の\s*\d+\s*件の(?:重要なパート|主要な場面)|この動画の重要なパート|動画内の重要な場面|キーモーメント|key\s+moments?(?:\s+(?:in|from)\s+(?:this|the)\s+video)?|important\s+parts?(?:\s+of\s+(?:this|the)\s+video)?)/i,o=/(?:^|[^\d])(?:\d{1,2}:)?\d{1,2}:\d{2}(?=$|[^\d])/g,r=t=>(e(t?.textContent).match(o)||[]).length,i=t=>Array.from(t?.querySelectorAll?.("a[href]")||[]).some(t=>{try{const e=new URL(t.getAttribute("href")||"",location.href);return/(^|\.)(?:youtube\.com|youtu\.be)$/i.test(e.hostname)}catch{return/(?:youtube\.com|youtu\.be)/i.test(t.getAttribute("href")||"")}}),a=n=>{if(!n||n===t)return!0;const o=Boolean(n.querySelector('h3,[role="heading"]')),r=i(n),a=e(n.textContent);return o&&r&&a.length>500},s=e=>!(!e||e===t||!t.contains(e)||a(e)||(e.remove(),0));for(const u of Array.from(t.querySelectorAll('[aria-expanded="false"][aria-controls]'))){const o=e(u.textContent);if(!n.test(o))continue;const r=u.getAttribute("aria-controls");if(!r)continue;const i=Array.from(t.querySelectorAll("[id]")).find(t=>t.id===r);i&&s(i)}const c=Array.from(t.querySelectorAll('button,[role="button"],summary,h3,h4,div,span')).filter(t=>{const o=e(t.textContent);return o.length>0&&o.length<=180&&n.test(o)});for(const u of c){let n=u,o=null,i=null;for(let s=0;n&&n!==t&&s<9;s+=1){const t=e(n.textContent),s=r(n);if(!o&&t.length<=900&&!a(n)&&(o=n),s>=2&&t.length<=3200&&!a(n)){i=n;break}n=n.parentElement}s(i||o)||s(u.closest('button,[role="button"],summary')||u)}const l=Array.from(t.querySelectorAll('a[href*="youtube.com" i],a[href*="youtu.be" i]'));for(const u of l){let o=u;for(let e=0;o&&o!==t&&e<8&&(!o.querySelector?.('h3,[role="heading"]')||!i(o));e+=1)o=o.parentElement;if(!o||o===t)continue;const a=Array.from(o.querySelectorAll("div,section,ul,ol")).filter(t=>{const n=e(t.textContent);return!(n.length<20||n.length>2600)&&!t.querySelector("h3")&&r(t)>=4});a.sort((t,e)=>t.querySelectorAll("*").length-e.querySelectorAll("*").length);for(const r of a)if(t.contains(r)&&(n.test(e(r.textContent))||r.querySelector("[aria-expanded]"))){s(r);break}}for(const u of t.querySelectorAll("[hidden],[inert]"))u.remove();for(const u of t.querySelectorAll('[aria-expanded="false"][aria-controls]')){const e=u.getAttribute("aria-controls");if(!e)continue;const n=Array.from(t.querySelectorAll("[id]")).find(t=>t.id===e);n&&n.remove()}}(u)}if(l.rule?.remove)for(const t of u.querySelectorAll(l.rule.remove))t.remove();if(function(t,e){const n=["href","src","poster","action","formaction"];for(const o of t.querySelectorAll("*")){for(const r of n){const t=o.getAttribute(r);t&&!/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(t)&&Z(o,r,t,e)}const t=o.getAttribute("srcset");t&&o.setAttribute("srcset",Q(t,e))}_(t,e)}(u,n),r)u.classList.add("generic-autopager-google-source-root"),u.dataset.genericAutopagerPage=String(o),i.appendChild(u);else for(;u.firstChild;)i.appendChild(u.firstChild);return i}(a,i,l.pages+1);if(!u||!u.childElementCount)throw new Error("追加できる本文がありません");(/(^|\.)buzzap\.jp$/i.test(location.hostname)&&"primary"===l.target?.id&&d?.parentNode===l.target?l.target.insertBefore(u,d):l.target.appendChild(u)),r&&t.googleRestoreYouTubeOriginalTitles&&async function(t){if(!t)return;const e=new Set,n=[];for(const i of t.querySelectorAll("a[href]")){const o=S(i.getAttribute("href")||i.href);if(!o)continue;let r=i;for(let e=0;r&&r!==t&&e<9&&!r.querySelector?.('h3,[role="heading"]');e+=1)r=r.parentElement;if(!r||r===t||e.has(r))continue;e.add(r);const a=r.querySelector("h3")||Array.from(r.querySelectorAll('[role="heading"]')).find(t=>{const e=Number(t.getAttribute("aria-level")||0);return!e||e>=2});if(!a)continue;const s=w(r,a);s&&v(a,s),n.push({titleElement:a,video:o})}let o=0;const r=Math.min(3,n.length);await Promise.all(Array.from({length:r},async()=>{for(;o<n.length;){const{titleElement:t,video:e}=n[o];o+=1;try{const n=await C(e);if(!n||!t.isConnected)continue;v(t,n)}catch{}}}))}(u);const m=()=>{r&&t.googleFixBrokenMultiImageRichResults&&(y(u,i),M(u))},d=/(^|\.)supjav\.com$/i.test(location.hostname),h=_(u,i),f=d||h;if(d&&J(u,i),m(),r&&t.googleFixBrokenMultiImageRichResults&&(window.requestAnimationFrame(m),window.setTimeout(m,350)),f&&function(t,e,{repairSupjav:n=!1}={}){if(!t?.isConnected)return;let o=!1,r=0,i=0,a=0;const s=["src","srcset","style","class","hidden","aria-hidden","data-src","data-lazy-src","data-original","data-original-src","data-cfsrc","data-url","data-image","data-image-src","data-srcset","data-lazy-srcset","data-original-srcset","data-bg","data-background","data-background-image","data-lazy-bg"],c=()=>{!o&&t.isConnected&&m.observe(t,{childList:!0,subtree:!0,attributes:!0,attributeFilter:s})},l=()=>{o||(o=!0,window.clearTimeout(r),window.clearTimeout(a),i&&window.cancelAnimationFrame(i),m.disconnect())},u=()=>{if(i=0,o||!t.isConnected)return l();m.disconnect(),_(t,e),n&&J(t,e),c()},m=new MutationObserver(()=>{o||(window.clearTimeout(r),r=window.setTimeout(()=>{r=0,i&&window.cancelAnimationFrame(i),i=window.requestAnimationFrame(u)},90))});c(),a=window.setTimeout(l,2800)}(u,i,{repairSupjav:d}),c&&l.contentSignatures.add(c),l.loadedUrls.add(ot(i)),l.currentSourceUrl=i,clearTimeout(l.retryTimer),l.retryTimer=0,l.pages+=1,l.retryCount=0,l.nextUrl=$(n,i,l.rule),l.nextUrl&&l.loadedUrls.has(ot(l.nextUrl))&&(l.nextUrl=null),t.updateAddressBar)try{history.replaceState(history.state,"",i)}catch{}document.dispatchEvent(new CustomEvent("GenericAutoPagerLoaded",{detail:{page:l.pages,url:i,container:u}})),l.nextUrl?l.paused?mt():dt(`自動 ${l.pages}/${t.maxPages}`):lt("最終ページです")}catch(i){l.lastError=i instanceof Error?i.message:String(i),/(^|\.)buzzap\.jp$/i.test(location.hostname)&&l.retryCount<3?(l.retryCount+=1,l.stopped=!1,dt(`再試行 ${l.retryCount}/3`,l.lastError),console.warn("[Android AutoPager]",i),clearTimeout(l.retryTimer),l.retryTimer=window.setTimeout(()=>{l.retryTimer=0,!l.loading&&!l.paused&&!l.stopped&&f()},600*l.retryCount)):(l.stopped=!0,dt("失敗",l.lastError),console.warn("[Android AutoPager]",i))}finally{o&&o(),l.loading=!1,setTimeout(()=>{!l.stopped&&!l.paused&&!l.retryTimer&&(/(^|\.)buzzap\.jp$/i.test(location.hostname)?d?.isConnected&&d.getBoundingClientRect().top<=window.innerHeight+h:ct()<=h)&&f()},350)}}function g(t,e,n){return new Promise((o,r)=>{let i=!1;const a=window.setTimeout(()=>{i||(i=!0,r(new Error("Google読込タイムアウト")))},n);t.addEventListener("load",()=>{i||(i=!0,clearTimeout(a),o())},{once:!0}),t.addEventListener("error",()=>{i||(i=!0,clearTimeout(a),r(new Error("Googleページを読み込めません")))},{once:!0}),t.src=e,document.documentElement.appendChild(t)})}function p(t,e){return new Promise((n,o)=>{const r=Date.now(),i=()=>{const a=it(t,"#rso")||it(t,"#search [role=main]")||it(t,"#search");if(a&&a.querySelector("a[href]"))return void n(a);const s=U(t);s?o(new Error(s)):Date.now()-r>=e?o(new Error("Google検索結果を取得できません")):window.setTimeout(i,120)};i()})}function y(t,e){if(!t?.querySelector)return!1;const n=Boolean(t.querySelector('[data-generic-autopager-commerce-safe="1"]')),o=t=>String(t||"").replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g," ").trim(),r=/(?:[¥￥$€£]\s*\d[\d,.]*(?:\s*[〜～~-]\s*[¥￥$€£]?\s*\d[\d,.]*)?|\d[\d,.]*\s*円(?:\s*[〜～~-]\s*\d[\d,.]*\s*円)?|(?:JPY|USD|EUR)\s*\d[\d,.]*)/i,i=/(?:在庫|送料無料|送料|評価|レビュー|口コミ|[★☆⭐]{3,}|\(\s*\d+\s*\))/i,a='h3,[role="heading"],[aria-level]',s=t=>{const e=t?.getAttribute?.("href")||t?.href||"";if(!e||/^(?:javascript:|#)/i.test(e))return null;let n=rt(e);if(!n||!/^https?:$/.test(n.protocol))return null;if(/^(?:www\.)?google\.[a-z.]+$/i.test(n.hostname)&&"/url"===n.pathname){const t=n.searchParams.get("q")||n.searchParams.get("url");t&&(n=rt(t))}return n&&/^https?:$/.test(n.protocol)?/^(?:www\.)?google\.[a-z.]+$/i.test(n.hostname)?null:{anchor:t,href:e,url:n}:null},c=e=>{const n=Array.from(e.querySelectorAll("a[href]")).map(s).filter(Boolean);if(!n.length)return null;let c=null;const l=Array.from(e.querySelectorAll(a));for(const t of l){if(t.closest('[hidden],[inert],[aria-hidden="true"]'))continue;const e=o(t.textContent);if(e.length<2||e.length>500||r.test(e))continue;const i=s(t.closest("a[href]")||t.querySelector("a[href]")),a=n.find(t=>{const n=o(`${t.anchor.getAttribute("aria-label")||""} ${t.anchor.getAttribute("title")||""}`);return Boolean(n)&&(n.includes(e)||e.includes(n))}),l=i||a||n.find(e=>e.anchor.contains(t)||t.contains(e.anchor))||n[0];let u=1e3+Math.min(e.length,180);t.matches("h3")&&(u+=250),i&&(u+=500),(!c||u>c.score)&&(c={title:e,titleElement:t,primaryLink:l.anchor,link:l,score:u})}if(c)return c;for(const t of n){const e=o(t.anchor.textContent);if(e.length<4||e.length>500||r.test(e))continue;if(/^(?:https?:\/\/|www\.)|^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(e))continue;const n=700+Math.min(e.length,180);(!c||n>c.score)&&(c={title:e,titleElement:t.anchor,primaryLink:t.anchor,link:t,score:n})}if(c)return c;const u=Array.from(e.querySelectorAll("div,span"));for(const a of u){if(a.childElementCount>3)continue;const e=o(a.textContent);if(e.length<4||e.length>240||r.test(e)||i.test(e))continue;if(/^(?:https?:\/\/|www\.)|^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(e))continue;const s=t.isConnected?window.getComputedStyle(a):null,l=Number.parseFloat(s?.fontSize||"0");if(l&&l<17)continue;const u=300+Math.min(e.length,180)+10*Math.min(l,40);(!c||u>c.score)&&(c={title:e,titleElement:a,primaryLink:n[0].anchor,link:n[0],score:u})}return c},l=[],u=new Set,m=(t.ownerDocument||document).createTreeWalker(t,4);let d=m.nextNode();for(;d;){if(d.parentElement?.closest('[data-generic-autopager-commerce-safe="1"]')){d=m.nextNode();continue}const e=o(d.nodeValue);if(/(?:[¥￥$€£]|円|JPY|USD|EUR)/i.test(e)){let e=d.parentElement;for(let n=0;e&&e!==t&&n<6&&!e.closest('[hidden],[inert],[aria-hidden="true"]');n+=1){const t=o(e.textContent);if(t.length>220)break;if(t.length>=2&&r.test(t)){u.has(e)||(u.add(e),l.push(e));break}e=e.parentElement}}d=m.nextNode()}let h=null;for(const y of l){const e=[];let n=y.parentElement;for(let l=0;n&&n!==t&&l<15;l+=1){const t=o(n.textContent);if(t.length>6200)break;if(r.test(t)){const t=c(n);if(t){const o=n.querySelectorAll(a).length,r=new Set(Array.from(n.querySelectorAll("a[href]")).map(s).filter(Boolean).map(t=>t.url.hostname));o<=3&&r.size<=4&&e.push({card:n,titleInfo:t})}}n=n.parentElement}if(!e.length)continue;const i=e.filter(({card:t})=>t.matches?.('.MjjYud,.g,[data-hveid],[data-snhf],article,[role="article"]'));h=i[i.length-1]||e[e.length-1];break}if(!h)return n;const{card:f,titleInfo:g}=h,{title:p,titleElement:b,primaryLink:w,link:v}=g,x=w?.getAttribute("href")||w?.href||v?.href||"";if(!x||/^(?:javascript:|#)/i.test(x))return!1;const E=Array.from(f.querySelectorAll('cite,p,div,span,em,strong,small,[role="text"]')).slice(0,320),A=t=>t===b||t.contains(b)||b.contains(t);let S="",C=-1;for(const y of E){if(A(y))continue;const t=o(y.textContent);if(t.length<2||t.length>240||t.includes(p))continue;if(!r.test(t))continue;let e=8;/在庫|送料無料|送料/i.test(t)&&(e+=4),/評価|レビュー|口コミ|[★☆⭐]{3,}/i.test(t)&&(e+=4),e+=Math.min(t.length,120)/120,e>C&&(C=e,S=t)}S||(S=o(f.textContent).match(r)?.[0]||"");const M=[];for(const y of E){if(A(y))continue;const t=o(y.textContent);t.length<2||t.length>150||t.includes(p)||!i.test(t)||r.test(t)||M.includes(t)||M.push(t)}const $=M.filter(t=>!M.some(e=>e!==t&&e.length>t.length&&e.includes(t)));for(const y of $.slice(0,3))S.includes(y)||(S+=`${S?" · ":""}${y}`);let T="",L=-1;for(const y of E){if(A(y))continue;const t=o(y.textContent);if(t.length<24||t.length>700||t.includes(p))continue;if(t===S||S.includes(t)||r.test(t)&&t.length<220)continue;if(/^(?:https?:\/\/|www\.)|^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(t))continue;let e=t.length;y.matches("p")&&(e+=160),y.childElementCount>5&&(e-=120),e>L&&(L=e,T=t)}const k=t=>{const e=t.getBoundingClientRect?.(),n=Number.parseFloat(t.getAttribute("width")||"")||t.naturalWidth||e?.width||0,o=Number.parseFloat(t.getAttribute("height")||"")||t.naturalHeight||e?.height||0,r=`${t.className||""} ${t.id||""} ${t.alt||""}`,i=/(?:favicon|logo|avatar|profile|icon)/i.test(r)?.08:1;return n>=48&&o>=40?n*o*i:0},q=Array.from(f.querySelectorAll("img")).map(t=>({image:t,score:k(t)})).sort((t,e)=>e.score-t.score)[0];let P=rt(x);if(P&&/^(?:www\.)?google\.[a-z.]+$/i.test(P.hostname)){const t=P.searchParams.get("q")||P.searchParams.get("url");t&&(P=rt(t))}const H=o(f.querySelector("cite")?.textContent),N=H||P?.hostname?.replace(/^www\./i,"")||"サイトを開く",j=o(P?.hostname?.replace(/^www\./i,"")||H).toLowerCase(),I=E.filter(t=>{if(A(t))return!1;if(!(4&t.compareDocumentPosition(b)))return!1;const e=o(t.textContent);return e.length>=2&&e.length<=180&&!r.test(e)&&(!j||e.toLowerCase().includes(j))}).map(t=>o(t.textContent)).sort((t,e)=>e.length-t.length)[0]||N,R=o(I.replace(/https?:\/\/\S+/gi,"")),B=R&&!R.toLowerCase().includes(j)?`${R} · ${N}`:N,F=t.ownerDocument||document,Y=(()=>{const e=[F.body,F.documentElement,F.querySelector("#search"),t];for(const t of e){if(!t)continue;const e=window.getComputedStyle?.(t)?.backgroundColor||"",n=e.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);if(n&&!(void 0!==n[4]&&Number(n[4])<.5))return{color:e,dark:n.slice(1,4).map(Number).reduce((t,e,n)=>{const o=e/255;return t+(o<=.04045?o/12.92:((o+.055)/1.055)**2.4)*[.2126,.7152,.0722][n]},0)<.3}}return{color:"#fff",dark:!1}})(),z=Y.dark?{background:Y.color,text:"#e8eaed",link:"#8ab4f8",muted:"#bdc1c6",divider:"#3c4043"}:{background:Y.color,text:"#202124",link:"#1967d2",muted:"#4d5156",divider:"#eef0f4"},U=F.createElement("generic-autopager-commerce");U.className="generic-autopager-google-commerce-safe",U.setAttribute("role","article"),U.setAttribute("aria-label",p),U.dataset.genericAutopagerCommerceSafe="1";const V=(t,e)=>U.style.setProperty(t,e,"important");V("display","block"),V("position","relative"),V("inset","auto"),V("transform","none"),V("float","none"),V("clear","both"),V("box-sizing","border-box"),V("width","100%"),V("height","auto"),V("min-height","0"),V("max-height","none"),V("margin","0"),V("padding","0"),V("overflow","visible"),V("border","0"),V("border-bottom",`8px solid ${z.divider}`),V("background-color",z.background),V("color",z.text),V("color-scheme",Y.dark?"dark":"light"),V("--ga-background",z.background),V("--ga-text",z.text),V("--ga-link",z.link),V("--ga-muted",z.muted);let D=U;try{D=U.attachShadow({mode:"open"})}catch{}const W=F.createElement("style");W.textContent="\n      :host{color:var(--ga-text,#202124);background:var(--ga-background,#fff);font-family:Arial,sans-serif}\n      .ga-card,.ga-card *{box-sizing:border-box}\n      .ga-card{display:block;position:relative;width:100%;height:auto;min-height:0;padding:2px 16px 20px;overflow:hidden;background:var(--ga-background,#fff)}\n      .ga-site,.ga-title,.ga-image{color:inherit;text-decoration:none}\n      .ga-site{display:block;position:static;overflow:hidden;margin:0 0 10px;font-size:14px;line-height:1.35;white-space:nowrap;text-overflow:ellipsis}\n      .ga-body{display:flex;position:static;align-items:flex-start;gap:12px;width:100%;height:auto}\n      .ga-copy{display:block;position:static;flex:1 1 auto;min-width:0;width:auto;height:auto}\n      .ga-title{display:block;position:static;margin:0 0 9px;color:var(--ga-link,#1967d2);font-size:22px;line-height:1.32}\n      .ga-card h3{display:block;position:static;margin:0;padding:0;color:inherit;font:inherit;font-weight:400;overflow-wrap:anywhere}\n      .ga-snippet{display:block;position:static;margin:0 0 9px;color:var(--ga-muted,#4d5156);font-size:14px;line-height:1.55;overflow-wrap:anywhere}\n      .ga-meta{display:block;position:static;margin:0;color:inherit;font-size:14px;font-weight:500;line-height:1.5;overflow-wrap:anywhere}\n      .ga-image{display:block;position:static;flex:0 0 min(132px,34vw);width:min(132px,34vw);height:auto;margin:2px 0 0}\n      .ga-image img{display:block;position:static;width:100%;height:auto;max-height:148px;margin:0;border-radius:10px;object-fit:contain}\n    ";const O=t=>{const e=F.createElement("a");e.className=t,e.setAttribute("href",x);for(const n of["target","rel","referrerpolicy"]){const t=w.getAttribute(n);t&&e.setAttribute(n,t)}return e},G=F.createElement("div");G.className="ga-card";const _=O("ga-site");_.textContent=B,G.appendChild(_);const J=F.createElement("div");J.className="ga-body";const X=F.createElement("div");X.className="ga-copy";const Z=O("ga-title"),Q=F.createElement("h3");if(Q.textContent=p,Z.appendChild(Q),X.appendChild(Z),T){const t=F.createElement("p");t.className="ga-snippet",t.textContent=T,X.appendChild(t)}if(S){const t=F.createElement("div");t.className="ga-meta",t.textContent=S,X.appendChild(t)}if(J.appendChild(X),q?.score>0){const t=q.image,e=t.getAttribute("src")||t.currentSrc||"";if(e&&!K(e)){const n=O("ga-image"),r=F.createElement("img");r.src=e,r.alt=o(t.alt)||p,r.loading="eager",r.decoding="async";const i=t.getAttribute("referrerpolicy");i&&r.setAttribute("referrerpolicy",i),n.appendChild(r),J.appendChild(n)}}return G.appendChild(J),D.append(W,G),f.replaceWith(U),y(t,e),!0}function b(t){const e=rt(t);return e&&Y(e.href)?(e.searchParams.set("hl","ja"),e.hash="",e.href):String(t||"")}function w(t,e){const n=x(e.textContent),o=E(n),r=[],i=["aria-label","title","data-title","data-text","alt"];for(const c of t.querySelectorAll("*"))for(const t of i){if(!c.hasAttribute(t))continue;const e=x(c.getAttribute(t));A(e)&&r.push(e)}let a="",s=-1;for(const c of new Set(r)){if(c===n)continue;const t=E(c);if(!t)continue;if(o>=3&&t<=o)continue;const e=12*t+Math.min(c.length,100);e>s&&(a=c,s=e)}return a}function v(t,e){const n=x(e);A(n)&&(t.textContent=n,t.setAttribute("title",n),t.setAttribute("aria-label",n))}function x(t){return String(t||"").normalize("NFC").replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,"").replace(/[\s\u00a0]+/g," ").trim()}function E(t){return(String(t||"").match(/[\u3040-\u30ff\u3400-\u9fff]/g)||[]).length}function A(t){const e=x(t);return!(e.length<3||e.length>220||/^(?:YouTube|動画|再生|視聴回数|チャンネル|もっと見る)$/i.test(e)||/^https?:\/\//i.test(e)||/視聴回数\s*[:：]|\d+\s*(?:回視聴|年前|か月前|週間前|日前|時間前)/.test(e))}function S(t){let e=rt(t);if(!e)return null;if(/(^|\.)google\./i.test(e.hostname)&&/^(?:\/url|\/imgres)$/i.test(e.pathname)){const t=e.searchParams.get("url")||e.searchParams.get("q");t&&(e=rt(t))}if(!e)return null;let n="";if(/(^|\.)youtu\.be$/i.test(e.hostname))n=e.pathname.split("/").filter(Boolean)[0]||"";else{if(!/(^|\.)youtube\.com$/i.test(e.hostname))return null;if("/watch"===e.pathname)n=e.searchParams.get("v")||"";else{const t=e.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/i);n=t?.[1]||""}}return/^[A-Za-z0-9_-]{6,20}$/.test(n)?{videoId:n,canonicalUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(n)}`}:null}async function C(t){if(!t?.videoId)return"";if(c.has(t.videoId))return c.get(t.videoId)||"";const e=(async()=>{const e=`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(t.canonicalUrl)}`;try{const t=await fetch(e,{method:"GET",mode:"cors",credentials:"omit",cache:"force-cache",referrerPolicy:"no-referrer",headers:{Accept:"application/json"}});if(t.ok){const e=await t.json(),n=x(e?.title);if(A(n))return n}}catch{}try{const t=await function(t,e=9e3){const n="function"==typeof GM_xmlhttpRequest?GM_xmlhttpRequest:null,o="undefined"!=typeof GM&&"function"==typeof GM?.xmlHttpRequest?GM.xmlHttpRequest.bind(GM):null,r=n||o;return r?new Promise(n=>{let o=!1;const i=t=>{o||(o=!0,n(t||null))},a=t=>{if(!t||t.status&&t.status>=400)return null;if(t.response&&"object"==typeof t.response)return t.response;try{return JSON.parse(t.responseText||"")}catch{return null}};try{const n=r({method:"GET",url:t,timeout:e,responseType:"json",anonymous:!0,headers:{Accept:"application/json"},onload:t=>i(a(t)),onerror:()=>i(null),ontimeout:()=>i(null),onabort:()=>i(null)});n&&"function"==typeof n.then&&n.then(t=>i(a(t))).catch(()=>i(null))}catch{i(null)}}):Promise.resolve(null)}(e,9e3),n=x(t?.title);if(A(n))return n}catch{}try{const e=await async function(t){if(!t?.videoId)return"";const e=`${t.canonicalUrl}&hl=ja&persist_hl=1&bpctr=9999999999`,n=t=>{const e=String(t||"");if(!e)return"";const n=t=>{const e=document.createElement("textarea");return e.innerHTML=String(t||""),x(e.value||e.textContent||"")},o=[/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,/<title>([^<]+)<\/title>/i,/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,/"videoDetails"\s*:\s*\{[^{}]*?"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i];for(const r of o){const t=e.match(r);if(!t?.[1])continue;let o=t[1].replace(/\u0026/g,"&");try{o=o.replace(/\\u([0-9a-fA-F]{4})/g,(t,e)=>String.fromCharCode(parseInt(e,16))),o=o.replace(/\\n/g," ").replace(/\\"/g,'"').replace(/\\\\/g,"\\")}catch{}if(o=n(o).replace(/\s*-\s*YouTube$/i,""),A(o))return o}return""};try{const t=await fetch(e,{method:"GET",mode:"cors",credentials:"omit",cache:"force-cache",referrerPolicy:"no-referrer",headers:{Accept:"text/html,application/xhtml+xml","Accept-Language":"ja,en;q=0.8"}});if(t.ok){const e=n(await t.text());if(A(e))return e}}catch{}try{const t=n(await function(t,e=12e3){const n="function"==typeof GM_xmlhttpRequest?GM_xmlhttpRequest:null,o="undefined"!=typeof GM&&"function"==typeof GM?.xmlHttpRequest?GM.xmlHttpRequest.bind(GM):null,r=n||o;return r?new Promise(n=>{let o=!1;const i=t=>{o||(o=!0,n(String(t||"")))};try{const n=r({method:"GET",url:t,timeout:e,responseType:"text",anonymous:!0,headers:{Accept:"text/html,application/xhtml+xml","Accept-Language":"ja,en;q=0.8"},onload:t=>{if(!t||t.status&&t.status>=400)return i("");i(t.responseText||t.response||"")},onerror:()=>i(""),ontimeout:()=>i(""),onabort:()=>i("")});n&&"function"==typeof n.then&&n.then(t=>{if(!t||t.status&&t.status>=400)return i("");i(t.responseText||t.response||"")}).catch(()=>i(""))}catch{i("")}}):Promise.resolve("")}(e,12e3));if(A(t))return t}catch{}return""}(t);if(A(e))return e}catch{}try{const e=await async function(t){if(!r||!t?.videoId)return"";const e=new URL("/search",location.origin);e.searchParams.set("q",`"${t.canonicalUrl}"`),e.searchParams.set("hl","ja"),e.searchParams.set("gl","jp"),e.searchParams.set("lr","lang_ja"),e.searchParams.set("filter","0");const n=document.createElement("iframe");n.setAttribute("aria-hidden","true"),n.tabIndex=-1,n.style.cssText=["position:fixed!important","left:0!important","top:0!important","width:100vw!important","height:100vh!important","border:0!important","opacity:.001!important","pointer-events:none!important","z-index:-2147483647!important"].join(";");try{await g(n,e.href,8500);const o=n.contentDocument;if(!o)return"";const r=await p(o,5e3);for(const e of r.querySelectorAll("a[href]")){const n=S(e.getAttribute("href")||e.href);if(!n||n.videoId!==t.videoId)continue;let o=e;for(let t=0;o&&o!==r&&t<10&&!o.querySelector?.('h3,[role="heading"]');t+=1)o=o.parentElement;if(!o||o===r)continue;const i=o.querySelector('h3,[role="heading"]');if(!i)continue;const a=w(o,i),s=x(i.textContent),c=a||s;if(A(c))return c}}finally{n.remove()}return""}(t);if(A(e))return e}catch{}return""})();c.set(t.videoId,e);const n=await e;if(c.set(t.videoId,n),c.size>80)for(const[o,r]of c)if((!r||"function"!=typeof r.then)&&(c.delete(o),c.size<=80))break;return n}function M(t){if(!t)return;const e=new Set,n=(t,e)=>{const n=Number.parseFloat(t.getAttribute(e)||"");if(Number.isFinite(n)&&n>0)return n;const o=Number.parseFloat(t.style?.[e]||"");if(Number.isFinite(o)&&o>0)return o;const r="width"===e?t.naturalWidth:t.naturalHeight;if(Number.isFinite(r)&&r>0)return r;const i=t.getBoundingClientRect?.(),a="width"===e?i?.width:i?.height;return Number.isFinite(a)&&a>0?a:0},o=t=>{if(!t||t.closest(".generic-autopager-divider"))return!1;const e=n(t,"width"),o=n(t,"height"),r=e>=72&&o>=48,i=`${t.className||""} ${t.id||""}`,a=/(?:favicon|logo|avatar|profile|icon)/i.test(i);if(a&&!r)return!1;if(r)return!0;const s=t.getAttribute("src")||t.getAttribute("data-src")||"";return Boolean(s)&&!K(s)&&!a},r=t=>Array.from(t?.querySelectorAll?.("img")||[]).filter(o),i=e=>{let n=e.parentElement,o=null;for(let i=0;n&&n!==t&&i<10;i+=1){const t=r(n),e=n.querySelectorAll("h3").length,i=(n.textContent||"").trim().length;if(t.length>=3&&t.length<=12&&e<=1&&i<2600){o=n;break}n=n.parentElement}return o},a=(t,e)=>{if(!t||e.length<3)return null;for(const n of e){let o=n.parentElement;for(let n=0;o&&o!==t&&n<8;n+=1){const t=e.filter(t=>o.contains(t)),n=(o.textContent||"").replace(/\s+/g," ").trim().length,r=Boolean(o.querySelector("h3"));if(t.length>=3&&t.length<=12&&!r&&n<500)return o;o=o.parentElement}}return null},s=(t,n)=>{if(!t||!n||e.has(t))return;e.add(t);let o=n.closest("a[href]");o&&t.contains(o)&&!o.querySelector("h3")||(o=n);const r=o.cloneNode(!0);t.replaceChildren(r),t.dataset.genericAutopagerMediaFixed="true";const i=(t,e,n)=>t?.style?.setProperty(e,n,"important");i(t,"display","block"),i(t,"position","relative"),i(t,"inset","auto"),i(t,"transform","none"),i(t,"width","100%"),i(t,"height","auto"),i(t,"min-height","0"),i(t,"max-height","none"),i(t,"overflow","visible"),i(t,"margin","10px 0 14px"),i(t,"padding","0"),i(r,"display","inline-block"),i(r,"position","relative"),i(r,"inset","auto"),i(r,"transform","none"),i(r,"width","auto"),i(r,"height","auto"),i(r,"min-height","0"),i(r,"margin","0"),i(r,"padding","0");const a=r.matches?.("img")?r:r.querySelector?.("img");a&&(a.removeAttribute("width"),a.removeAttribute("height"),a.removeAttribute("srcset"),i(a,"display","block"),i(a,"position","static"),i(a,"inset","auto"),i(a,"transform","none"),i(a,"width","min(176px, 46vw)"),i(a,"height","auto"),i(a,"max-height","142px"),i(a,"object-fit","cover"),i(a,"margin","0"))},c=t=>Array.from(t?.querySelectorAll?.("a[href]")||[]).some(t=>/(?:youtube\.com|youtu\.be)/i.test(t.getAttribute("href")||"")),l=e=>{let n=e,o=null;for(let r=0;n&&n!==t&&r<12;r+=1){const t=n.querySelectorAll?.("h3")?.length||0,e=(n.textContent||"").replace(/\s+/g," ").trim().length;if(1===t&&e<3200&&(o=n),n.matches?.(".MjjYud,.g,[data-snhf],[data-hveid]")&&1===t&&e<3200)return n;n=n.parentElement}return o};for(const m of Array.from(t.querySelectorAll('g-scrolling-carousel,[role="list"][data-attrid*="image" i],[jscontroller][data-attrid*="image" i]'))){const t=r(m);if(t.length<3||t.length>20)continue;const e=l(m);e&&!c(e)&&s(m,t[0])}for(const m of Array.from(t.querySelectorAll("h3"))){const t=i(m)||l(m);if(!t||c(t))continue;const e=r(t);if(e.length<3||e.length>20)continue;const n=new Map;for(const r of e){let e=r;for(;e.parentElement&&e.parentElement!==t;)e=e.parentElement;e&&e!==t&&(n.has(e)||n.set(e,[]),n.get(e).push(r))}const o=Array.from(n.entries()).filter(([,t])=>t.length>=3).sort((t,e)=>e[1].length-t[1].length)[0];if(o){s(o[0],o[1][0]),t.style.setProperty("height","auto","important"),t.style.setProperty("min-height","0","important"),t.style.setProperty("max-height","none","important");continue}const a=Array.from(n.entries()).filter(([t,e])=>1===e.length&&!t.querySelector("h3")&&(t.textContent||"").replace(/\s+/g," ").trim().length<220);if(a.length>=3){const[e,n]=a[0];s(e,n[0]);for(const[t]of a.slice(1))t.remove();t.style.setProperty("height","auto","important"),t.style.setProperty("min-height","0","important"),t.style.setProperty("max-height","none","important"),t.style.setProperty("overflow","visible","important")}}for(const m of Array.from(t.querySelectorAll("h3"))){const t=i(m);if(!t)continue;if(Array.from(t.querySelectorAll("a[href]")).map(t=>t.getAttribute("href")||"").some(t=>/(?:youtube\.com|youtu\.be)/i.test(t)))continue;if(t.querySelectorAll("h3").length>1)continue;const e=r(t);if(e.length<3||e.length>12)continue;const n=a(t,e);n&&s(n,e[0])}const u=new Set;for(const m of Array.from(t.querySelectorAll("img"))){if(!o(m))continue;const t=l(m)||m.closest(".MjjYud,.g,[data-hveid],[data-ved],article,div");if(!t||u.has(t)||c(t))continue;u.add(t);const e=r(t);if(e.length<3||e.length>20)continue;const n=e.map(t=>({img:t,rect:t.getBoundingClientRect?.()})).filter(t=>t.rect&&t.rect.width>10&&t.rect.height>10);if(n.length<3)continue;const i=n.map(t=>t.rect.top).sort((t,e)=>t-e),a=i[i.length-1]-i[0],d=t.getBoundingClientRect?.(),h=Math.max(d?.height||0,t.scrollHeight||0);if(a<220&&h<520)continue;const f=[],g=new Set;for(const{img:o}of n){let e=o;for(;e.parentElement&&e.parentElement!==t;)e=e.parentElement;e&&e!==t&&!g.has(e)&&(g.add(e),f.push({child:e,img:o}))}if(!(f.length<3)){s(f[0].child,f[0].img);for(const{child:t}of f.slice(1))t.remove();t.style.setProperty("height","auto","important"),t.style.setProperty("min-height","0","important"),t.style.setProperty("max-height","none","important"),t.style.setProperty("overflow","visible","important")}}!function(t){if(!t?.isConnected)return;const e=t=>String(t||"").replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g," ").trim(),n=/(?:[¥￥$€£]\s?[\d,.]+|[\d,.]+\s*円|在庫|送料無料|評価|レビュー|[★☆⭐]{3,})/i,o=new Set;if(t.dataset.genericGoogleProductSignalV66||(t.dataset.genericGoogleProductSignalV66=n.test(e(t.textContent))?"1":"0"),"1"!==t.dataset.genericGoogleProductSignalV66)return;const r=t=>{const e=t?.getBoundingClientRect?.();return!e||e.width<8||e.height<7?null:e},i=(t,e)=>{if(!t||!e)return!1;const n=Math.min(t.right,e.right)-Math.max(t.left,e.left),o=Math.min(t.bottom,e.bottom)-Math.max(t.top,e.top);return n>.28*Math.min(t.width,e.width)&&o>.38*Math.min(t.height,e.height)},a=o=>{let r=o.parentElement,i=null;for(let a=0;r&&r!==t&&a<11;a+=1){const t=e(r.textContent);if(t.length>3600||1!==r.querySelectorAll("h3").length)r=r.parentElement;else{if(n.test(t)&&(i=r),i===r&&r.matches(".MjjYud,.g,[data-snhf],[data-hveid],[data-ved],article"))return r;r=r.parentElement}}return i},s=t=>{const e=window.getComputedStyle(t),n=["marginTop","marginRight","marginBottom","marginLeft"].some(t=>Number.parseFloat(e[t]||"0")<-1);return/^(?:absolute|fixed|sticky)$/i.test(e.position)||e.transform&&"none"!==e.transform||n},c=(t,e,n)=>t?.style?.setProperty(e,n,"important");for(const l of t.querySelectorAll("h3")){const t=a(l);if(!t||o.has(t)||"1"===t.dataset.genericGoogleOverlapFixedV66)continue;o.add(t);const n=[],u=[l,...t.querySelectorAll('p,div,span,[role="heading"],img')];for(const o of u.slice(0,180)){if(o!==l&&o.querySelector?.('h3,[role="heading"]'))continue;if("true"===o.getAttribute?.("aria-hidden"))continue;if(o.matches?.("img")){const t=r(o);t&&t.width>=48&&t.height>=38&&n.push({element:o,rect:t});continue}const t=e(o.textContent);if(t.length<2||t.length>520)continue;if(Array.from(o.children||[]).some(n=>e(n.textContent)===t))continue;const i=r(o);i&&n.push({element:o,rect:i})}let m=null;for(let e=0;e<n.length&&!m;e+=1)for(let t=e+1;t<n.length;t+=1){const o=n[e],r=n[t];if(!o.element.contains(r.element)&&!r.element.contains(o.element)&&i(o.rect,r.rect)){m=[o.element,r.element];break}}if(!m)continue;const d=new Set,h=new Set([l,l.closest("a[href]")].filter(Boolean)),f=e=>{d.add(e);let n=e,o=e;for(let r=0;n&&n!==t&&r<9;r+=1)s(n)&&d.add(n),o=n,n=n.parentElement;o&&o!==t&&h.add(o),e.matches?.("span,img")||h.add(e)};m.forEach(f);for(const o of Array.from(t.querySelectorAll("*")).slice(0,220))s(o)&&(e(o.textContent)||o.matches("img")||o.querySelector("img"))&&f(o);const g=[];for(const e of t.querySelectorAll("img")){const t=r(e);!t||t.width<48||t.height<38||n.some(n=>!n.element.contains(e)&&!e.contains(n.element)&&i(t,n.rect))&&(g.push(e),f(e))}t.dataset.genericGoogleOverlapFixedV66="1",c(t,"display","flow-root"),c(t,"position","relative"),c(t,"inset","auto"),c(t,"transform","none"),c(t,"box-sizing","border-box"),c(t,"width","100%"),c(t,"height","auto"),c(t,"min-height","0"),c(t,"max-height","none"),c(t,"overflow","visible");for(const e of d)c(e,"position","static"),c(e,"inset","auto"),c(e,"top","auto"),c(e,"right","auto"),c(e,"bottom","auto"),c(e,"left","auto"),c(e,"transform","none"),c(e,"translate","none"),c(e,"float","none"),c(e,"grid-area","auto"),c(e,"z-index","auto"),c(e,"width","auto"),c(e,"height","auto"),c(e,"min-height","0"),c(e,"max-height","none"),c(e,"margin-left","0"),c(e,"margin-right","0");for(const e of h)c(e,"display","block"),c(e,"clear","both"),c(e,"width","auto"),c(e,"height","auto"),c(e,"margin-top","5px"),c(e,"margin-bottom","5px");for(const e of g)c(e,"display","block"),c(e,"position","static"),c(e,"inset","auto"),c(e,"transform","none"),c(e,"float","none"),c(e,"width","auto"),c(e,"height","auto"),c(e,"max-width","132px"),c(e,"max-height","132px"),c(e,"object-fit","contain"),c(e,"margin","8px 0")}}(t)}function $(e,n,o){if(Y(n)){const o=function(e,n){const o=["a#pnnext[href]",'a[aria-label="Next page"][href]','a[aria-label="次へ"][href]','a[aria-label*="次のページ"][href]','a[rel~="next" i][href]','nav a[href*="start="]','[role="navigation"] a[href*="start="]','a[href*="/search?"][href*="start="]'];for(const c of o)for(const o of e.querySelectorAll(c)){const e=et(o,n);if(!nt(e,n))continue;const r=rt(n),i=rt(e);if(!r||!i)continue;const a=V(r.searchParams.get("start"))??0,s=V(i.searchParams.get("start"));if(null!==s&&s>a)return t.googleForceJapaneseUi?b(i.href):i.href}const r=rt(n);if(!r||!Y(r.href))return null;const i=V(r.searchParams.get("start"))??0,a=V(r.searchParams.get("num")),s=a&&a>=1&&a<=100?a:10;return r.searchParams.set("start",String(i+s)),r.searchParams.delete("sei"),r.searchParams.delete("ved"),r.hash="",t.googleForceJapaneseUi?b(r.href):r.href}(e,n);if(nt(o,n))return o}const r=function(t,e){const n=rt(e);if(!n||!/(^|\.)supjav\.com$/i.test(n.hostname))return null;if(!/^\/category\/[^/?#]+(?:\/page\/\d+)?\/?$/i.test(n.pathname))return null;const o=['link[rel~="next" i][href]','a[rel~="next" i][href]',".pagination a.next[href]",".pagination .next a[href]",".nav-links a.next[href]",".page-numbers.next[href]","a.next[href]"];for(const i of o)for(const o of t.querySelectorAll(i)){const t=et(o,e);if(!nt(t,e))continue;const r=rt(t);if(r&&r.origin===n.origin&&/^\/category\/[^/?#]+\/page\/\d+\/?$/i.test(r.pathname))return r.href}const r=n.pathname.match(/\/page\/(\d+)\/?$/i),a=r?Number(r[1]):1;if(!Number.isFinite(a)||a<1)return null;const s=a+1;for(const u of t.querySelectorAll(i+",.nav-links,.page-numbers"))for(const t of u.querySelectorAll("a[href]")){const o=et(t,e),r=rt(o);if(!r||r.origin!==n.origin)continue;const i=r.pathname.match(/\/page\/(\d+)\/?$/i);if(i&&Number(i[1])===s)return r.href;if(tt(t.textContent)===s&&nt(o,e))return o}let c=n.pathname.replace(/\/page\/\d+\/?$/i,"/");c.endsWith("/")||(c+="/");const l=new URL(n.href);return l.pathname=`${c}page/${s}/`.replace(/\/{2,}/g,"/"),l.search=n.search,l.hash="",l.href}(e,n);if(nt(r,n))return r;if(o?.next){const t=et(it(e,o.next),n);if(nt(t,n))return t}const a=et(e.querySelector('link[rel~="next" i][href], a[rel~="next" i][href]'),n);if(nt(a,n))return a;const s=Array.from(e.querySelectorAll("a[href]"));let c=null;for(const t of s){const e=et(t,n);if(!nt(e,n))continue;const o=D(t,e,n);(!c||o>c.score)&&(c={href:e,score:o})}if(c&&c.score>=280)return c.href;for(const t of e.querySelectorAll(i)){const e=W(t,n);if(e)return e}return null}function T(t){const e=Math.max(0,Number(t)||0),n=[0,200,450,900,1200,2200,3e3];return n.reduce((t,n)=>Math.abs(n-e)<Math.abs(t-e)?n:t,n[0])}function L(t,e){return t?.query?t.query(e):Array.from(document.querySelectorAll(e))}function k(t){return Boolean(t instanceof Element&&t.closest(n))}function q(t){const n=e?.activeContext;return n&&t instanceof Element?(n.rectCache.has(t)||n.rectCache.set(t,t.getBoundingClientRect()),n.rectCache.get(t)):t.getBoundingClientRect()}function P(t){const n=e?.activeContext;return n&&t instanceof Element?(n.styleCache.has(t)||n.styleCache.set(t,window.getComputedStyle(t)),n.styleCache.get(t)):window.getComputedStyle(t)}function H(t,n=!1){if(!(t instanceof Element))return"";const o=e?.activeContext;if(!o)return String(n?t.innerText||t.textContent||"":t.textContent||"");let r=o.textCache.get(t);r||(r={},o.textCache.set(t,r));const i=n?"inner":"text";return i in r||(r[i]=String(n?t.innerText||t.textContent||"":t.textContent||"")),r[i]}function N(t,n={}){const o=e;if(!o||!t?.size)return;if(document.hidden)return void(o.pendingFull=!0);if(o.running)return void(o.pendingFull=!0);const r=function({full:t=!0,roots:e=[]}={}){const n=new Map;return{full:t,roots:Array.from(e).filter(t=>t instanceof Element&&t.isConnected),queryCache:n,rectCache:new WeakMap,styleCache:new WeakMap,textCache:new WeakMap,beginScanner(){this.rectCache=new WeakMap,this.styleCache=new WeakMap,this.textCache=new WeakMap},query(e){if(n.has(e))return n.get(e);let o;if(t)o=Array.from(document.querySelectorAll(e));else{const t=new Set,n=n=>{n instanceof Element&&n.matches(e)&&t.add(n)};for(const o of this.roots){n(o);for(const n of o.querySelectorAll(e))t.add(n);let r=o.parentElement;for(let t=0;r&&t<7&&r!==document.body&&r!==document.documentElement;t+=1)n(r),r=r.parentElement}o=Array.from(t)}return n.set(e,o),o}}}(n);o.running=!0;try{for(const e of Array.from(t))try{r.beginScanner(),o.activeContext=r,e(r)}catch(i){console.warn("[Android AutoPager] Yahoo scan failed",i)}}finally{o.activeContext=null,o.running=!1,o.pendingFull&&(o.pendingFull=!1,B(80))}}function j(t,e,n){t[e]&&window.cancelAnimationFrame(t[e]),t[e]=window.requestAnimationFrame(()=>{t[e]=0,n()})}function I(t,e){let n=e instanceof Element?e:e?.parentElement;if(!(n instanceof Element&&n.isConnected))return!1;if(/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/i.test(n.tagName))return!1;if(n===document.body||n===document.documentElement)return t.forceIncrementalFull=!0,t.mutationRoots.clear(),!0;if(t.forceIncrementalFull)return!0;for(const o of Array.from(t.mutationRoots)){if(o===n||o.contains(n))return!0;n.contains(o)&&t.mutationRoots.delete(o)}return t.mutationRoots.add(n),t.mutationRoots.size>48&&(t.forceIncrementalFull=!0,t.mutationRoots.clear()),!0}function R(t,e){const n=t instanceof Element?t:null;if(!n)return!1;const o='nav,[role="tablist"],img,picture';if(n.matches(o)||n.querySelector(o))return!0;if(n.querySelectorAll("*").length>80)return!0;const r=String(n.textContent||"");if(/あなたにおすすめ|新着[\s\S]{0,120}(?:政治|社会|国内|経済)|経済総合[\s\S]{0,100}(?:市況|株式|産業)/.test(r))return!0;for(const i of[n.previousElementSibling,n.nextElementSibling]){if(!(i instanceof Element))continue;if(i.matches(o)||i.querySelector(o))return!0;const t=String(i.textContent||"");if(/あなたにおすすめ|経済総合|市況|株式|産業/.test(t))return!0}return e instanceof Element&&e.children.length<=12&&Boolean(e.querySelector(o))}function B(t=180){const n=e;n&&(document.hidden?n.pendingFull=!0:(window.clearTimeout(n.fullTimer),n.fullTimer=window.setTimeout(()=>{n.fullTimer=0,j(n,"fullFrame",()=>{window.clearTimeout(n.mutationTimer),window.clearTimeout(n.structuralTimer),n.mutationTimer=0,n.structuralTimer=0,n.mutationRoots.clear(),n.forceIncrementalFull=!1,N(n.scanners,{full:!0})})},Math.max(0,Number(t)||0))))}function F(t,n=[250,900,2200],o={}){if("function"!=typeof t)return;if(!e){const t={scanners:new Set,incrementalScanners:new Set,structuralScanners:new Set,scannerInterests:new Map,bootstrapBuckets:new Map,mutationRoots:new Set,forceIncrementalFull:!1,mutationTimer:0,structuralTimer:0,fullTimer:0,mutationFrame:0,structuralFrame:0,fullFrame:0,running:!1,pendingFull:!1,activeContext:null,observer:null};e=t,t.observer=new MutationObserver(n=>{let o=!1,r=!1;for(const e of n){for(const n of e.addedNodes)(n.nodeType!==Node.TEXT_NODE||String(n.nodeValue||"").trim())&&I(t,n)&&(o=!0,R(n,e.target)&&(r=!0));e.removedNodes.length&&I(t,e.target)&&(o=!0,Array.from(e.removedNodes).some(t=>t instanceof Element)&&(r=!0))}o&&function(t=180){const n=e;n&&n.incrementalScanners.size&&(document.hidden?n.pendingFull=!0:(window.clearTimeout(n.mutationTimer),n.mutationTimer=window.setTimeout(()=>{n.mutationTimer=0;const t=function(t){const e=Array.from(t.mutationRoots);t.mutationRoots.clear();const n=t.forceIncrementalFull;return t.forceIncrementalFull=!1,{full:n,roots:e}}(n);if(!t.full&&!t.roots.length)return;const e=function(t,e,n){if(n.full||!t.scannerInterests.size)return e;const o=[],r=new Set,i=new Set(n.roots);let a=0;for(const l of n.roots){let t=l;for(let n=0;t&&n<7&&t!==document.body&&t!==document.documentElement;n+=1,t=t.parentElement){if(r.has(t))continue;r.add(t);const n=String(t.textContent||"");if(n.length>6e3){if(i.has(t))return e}else{if(a+=n.length,a>18e3)return e;o.push(n)}}}const s=o.join("\n"),c=new Set;for(const l of e){const e=t.scannerInterests.get(l);if(e)try{e.lastIndex=0,e.test(s)&&c.add(l)}catch{c.add(l)}else c.add(l)}return c}(n,n.incrementalScanners,t);e.size&&j(n,"mutationFrame",()=>{N(e,t)})},Math.max(0,Number(t)||0))))}(180),r&&function(t=700){const n=e;n&&n.structuralScanners.size&&(document.hidden?n.pendingFull=!0:(window.clearTimeout(n.structuralTimer),n.structuralTimer=window.setTimeout(()=>{n.structuralTimer=0,j(n,"structuralFrame",()=>{N(n.structuralScanners,{full:!0})})},Math.max(0,Number(t)||0))))}(700)}),t.observer.observe(document.body||document.documentElement,{childList:!0,subtree:!0}),document.addEventListener("visibilitychange",()=>{!document.hidden&&t.pendingFull&&(t.pendingFull=!1,B(0))},{passive:!0})}const r=e;r.scanners.add(t),o.incremental?r.incrementalScanners.add(t):r.structuralScanners.add(t),o.interest instanceof RegExp&&r.scannerInterests.set(t,o.interest);for(const e of new Set(/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)&&"/"===location.pathname?[0,...n]:n)){const n=T(e);let o=r.bootstrapBuckets.get(n);o||(o={scanners:new Set,timer:0,run:()=>{r.bootstrapBuckets.delete(n),N(o.scanners,{full:!0}),0===n&&/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)&&"/"===location.pathname&&document.dispatchEvent(new Event("generic-yahoo-initial-ready-v619"))}},r.bootstrapBuckets.set(n,o),o.timer=0===n&&/(^|\.)news\.yahoo\.co\.jp$/i.test(location.hostname)&&"/"===location.pathname&&!document.hidden?window.requestAnimationFrame(()=>{o.timer=window.setTimeout(o.run,0)}):window.setTimeout(o.run,n)),o.scanners.add(t)}}function Y(t){const e=rt(t);if(!e)return!1;if(!/^(?:www\.)?google\.[a-z.]+$/i.test(e.hostname))return!1;if("/search"!==e.pathname)return!1;if(!e.searchParams.get("q"))return!1;const n=(e.searchParams.get("tbm")||"").toLowerCase(),o=(e.searchParams.get("udm")||"").toLowerCase();return"isch"!==n&&"2"!==o}function z(t,e){if(!t)return"";const n=[],o=new Set;for(const r of t.querySelectorAll("a[href]")){let t=et(r,e);if(!t)continue;const i=rt(t);if(!i)continue;if(/^(?:www\.)?google\.[a-z.]+$/i.test(i.hostname)&&"/url"===i.pathname){const e=i.searchParams.get("q")||i.searchParams.get("url");e&&(t=e)}const a=rt(t);if(!a||!/^https?:$/.test(a.protocol))continue;if(/^(?:www\.)?google\.[a-z.]+$/i.test(a.hostname))continue;a.hash="";const s=a.href;if(!o.has(s)&&(o.add(s),n.push(s),n.length>=8))break}return n.length?n.join("\n"):""}function U(t){const e=`${st(t.title)}\n${st(t.body?.textContent).slice(0,5e3)}`;return/unusual traffic|通常と異なるトラフィック|自動化されたクエリ/i.test(e)?"Google側で自動取得が制限されました":/before you continue|続行する前に|consent\.google/i.test(e)?"Googleの同意画面が返されました":/recaptcha|ロボットではありません/i.test(e)?"Googleの確認画面が返されました":""}function V(t){if(null===t||""===t)return null;if(!/^\d+$/.test(String(t)))return null;const e=Number(t);return Number.isSafeInteger(e)&&e>=0?e:null}function D(t,e,n){const o=st(t.textContent),r=st([t.getAttribute("aria-label"),t.getAttribute("title")].filter(Boolean).join(" ")),a=`${t.className||""} ${t.id||""}`.toLowerCase(),s=Boolean(t.closest(i)),c=Boolean(t.closest('.carousel,.slider,.swiper,.gallery,[class*="carousel" i],[class*="slider" i],[class*="swiper" i]'));if("true"===t.getAttribute("aria-disabled")||/(^|\s)(disabled|is-disabled)(\s|$)/i.test(t.className||""))return-1e3;let l=0;s&&(l+=330),c&&(l-=600),/^(次へ|次のページ|次ページ|つぎへ|next|next page|older|more|›|»|→)$/i.test(o)&&(l+=300),/(次へ|次のページ|次ページ|next|older)/i.test(r)&&(l+=260),/(^|[-_\s])(next|older)([-_\s]|$)/i.test(a)&&(l+=170),/pagination|pager|paging/i.test(a)&&(l+=80),function(t,e){const n=rt(e),o=rt(t);if(!n||!o)return!1;const r=["page","paged","p","pg","start","offset","pageNo","pageNum"];for(const i of r)if(n.searchParams.get(i)!==o.searchParams.get(i)&&o.searchParams.has(i))return!0;return!!/\/(page|paged|p)\/\d+\/?$/i.test(o.pathname)||!(!/[-_/](\d+)\/?$/i.test(o.pathname)||o.pathname===n.pathname)}(e,n)&&(l+=230);const u=rt(n),m=rt(e);return u&&m&&u.origin===m.origin&&(l+=30),!s&&t.closest("article,.article,.post,.entry")&&(l-=160),l}function W(t,e){const n=t.querySelector('[aria-current="page"],.current,.active,.selected,[class*="current" i],[class*="active" i]');let o=tt(n?.textContent);if(Number.isFinite(o)||(o=function(t){const e=rt(t);if(!e)return NaN;for(const o of["page","paged","p","pg","pageNo","pageNum"]){const t=Number(e.searchParams.get(o));if(Number.isFinite(t)&&t>=1)return t}const n=e.pathname.match(/\/(?:page|paged|p)\/(\d+)\/?$/i);return n?Number(n[1]):NaN}(e)),!Number.isFinite(o))return null;const r=Array.from(t.querySelectorAll("a[href]")).map(t=>({number:tt(t.textContent),href:et(t,e)})).filter(t=>Number.isFinite(t.number)&&t.number>o&&nt(t.href,e)).sort((t,e)=>t.number-e.number);return r[0]?.href||null}function O(t,e){if(r)return it(t,"#rso")||it(t,"#search [role=main]")||it(t,"#search")||null;if(e?.content){const n=it(t,e.content);if(n)return n}const n=[],o=new Set;for(const r of a)for(const e of t.querySelectorAll(r))o.has(e)||(o.add(e),n.push(e));if(!n.length)return t.body||null;let i=null;for(const r of n){const t=G(r);(!i||t>i.score)&&(i={element:r,score:t})}return i?.element||t.body||null}function G(t){const e=(t.textContent||"").trim().length,n=t.querySelectorAll('article,li,.item,.result,.product,.post,.entry,[class*="result" i],[class*="product" i]').length,o=t.querySelectorAll("a[href]").length,r=Boolean(t.querySelector(i));let a=Math.min(e,2e4)/20;return a+=18*Math.min(n,100),a+=2*Math.min(o,200),r&&(a+=300),t.matches('main,[role="main"]')&&(a+=180),/search|result|product|post|entry|content|main/i.test(`${t.id} ${t.className}`)&&(a+=140),t.matches("header,footer,nav,aside")&&(a-=1e3),a}function _(t,e){if(!t)return!1;let n=!1;const o=["img","source","[data-bg]","[data-background]","[data-background-image]","[data-lazy-bg]"].join(","),r=[];t.matches?.(o)&&r.push(t),r.push(...t.querySelectorAll(o));for(const i of r){if(!i.matches("img"))continue;const t=X(i,["data-src","data-lazy-src","data-original","data-original-src","data-image-src","data-image-url","data-thumbnail-src","data-thumbnail-url","data-iurl","data-ou"]),o=i.getAttribute("src")||"";(!o||/^data:image\//i.test(o)||t||i.hasAttribute("data-cfsrc")||i.hasAttribute("data-url")||i.hasAttribute("data-image"))&&(n=!0),!t||o&&!K(o)||Z(i,"src",t,e);const r=X(i,["data-srcset","data-lazy-srcset","data-original-srcset"]);r&&(n=!0,i.setAttribute("srcset",Q(r,e))),i.setAttribute("loading",/(^|\.)buzzap\.jp$/i.test(location.hostname)?"lazy":"eager"),i.setAttribute("decoding","async"),/(^|\.)buzzap\.jp$/i.test(location.hostname)&&i.setAttribute("fetchpriority","low"),i.removeAttribute("hidden"),i.removeAttribute("data-deferred"),i.removeAttribute("aria-hidden"),i.style.setProperty("opacity","1","important"),i.style.setProperty("visibility","visible","important"),i.closest("g-img")&&"none"===i.style.display&&i.style.setProperty("display","block","important")}for(const i of r){if(!i.matches("source"))continue;const t=X(i,["data-srcset","data-lazy-srcset","data-original-srcset"]);t&&(n=!0,i.setAttribute("srcset",Q(t,e)))}for(const i of r){if(i.matches("img,source"))continue;const t=X(i,["data-bg","data-background","data-background-image","data-lazy-bg"]);if(!t)continue;n=!0;const o=t.match(/^url\((['"]?)(.*?)\1\)$/i),r=o?o[2]:t;try{i.style.setProperty("background-image",`url("${new URL(r,e).href.replace(/"/g,"%22")}")`,"important")}catch{}}return n}function J(t,e){if(!/(^|\.)supjav\.com$/i.test(location.hostname))return;if(!t)return;const n=t=>{const n=String(t||"").trim();if(!n||/^(?:data:|blob:|javascript:|#)/i.test(n))return n;try{return new URL(n,e||location.href).href}catch{return n}},o=(t,e)=>{for(const n of e){const e=t.getAttribute(n);if(!e||!e.trim())continue;const o=e.trim();if(!/^(?:data:image\/svg\+xml|data:image\/gif;base64)/i.test(o))return o}return""},r=t=>{const e=String(t||"").trim().toLowerCase();return!(e&&!K(e)&&!/placeholder|blank\.(?:gif|png|jpg|webp)|lazy(?:load|loader)?|transparent|spacer/i.test(e)&&!/^data:image\//i.test(e))},i=[];t.matches?.("img")&&i.push(t),i.push(...t.querySelectorAll("img"));for(const a of i){const t=o(a,["data-src","data-lazy-src","data-original","data-original-src","data-cfsrc","data-url","data-image","data-image-src","data-lazy","data-echo","data-orig-file","data-large-file","data-medium-file","data-thumbnail-src","data-thumb","data-poster"]),i=a.getAttribute("src")||"";t&&(r(i)||i!==n(t))&&a.setAttribute("src",n(t));const s=o(a,["data-srcset","data-lazy-srcset","data-original-srcset","data-cfsrcset"]);if(s&&a.setAttribute("srcset",Q(s,e)),(!a.getAttribute("src")||r(a.getAttribute("src")))&&a.getAttribute("srcset")){const t=a.getAttribute("srcset").split(",")[0]?.trim().split(/\s+/)[0];t&&a.setAttribute("src",n(t))}a.setAttribute("loading","eager"),a.setAttribute("decoding","async"),a.removeAttribute("hidden"),a.removeAttribute("aria-hidden"),a.removeAttribute("data-deferred"),a.classList.remove("lazy","lazyload","lazy-load","lazy-loading","lozad","unveil"),a.classList.add("lazyloaded"),a.style.setProperty("display","block","important"),a.style.setProperty("opacity","1","important"),a.style.setProperty("visibility","visible","important"),a.style.removeProperty("filter")}for(const a of t.querySelectorAll("picture source, source[data-srcset], source[data-lazy-srcset]")){const t=o(a,["data-srcset","data-lazy-srcset","data-original-srcset","data-cfsrcset"]);t&&a.setAttribute("srcset",Q(t,e))}for(const a of t.querySelectorAll("noscript")){const t=a.textContent||a.innerHTML||"";if(!/<img\b/i.test(t))continue;const o=(new DOMParser).parseFromString(t,"text/html").querySelector("img");if(!o)continue;const i=a.parentElement;if(!i)continue;const s=i.querySelector("img"),c=o.getAttribute("src")||o.getAttribute("data-src")||"";if(s&&c&&r(s.getAttribute("src")||"")){s.setAttribute("src",n(c));const t=o.getAttribute("srcset");t&&s.setAttribute("srcset",Q(t,e)),s.style.setProperty("display","block","important"),s.style.setProperty("opacity","1","important"),s.style.setProperty("visibility","visible","important")}}for(const a of t.querySelectorAll("[data-src]:not(img),[data-bg],[data-background],[data-lazy-bg],[data-background-image]")){const t=o(a,["data-bg","data-background","data-lazy-bg","data-background-image"]);if(!t)continue;const e=t.match(/^url\((['"]?)(.*?)\1\)$/i),r=n(e?e[2]:t);r&&a.style.setProperty("background-image",`url("${r.replace(/"/g,"%22")}")`,"important"),a.style.setProperty("opacity","1","important"),a.style.setProperty("visibility","visible","important")}}function X(t,e){for(const n of e){const e=t.getAttribute(n);if(e&&e.trim())return e.trim()}return""}function K(t){const e=String(t||"").trim().toLowerCase();return!(e&&"about:blank"!==e&&!e.startsWith("data:image/gif;base64,r0lgodlhaqaba")&&!e.startsWith("data:image/png;base64,ivborw0kgoaaaansuheugaaaaeaaaab")&&(!e.startsWith("data:image/svg+xml")||!/transparent|opacity%3d.?0|fill%3d.?none/.test(e)))}function Z(t,e,n,o){try{t.setAttribute(e,new URL(n,o).href)}catch{t.setAttribute(e,n)}}function Q(t,e){return t.split(",").map(t=>{const n=t.trim(),o=n.match(/^(\S+)(\s+.+)?$/);if(!o)return n;try{return`${new URL(o[1],e).href}${o[2]||""}`}catch{return n}}).join(", ")}function tt(t){const e=st(t);return/^\d+$/.test(e)?Number(e):NaN}function et(t,e){if(!t)return null;const n=t.getAttribute?.("href");if(!n)return null;try{return new URL(n,e).href}catch{return null}}function nt(t,e){if(!t)return!1;const n=rt(t),o=rt(e);return!(!n||!o||!/^https?:$/.test(n.protocol)||n.origin!==location.origin||ot(n.href)===ot(o.href))}function ot(t){const e=rt(t);return e?(e.hash="",e.href):String(t||"")}function rt(t){try{return new URL(t,location.href)}catch{return null}}function it(t,e){try{return t.querySelector(e)}catch(n){return console.warn("[Generic AutoPager] CSS selector error:",e,n),null}}function at(t){return window.CSS?.escape?CSS.escape(t):String(t).replace(/[^a-zA-Z0-9_-]/g,t=>`\\${t}`)}function st(t){return String(t||"").replace(/[\s\u00a0]+/g," ").trim()}function ct(){const t=document.scrollingElement||document.documentElement;return t.scrollHeight-(t.scrollTop+window.innerHeight)}function lt(t){l.stopped=!0,/最終ページ|上限|同じページ|同じ検索結果|次ページを検出できません/.test(t)?ut():/失敗|エラー|制限|確認|同意|取得|読み込|HTTP/.test(t)?dt("失敗",t):ut()}function ut(){m&&(m.textContent="",m.title="",m.removeAttribute("aria-label"),m.classList.add("generic-autopager-status-hidden"),m.style.setProperty("display","none","important"))}function mt(){m&&(m.textContent="",m.title="タップで再開",m.setAttribute("aria-label","一時中断中。タップで再開"),m.classList.add("generic-autopager-status-hidden"),m.style.setProperty("opacity","0","important"),m.style.setProperty("color","transparent","important"),m.style.setProperty("background","transparent","important"),m.style.setProperty("border-color","transparent","important"),m.style.setProperty("box-shadow","none","important"),m.style.setProperty("-webkit-backdrop-filter","none","important"),m.style.setProperty("backdrop-filter","none","important"))}function dt(t,e=""){l.statusDetail=e||t,m&&(m.classList.remove("generic-autopager-status-hidden"),m.style.removeProperty("display"),m.style.removeProperty("opacity"),m.style.removeProperty("color"),m.style.removeProperty("background"),m.style.removeProperty("border-color"),m.style.removeProperty("box-shadow"),m.style.removeProperty("-webkit-backdrop-filter"),m.style.removeProperty("backdrop-filter"),m.textContent=t,m.title=l.statusDetail,m.setAttribute("aria-label",l.statusDetail))}(()=>{const t=/(^|\.)buzzap\.jp$/i.test(location.hostname),e="IntersectionObserver"in window;e&&new IntersectionObserver(t=>{t.some(t=>t.isIntersecting)&&f()},{root:null,rootMargin:`${h}px 0px`,threshold:0}).observe(d),!e&&!t&&window.addEventListener("scroll",function(){let t=0;return(...e)=>{clearTimeout(t),t=window.setTimeout(()=>(()=>{ct()<=h&&f()})(...e),220)}}(),{passive:!0});if(t){const t=()=>{!l.stopped&&!l.paused&&d?.isConnected&&d.getBoundingClientRect().top<=window.innerHeight+h&&f()},e=function(){let e=0;return()=>{clearTimeout(e),e=window.setTimeout(t,180)}}();window.addEventListener("scroll",e,{passive:!0}),window.addEventListener("resize",e,{passive:!0}),window.addEventListener("pageshow",e,{passive:!0}),window.setTimeout(t,0)}})(),m?.addEventListener("click",()=>{if(l.stopped&&l.nextUrl)return l.stopped=!1,l.lastError="",l.retryCount=0,clearTimeout(l.retryTimer),l.retryTimer=0,dt("再試行"),void f();l.paused=!l.paused,l.paused?mt():(dt(`自動 ${l.pages}/${t.maxPages}`),ct()<=h&&f())})};(()=>{let t=0,n=!1;const o=()=>{if(n)return;if(document.body&&"loading"!==document.readyState)return n=!0,void e();t+=1,t<80&&window.setTimeout(o,50)};document.addEventListener("DOMContentLoaded",o,{once:!0}),o()})()})();
