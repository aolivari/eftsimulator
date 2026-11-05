import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Modal, Input, Button, FormField } from '../../../shared/ui';
import { useAuth } from '../hooks/useAuth';
import type { AuthModalProps } from '../types';

type Mode = 'login' | 'signup' | 'reset';

const GOOGLE_ENABLED = import.meta.env.VITE_AUTH_GOOGLE === 'true';

const TITLES: Record<Mode, string> = {
  login: 'Inicia sesión',
  signup: 'Crea tu cuenta',
  reset: 'Recuperar contraseña',
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await auth.signInWithPassword(email, password);
        onClose();
      } else if (mode === 'signup') {
        const { needsConfirmation } = await auth.signUp(email, password);
        if (needsConfirmation) {
          setNotice('Te hemos enviado un email para confirmar la cuenta. Ábrelo y vuelve aquí.');
        } else {
          onClose();
        }
      } else {
        await auth.resetPassword(email);
        setNotice('Si el email existe, recibirás un enlace para cambiar la contraseña.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      setError(translateAuthError(message));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await auth.signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      setError(translateAuthError(message));
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-sm">
      <Modal.Title>{TITLES[mode]}</Modal.Title>

      <p className="text-xs text-slate-600 leading-relaxed">
        Con una cuenta puedes guardar y gestionar tus planes de ahorro desde cualquier dispositivo.
      </p>

      {GOOGLE_ENABLED && mode !== 'reset' && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-800 cursor-pointer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4">
              <path
                fill="#4285F4"
                d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
              />
            </svg>
            Continuar con Google
          </button>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="flex-1 h-px bg-slate-200" />o con email
            <span className="flex-1 h-px bg-slate-200" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
          />
        </FormField>

        {mode !== 'reset' && (
          <FormField label="Contraseña">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />
          </FormField>
        )}

        {error && (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            {notice}
          </p>
        )}

        <Button type="submit" size="md" disabled={busy} className="w-full text-sm">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs font-semibold">
        {mode === 'login' ? (
          <>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="text-orange-600 hover:underline cursor-pointer"
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-slate-600 hover:underline cursor-pointer"
            >
              ¿Olvidaste la contraseña?
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-orange-600 hover:underline cursor-pointer"
          >
            Ya tengo cuenta
          </button>
        )}
      </div>
    </Modal.Root>
  );
}

function translateAuthError(message?: string): string {
  if (!message) return 'Ha ocurrido un error. Inténtalo de nuevo.';
  if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos.';
  if (/email not confirmed/i.test(message)) {
    return 'Confirma tu email antes de entrar (revisa tu bandeja).';
  }
  if (/already registered/i.test(message)) return 'Ese email ya tiene cuenta. Inicia sesión.';
  if (/password should be at least/i.test(message)) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (/provider is not enabled/i.test(message)) {
    return 'El acceso con Google aún no está activado.';
  }
  return message;
}
