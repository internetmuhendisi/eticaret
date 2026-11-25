// Ortak e-posta şablonu (kart 0032, karar 0050; kart 0240, karar 0153): mağazanın logosu ve adı, metin
// dosyasından metinler, düz metin karşılığı. Bütün e-postalar buradan geçer.
//
// Gövde bloklardan kurulur (paragraf, kutu, tablo, düğme, bilgi). Hesap ve şifre e-postaları metin anahtarlarından
// (govde), sipariş e-postaları olay anında yazılmış veriden (cekirdek/moduller/siparis/eposta-icerigi.ts) blok üretir.
// Renkler ve yazı tipi sitenin açık temasından gelir (gorunus.ts); e-posta sitenin koyu temasını almaz, e-posta
// programının yaptığı kadar koyulaşır (karar 0145). Ölçüler tasarım değerlerinin ölçeğindendir, e-posta programları
// rem'i her yerde tanımadığı için piksele çevrilir. Stil satır içidir: e-posta programları <style>'ı silebilir.
import { sabitDegerler } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import { type EpostaSablonu, epostaAyari } from "../../kayitlar/eposta.ts";
import type { Bicimleyici } from "../../metinler/bicimleyici.ts";
import { doldur } from "../../metinler/doldur.ts";
import { type Dil, type MetinAnahtari, metinOkuyucu } from "../../metinler/metin.ts";
import { siparisEpostaIcerikleri } from "../siparis/eposta-icerigi.ts";
import { yoneticiEpostaIcerikleri } from "../yonetici-bildirimi/eposta-icerigi.ts";
import { type EpostaGorunusu, varsayilanEpostaGorunusu } from "./gorunus.ts";

export type EpostaDugmesi = { metin: string; adres: string; birincil?: boolean };
// kod: satırın sonundaki eş aralıklı parça (takip numarası, IBAN); metin onun önündeki yazıdır.
export type KutuSatiri = { metin: string; kalin?: boolean; soluk?: boolean; kod?: string };
export type OzetSatiri = { ad: string; deger: string; tur: "duz" | "toplam" | "vergi" };
export type EpostaBlogu =
  | { tur: "paragraf"; metin: string; soluk?: boolean }
  // Vurgulu kutu (havalenin ödeme bilgisi, kargo, mağazanın notu): satırlar ve isteğe bağlı düğme.
  | { tur: "kutu"; satirlar: KutuSatiri[]; vurgu?: boolean; dugme?: EpostaDugmesi }
  // Kalemler (ad, alt satırlar, tutar) ve özet satırları (ara toplam, kargo, toplam, vergi).
  | {
      tur: "tablo";
      satirlar: { ad: string; altlar: string[]; deger: string }[];
      ozet: OzetSatiri[];
    }
  | { tur: "dugme"; dugme: EpostaDugmesi }
  // Başlıklı küçük bilgi (teslimat adresi).
  | { tur: "bilgi"; baslik: string; satirlar: string[] };

export type EpostaGovdesi = {
  konu: string;
  baslik: string;
  bloklar: EpostaBlogu[];
  // Alt bilginin satırları; verilmezse ortak alt bilgi.
  altBilgi?: string[];
  // Üst şeridin sağındaki etiket (yönetici bildirimi, kart 0241): şerit alt kısmın renk çiftiyle koyu çizilir.
  ustEtiketi?: string;
};

// Sipariş e-postalarının gönderimdeki bağlamı: biçim sitenin ayarlarından, adresler sitenin kök adresinden.
export type IcerikBaglami = {
  satir: (anahtar: MetinAnahtari, degerler?: Record<string, string>) => string;
  bicim: Bicimleyici;
  // Sitenin kök adresi ("https://ornek.test"); bilinmiyorsa bağlantılı düğme çizilmez.
  kok: string | undefined;
  // Alt bilgi için satıcının unvanı ve adresi, mağazanın telefonu (ayarda yoksa yazılmaz).
  satici: { unvan?: string; adres?: string; telefon?: string };
};
export type IcerikUretici = (veri: unknown, baglam: IcerikBaglami) => EpostaGovdesi;

