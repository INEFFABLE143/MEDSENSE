(function(){
  var KEY="medsense-theme",root=document.documentElement,t=null;
  try{t=localStorage.getItem(KEY)}catch(e){}
  if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  root.setAttribute("data-theme",t);
  function label(b){var d=root.getAttribute("data-theme")==="dark";b.textContent=d?"☀️ Light":"🌙 Dark";b.setAttribute("aria-label","Switch to "+(d?"light":"dark")+" theme")}
  document.addEventListener("DOMContentLoaded",function(){
    var b=document.createElement("button");b.type="button";b.className="theme-toggle";label(b);
    b.onclick=function(){var n=root.getAttribute("data-theme")==="dark"?"light":"dark";root.setAttribute("data-theme",n);try{localStorage.setItem(KEY,n)}catch(e){}label(b)};
    document.body.appendChild(b);
  });
})();
