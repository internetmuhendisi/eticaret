// Ürünün uzun açıklamasının vitrinde güvenli yazılışı (kart 0138, karar 0108; .claude/rules/guvenlik.md: ürün
// açıklaması ekrana yazılmadan önce zararlı koddan temizlenir). Vitrin uzun açıklamayı yalnız bununla çizer.
//
// - Açıklama biçimli metin (HTML) olabilir: panelin metin düzenleyicisi böyle yazacak. Yalnız aşağıdaki
//   etiketler kalır; öteki etiketler kaldırılır, içindeki yazı kalır (betik, stil ve benzerlerinin içi de
//   kaldırılır). Hiçbir etiket özellik taşımaz, bağlantı yalnız adresini taşır.
// - Bağlantı yalnız https, http, mailto ve tel adresine ya da sitenin kendi yoluna ("/kategori/...") gider.
//   Başka şemalı (javascript:, data:) bağlantının adresi kaldırılır. Her bağlantı rel="nofollow noopener
//   noreferrer" alır, aynı sekmede açılır.
// - Etiket taşımayan açıklama düz metindir (bugünkü başlangıç kataloğu ve panelden önceki ürünler): boş
//   satırla ayrılmış kısımlar paragraf, tek satır sonu satır sonu olur. Düz metindeki < ve & yazı olarak görünür.
// - Temizlenince boş kalan açıklama yoktur (undefined): sayfa bölümü çizmez.
import sanitizeHtml from "sanitize-html";

export const aciklamaEtiketleri = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h3",
  "h4",
  "blockquote",
  "a",
] as const;

const bagliRel = "nofollow noopener noreferrer";

const ayarlar: sanitizeHtml.IOptions = {
  allowedTags: [...aciklamaEtiketleri],
  // rel dönüşümle konur; izin listesi dönüşümden sonra uygulandığı için rel de listededir. Girdideki rel ve
  // öteki özellikler dönüşümde atılır.
  allowedAttributes: { a: ["href", "rel"] },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (etiket, { href }) => ({
      tagName: etiket,
      attribs: { ...(href === undefined ? {} : { href }), rel: bagliRel },
    }),
  },
};

// Açıklama HTML'se tanınan bir etiket taşır: izinliler ve temizlenmesi gerekenler. Başka yazı ("ölçü x<y z> cm")
// düz metindir ve kaçırılarak aynen görünür (bağımsız kontrolün bulgusu). Listede olmayan bir etiketle yazılmış
// metin de düz metin sayılır: kaçırıldığı için zarar vermez.
const taninanEtiketler = [
  ...aciklamaEtiketleri,
  "div",
  "span",
  "h1",
  "h2",
  "h5",
  "h6",
  "script",
  "style",
  "img",
  "iframe",
  "svg",
  "math",
  "table",
  "form",
  "input",
  "button",
  "noscript",
  "object",
  "embed",
  "link",
  "meta",
  "template",
  "video",
  "audio",
];
const htmlKalibi = new RegExp(`<\\/?(?:${taninanEtiketler.join("|")})(?=[\\s/>])`, "i");
const htmlMi = (metin: string): boolean => htmlKalibi.test(metin);

const kacir = (metin: string): string =>
  metin.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const duzMetindenHtml = (metin: string): string =>
  metin
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/)
    .map((paragraf) => paragraf.trim())
    .filter((paragraf) => paragraf !== "")
    .map((paragraf) => `<p>${kacir(paragraf).replaceAll("\n", "<br>")}</p>`)
    .join("");

export const aciklamayiTemizle = (aciklama: string | undefined): string | undefined => {
  if (aciklama === undefined) return undefined;
  const ham = htmlMi(aciklama) ? aciklama : duzMetindenHtml(aciklama);
  const temiz = sanitizeHtml(ham, ayarlar).trim();
  // Yalnız boş etiketler ve boşluk kaldıysa açıklama yoktur.
  return sanitizeHtml(temiz, { allowedTags: [], allowedAttributes: {} }).trim() === ""
    ? undefined
    : temiz;
};
