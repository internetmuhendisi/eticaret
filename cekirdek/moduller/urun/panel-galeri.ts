// Ürün ekranının galerisi (kart 0266, karar 0073 ve 0162; taslak: planlar/tasarim-yonu/panel.html, u-galeri). Ürünün
// tek "Kaydet"iyle ürünle aynı işlemde yazılır. Ekran galerinin son hâlini sırasıyla gönderir; bu dosya farkı çıkarıp
// yalnız galeri işlemleriyle (galeri.ts) yazar:
//
// - Ekranın gördüğü kayıtlı öğeler (`gorulen`) bugünkü canlı galeriyle aynı değilse (arada başka yerden öğe eklendi ya
//   da silindi) çakışma (`galeri-degisti`), hiçbir şey yazılmaz. Okuma ürün kilidinin altındadır.
// - Görülen ama listede olmayan öğe silinir (galeriOgesiSil: öğeyi seçmiş birleşimin görseli boşalır).
// - Listedeki kayıtlı öğenin alternatif metni değişmişse yazılır; yeni görsel (yüklenmiş dosyanın kimliği) ve yeni
//   video (bağlantı) eklenir; en son bütün liste sıralanır (ilk görsel ana görseldir).
// - Hata ekranın alanının yoluyla döner: "galeri.ogeler.2.alternatifMetin", "galeri.ogeler.0.dosya",
//   "galeri.ogeler.1.adres", sınır "galeri".
import { z } from "zod";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { galeriSinirlari } from "../../kayitlar/gorsel.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikSemasi } from "../../veritabani/kimlik.ts";
import { cakisma, yolla } from "./dogrulama.ts";
import { type galeriIslemleri, urunGalerileri } from "./galeri.ts";
import { urunKilidiAl } from "./kilit.ts";

// Metinler servisin şemasında doğrulanır (alternatifMetin, adres); burada yalnız uzunluk üst sınırı.
const metin = z.string().max(2000);

export const panelGaleriSemasi = z.strictObject({
  gorulen: z.array(kimlikSemasi).max(galeriSinirlari.oge),
  ogeler: z
    .array(
      z.union([
        z.strictObject({ kimlik: kimlikSemasi, alternatifMetin: metin }),
        z.strictObject({ dosya: kimlikSemasi, alternatifMetin: metin }),
        z.strictObject({ video: metin, alternatifMetin: metin }),
      ]),
    )
    .max(galeriSinirlari.oge),
});
export type PanelGaleri = z.input<typeof panelGaleriSemasi>;

type GaleriServisi = ReturnType<typeof galeriIslemleri>;

export const panelGaleriYaz = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  urun: string,
  ham: PanelGaleri,
  servis: GaleriServisi,
): Promise<void> => {
  const sonuc = panelGaleriSemasi.safeParse(ham);
  if (!sonuc.success) throw cakisma("galeri", "galeri-degisti");
  const { gorulen, ogeler } = sonuc.data;
  await urunKilidiAl(islem);
  const simdiki = ((await urunGalerileri(islem, [urun])).get(kimligiDuzelt(urun)) ?? []).map(
    (oge) => oge.kimlik,
  );
  const gorulenler = new Set(gorulen.map(kimligiDuzelt));
  if (simdiki.length !== gorulenler.size || simdiki.some((kimlik) => !gorulenler.has(kimlik))) {
    throw cakisma("galeri", "galeri-degisti");
  }
  const kalanlar = new Set(
    ogeler.flatMap((oge) => ("kimlik" in oge ? [kimligiDuzelt(oge.kimlik)] : [])),
  );
  // Listede kayıtlı ama görülmemiş öğe yoktur: görülen dışındaki kimlik çakışmadır.
  if ([...kalanlar].some((kimlik) => !gorulenler.has(kimlik))) {
    throw cakisma("galeri", "galeri-degisti");
  }
  for (const kimlik of simdiki) {
    if (!kalanlar.has(kimlik)) await servis.galeriOgesiSil(islem, kim, kimlik);
  }
  const sira: string[] = [];
  for (const [i, oge] of ogeler.entries()) {
    // Sınır hatası galerinin kendisinindir; öteki hatalar öğenin alanınındır.
    const yol = (alan: string) => (alan === "galeri" ? "galeri" : `galeri.ogeler.${i}.${alan}`);
    if ("kimlik" in oge) {
      const kimlik = kimligiDuzelt(oge.kimlik);
      await yolla(yol, () =>
        servis.galeriOgesiDegistir(islem, kim, kimlik, { alternatifMetin: oge.alternatifMetin }),
      );
      sira.push(kimlik);
    } else if ("dosya" in oge) {
      sira.push(
        await yolla(yol, () =>
          servis.galeriyeGorselEkle(islem, kim, urun, {
            dosya: oge.dosya,
            alternatifMetin: oge.alternatifMetin,
          }),
        ),
      );
    } else {
      sira.push(
        await yolla(yol, () =>
          servis.galeriyeVideoEkle(islem, kim, urun, {
            adres: oge.video,
            alternatifMetin: oge.alternatifMetin,
          }),
        ),
      );
    }
  }
  await yolla(
    () => "galeri",
    () => servis.galeriyiSirala(islem, kim, urun, { ogeler: sira }),
  );
};
