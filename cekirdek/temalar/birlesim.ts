// Sitenin tasarım değerlerinin birleşimi (.claude/rules/tasarim-sistemi.md, kararlar 0076 ve 0080). Vitrinin
// ve panelin değerleri yalnız buradan okunur, bileşenler sonucu kullanır.
//
// - Vitrin: sitenin seçili temasının değerleri ile mağaza sahibinin temanın açtığı yerlerdeki ayarlarının
//   birleşimi. Mağaza sahibi bir renk seçer; renk açık temada kaydedilirken okunurluk ölçüsünden geçmiştir,
//   koyu temada okunur değilse onun okunur en yakın tonu kullanılır (kart 0105, kullanıcı kararı).
// - Panel: bütün sitelerde aynı değerler (varsayilanTemaDegerleri), siteden yalnız ana renk (birincil):
//   açık temada sitenin açık, koyu temada sitenin koyu temadaki ana rengi (temanın koyu tonu korunur).
//   Ana renk panelde okunur değilse okunur tonu türetilir.
// - Değerler okunamazsa (veritabanı yok, tema bozuk) sayfa düşmez: hata kaydedilir, sayfa sitenin
//   başlangıç temasıyla, o da olmazsa başlangıç değerleriyle açılır.
import { cache } from "react";
import { temaDegerleriCss } from "../../bilesenler/tasarim-degerleri/css.ts";
import {
  type RenkAdi,
  renkAdlari,
  type TemaDegerleri,
  varsayilanTemaDegerleri,
} from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";
import { siteninGecerliTemasi } from "../moduller/tema/servis.ts";
import type { TemaAyarlari } from "./ayarlar.ts";
import { okunmayanCiftler, okunurRenk } from "./okunurluk.ts";
import type { TemaTanimi } from "./sema.ts";

type Mod = "acik" | "koyu";

// Seçilen renkleri bir temanın renklerine koyar. Önce hepsi birlikte konur: birlikte okunur olan renkler
// aynen kalır (kaydedilirken de açık temada birlikte ölçülmüşlerdir; ana renk ve üstündeki yazı gibi
// birbirine bağlı iki renk ayrı ayrı ölçülseydi doğru bir seçim bozulurdu). Okunmayan her renk, öteki
// seçilen renkler yerindeyken okunur en yakın tonuna, o da yoksa temanın kendi rengine döner. Sıra renk
// adlarının sırasıdır, kaydın sırası değil.
// Ölçü temanın bağlarıyla yapılır (kart 0124): ana renge bağlı renklerin çiftleri de ana rengin çiftleridir.
const renkleriKoy = (
  degerler: TemaDegerleri,
  mod: Mod,
  secilenler: readonly (readonly [RenkAdi, string])[],
): void => {
  const renkler = degerler.renkler[mod];
  const olcu = { renkler, baglar: degerler.renkBaglari, mod };
  const asil = { ...renkler };
  for (const [ad, renk] of secilenler) renkler[ad] = renk;
  for (const [ad, renk] of secilenler) {
    if (okunmayanCiftler(olcu, ad).length === 0) continue;
    renkler[ad] = okunurRenk(olcu, ad, renk) ?? asil[ad];
  }
};

// Temanın değerleri ile mağaza sahibinin ayarlarının birleşimi.
export function temaBirlesimi(tema: TemaTanimi, ayarlar: TemaAyarlari): TemaDegerleri {
  const degerler = structuredClone(tema.degerler);
  const secilenler = renkAdlari.flatMap((ad) => {
    const renk = ayarlar.renkler[ad];
    return renk !== undefined && tema.magazaSecenekleri.renkler.includes(ad)
      ? [[ad, renk] as const]
      : [];
  });
  renkleriKoy(degerler, "acik", secilenler);
  renkleriKoy(degerler, "koyu", secilenler);
  const secenekler = tema.magazaSecenekleri;
  const yaziTipi =
    ayarlar.yaziTipi === undefined ? undefined : secenekler.yaziTipleri[ayarlar.yaziTipi];
  if (yaziTipi !== undefined) {
    degerler.yaziTipleri.govde = yaziTipi.govde;
    degerler.yaziTipleri.baslik = yaziTipi.baslik;
  }
  const kose = ayarlar.kose === undefined ? undefined : secenekler.koseler[ayarlar.kose];
  if (kose !== undefined) {
    degerler.koseler.kucuk = kose.kucuk;
    degerler.koseler.orta = kose.orta;
  }
  const dugme =
    ayarlar.dugmeBicimi === undefined ? undefined : secenekler.dugmeBicimleri[ayarlar.dugmeBicimi];
  if (dugme !== undefined) degerler.koseler.dugme = dugme;
  return degerler;
}

