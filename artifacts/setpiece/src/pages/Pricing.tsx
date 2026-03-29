import { CoachLayout } from '@/components/Layout';
import { useGetPricingData } from '@workspace/api-client-react';
import type { PricingDataTiersItem } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Pricing() {
  const { data } = useGetPricingData();
  const tiers: PricingDataTiersItem[] = data?.tiers || [];

  return (
    <CoachLayout>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Unlock the full power of SETPIECE for your coaching workflow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
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

                  <Button className={`w-full ${tier.highlighted ? '' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                    {tier.cta || 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </CoachLayout>
  );
}
