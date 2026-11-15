'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    async function checkSession() {
      const { data: userData } = await adminSupabase.auth.getUser();
      if (userData.user) {
        const { data: membership } = await adminSupabase
          .from('admin_users')
          .select('id')
          .eq('id', userData.user.id)
          .eq('active', true)
          .maybeSingle();
        if (membership) {
          router.replace('/admin');
          return;
        }
      }
      if (alive) setChecking(false);
    }
    void checkSession();
    return () => { alive = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        setMessage('Não foi possível entrar. Confira e-mail e senha.');
        return;
      }

      // A autenticação sozinha não dá acesso à administração.
      // Só usuários ativos em admin_users podem prosseguir.
      const { data: membership, error: accessError } = await adminSupabase
        .from('admin_users')
        .select('id, role')
        .eq('id', data.user.id)
        .eq('active', true)
        .maybeSingle();

      if (accessError || !membership ||
          !['super_admin', 'manager', 'agent'].includes(membership.role)) {
        await adminSupabase.auth.signOut();
        setMessage('Sua conta não tem autorização para acessar o painel.');
        return;
      }

      router.replace('/admin');
    } catch {
      setMessage('Ocorreu um problema de conexão. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-3xl text-ink">Acesso administrativo</h1>
      <p className="mt-2 text-sm text-slate-soft">
        Área reservada aos administradores e agentes autorizados.
      </p>
      {checking ? (
        <p className="mt-8 text-slate-soft">Verificando acesso...</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="admin-email" className="mb-2 block text-sm font-medium">E-mail</label>
            <input id="admin-email" type="email" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3" />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Senha</label>
            <input id="admin-password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3" />
          </div>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>
      )}
      <Link href="/admin/recuperar-senha" className="mt-6 inline-block text-sm font-semibold underline">
        Esqueci minha senha
      </Link>
      <div>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-soft underline">
          Voltar ao catálogo público
        </Link>
      </div>
    </section>
  );
}
