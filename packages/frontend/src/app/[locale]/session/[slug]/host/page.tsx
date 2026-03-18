import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { HostToolbar } from "@/components/session/host-toolbar";
import { SessionLiveHostPage } from "@/components/session/session-live-host-page";
import { getBaseUrl } from "@/lib/base-url";
import { getSession, getSessionData } from "@/lib/session";

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ raw?: string }>;
}) {
  const { slug } = await params;
  const { raw } = await searchParams;
  const session = await getSession(slug);

  if (!session) {
    const t = await getTranslations("pages");

    return (
      <div className="flex min-h-[calc(100dvh-73px)] flex-col items-center justify-center px-6 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/8 blur-3xl" />
        </div>

        <div className="relative space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg
              viewBox="100 85 824 855"
              className="h-8 w-auto text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={65}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M582.687,151.44c88.633,46.208 124.112,154.761 79.876,244.395c-51.925,105.214 -114.549,232.104 -139.582,282.828c-6.796,13.77 -20.916,22.393 -36.269,22.151c-53.688,-0.848 -182.101,-2.876 -273.696,-4.323c-22.082,-0.349 -42.459,-11.945 -54.037,-30.752c-11.578,-18.807 -12.754,-42.223 -3.12,-62.096c50.081,-103.308 132.337,-272.989 191.142,-394.294c18.364,-37.882 51.28,-66.717 91.248,-79.936c39.969,-13.219 83.586,-9.697 120.916,9.764c7.802,4.067 15.667,8.168 23.523,12.263Z" />
              <path d="M422.18,872.922c-89.217,-45.069 -126.083,-153.16 -82.998,-243.352c50.574,-105.87 111.568,-233.551 135.95,-284.592c6.619,-13.856 20.627,-22.659 35.983,-22.613c53.694,0.161 182.123,0.545 273.729,0.819c22.085,0.066 42.609,11.401 54.426,30.058c11.817,18.657 13.294,42.056 3.915,62.051c-48.754,103.941 -128.831,274.661 -186.078,396.708c-17.877,38.114 -50.421,67.368 -90.217,81.098c-39.796,13.73 -83.455,10.767 -121.031,-8.215c-7.853,-3.967 -15.771,-7.967 -23.678,-11.961Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t("sessionExpired")}
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
            {t("sessionExpiredDesc")}
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-indigo-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-[1.02] hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98]"
              style={{ minHeight: "44px" }}
            >
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { snippets, questions, replies } = await getSessionData(slug);
  const baseUrl = await getBaseUrl();
  const participantUrl = `${baseUrl}/session/${slug}`;

  return (
    <SessionLiveHostPage
      session={session}
      sessionSlug={slug}
      rawSecret={raw}
      initialSnippets={snippets}
      initialQuestions={questions}
      initialReplies={replies}
      hostToolbar={<HostToolbar participantUrl={participantUrl} />}
    />
  );
}
