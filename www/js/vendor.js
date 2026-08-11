/* Vendor loader — lazy loads jsPDF, html2canvas, XLSX only when needed.
   Uses CDN with local fallback caching via Service Worker. */
(function(){
  const V = {
    jspdf: { url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', check:()=>window.jspdf&&window.jspdf.jsPDF, loading:null },
    html2canvas: { url:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', check:()=>window.html2canvas, loading:null },
    xlsx: { url:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', check:()=>window.XLSX, loading:null },
  };
  function loadScript(url){
    return new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src=url; s.async=true;
      s.onload=()=>res(); s.onerror=()=>rej(new Error('failed '+url));
      document.head.appendChild(s);
    });
  }
  window.Vendor = {
    async need(name){
      const v = V[name]; if(!v) throw new Error('unknown vendor '+name);
      if (v.check()) return true;
      if (!v.loading) v.loading = loadScript(v.url);
      await v.loading;
      if (!v.check()) throw new Error('vendor '+name+' failed to load');
      return true;
    }
  };
})();