// baglanti: e-postadaki düğme yerine geçen bağlantı. Adresi "baglanti" değişkeninden gelir, düz metinde de
// açık yazılır.
type MetinTanimi = {
  konu: MetinAnahtari;
  baslik: MetinAnahtari;
  govde: MetinAnahtari[];
  baglanti?: MetinAnahtari;
};
type SablonTanimi = MetinTanimi | IcerikUretici;

const metinTanimlari = {
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
  "yonetici-daveti": {
    konu: "eposta.yoneticiDaveti.konu",
    baslik: "eposta.yoneticiDaveti.baslik",
    govde: ["eposta.yoneticiDaveti.govde", "eposta.yoneticiDaveti.uyari"],
    baglanti: "eposta.yoneticiDaveti.baglanti",
  },
  "stok-bildirimi": {
    konu: "eposta.stokBildirimi.konu",
    baslik: "eposta.stokBildirimi.baslik",
    govde: ["eposta.stokBildirimi.govde", "eposta.stokBildirimi.bilgi"],
    baglanti: "eposta.stokBildirimi.baglanti",
  },
} as const satisfies Record<string, MetinTanimi>;

// Kayıttaki her şablonun tanımı (tür kontrolü eksik olanı yakalar).
const sablonlar: Record<EpostaSablonu, SablonTanimi> = {
  ...metinTanimlari,
  ...siparisEpostaIcerikleri,
  ...yoneticiEpostaIcerikleri,
};

// Şablon olay anında yazılmış veriden mi çizilir (sipariş ve yönetici e-postaları, kart 0240, 0241): gönderim
// onlara biçimleyiciyi, kök adresi ve satıcı alt bilgisini verir.
export const veriliSablonMu = (sablon: string): boolean =>
  typeof sablonlar[sablon as EpostaSablonu] === "function";

export const htmlKacir = (metin: string): string =>
  metin
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Ölçeğin adımı ya da tasarım değeri ("1.5rem") pikselle: e-posta programları rem'i her yerde tanımaz.
// Kökün yazı boyu 16 px'tir (tarayıcı testi kökün 16 px kaldığını ölçer, kart 0102).
const kokPiksel = 16;
const piksel = (deger: string): string => {
  const rem = /^([0-9.]+)rem$/.exec(deger);
  return rem === null ? deger : `${Number(rem[1]) * kokPiksel}px`;
};
const bosluk = (adim: keyof typeof sabitDegerler.bosluklar): string =>
  piksel(sabitDegerler.bosluklar[adim]);

