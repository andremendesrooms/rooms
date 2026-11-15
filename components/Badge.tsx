const VARIANTS = {
  gold: 'bg-route-gold/15 text-route-gold',
  green: 'bg-route-green/15 text-route-green',
  red: 'bg-route-red/15 text-route-red',
} as const;

export default function Badge({
  children,
  variant = 'gold',
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
