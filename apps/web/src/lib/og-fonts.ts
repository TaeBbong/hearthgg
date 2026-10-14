/**
 * Fonts for share images. Names can be any script, so instead of bundling
 * CJK fonts the glyphs are subset on demand by Google Fonts (`text=`), the
 * approach the Next.js/Vercel OG docs use. Without a browser user agent the
 * API serves TrueType, which Satori needs.
 */
type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };

async function loadGoogleFont(family: string, weight: OgFont["weight"], text: string): Promise<OgFont | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? { name: family, data: await response.arrayBuffer(), weight, style: "normal" } : null;
  } catch {
    // The image still renders with the built-in font; only uncovered glyphs suffer.
    return null;
  }
}

/** Korean first; Chinese and Cyrillic/Greek fallbacks only when the text needs them. */
export async function ogFonts(text: string, weights: ReadonlyArray<OgFont["weight"]> = [700]): Promise<OgFont[]> {
  const families = ["Noto Sans KR"];
  if (/[一-鿿]/.test(text)) families.push("Noto Sans SC");
  if (/[Ͱ-ϿЀ-ӿ]/.test(text)) families.push("Noto Sans");
  const fonts = await Promise.all(families.flatMap((family) => weights.map((weight) => loadGoogleFont(family, weight, text))));
  return fonts.filter((font): font is OgFont => font !== null);
}