const stilKur = (g: EpostaGorunusu) => {
  const r = g.renkler;
  return {
    govde: `margin:0;padding:${bosluk("6")} ${bosluk("2")};background:${r.yuzey};color:${r.yazi};font-family:${g.yaziTipi};font-size:${piksel(g.yaziBoylari.govde.boy)};line-height:${g.yaziBoylari.govde.satir};`,
    kap: `max-width:${piksel(sabitDegerler.genislikler.eposta)};margin:0 auto;background:${r.zemin};border:${bosluk("px")} solid ${r.kenar};border-radius:${g.kose};`,
    ust: `padding:${bosluk("4")} ${bosluk("6")};border-bottom:${bosluk("px")} solid ${r.kenar};font-family:${g.baslikYaziTipi};font-size:${piksel(g.yaziBoylari.buyuk.boy)};font-weight:${g.kalinliklar.enKalin};`,
    koyuUst: `padding:${bosluk("4")} ${bosluk("6")};background:${r["alt-kisim"]};color:${r["alt-kisim-ustu"]};font-family:${g.baslikYaziTipi};font-size:${piksel(g.yaziBoylari.buyuk.boy)};font-weight:${g.kalinliklar.enKalin};`,
    ustEtiket: `float:right;font-family:${g.yaziTipi};font-size:${piksel(g.yaziBoylari.kucuk.boy)};font-weight:${g.kalinliklar.normal};line-height:${g.yaziBoylari.buyuk.satir};`,
    ic: `padding:${bosluk("6")};`,
    baslik: `margin:0 0 ${bosluk("4")};font-family:${g.baslikYaziTipi};font-weight:${g.kalinliklar.baslik};font-size:${piksel(g.yaziBoylari.baslik.boy)};line-height:${g.yaziBoylari.baslik.satir};color:${r.yazi};`,
    paragraf: `margin:0 0 ${bosluk("4")};`,
    soluk: `margin:0 0 ${bosluk("4")};color:${r["soluk-yazi"]};font-size:${piksel(g.yaziBoylari.kucuk.boy)};`,
    kutu: `margin:0 0 ${bosluk("4")};padding:${bosluk("4")};background:${r.yuzey};border-radius:${g.kose};`,
    vurguKutu: `margin:0 0 ${bosluk("4")};padding:${bosluk("4")};background:${r.yuzey};border:${bosluk("px")} solid ${r.kenar};border-left:${bosluk("1")} solid ${r.birincil};border-radius:${g.kose};`,
    kutuSatiri: `margin:0 0 ${bosluk("1")};`,
    kod: `font-family:${g.kodYaziTipi};font-weight:${g.kalinliklar.kalin};`,
    tablo: `width:100%;border-collapse:collapse;margin:0 0 ${bosluk("4")};`,
    hucre: `padding:${bosluk("2")} 0;border-bottom:${bosluk("px")} solid ${r.kenar};text-align:left;vertical-align:top;`,
    tutar: `padding:${bosluk("2")} 0 ${bosluk("2")} ${bosluk("3")};border-bottom:${bosluk("px")} solid ${r.kenar};text-align:right;vertical-align:top;white-space:nowrap;`,
    alt: `color:${r["soluk-yazi"]};font-size:${piksel(g.yaziBoylari.kucuk.boy)};`,
    toplam: `padding:${bosluk("2")} 0 ${bosluk("1")};font-weight:${g.kalinliklar.enKalin};font-size:${piksel(g.yaziBoylari.orta.boy)};`,
    toplamTutar: `padding:${bosluk("2")} 0 ${bosluk("1")} ${bosluk("3")};font-weight:${g.kalinliklar.enKalin};font-size:${piksel(g.yaziBoylari.orta.boy)};text-align:right;white-space:nowrap;`,
    vergi: `padding:0 0 ${bosluk("1")};color:${r["soluk-yazi"]};font-size:${piksel(g.yaziBoylari.kucuk.boy)};`,
    vergiTutar: `padding:0 0 ${bosluk("1")} ${bosluk("3")};color:${r["soluk-yazi"]};font-size:${piksel(g.yaziBoylari.kucuk.boy)};text-align:right;white-space:nowrap;`,
    duz: `padding:${bosluk("1")} 0;`,
    duzTutar: `padding:${bosluk("1")} 0 ${bosluk("1")} ${bosluk("3")};text-align:right;white-space:nowrap;`,
    dugme: `display:inline-block;padding:${bosluk("3")} ${bosluk("5")};border-radius:${g.dugmeKosesi};background:${r.yazi};color:${r.zemin};font-weight:${g.kalinliklar.kalin};text-decoration:none;`,
    birincilDugme: `display:inline-block;padding:${bosluk("3")} ${bosluk("5")};border-radius:${g.dugmeKosesi};background:${r.birincil};color:${r["birincil-ustu"]};font-weight:${g.kalinliklar.kalin};text-decoration:none;`,
    dugmeKabi: `margin:0 0 ${bosluk("4")};`,
    altBilgi: `padding:${bosluk("4")} ${bosluk("6")};border-top:${bosluk("px")} solid ${r.kenar};background:${r.yuzey};color:${r["soluk-yazi"]};font-size:${piksel(g.yaziBoylari.kucuk.boy)};`,
    altSatir: `margin:0 0 ${bosluk("1")};`,
    // Telefonda (tablet genişliğinin altında) dış boşluk ve çerçeve yok, iç boşluk dar (taslak, kart 0240). <style>'ı
    // silen e-posta programında satır içi değerler kalır.
    telefon: `@media (max-width:${piksel(sabitDegerler.kirilmaNoktalari.tablet)}){.e-govde{padding:0 !important}.e-kap{border:0 !important;border-radius:0 !important}.e-ic{padding-left:${bosluk("4")} !important;padding-right:${bosluk("4")} !important}}`,
  };
};
type Stiller = ReturnType<typeof stilKur>;

