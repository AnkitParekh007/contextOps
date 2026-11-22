import {useEffect} from "react";

/**
 * Enhance static content only when IntersectionObserver is available.
 * No JS or reduced-motion preference => content stays fully visible.
 */
export function useReveal(){
  useEffect(()=>{
    const root=document.documentElement;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(reduced.matches||!("IntersectionObserver" in window))return;

    const selector=[
      ".why-layout",".principle",".feature-heading",".feature-card",
      ".journey-intro",".journey-story",".use-section .section-head",
      ".use-grid",".calculator-section .section-head",".calc-grid",
      ".trust-heading",".trust-card",".trust-warning",
      ".faq-intro",".faq-item",".bottom-cta",
    ].join(",");
    const io=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          entry.target.classList.add("motion-visible");
          io.unobserve(entry.target);
        }
      }
    },{threshold:0.08,rootMargin:"0px 0px -28px 0px"});

    const watch=(node:Element)=>{
      if(node.classList.contains("motion-reveal"))return;
      node.classList.add("motion-reveal");
      const parent=node.parentElement;
      if(parent && node.matches(".feature-card,.principle,.trust-card")){
        const siblings=Array.from(parent.children).filter(el=>el.matches(".feature-card,.principle,.trust-card"));
        (node as HTMLElement).style.setProperty("--reveal-delay",Math.min(siblings.indexOf(node)%3*90,180)+"ms");
      }
      io.observe(node);
    };
    document.querySelectorAll(selector).forEach(watch);
    root.classList.add("motion-ready");
    const mo=new MutationObserver(changes=>{
      for(const change of changes)for(const added of change.addedNodes){
        if(!(added instanceof Element))continue;
        if(added.matches(selector))watch(added);
        added.querySelectorAll(selector).forEach(watch);
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});
    const restore=()=>{
      if(reduced.matches){
        io.disconnect();
        root.classList.remove("motion-ready");
        document.querySelectorAll(".motion-reveal").forEach(el=>el.classList.add("motion-visible"));
      }
    };
    reduced.addEventListener("change",restore);
    return()=>{
      io.disconnect();
      mo.disconnect();
      root.classList.remove("motion-ready");
      reduced.removeEventListener("change",restore);
    };
  },[]);
}
