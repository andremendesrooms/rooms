import type { PropertyPublic } from './types';

export function formatPrice(price: number | null, frequency: string | null): string {
  if (price == null) return 'Preço a confirmar';
  const value = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(price);
  return frequency ? `${value}/${frequency === 'week' ? 'semana' : 'mês'}` : value;
}

export function whatsappLink(propertyId: string, title?: string | null): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const message = `Olá, vi o imóvel ${propertyId}${
    title ? ` (${title})` : ''
  } no site e gostaria de saber se ainda está disponível.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function propertyLabel(property: Pick<PropertyPublic, 'type' | 'subtype' | 'region'>): string {
  const kind = property.subtype || property.type;
  return property.region ? `${kind} em ${property.region}` : kind;
}