const dugmeHtml = (s: Stiller, d: EpostaDugmesi): string =>
  `<p style="${s.dugmeKabi}"><a href="${htmlKacir(d.adres)}" style="${d.birincil ? s.birincilDugme : s.dugme}">${htmlKacir(d.metin)}</a></p>`;

const blokHtml = (s: Stiller, b: EpostaBlogu): string => {
  switch (b.tur) {
    case "paragraf":
      return `<p style="${b.soluk ? s.soluk : s.paragraf}">${htmlKacir(b.metin)}</p>`;
    case "kutu":
      return `<div style="${b.vurgu ? s.vurguKutu : s.kutu}">${b.satirlar
        .map((satir) => {
          // Mağazanın çok satırlı yazısı (not, ret açıklaması) satır sonlarıyla çizilir.
          const ic = htmlKacir(satir.metin).replaceAll("\n", "<br>");
          const bicimli = `${satir.kalin ? `<strong>${ic}</strong>` : ic}${
            satir.kod === undefined ? "" : `<span style="${s.kod}">${htmlKacir(satir.kod)}</span>`
          }`;
          return `<p style="${s.kutuSatiri}${satir.soluk ? s.alt : ""}">${bicimli}</p>`;
        })
        .join("")}${b.dugme === undefined ? "" : dugmeHtml(s, b.dugme)}</div>`;
    case "tablo": {
      const kalemler = b.satirlar
        .map(
          (satir) =>
            `<tr><td style="${s.hucre}">${htmlKacir(satir.ad)}${satir.altlar
              .map((alt) => `<br><span style="${s.alt}">${htmlKacir(alt)}</span>`)
              .join("")}</td><td style="${s.tutar}">${htmlKacir(satir.deger)}</td></tr>`,
        )
        .join("");
      const ozet = b.ozet
        .map((satir) => {
          const [sol, sag] =
            satir.tur === "toplam"
              ? [s.toplam, s.toplamTutar]
              : satir.tur === "vergi"
                ? [s.vergi, s.vergiTutar]
                : [s.duz, s.duzTutar];
          return `<tr><td style="${sol}">${htmlKacir(satir.ad)}</td><td style="${sag}">${htmlKacir(satir.deger)}</td></tr>`;
        })
        .join("");
      return `<table role="presentation" style="${s.tablo}"><tbody>${kalemler}${ozet}</tbody></table>`;
    }
    case "dugme":
      return dugmeHtml(s, b.dugme);
    case "bilgi":
      return `<p style="${s.paragraf}"><strong>${htmlKacir(b.baslik)}</strong>${b.satirlar
        .map((satir) => `<br>${htmlKacir(satir)}`)
        .join("")}</p>`;
  }
};

const blokMetni = (b: EpostaBlogu): string[] => {
  switch (b.tur) {
    case "paragraf":
      return [b.metin];
    case "kutu":
      return [
        b.satirlar.map((satir) => `${satir.metin}${satir.kod ?? ""}`).join("\n"),
        ...(b.dugme === undefined ? [] : [`${b.dugme.metin}: ${b.dugme.adres}`]),
      ];
    case "tablo":
      return [
        [
          ...b.satirlar.map((satir) => [satir.ad, ...satir.altlar, satir.deger].join("\n  ")),
          ...b.ozet.map((satir) => `${satir.ad}: ${satir.deger}`),
        ].join("\n"),
      ];
    case "dugme":
      return [`${b.dugme.metin}: ${b.dugme.adres}`];
    case "bilgi":
      return [[b.baslik, ...b.satirlar].join("\n")];
  }
};