// Panelin değerleri: ortak değerler ve sitenin iki temadaki ana rengi.
export function panelDegerleri(anaRenk: Readonly<Record<Mod, string>> | undefined): TemaDegerleri {
  const degerler = structuredClone(varsayilanTemaDegerleri);
  if (anaRenk !== undefined) {
    renkleriKoy(degerler, "acik", [["birincil", anaRenk.acik]]);
    renkleriKoy(degerler, "koyu", [["birincil", anaRenk.koyu]]);
  }
  return degerler;
}

// Değerleri sayfaya yazılacak CSS'e çevirir. Şemaya uymayan değer sayfaya yazılmaz; site düşmez, hata
// kaydedilir ve sayfa başlangıç değerleriyle açılır.
export function tasarimCss(degerler: TemaDegerleri, secenek: { koyuTema: boolean }): string {
  try {
    return temaDegerleriCss(degerler, secenek);
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "tasarim-degerleri" });
    return temaDegerleriCss(varsayilanTemaDegerleri, secenek);
  }
}

type Okuyucu = () => Promise<{ tema: { tanim: TemaTanimi }; ayarlar: TemaAyarlari }>;

// Sitenin geçerli teması, istek başına bir kez okunur: kök düzen ve panel düzeni aynı isteği paylaşır
// (React'in sunucu bileşenlerindeki cache'i; sunucu bileşeni dışında her çağrı yeniden okur).
const istekBasinaTema: Okuyucu = cache(() => siteninGecerliTemasi());

// Sitenin başlangıç teması: veritabanı okunamazsa vitrin bununla açılır.
const baslangicTemasi: Okuyucu = async () => {
  const { tema: kod, ayarlar } = calisanSite().temaBaslangici;
  const tema = calisanSite().temalar.find((aday) => aday.kod === kod);
  if (tema === undefined) throw new Error("Sitenin başlangıç teması yok.");
  return { tema, ayarlar };
};

const temaOku = async (okuyucu: Okuyucu) => {
  try {
    return await okuyucu();
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "tema" });
    return baslangicTemasi().catch((ikinci: unknown) => {
      hatayiKaydet(ikinci, { kaynak: "tema" });
      return undefined;
    });
  }
};

// Kök düzenin sayfaya yazdığı vitrin CSS'i.
export async function sitenTasarimCss(okuyucu: Okuyucu = istekBasinaTema): Promise<string> {
  const secili = await temaOku(okuyucu);
  if (secili === undefined) return tasarimCss(varsayilanTemaDegerleri, { koyuTema: false });
  return tasarimCss(temaBirlesimi(secili.tema.tanim, secili.ayarlar), {
    koyuTema: secili.ayarlar.koyuTema,
  });
}

// Panel düzeninin sayfaya yazdığı CSS: vitrinin değerlerinin üstüne yazılır. Panel cihazın koyu tema
// tercihine her sitede uyar.
export async function panelTasarimCss(okuyucu: Okuyucu = istekBasinaTema): Promise<string> {
  const secili = await temaOku(okuyucu);
  const renkler =
    secili === undefined ? undefined : temaBirlesimi(secili.tema.tanim, secili.ayarlar).renkler;
  const anaRenk =
    renkler === undefined
      ? undefined
      : { acik: renkler.acik.birincil, koyu: renkler.koyu.birincil };
  return tasarimCss(panelDegerleri(anaRenk), { koyuTema: true });
}
