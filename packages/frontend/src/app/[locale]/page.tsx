import { getTranslations } from 'next-intl/server';
import { createSession } from '@/actions/session';

export default async function Home() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-[calc(100vh-53px)] flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <div className="w-full max-w-3xl space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t('landing.headline')}
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t('landing.subtitle')}
          </p>

          {/* Inline session creation form */}
          <form
            action={createSession}
            className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-card p-5 shadow-xl shadow-emerald-500/10 ring-1 ring-border sm:flex-row sm:gap-3"
          >
            <input
              name="title"
              type="text"
              maxLength={50}
              placeholder={t('landing.placeholder')}
              required
              className="flex-1 rounded-xl border border-input bg-background px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white transition hover:scale-[1.02] hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-[0.98]"
            >
              {t('landing.cta')}
            </button>
          </form>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border px-5 py-16">
        <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/20 bg-card p-8 text-center shadow-sm"
            >
              <span className="text-4xl text-emerald-500" aria-hidden="true">
                {feature.icon}
              </span>
              <h2 className="text-base font-bold text-foreground">
                {feature.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '⚡',
    title: 'Real-time Clipboard',
    description:
      'Share code snippets and links instantly. Every connected device sees updates in under 200ms.',
  },
  {
    icon: '💬',
    title: 'Live Q&A',
    description:
      'Audience members submit questions and vote up the best ones — no app download needed.',
  },
  {
    icon: '🔓',
    title: 'No sign-up needed',
    description:
      'Create a session in seconds. Share the link. Done.',
  },
];