export type EpostaIcerigi = { konu: string; metin: string; html: string };

export const epostaOlustur = (girdi: {
  dil: Dil;
  magazaAdi: string;
  logoAdresi?: string | undefined;
  sablon: EpostaSablonu;
  degiskenler: Record<string, string>;
  // Sipariş e-postalarının olay anındaki verisi ve gönderimdeki bağlamı.
  veri?: unknown;
  bicim?: Bicimleyici;
  kok?: string | undefined;
  satici?: IcerikBaglami["satici"];
  gorunus?: EpostaGorunusu;
  tanim?: SablonTanimi;
}): EpostaIcerigi => {
  const { dil, magazaAdi, logoAdresi, sablon, degiskenler, tanim = sablonlar[sablon] } = girdi;
  const oku = metinOkuyucu(dil);
  const degerler = { ...degiskenler, magaza: magazaAdi };
  const satir = (anahtar: MetinAnahtari, ek: Record<string, string> = {}) =>
    doldur(oku(anahtar), { ...degerler, ...ek });
  let govde: EpostaGovdesi;
  if (typeof tanim === "function") {
    if (girdi.bicim === undefined) throw new Error("Sipariş e-postası biçimleyicisiz kurulamaz.");
    govde = tanim(girdi.veri, {
      satir,
      bicim: girdi.bicim,
      kok: girdi.kok,
      satici: girdi.satici ?? {},
    });
  } else {
    const baglantiMetni = tanim.baglanti === undefined ? undefined : satir(tanim.baglanti);
    const { baglanti: baglantiAdresi } = degiskenler;
    govde = {
      konu: satir(tanim.konu),
      baslik: satir(tanim.baslik),
      bloklar: [
        ...tanim.govde.map((anahtar) => ({ tur: "paragraf" as const, metin: satir(anahtar) })),
        ...(baglantiMetni === undefined || baglantiAdresi === undefined
          ? []
          : [{ tur: "dugme" as const, dugme: { metin: baglantiMetni, adres: baglantiAdresi } }]),
      ],
    };
  }
  const altBilgi = govde.altBilgi ?? [satir("eposta.ortak.altBilgi")];
  const metin = [
    magazaAdi,
    "",
    govde.baslik,
    "",
    ...govde.bloklar.flatMap((blok) => [...blokMetni(blok), ""]),
    ...altBilgi,
  ].join("\n");
  const s = stilKur(girdi.gorunus ?? varsayilanEpostaGorunusu);
  const ust = logoAdresi
    ? `<img src="${htmlKacir(logoAdresi)}" alt="${htmlKacir(magazaAdi)}" height="${epostaAyari.logoYuksekligi}">`
    : `<strong>${htmlKacir(magazaAdi)}</strong>`;
  const html = `<!doctype html>
<html lang="${htmlKacir(dil)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${htmlKacir(govde.konu)}</title>
<style>${s.telefon}</style></head>
<body class="e-govde" style="${s.govde}">
<div class="e-kap" style="${s.kap}">
<div class="e-ic" style="${govde.ustEtiketi === undefined ? s.ust : s.koyuUst}">${
    govde.ustEtiketi === undefined
      ? ""
      : `<span style="${s.ustEtiket}">${htmlKacir(govde.ustEtiketi)}</span>`
  }${ust}</div>
<div class="e-ic" style="${s.ic}">
<h1 style="${s.baslik}">${htmlKacir(govde.baslik)}</h1>
${govde.bloklar.map((blok) => blokHtml(s, blok)).join("\n")}
</div>
<div class="e-ic" style="${s.altBilgi}">${altBilgi.map((satir) => `<p style="${s.altSatir}">${htmlKacir(satir)}</p>`).join("")}</div>
</div>
</body>
</html>
`;
  return { konu: govde.konu, metin, html };
};
