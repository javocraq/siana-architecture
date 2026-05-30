import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string | null;
  image?: string | null;
  canonical?: string | null;
  type?: "website" | "article";
}

export default function SEO({ title, description, image, canonical, type = "website" }: SEOProps) {
  const url = canonical || (typeof window !== "undefined" ? window.location.href : "");
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
