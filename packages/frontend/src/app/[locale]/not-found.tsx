import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("pages");

  return (
    <div className="flex min-h-[calc(100vh-49px)] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-xl font-semibold text-foreground">{t("sessionNotFound")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("sessionNotFoundDesc")}</p>
      <Link
        href="/"
        className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center" }}
      >
        {t("createNewSession")}
      </Link>
    </div>
  );
}
