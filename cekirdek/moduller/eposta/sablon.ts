// Ortak e-posta şablonu (kart 0032, karar 0050): mağazanın logosu ve adı, metin dosyasından metinler,
// düz metin karşılığı. Bütün e-postalar buradan geçer. Tasarım değerleri henüz yok; renk verilmez,
// e-posta programının varsayılan renkleri kullanılır (kart 0060).

import { type EpostaSablonu, epostaAyari } from "../../kayitlar/eposta.ts";
import { doldur } from "../../metinler/doldur.ts";
import { type Dil, type MetinAnahtari, metinOkuyucu } from "../../metinler/metin.ts";

// baglanti: e-postadaki düğme yerine geçen bağlantı. Adresi "baglanti" değişkeninden gelir, düz metinde de
// açık yazılır.
type SablonTanimi = {
  konu: MetinAnahtari;
  baslik: MetinAnahtari;
  govde: MetinAnahtari[];
  baglanti?: MetinAnahtari;
};

const sablonlar: Record<EpostaSablonu, SablonTanimi> = {
  deneme: {
    konu: "eposta.deneme.konu",
    baslik: "eposta.deneme.baslik",
    govde: ["eposta.deneme.govde"],
  },
  "hos-geldin": {
    konu: "eposta.hosGeldin.konu",
    baslik: "eposta.hosGeldin.baslik",
    govde: ["eposta.hosGeldin.govde"],
  },
  "sifre-sifirlama": {
    konu: "eposta.sifreSifirlama.konu",
    baslik: "eposta.sifreSifirlama.baslik",
    govde: ["eposta.sifreSifirlama.govde", "eposta.sifreSifirlama.uyari"],
    baglanti: "eposta.sifreSifirlama.baglanti",
  },
  "sifre-degisti": {
    konu: "eposta.sifreDegisti.konu",
    baslik: "eposta.sifreDegisti.baslik",
    govde: ["eposta.sifreDegisti.govde", "eposta.sifreDegisti.uyari"],
  },
  "stok-bildirimi": {
    konu: "eposta.stokBildirimi.konu",
    baslik: "eposta.stokBildirimi.baslik",
    govde: ["eposta.stokBildirimi.govde", "eposta.stokBildirimi.bilgi"],
    baglanti: "eposta.stokBildirimi.baglanti",
  },
};

const htmlKacir = (metin: string): string =>
  metin
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export type EpostaIcerigi = { konu: string; metin: string; html: string };

export const epostaOlustur = (girdi: {
  dil: Dil;
  magazaAdi: string;
  logoAdresi?: string | undefined;
  sablon: EpostaSablonu;
  degiskenler: Record<string, string>;
  tanim?: SablonTanimi;
}): EpostaIcerigi => {
  const { dil, magazaAdi, logoAdresi, sablon, degiskenler, tanim = sablonlar[sablon] } = girdi;
  const oku = metinOkuyucu(dil);
  const degerler = { ...degiskenler, magaza: magazaAdi };
  const satir = (anahtar: MetinAnahtari) => doldur(oku(anahtar), degerler);
  const konu = satir(tanim.konu);
  const baslik = satir(tanim.baslik);
  const govde = tanim.govde.map(satir);
  const altBilgi = satir("eposta.ortak.altBilgi");
  const baglantiMetni = tanim.baglanti === undefined ? undefined : satir(tanim.baglanti);
  const { baglanti: baglantiAdresi } = degiskenler;
  const baglanti =
    baglantiMetni === undefined || baglantiAdresi === undefined
      ? undefined
      : { metin: baglantiMetni, adres: baglantiAdresi };
  const metin = [
    magazaAdi,
    "",
    baslik,
    "",
    ...govde.flatMap((p) => [p, ""]),
    ...(baglanti === undefined ? [] : [`${baglanti.metin}: ${baglanti.adres}`, ""]),
    altBilgi,
  ].join("\n");
  const ust = logoAdresi
    ? `<img src="${htmlKacir(logoAdresi)}" alt="${htmlKacir(magazaAdi)}" height="${epostaAyari.logoYuksekligi}">`
    : `<strong>${htmlKacir(magazaAdi)}</strong>`;
  const html = `<!doctype html>
<html lang="${htmlKacir(dil)}">
<head><meta charset="utf-8"><title>${htmlKacir(konu)}</title></head>
<body>
<p>${ust}</p>
<h1>${htmlKacir(baslik)}</h1>
${govde.map((p) => `<p>${htmlKacir(p)}</p>`).join("\n")}
${baglanti === undefined ? "" : `<p><a href="${htmlKacir(baglanti.adres)}">${htmlKacir(baglanti.metin)}</a></p>`}
<hr>
<p><small>${htmlKacir(altBilgi)}</small></p>
</body>
</html>
`;
  return { konu, metin, html };
};
