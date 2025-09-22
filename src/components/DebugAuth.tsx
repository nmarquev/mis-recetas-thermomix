import { useAuth } from '@/contexts/AuthContext';

export const DebugAuth = () => {
  const { user } = useAuth();

  const authToken = localStorage.getItem('auth_token');
  const thermomixUser = localStorage.getItem('thermomix_user');

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">🔍 Debug Auth Status</h3>

      <div className="space-y-1">
        <div>
          <strong>User Context:</strong> {user ? `${user.name} (${user.email})` : 'No user'}
        </div>

        <div>
          <strong>Auth Token:</strong> {authToken ? `${authToken.substring(0, 20)}...` : 'No token'}
        </div>

        <div>
          <strong>Thermomix User:</strong> {thermomixUser ? 'Exists' : 'Not found'}
        </div>
      </div>
    </div>
  );
};