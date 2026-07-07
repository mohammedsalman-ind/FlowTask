import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useForm as useRHForm } from 'react-hook-form';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error, clearError } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useRHForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const onSubmit = async (data: LoginFormValues) => {
    const success = await login(data.email, data.password);
    if (success) {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  const handleGoogleLogin = () => {
    // Stub for Google OAuth flow
    toast('Google OAuth will be implemented with Supabase client');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background animate-fade-in">
      <Toaster position="top-right" toastOptions={{ className: 'glass-card text-text-primary' }} />
      
      {/* Left side — Branding / Visual */}
      <div className="hidden md:flex flex-col flex-1 bg-surface-2 p-12 justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-accent opacity-10"></div>
        <div className="relative z-10 text-center space-y-6">
          <div className="text-8xl animate-pulse-soft">⚡</div>
          <h1 className="text-4xl font-bold tracking-tight">
            FlowTask
          </h1>
          <p className="text-lg text-text-muted max-w-md">
            The AI-powered task manager that adapts to your context.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-accent-2/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right side — Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-accent hover:text-accent-2 transition-colors">
                Register here
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-surface p-8 rounded-2xl border border-stone-300/50 shadow-xl">
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-danger focus:ring-danger/20' : ''}`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-text-primary">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-accent hover:text-accent-2">
                  Forgot password?
                </a>
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className={`input-field ${errors.password ? 'border-danger focus:ring-danger/20' : ''}`}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-text-muted">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="btn-secondary w-full py-3 flex items-center justify-center gap-3 bg-surface-2 hover:bg-stone-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};
