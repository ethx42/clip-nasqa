import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/en/session/", "/es/session/", "/pt/session/"],
    },
    sitemap: "https://clip.nasqa.io/sitemap.xml",
  };
}
