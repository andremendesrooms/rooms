'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TrackPageView({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void supabase.from('analytics_events').insert({
      event_type: 'property_view',
      property_id: propertyId,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
    });
    // Dispara uma única vez, ao montar a página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
