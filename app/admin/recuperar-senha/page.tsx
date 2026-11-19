'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { adminSupabase } from '@/lib/supabase-admin';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    setMessage('');
    try {
      const { error: recoveryError } = await adminSupabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/admin/redefinir-senha` }
      );
      if (recoveryError) {
        setError('Não foi possível enviar agora. Tente novamente mais tarde.');
        return;
      }
      // Não revela se o email está cadastrado.
      setMessage('Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Abra o link neste mesmo computador, com o site local funcionando.');
    } catch {
      setError('Falha de conexão. Confira a internet e tente novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Recuperar acesso</h1>
      <p className="mt-2 text-sm text-slate-soft">
        Informe o e-mail cadastrado no painel administrativo. Enviaremos um link para cadastrar uma nova senha.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">E-mail</label>
          <input id="recovery-email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-3" />
        </div>
        {message && <p role="status" className="text-sm text-route-green">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={sending}
          className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60">
          {sending ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>
      <Link href="/admin/login" className="mt-6 inline-block text-sm underline">
        Voltar para o login
      </Link>
    </section>
  );
}
