'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PropertyFilters } from '@/lib/types';

export default function TrackSearch({
  filters,
  resultCount,
}: {
  filters: PropertyFilters;
  resultCount: number;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // search_filters/result_count vêm da migration-002 — é exatamente o dado
    // mínimo que a arquitetura pedia para não perder histórico de demanda
    // desde o primeiro dia (inclusive buscas com resultado 0).
    void supabase.from('analytics_events').insert({
      event_type: 'search',
      search_filters: filters,
      result_count: resultCount,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), resultCount]);

  return null;
}
