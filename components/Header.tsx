import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-mono text-sm font-semibold tracking-widest text-ink">
          ANDRÉ MENDES ROOMS
        </Link>
        <Link
          href="/imoveis"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Ver imóveis
        </Link>
      </div>
    </header>
  );
}
