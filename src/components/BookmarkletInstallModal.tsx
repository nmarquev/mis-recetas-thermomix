import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bookmark, ExternalLink, Sparkles } from 'lucide-react';

interface BookmarkletInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkletInstallModal = ({ isOpen, onClose }: BookmarkletInstallModalProps) => {
  const bookmarkletCode = `javascript:void(function(){if(window.tb)return;window.tb=1;function createUI(){var d=document.createElement('div');d.id='tb-ui';d.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:2px solid black;padding:20px;z-index:99999;border-radius:10px;font-family:Arial';d.innerHTML='<h3>TasteBox</h3><p id="tb-msg">Connecting...</p><button onclick="document.getElementById(\\'tb-ui\\').remove();window.tb=0" style="float:right;background:red;color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer">Close</button><div style="clear:both"></div>';document.body.appendChild(d);return d}function updateMsg(m){var e=document.getElementById('tb-msg');if(e)e.innerHTML=m}function tryImport(){var servers=['https://localhost:3006','http://localhost:3006'];for(var i=0;i<servers.length;i++){try{updateMsg('Trying server: '+servers[i]);fetch(servers[i]+'/api/import-html',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({html:document.documentElement.outerHTML,url:location.href,title:document.title})}).then(function(r){if(r.status===401){updateMsg('Please login first: <a href="https://localhost:8080" target="_blank" style="color:blue;text-decoration:underline">Open TasteBox</a><br><button onclick="tryImport()" style="margin-top:10px;background:green;color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer">Try Again</button>');return}return r.json()}).then(function(data){if(data)updateMsg(data.success?'Recipe imported successfully!':'Error: '+data.error)}).catch(function(){updateMsg('Connection failed')});break}catch(e){updateMsg('Error: '+e.message)}}window.tryImport=tryImport}createUI();tryImport()}())`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Instalar Bookmarklet de TasteBox
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Explicación */}
          <div className="text-sm text-muted-foreground">
            <p>
              El bookmarklet te permite importar recetas desde cualquier página web (Cookidoo, blogs de cocina, etc.)
              directamente a TasteBox con un solo clic. La inteligencia artificial extrae automáticamente ingredientes,
              instrucciones y datos nutricionales.
            </p>
          </div>

          {/* Instalación */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                Instrucciones de Instalación
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Asegúrate de que tu barra de marcadores esté visible en tu navegador
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Arrastra el siguiente botón a tu barra de marcadores:
                </p>
              </div>

              {/* Bookmarklet Button */}
              <div className="flex justify-center my-6">
                <a
                  href={bookmarkletCode}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing"
                  title="Arrastra este botón a tu barra de marcadores"
                  draggable="true"
                >
                  🍳 Guardar en TasteBox
                </a>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ¡Listo! Ahora visita cualquier página con recetas y haz clic en tu nuevo marcador
                </p>
              </div>
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Consejo:</strong> Si no puedes arrastrar el botón, haz clic derecho sobre él y selecciona "Agregar a marcadores"
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✨ Compatible con todos los sitios:</strong> El bookmarklet funciona en Cookidoo, blogs de cocina, Instagram, YouTube y cualquier página web con recetas.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
            <Button
              onClick={() => window.open('https://support.google.com/chrome/answer/188842', '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ayuda con marcadores
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};