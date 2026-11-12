// Uzun açıklamanın vitrinde güvenli yazılışı (kart 0138, karar 0108): izinli etiketler kalır, betik, olay
// özniteliği, stil, görsel, çerçeve ve tehlikeli bağlantı düşer; düz metin paragraflara çevrilip kaçırılır.
import { describe, expect, it } from "vitest";
import { aciklamaEtiketleri, aciklamayiTemizle } from "../aciklama.ts";

describe("açıklamanın temizlenmesi", () => {
  it("izinli etiketler kalır, öznitelikleri düşer", () => {
    expect(
      aciklamayiTemizle(
        '<h3 class="x">Başlık</h3><p style="color:red" onclick="x()">Metin <strong>kalın</strong> <em>eğik</em></p><ul><li>bir</li></ul><ol><li>iki</li></ol><blockquote>alıntı</blockquote>',
      ),
    ).toBe(
      "<h3>Başlık</h3><p>Metin <strong>kalın</strong> <em>eğik</em></p><ul><li>bir</li></ul><ol><li>iki</li></ol><blockquote>alıntı</blockquote>",
    );
  });

  it("betik, stil, görsel, çerçeve, form ve SVG düşer; içindeki betik yazısı da", () => {
    const sonuc = aciklamayiTemizle(
      '<p>a<script>alert(1)</script><style>p{}</style><img src=x onerror=alert(1)><iframe src="https://x"></iframe><form action="/x"><input></form><svg><a href="javascript:alert(1)">s</a></svg><noscript><p>gizli</p></noscript></p>',
    );
    expect(sonuc).not.toMatch(/script|style|img|iframe|form|input|svg|onerror|alert|javascript/i);
  });

  it("bağlantı yalnız güvenli adresle ve rel ile kalır", () => {
    const sonuc = aciklamayiTemizle(
      '<a href="javascript:alert(1)">a</a><a href="JaVaScRiPt:alert(1)">b</a><a href=" javascript:alert(1)">c</a><a href="data:text/html,x">d</a><a href="//kotu.test">e</a><a href="vbscript:x">f</a><a href="https://iyi.test" target="_blank" rel="opener">g</a><a href="/kategori/giyim">h</a><a href="mailto:a@b.test">i</a>',
    );
    const rel = 'rel="nofollow noopener noreferrer"';
    expect(sonuc).toBe(
      [
        `<a ${rel}>a</a>`,
        `<a ${rel}>b</a>`,
        `<a ${rel}>c</a>`,
        `<a ${rel}>d</a>`,
        `<a ${rel}>e</a>`,
        `<a ${rel}>f</a>`,
        `<a href="https://iyi.test" ${rel}>g</a>`,
        `<a href="/kategori/giyim" ${rel}>h</a>`,
        `<a href="mailto:a@b.test" ${rel}>i</a>`,
      ].join(""),
    );
  });

  it("düz metin paragraflara ve satır sonlarına çevrilir, işaretler yazı olarak kalır", () => {
    expect(aciklamayiTemizle("Bir & iki < üç\r\n\r\nİkinci\nsatır")).toBe(
      "<p>Bir &amp; iki &lt; üç</p><p>İkinci<br />satır</p>",
    );
  });

  it("düz metindeki kapanmamış etiket benzeri yazı kaybolmaz", () => {
    expect(aciklamayiTemizle("Fiyat<indirim olursa\n\nsonraki")).toBe(
      "<p>Fiyat&lt;indirim olursa</p><p>sonraki</p>",
    );
  });

  it("etikete benzeyen ama etiket olmayan yazı düz metindir, kaybolmaz", () => {
    expect(aciklamayiTemizle("ölçü x<y z> cm")).toBe("<p>ölçü x&lt;y z&gt; cm</p>");
    // Tanınan etiket varsa HTML'dir: <script> büyük harfle ve satır sonuyla da.
    expect(aciklamayiTemizle("a<SCRIPT\n>alert(1)</SCRIPT>b")).toBe("ab");
  });

  it("boş ya da yalnız boş etiketli açıklama yoktur", () => {
    expect(aciklamayiTemizle(undefined)).toBeUndefined();
    expect(aciklamayiTemizle("   ")).toBeUndefined();
    expect(aciklamayiTemizle("<p> </p><script>x</script>")).toBeUndefined();
  });

  it("izinli etiket listesi biçimli metin stilinin etiketleriyle aynı (bicimli-metin)", async () => {
    const { readFile } = await import("node:fs/promises");
    const css = await readFile(
      new URL("../../../../bilesenler/tasarim-degerleri/tailwind.css", import.meta.url),
      "utf8",
    );
    const blok = css.slice(css.indexOf("@utility bicimli-metin"));
    const stilli = new Set(
      [...blok.slice(0, blok.indexOf("\n}\n")).matchAll(/& ([a-z0-9]+)/g)].map((e) => e[1]),
    );
    // Paragraf ve satır sonu aralıkla, eğik ve altı çizili tarayıcının kendi stiliyle görünür.
    const kendiStilli = new Set(["p", "br", "em", "i", "u", "s", "li"]);
    expect(aciklamaEtiketleri.filter((e) => !kendiStilli.has(e) && !stilli.has(e))).toEqual([]);
  });
});
