// @polsia:user-owned — starter home served at /. Replace it in place, or delete
// this route group before adding another page that resolves to /.

import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CircleDashed,
  Dna,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { siteDescription, siteName } from '@/lib/site';

// Keep this a Server Component so it can export metadata.
export const metadata: Metadata = {
  title: { absolute: siteName },
  description: siteDescription,
  // Do not export an explicit openGraph object here; that suppresses the
  // file-based opengraph-image.tsx for the home route.
  alternates: { canonical: '/' },
};

const signals = [
  { icon: ShieldCheck, label: 'Verified profiles' },
  { icon: HeartPulse, label: 'Health-first matching' },
  { icon: MapPin, label: 'Nearby connections' },
];

const features = [
  {
    number: '01',
    title: 'Know who you are meeting',
    description:
      'Browse owner and dog profiles shaped by breed, radius, pedigree, vaccination history, DNA clearances, and clear breeding terms.',
    icon: ShieldCheck,
  },
  {
    number: '02',
    title: 'Match around real health signals',
    description:
      'Keep heat-cycle reminders, health-passport checks, and veterinary verification in the same considered workflow.',
    icon: Dna,
  },
  {
    number: '03',
    title: 'Agree before you connect',
    description:
      'Mutual matches unlock secure chat and a structured mating agreement for fees, puppy-pick terms, retries, and care responsibilities.',
    icon: HeartPulse,
  },
];

const workflow = [
  [
    '01',
    'Create a clear profile',
    'Share your dog’s story, records, location, and what responsible terms look like to you.',
  ],
  [
    '02',
    'Discover with context',
    'Use breed, distance, health signals, and verification status to find relevant profiles.',
  ],
  [
    '03',
    'Connect with care',
    'Mutual interest opens a safer conversation and an agreement everyone can understand.',
  ],
];

const welfareSignals = [
  'Animal welfare before convenience',
  'Records that can be checked',
  'Clear expectations before contact',
];

function KnotMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path
        d="M31.5 25.5c-7.3-7.3-19.2-7.3-26.5 0s-7.3 19.2 0 26.5l37 37c7.3 7.3 19.2 7.3 26.5 0s7.3-19.2 0-26.5l-37-37Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M64.5 25.5c7.3-7.3 19.2-7.3 26.5 0s7.3 19.2 0 26.5l-37 37c-7.3 7.3-19.2 7.3-26.5 0s-7.3-19.2 0-26.5l37-37Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CanidKnotHome() {
  return (
    <main className="overflow-hidden">
      <section className="relative isolate border-b border-border bg-gradient-to-br from-brand-100/70 via-background to-background">
        <div className="container-page relative grid min-h-[calc(100svh-3.5rem)] items-center gap-14 py-16 md:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] md:gap-10 md:py-24 lg:py-28">
          <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Badge
              variant="outline"
              className="mb-7 gap-2 rounded-full border-brand-300 bg-background/70 px-3 py-1 text-brand-700"
            >
              <span className="size-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Built for responsible dog owners in India
            </Badge>
            <h1 className="max-w-3xl font-display text-[clamp(3.5rem,9vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.055em] text-foreground">
              Find the right
              <span className="block text-brand-700">connection.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg font-medium leading-8 text-foreground md:text-xl">
              Verified, health-first breeding connections for India’s responsible dog owners.
            </p>
            <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
              CanidKnot helps you find compatible breeding partners nearby, with animal welfare and
              trust at the center.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                size="lg"
                disabled
                title="Contact channel coming soon"
                className="h-12 rounded-full px-6 shadow-brand"
              >
                Join the early network <span className="text-xs font-normal">(coming soon)</span>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
                <Link href="/discover">
                  Browse nearby profiles <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="link" className="h-12 px-2 text-foreground">
                <a href="#how-it-works">
                  See how it works <ArrowDownRight className="size-4" />
                </a>
              </Button>
            </div>
            <div className="mt-14 flex flex-wrap gap-x-6 gap-y-3 border-t border-border/80 pt-5 text-sm text-muted-foreground">
              {signals.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-brand-600" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[31rem] animate-in fade-in zoom-in-95 duration-1000 md:translate-y-8">
            <div
              className="absolute -right-10 -top-10 size-32 rounded-full border border-brand-300/70 bg-brand-100/40 blur-sm"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-12 -left-8 size-44 rounded-full border border-brand-200/80"
              aria-hidden="true"
            />
            <Card className="relative overflow-hidden border-brand-200/80 bg-card/90 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-600">
                    A better kind of match
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Sample verified profile</p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-brand">
                  <KnotMark className="size-7" />
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex size-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-muted text-primary">
                    <span className="font-display text-4xl font-semibold">B</span>
                    <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold">Bodhi</h2>
                      <Badge variant="secondary" className="rounded-full text-[0.65rem]">
                        Verified
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Labrador Retriever · 3 years
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700">
                      <MapPin className="size-3.5" /> Pune · 8 km away
                    </p>
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-2 text-sm">
                  {[
                    'Vaccinations up to date',
                    'DNA clearances listed',
                    'Pedigree documented',
                    'Breeding terms clear',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-3 text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
                  <span className="text-xs text-muted-foreground">Health passport reviewed</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                    <Stethoscope className="size-3.5" /> Vet partner
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="absolute -bottom-7 -right-3 rounded-xl border border-border bg-background px-4 py-3 shadow-lg sm:-right-8">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <CircleDashed className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Mutual interest</p>
                  <p className="text-[0.68rem] text-muted-foreground">Chat unlocked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section-lg scroll-mt-14">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <div className="max-w-md">
              <p className="text-eyebrow">A calmer way forward</p>
              <h2 className="mt-4 font-display text-h2 text-foreground">
                Less guesswork.
                <br />
                <span className="text-brand-700">More care.</span>
              </h2>
              <p className="mt-6 text-body-lg text-muted-foreground">
                Informal listings make responsible breeding harder than it needs to be. CanidKnot
                brings the important details into the open, so every introduction can start with
                better information.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {features.map(({ number, title, description, icon: Icon }) => (
                <article
                  key={number}
                  className="group grid gap-5 py-8 transition-colors duration-200 hover:bg-muted/40 sm:grid-cols-[4rem_3rem_1fr] sm:items-start sm:gap-3 sm:px-5"
                >
                  <p className="font-mono text-sm text-brand-600">{number}</p>
                  <Icon
                    className="size-6 text-brand-600 transition-transform duration-200 ease-out group-hover:rotate-[-8deg] group-hover:scale-110"
                    strokeWidth={1.6}
                  />
                  <div>
                    <h3 className="font-display text-h4 text-foreground">{title}</h3>
                    <p className="mt-2 max-w-xl leading-7 text-muted-foreground">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-14 border-y border-border bg-muted/40">
        <div className="container-page grid gap-12 py-20 md:grid-cols-[0.8fr_1.2fr] md:items-end md:py-28">
          <div>
            <p className="text-eyebrow">How it works</p>
            <h2 className="mt-4 max-w-lg font-display text-h2 text-foreground">
              A thoughtful match is built, not stumbled into.
            </h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 md:gap-5">
            {workflow.map(([number, title, description]) => (
              <li
                key={number}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-1"
              >
                <span className="font-mono text-xs font-semibold text-brand-600">{number}</span>
                <h3 className="mt-8 font-display text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="welfare" className="section scroll-mt-14">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[calc(var(--radius)*1.6)] bg-primary p-8 text-primary-foreground shadow-xl md:p-12 lg:p-16">
            <div
              className="absolute -right-10 -top-20 size-64 rounded-full border border-primary-foreground/15"
              aria-hidden="true"
            />
            <div
              className="absolute -right-2 -top-12 size-40 rounded-full border border-primary-foreground/15"
              aria-hidden="true"
            />
            <div className="relative grid gap-10 md:grid-cols-[1fr_0.8fr] md:items-end">
              <div className="max-w-2xl">
                <Badge
                  variant="outline"
                  className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                >
                  The CanidKnot standard
                </Badge>
                <h2 className="mt-5 font-display text-h2">
                  Better matches begin with better stewardship.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-primary-foreground/75">
                  KYC, watermarked records, image moderation, reporting tools, and breeder-status
                  checks are designed to discourage puppy mills and support responsible expectations
                  in India.
                </p>
              </div>
              <div className="grid gap-3 border-t border-primary-foreground/20 pt-6 text-sm md:border-l md:border-t-0 md:pl-8 md:pt-0">
                {welfareSignals.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Check className="size-4 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="partners" className="section-lg scroll-mt-14 border-t border-border">
        <div className="container-page grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-2xl">
            <p className="text-eyebrow">For the wider care network</p>
            <h2 className="mt-4 font-display text-h2">A dependable ecosystem around every dog.</h2>
            <p className="mt-5 text-body-lg text-muted-foreground">
              Veterinary directories, fertility specialists, and transport resources help owners
              make informed decisions beyond the initial introduction.
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            disabled
            title="Contact channel coming soon"
            className="h-12 rounded-full px-6"
          >
            Talk to CanidKnot <span className="text-xs font-normal">(coming soon)</span>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-gradient-to-t from-brand-100/60 to-background">
        <div className="container-page flex flex-col gap-8 py-16 md:flex-row md:items-end md:justify-between md:py-24">
          <div className="max-w-2xl">
            <KnotMark className="mb-6 size-12 text-brand-600" />
            <h2 className="font-display text-h2">
              Responsible connections,
              <br />
              <span className="text-brand-700">tied together.</span>
            </h2>
          </div>
          <div className="max-w-xs md:text-right">
            <p className="text-muted-foreground">
              CanidKnot is taking shape with owners, vets, and welfare-minded partners.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Contact CanidKnot — details coming soon.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
