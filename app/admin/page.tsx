'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminSupabase } from '@/lib/supabase-admin';

type AdminProfile = { role: string; name: string | null };
const LABELS: Record<string, string> = {
  super_admin: 'Administrador principal',
  manager: 'Gerente',
  agent: 'Agente',
};

export default function AdminHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function verifyAccess() {
      const { data: userData, error: userError } = await adminSupabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace('/admin/login');
        return;
      }
      const { data: membership, error } = await adminSupabase
        .from('admin_users')
        .select('role, name, active')
        .eq('id', userData.user.id)
        .eq('active', true)
        .maybeSingle();

      if (error || !membership ||
        !['super_admin', 'manager', 'agent'].includes(membership.role)) {
        await adminSupabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      if (active) {
        setProfile({ role: membership.role, name: membership.name ?? null });
        setLoading(false);
      }
    }
    void verifyAccess();
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await adminSupabase.auth.signOut();
    router.replace('/admin/login');
  }

  if (loading) {
    return <section className="mx-auto max-w-4xl px-4 py-16 text-slate-soft">Verificando acesso...</section>;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Painel administrativo</h1>
          <p className="mt-2 text-slate-soft">
            {profile?.name || 'Usuário autorizado'} — {LABELS[profile?.role ?? ''] ?? profile?.role}
          </p>
        </div>
        <button onClick={logout} className="rounded-lg border px-4 py-2 text-sm">
          Sair
        </button>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-ink">Gerenciar imóveis</h2>
        <p className="mt-2 text-slate-soft">
          Consulte os imóveis, preços e disponibilidade conforme as permissões
          do seu usuário. Esta primeira versão é somente leitura.
        </p>
        <Link href="/admin/imoveis"
          className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white">
          Ver imóveis cadastrados
        </Link>
        <div className="mt-5">
          <Link href="/imoveis" className="text-sm underline">
            Ver catálogo público
          </Link>
        </div>
      </div>
    </section>
  );
}
