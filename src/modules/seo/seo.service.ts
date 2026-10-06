import Blog from "../blog/blog.model";
import RagImage from "../rag/rag.image.model";
import config from "../../config/config";

function createPromptSlug(prompt: string, id: string): string {
  if (!prompt) return id;
  const cleanPrompt = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
  return cleanPrompt ? `${cleanPrompt}-${id}` : id;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

const getBaseUrl = (): string =>
  (config.clientUrl || "https://www.ragai.website").replace(/\/+$/, "");

export const getBlogPageUrl = (slug: string): string => `${getBaseUrl()}/blog/${slug}`;

export const getImagePageUrl = (image: { _id: { toString(): string }; prompt: string }): string =>
  `${getBaseUrl()}/free-images/${createPromptSlug(image.prompt, image._id.toString())}`;

export interface ISitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

/**
 * All public URLs listed in the sitemap: static routes, published blogs, and image detail pages
 */
export const getSitemapEntries = async (): Promise<ISitemapEntry[]> => {
  const baseUrl = getBaseUrl();
  const now = new Date().toISOString();

  // 1. Static Core Landing & Product Pages
  const staticUrls = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/features", priority: "0.9", changefreq: "weekly" },
    { path: "/how-it-works", priority: "0.8", changefreq: "weekly" },
    { path: "/pricing", priority: "0.9", changefreq: "weekly" },
    { path: "/contact", priority: "0.8", changefreq: "monthly" },
    { path: "/blog", priority: "0.9", changefreq: "daily" },
    { path: "/free-images", priority: "0.9", changefreq: "daily" },
    { path: "/image-editor", priority: "0.8", changefreq: "weekly" },
    { path: "/document-converter", priority: "0.8", changefreq: "weekly" },
    { path: "/register", priority: "0.7", changefreq: "monthly" },
    { path: "/login", priority: "0.5", changefreq: "monthly" },
    { path: "/privacy", priority: "0.4", changefreq: "monthly" },
    { path: "/terms", priority: "0.4", changefreq: "monthly" },
    { path: "/security", priority: "0.6", changefreq: "monthly" },
  ];

  // 2. Fetch all published blogs
  const blogs = await Blog.find({ status: "published" }, { slug: 1, updatedAt: 1, publishedAt: 1 }).lean();

  // 3. Fetch all public generated images
  const images = await RagImage.find({}, { _id: 1, prompt: 1, createdAt: 1, updatedAt: 1 })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  return [
    ...staticUrls.map((item) => ({
      loc: `${baseUrl}${item.path}`,
      lastmod: now,
      changefreq: item.changefreq,
      priority: item.priority,
    })),
    ...blogs.map((blog) => ({
      loc: getBlogPageUrl(blog.slug),
      lastmod: (blog.updatedAt || blog.publishedAt || new Date()).toISOString(),
      changefreq: "weekly",
      priority: "0.8",
    })),
    ...images.map((img) => ({
      loc: getImagePageUrl(img),
      lastmod: (img.updatedAt || img.createdAt || new Date()).toISOString(),
      changefreq: "weekly",
      priority: "0.7",
    })),
  ];
};

/**
 * Generate XML sitemap containing all static routes, published blogs, and image detail pages
 */
export const generateSitemapXml = async (): Promise<string> => {
  const entries = await getSitemapEntries();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  for (const entry of entries) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
};

/**
 * Generate standard robots.txt for search engines
 */
export const generateRobotsTxt = (): string => {
  const baseUrl = getBaseUrl();

  return `# Robots.txt for RagAI Enterprise Platform
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /_next/
Disallow: /v1/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

`;
};

