import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerAuth, isLoading, isAuthenticated, error, clearError } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormValues) => {
    const success = await registerAuth(data.email, data.password, data.name);
    if (success) {
      toast.success('Account created successfully!');
      navigate('/');
    }
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
            Join FlowTask
          </h1>
          <p className="text-lg text-text-muted max-w-md">
            Start managing your tasks, habits, and goals in one unified space.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent-2/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right side — Register Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent hover:text-accent-2 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-surface p-8 rounded-2xl border border-stone-300/50 shadow-xl">
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="John Doe"
                className={`input-field ${errors.name ? 'border-danger focus:ring-danger/20' : ''}`}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-danger mt-1">{errors.name.message}</p>
              )}
            </div>

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
              <label className="block text-sm font-medium text-text-primary">
                Password
              </label>
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="••••••••"
                className={`input-field ${errors.confirmPassword ? 'border-danger focus:ring-danger/20' : ''}`}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
