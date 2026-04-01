'use client';

import { signIn } from 'next-auth/react';
import { GitBranch } from 'lucide-react';

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
      className="btn-primary w-full justify-center py-3 text-base"
    >
      <GitBranch className="h-5 w-5" />
      Continue with GitHub
    </button>
  );
}
