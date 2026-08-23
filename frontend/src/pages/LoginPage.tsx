import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '../lib/api-client';
import { useLoginMutation } from '../queries/auth.queries';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

interface LoginPageProps {
  justRegistered?: boolean;
}

export function LoginPage({ justRegistered = false }: LoginPageProps) {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    setError(null);

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          void navigate({ to: ROUTE_PATHS.DOCUMENTS });
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        },
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground">Sign in to your documents.</p>
      </div>

      {justRegistered && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          Account created — log in below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link to={ROUTE_PATHS.REGISTER} className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
