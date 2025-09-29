import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Tag, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { getServerBaseUrl } from "@/utils/api";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal = ({ isOpen, onClose }: EditProfileModalProps) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name: user?.name || '',
    alias: user?.alias || '',
    currentPassword: '',
    newPassword: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handlePhotoUpdate = async (photoUrl: string) => {
    // Refresh user data to update the profile photo in the UI
    if (refreshUser) {
      await refreshUser();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data to send (only include changed fields)
      const updateData: any = {};

      if (formData.email !== user?.email) {
        updateData.email = formData.email;
      }

      if (formData.name !== user?.name) {
        updateData.name = formData.name;
      }

      if (formData.alias !== (user?.alias || '')) {
        updateData.alias = formData.alias || null;
      }

      // Handle password change
      if (formData.currentPassword && formData.newPassword) {
        if (formData.newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      } else if (formData.currentPassword || formData.newPassword) {
        setError('Para cambiar la contraseña, debes completar ambos campos');
        setLoading(false);
        return;
      }

      // Check if there are changes to save
      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar');
        setLoading(false);
        return;
      }

      const response = await api.auth.updateProfile(updateData);

      setSuccess('Perfil actualizado correctamente');

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: ''
      }));

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: user?.email || '',
        name: user?.name || '',
        alias: user?.alias || '',
        currentPassword: '',
        newPassword: ''
      });
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {/* Profile Photo */}
          <div className="space-y-2">
            <Label>Foto de perfil</Label>
            <ProfilePhotoUpload
              currentPhotoUrl={user?.profilePhoto ? `${getServerBaseUrl()}${user.profilePhoto}` : undefined}
              onPhotoUpdate={handlePhotoUpdate}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">Alias (opcional)</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="alias"
                value={formData.alias}
                onChange={(e) => handleInputChange('alias', e.target.value)}
                className="pl-10"
                placeholder="Cómo quieres que aparezca tu nombre"
              />
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Cambiar Contraseña (opcional)
            </h3>

            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className="pl-10 pr-10"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};