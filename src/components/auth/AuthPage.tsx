import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import heroImage from '@/assets/hero-kitchen.jpg';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
      
      {/* Right side - Hero image */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src={heroImage}
          alt="TasteBox Kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/30" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-6">
              TasteBox
            </h1>
            <p className="text-xl opacity-90 max-w-md">
              Organiza, descubre y comparte tus recetas favoritas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};