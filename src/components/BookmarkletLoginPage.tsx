import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

export const BookmarkletLoginPage = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'already_logged_in' | 'need_login'>('loading');

  useEffect(() => {
    // Check if user is already logged in
    if (user) {
      setStatus('already_logged_in');

      // Send success message to parent and close after delay
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage({
            type: 'TASTEBOX_LOGIN_SUCCESS',
            timestamp: Date.now()
          }, '*');
        }

        setTimeout(() => {
          window.close();
        }, 2000);
      }, 1000);

    } else {
      setStatus('need_login');
    }
  }, [user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-lg font-medium text-gray-700">Verificando estado de login...</p>
        </div>
      </div>
    );
  }

  if (status === 'already_logged_in') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">¡Ya estás logueado!</h1>
          <p className="text-green-600 mb-4">
            Tu sesión está activa. El bookmarklet continuará automáticamente.
          </p>
          <p className="text-sm text-gray-500">
            Esta ventana se cerrará en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-orange-200 max-w-md">
        <div className="text-4xl mb-4">🍳</div>
        <h1 className="text-2xl font-bold text-orange-800 mb-4">Login para Bookmarklet</h1>
        <p className="text-gray-600 mb-6">
          Para importar recetas con el bookmarklet, necesitas iniciar sesión en TasteBox.
        </p>
        <div className="space-y-4">
          <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded border border-orange-200">
            💡 <strong>Tip:</strong> Después del login, esta ventana se cerrará automáticamente
            y el bookmarklet continuará con la importación de la receta.
          </p>
        </div>
      </div>
    </div>
  );
};