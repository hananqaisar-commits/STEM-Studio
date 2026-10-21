import { useEffect, useState } from 'react';
import { apiClient } from '../../api/apiClient';
import './AdSensePlacement.css';

type Placement = 'landing' | 'learner';
type AdPlacementConfig = { eligible: boolean; publisher_id: string; slot_id: string };

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSensePlacement({ placement }: { placement: Placement }) {
  const [config, setConfig] = useState<AdPlacementConfig | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient<AdPlacementConfig>(`/api/billing/ads/${placement}`)
      .then((value) => { if (active && value.eligible && value.publisher_id && value.slot_id) setConfig(value); })
      .catch(() => { if (active) setConfig(null); });
    return () => { active = false; };
  }, [placement]);

  useEffect(() => {
    if (!config) return;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisher_id)}`;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const pushAd = () => {
      try {
        const queue = window.adsbygoogle ?? [];
        queue.push({});
        window.adsbygoogle = queue;
      } catch {
        // The browser may block advertising scripts; keep the learning page usable.
      }
    };
    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = src;
      script.dataset.stemAdsLoaded = 'false';
      script.addEventListener('load', () => { script!.dataset.stemAdsLoaded = 'true'; pushAd(); }, { once: true });
      document.head.appendChild(script);
    } else if (script.dataset.stemAdsLoaded === 'true') {
      pushAd();
    } else {
      script.addEventListener('load', pushAd, { once: true });
    }
  }, [config]);

  if (!config) return null;
  return (
    <aside className={`stem-ad-placement stem-ad-placement-${placement}`} aria-label="Advertisement">
      <span className="stem-ad-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={config.publisher_id}
        data-ad-slot={config.slot_id}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
