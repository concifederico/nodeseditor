'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';

interface AuthScreenProps {
  callbackUrl?: string;
  hasGoogle: boolean;
  hasGitHub: boolean;
}

export default function AuthScreen({
  callbackUrl = '/',
  hasGoogle,
  hasGitHub,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitLabel = useMemo(
    () => (mode === 'login' ? 'Ingresar' : 'Crear cuenta'),
    [mode]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    setError(null);

    startTransition(async () => {
      if (mode === 'register') {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        if (!registerResponse.ok) {
          const payload = (await registerResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(payload?.error ?? 'No se pudo crear la cuenta.');
          return;
        }
      }

      const loginResult = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        setError('Email o contraseña inválidos.');
        return;
      }

      window.location.href = loginResult.url || callbackUrl;
    });
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    setError(null);
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#020617_45%,#020617_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden border-r border-slate-800 p-10 lg:block">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Node Simulator</p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
              Diagramas privados, bloques globales y simulación Python en el navegador.
            </h1>
            <p className="mt-6 max-w-xl text-base text-slate-300">
              Inicia sesión para guardar tus diagramas, reutilizar bloques compartidos y ejecutar
              nodos en orden topológico con Pyodide.
            </p>
            <div className="mt-10 grid gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-4">
                Diagramas aislados por usuario con rutas protegidas.
              </div>
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-4">
                Bloques compartidos y editables por administradores.
              </div>
              <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
                Scripts Python por nodo con resultados visibles en el canvas.
              </div>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mb-8 flex rounded-2xl border border-slate-800 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${
                  mode === 'login' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${
                  mode === 'register' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Registro
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-400"
                    placeholder="Tu nombre"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Procesando...' : submitLabel}
              </button>
            </form>

            {(hasGoogle || hasGitHub) && (
              <div className="mt-8">
                <div className="mb-4 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
                  o continúa con
                </div>
                <div className="grid gap-3">
                  {hasGoogle && (
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500"
                    >
                      Google
                    </button>
                  )}
                  {hasGitHub && (
                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500"
                    >
                      GitHub
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
