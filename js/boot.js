// Carrega os JSON externos antes dos módulos clássicos do jogo.
(async function bootWMK(){
    const box=document.createElement('div'); box.className='wmk-loading'; box.textContent='WMK Racing Studio · Carregando pistas e veículos…'; document.body.append(box);
    const models=['formula','rally','drift','muscle','gt','compact','kart','monster','hover','cyber','sportbike','motocross','streetbike'];
    const loadJSON=async path=>{const r=await fetch(path);if(!r.ok)throw new Error(path+' — HTTP '+r.status);return r.json();};
    const loadScript=path=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=path;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+path));document.body.append(s);});
    let startupError=null;
    const onError=e=>{if(e.message)startupError=e.message;};
    window.addEventListener('error',onError);
    try{
        if(location.protocol==='file:')throw new Error('Abra a pasta com Live Server ou outro servidor HTTP.');
        if(!window.THREE||!THREE.OrbitControls||!THREE.TransformControls)throw new Error('Three.js não carregou. Verifique a conexão com a internet.');
        [window.WMK_VEHICLES,window.WMK_TRACKS]=await Promise.all([Promise.all(models.map(x=>loadJSON('vehicles/'+x+'.json'))),Promise.all(Array.from({length:24},(_,i)=>loadJSON('tracks/'+(i+1)+'.json')))]);
        for(const script of ['race','game','studio','ui']){await loadScript('js/'+script+'.js');if(startupError)throw new Error(startupError);}
        box.remove();
    }catch(e){box.textContent='Não foi possível iniciar: '+e.message;box.classList.add('wmk-loading-error');console.error(e);}
    finally{window.removeEventListener('error',onError);}
})();
