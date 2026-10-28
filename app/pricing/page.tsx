"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    id: "biweekly",
    name: "2-Week Plan",
    price: "$7.00",
    period: "every 2 weeks",
    description: "Flexible short-term access.",
    features: ["3D box previews", "Upload artwork to box faces", "Custom dimensions and colors", "PNG export while subscribed", "Unlimited projects"],
  },
  {
    id: "monthly",
    name: "Monthly Plan",
    price: "$10.00",
    period: "per month",
    description: "For regular product mockup work.",
    features: ["3D box previews", "Upload artwork to box faces", "Custom dimensions and colors", "PNG export while subscribed", "Up to 50 projects per calendar month"],
    featured: true,
  },
  {
    id: "yearly",
    name: "Annual Plan",
    price: "$98.00",
    period: "per year",
    description: "Best value for long-term use.",
    features: ["3D box previews", "Upload artwork to box faces", "Custom dimensions and colors", "PNG export while subscribed", "Unlimited projects"],
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  function subscribe(planId: string) {
    setLoadingPlan(planId);
    // Navigate the browser directly so the hosted Polar checkout redirect is not blocked by fetch/CORS.
    window.location.assign(`/api/polar/checkout?plan=${encodeURIComponent(planId)}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
          <Sparkles className="h-4 w-4" /> Simple, secure billing through Polar
        </div>
        <h1 className="text-4xl font-black sm:text-5xl">Choose your RevaBox plan</h1>
        <p className="mt-4 text-white/55">Create your box mockups, then export PNGs while your subscription is active.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <section key={plan.id} className={`flex flex-col rounded-3xl border p-7 ${plan.featured ? "border-violet-400/50 bg-violet-400/[0.08] shadow-2xl shadow-violet-950/20" : "border-white/10 bg-white/[0.03]"}`}>
            {plan.featured && <span className="mb-4 w-fit rounded-full bg-violet-400/15 px-3 py-1 text-xs font-bold text-violet-200">50 projects monthly</span>}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-2 min-h-10 text-sm text-white/55">{plan.description}</p>
            <div className="mt-5 flex flex-wrap items-baseline gap-2">
              <span className="text-4xl font-black">{plan.price}</span>
              <span className="text-sm text-white/50">{plan.period}</span>
            </div>
            <div className="my-7 flex-1 space-y-4">
              {plan.features.map((feature) => (
                <div key={feature} className="flex gap-3 text-sm text-white/75">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {feature}
                </div>
              ))}
            </div>
            <button onClick={() => subscribe(plan.id)} disabled={loadingPlan !== null} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-50">
              {loadingPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Choose {plan.name}
            </button>
          </section>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-white/40">Prices are in USD. Create the three matching products/prices in your Polar dashboard and configure their product IDs in your deployment environment before enabling checkout.</p>
    </main>
  );
}
