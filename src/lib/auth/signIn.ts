import { getBrowserSupabase } from '@/lib/supabase/browserClient';

export async function signInWithGoogle(origin: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

export interface SignInWithEmailInput {
  email: string;
  password: string;
}

// Translate Supabase auth error codes into user-friendly messages.
// We expose only the cases we know how to phrase well; everything else
// surfaces as a generic message.
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Wrong email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email first. Check your inbox for the link.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Use at least 8 characters for your password.';
  }
  if (lower.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  return 'Something went wrong. Please try again.';
}

export async function signInWithEmail(input: SignInWithEmailInput): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(translateAuthError(error.message));
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface SignUpWithEmailInput {
  email: string;
  password: string;
  name: string;
}

export async function signUpWithEmail(input: SignUpWithEmailInput): Promise<SignUpResult> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  // When email confirmation is enabled, supabase returns user but session=null.
  // When disabled, both user and session are returned and the user is signed in.
  return { needsEmailConfirmation: data.session === null };
}
