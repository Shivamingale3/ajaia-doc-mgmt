import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '../lib/api-client';
import { useRegisterMutation } from '../queries/auth.queries';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/** Mirrors backend/src/validationSchemas/password.schema.ts's PASSWORD_RULE
 * so the user gets a clear hint before submitting, not just a server 400. */
const PASSWORD_HINT =
  '8–19 characters, with at least one uppercase letter, one lowercase letter, one number and one special character.';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    setError(null);

    registerMutation.mutate(
      { firstName, lastName, email, password },
      {
        onSuccess: () => {
          void navigate({ to: ROUTE_PATHS.LOGIN, search: { registered: true } });
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
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start creating and sharing documents.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
            />
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
              }}
            />
          </div>
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={ROUTE_PATHS.LOGIN} className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
