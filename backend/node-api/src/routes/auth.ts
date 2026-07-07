import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ---- Zod Schemas ----

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
});

// ---- Routes ----

/**
 * POST /api/auth/register
 * Register a new user with email + password.
 * The Supabase trigger (handle_new_user) auto-creates the public.users profile.
 */
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as z.infer<typeof registerSchema>;

    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Stored in raw_user_meta_data, used by trigger
      },
    });

    if (error) {
      res.status(400).json({
        data: null,
        error: error.message,
        status: 400,
      });
      return;
    }

    // Fetch the created profile from public.users
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    res.status(201).json({
      data: {
        user: profile,
        access_token: data.session?.access_token ?? null,
        refresh_token: data.session?.refresh_token ?? null,
      },
      error: null,
      status: 201,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

/**
 * POST /api/auth/login
 * Log in with email + password.
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({
        data: null,
        error: error.message,
        status: 401,
      });
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      data: {
        user: profile,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

/**
 * POST /api/auth/logout
 * Sign out the current user. Requires a valid JWT.
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Invalidate the user's session on the Supabase side
    const { error } = await supabaseAdmin.auth.admin.signOut(req.accessToken!);

    if (error) {
      // Non-fatal: the token may already be expired
      console.warn('Logout warning:', error.message);
    }

    res.status(200).json({
      data: { message: 'Logged out successfully' },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      res.status(404).json({
        data: null,
        error: 'User profile not found',
        status: 404,
      });
      return;
    }

    res.status(200).json({
      data: { user: profile },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

/**
 * POST /api/auth/google
 * Exchange a Google OAuth access token for a Supabase session.
 * The frontend initiates Google OAuth via Supabase client-side,
 * then sends the resulting access_token here.
 */
router.post('/google', validate(googleAuthSchema), async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body as z.infer<typeof googleAuthSchema>;

    // Verify the token and get the user
    const { data, error } = await supabaseAdmin.auth.getUser(access_token);

    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: 'Invalid Google OAuth token',
        status: 401,
      });
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      data: {
        user: profile,
        access_token,
      },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using a refresh token.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        data: null,
        error: 'Refresh token is required',
        status: 400,
      });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      res.status(401).json({
        data: null,
        error: 'Invalid or expired refresh token',
        status: 401,
      });
      return;
    }

    res.status(200).json({
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal server error',
      status: 500,
    });
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100),
  avatar_url: z.string().url().or(z.literal('')).nullable().optional(),
});

/**
 * PATCH /api/auth/profile
 * Update user display name and optionally avatar.
 */
router.patch('/profile', authMiddleware, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, avatar_url } = req.body as z.infer<typeof updateProfileSchema>;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({ name, avatar_url })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({ data: { user: updatedUser }, error: null, status: 200 });
  } catch (err) {
    console.error('PATCH /profile error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;

