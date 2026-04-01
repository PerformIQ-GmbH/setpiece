import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useGetPricingData, useListTeams } from '@workspace/api-client-react';
import type { PricingDataTiersItem } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Loader2, CreditCard, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearch } from 'wouter';

export default function Pricing() {
  const { data } = useGetPricingData();
  const { data: teams } = useListTeams();
  const team = teams?.[0];
  const tiers: PricingDataTiersItem[] = data?.tiers || [];
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const success = params.get('success') === 'true';
  const canceled = params.get('canceled') === 'true';

  const handleUpgrade = async (tier: PricingDataTiersItem) => {
    if (tier.id === 'free' || !tier.stripePriceId) return;

    setLoadingTier(tier.id!);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId: tier.stripePriceId, tierId: tier.id, teamId: team?.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoadingTier(null);
    }
  };

  return (
    <CoachLayout>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Unlock the full power of SETPIECE for your coaching workflow.</p>
        </div>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
            <Check className="h-5 w-5 text-primary shrink-0" />
            <p className="text-primary font-medium">Your subscription is now active! Enjoy your upgraded plan.</p>
          </motion.div>
        )}

        {canceled && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-amber-400 font-medium">Checkout was canceled. You can try again anytime.</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => {
            const isCurrentPlan = team?.tier === tier.id;

            return (
              <motion.div key={tier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <Card className={`bg-card border-border relative overflow-hidden h-full ${tier.highlighted ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20' : ''}`}>
                  {tier.highlighted && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-emerald-400" />
                  )}
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="mb-6">
                      {tier.highlighted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
                          <Sparkles className="h-3 w-3" /> Most Popular
                        </span>
                      )}
                      <h2 className="text-xl font-display font-bold text-white">{tier.name}</h2>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-bold text-white">{tier.price}</span>
                        <span className="text-muted-foreground text-sm">{tier.currency}/mo</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 flex-1 mb-6">
                      {tier.features?.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <Button disabled className="w-full bg-primary/20 text-primary border border-primary/30">
                        <Check className="h-4 w-4 mr-1" /> Current Plan
                      </Button>
                    ) : tier.id === 'free' ? (
                      <Button disabled className="w-full bg-secondary text-foreground">
                        Free Forever
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(tier)}
                        disabled={loadingTier !== null}
                        className={`w-full ${tier.highlighted ? '' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
                      >
                        {loadingTier === tier.id ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Redirecting...</>
                        ) : (
                          tier.cta || 'Upgrade'
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </CoachLayout>
  );
}
