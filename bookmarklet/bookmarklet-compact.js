javascript:(function(){
    if(window.tasteboxBookmarkletRunning) return;
    window.tasteboxBookmarkletRunning=true;

    const servers=['https://localhost:3006','http://localhost:3006','https://127.0.0.1:3006','http://127.0.0.1:3006','https://192.168.0.10:3006','http://192.168.0.10:3006'];

    async function findServer(){
        for(const s of servers){
            try{
                const r=await fetch(`${s}/api/health`,{mode:'cors'});
                if(r.ok) return s;
            }catch(e){}
        }
        throw new Error('TasteBox server not found');
    }

    function createUI(){
        const overlay=document.createElement('div');
        overlay.id='tb-overlay';
        overlay.style.cssText='position:fixed!important;top:0!important;left:0!important;width:100%!important;height:100%!important;background:rgba(0,0,0,0.8)!important;z-index:999999!important;display:flex!important;justify-content:center!important;align-items:center!important;font-family:system-ui!important';

        const modal=document.createElement('div');
        modal.style.cssText='background:white!important;border-radius:12px!important;padding:24px!important;max-width:400px!important;width:90%!important;position:relative!important;box-shadow:0 10px 30px rgba(0,0,0,0.3)!important';

        modal.innerHTML='<button onclick="this.closest(\'#tb-overlay\').remove();window.tasteboxBookmarkletRunning=false" style="position:absolute!important;top:12px!important;right:16px!important;background:none!important;border:none!important;font-size:24px!important;cursor:pointer!important">×</button><h3 style="color:#2c3e50!important;margin:0 0 16px 0!important">🍳 TasteBox Recipe Importer</h3><div id="tb-status" style="padding:12px!important;border-radius:6px!important;margin:16px 0!important;background:#e3f2fd!important;color:#1976d2!important">🔄 Connecting...</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        return overlay;
    }

    function updateStatus(msg,type='info'){
        const status=document.getElementById('tb-status');
        if(!status) return;
        const colors={info:'#e3f2fd;color:#1976d2',success:'#e8f5e8;color:#2e7d32',error:'#ffebee;color:#c62828'};
        status.style.background=colors[type].split(';')[0];
        status.style.color=colors[type].split(':')[1];
        status.innerHTML=msg;
    }

    async function importRecipe(serverUrl){
        try{
            updateStatus('🔄 Analyzing page...');
            const response=await fetch(`${serverUrl}/api/import-html`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                credentials:'include',
                body:JSON.stringify({
                    html:document.documentElement.outerHTML,
                    url:window.location.href,
                    title:document.title
                })
            });

            const data=await response.json();

            if(response.ok && data.success){
                updateStatus(`✅ Recipe "${data.recipe.title}" imported successfully!`,'success');
                setTimeout(()=>{
                    window.open(serverUrl,'_blank');
                    document.getElementById('tb-overlay').remove();
                    window.tasteboxBookmarkletRunning=false;
                },2000);
            }else if(response.status===401){
                updateStatus(`🔐 Please login to TasteBox first. <button onclick="window.open('${serverUrl}','_blank')" style="background:#2196F3!important;color:white!important;border:none!important;padding:8px 16px!important;border-radius:4px!important;cursor:pointer!important;margin-left:8px!important">Login</button>`,'info');
            }else{
                updateStatus(`❌ ${data.error || 'Could not extract recipe from this page'}`,'error');
            }
        }catch(error){
            updateStatus('❌ Connection failed. Make sure TasteBox is running.','error');
        }
    }

    async function main(){
        createUI();
        try{
            const serverUrl=await findServer();
            await importRecipe(serverUrl);
        }catch(error){
            updateStatus(`❌ ${error.message}`,'error');
        }
    }

    main();
})();