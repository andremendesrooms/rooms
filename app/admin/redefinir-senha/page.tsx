'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminSupabase } from '@/lib/supabase-admin';

export default function RedefinirSenhaPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fragment = new URLSearchParams(window.location.hash.substring(1));
    if (fragment.get('error') || fragment.get('error_code')) {
      setError('Este link está inválido ou expirou. Solicite um novo e-mail.');
    }
    const { data: { subscription } } = adminSupabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          setAuthorized(true);
          setChecking(false);
          setError('');
        } else if (event === 'SIGNED_OUT') {
          setAuthorized(false);
          setChecking(false);
        }
      }
    );
    void adminSupabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (!authError && data.user) setAuthorized(true);
      setChecking(false);
    }).catch(() => {
      if (active) setChecking(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('Use uma senha de pelo menos 12 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await adminSupabase.auth.updateUser({ password });
      if (updateError) {
        setError('Não foi possível alterar a senha. Solicite outro link de recuperação.');
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      await adminSupabase.auth.signOut();
    } catch {
      setError('Falha de conexão ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Definir nova senha</h1>
      {success ? (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p role="status" className="text-route-green">Senha atualizada com sucesso.</p>
          <Link href="/admin/login" className="mt-4 inline-block font-semibold underline">
            Entrar no painel administrativo
          </Link>
        </div>
      ) : checking ? (
        <p className="mt-6 text-slate-soft">Validando seu link...</p>
      ) : authorized ? (
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
              Nova senha (mínimo de 12 caracteres)
            </label>
            <input id="new-password" type="password" required minLength={12}
              autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
              Confirmar nova senha
            </label>
            <input id="confirm-password" type="password" required minLength={12}
              autoComplete="new-password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3" />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-slate-soft">
          {error || 'Não foi possível validar um link de recuperação nesta página.'}
        </p>
      )}
      <Link href="/admin/recuperar-senha" className="mt-6 inline-block text-sm underline">
        Solicitar outro link de recuperação
      </Link>
    </section>
  );
}
