// Müşterinin adres defteri (kart 0237, karar 0149). Adresler yalnız bu servisle okunur ve değişir.
//
// Kurallar:
// - Müşteri yalnız kendi adreslerini görür ve değiştirir: kimlik yalnız kapıdan gelir, her sorgu onunla süzülür.
//   Başka müşterinin adresi olmayan adresle aynı cevabı alır ("adres-yok").
// - Adresin alanları ödeme adımının teslimatıyla aynıdır; telefonun zorunluluğu ve teslimat ülkesi ödemeyle aynı
//   işlevle denetlenir (teslimatKuraliHatasi).
// - Sınır musteriAdresiSinirlari.enCok'tur (kayıt). Sınır, varsayılan ve silme müşterinin satırı kilitlenerek
//   yapılır: aynı müşterinin işlemleri sırayla çalışır, aynı anda gelen iki ekleme sınırı aşamaz.
// - Her türde (teslimat, fatura) en çok bir varsayılan adres vardır: yeni varsayılan öncekini bırakır (veritabanında
//   kısmi tekil indeks de tutar). Varsayılanı olmayan türde eklenen ilk adres o türde varsayılan olur. Varsayılan adres
//   silinince kalanların en yenisi varsayılan olur. Müşteri düzenlemede işareti kaldırabilir.
// - Silinen adres kalıcı silinir (kişisel veri, karar 0149); siparişlerdeki adres kendi kopyasıdır, değişmez.
// - Değişiklik kaydına girmez: müşterinin kendi verisidir, mağazanın verisini değiştirmez (favorilerle aynı, karar
//   0110); kişisel değeri kayda yazmamak da gerekir.
// - Ödeme adımında "Adreslerime kaydet" (odemedenKaydet) ödeme oturumunun işleminde çalışır: sınır doluysa ya da aynı
//   adres zaten kayıtlıysa hiçbir şey yazmaz, ödemeyi durdurmaz.
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import {
  musteriAdresiSinirlari,
  type VarsayilanAdresTuru,
} from "../../kayitlar/musteri-adresleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { teslimatKuraliHatasi } from "../odeme/teslimat-kurallari.ts";
import type { Teslimat } from "../odeme/teslimat-semasi.ts";
import type { AdresFormu, AdresHatasi, KayitliAdres } from "./adres-semalari.ts";
import { musteriAdresleri, musteriler } from "./model.ts";

type Satir = typeof musteriAdresleri.$inferSelect;

const kolonlar = {
  teslimat: musteriAdresleri.varsayilan_teslimat,
  fatura: musteriAdresleri.varsayilan_fatura,
} as const;

const adresYok = () =>
  new BilinenHata("bulunamadi", [{ alan: "kimlik", kod: "adres-yok" satisfies AdresHatasi }]);

const kayitliAdres = (satir: Satir): KayitliAdres => ({
  kimlik: satir.kimlik,
  baslik: satir.baslik,
  teslimat: {
    ad: satir.ad,
    soyad: satir.soyad,
    telefon: satir.telefon ?? undefined,
    adres: {
      ulke: satir.ulke,
      ...(satir.il === null ? {} : { il: satir.il }),
      ...(satir.ilce === null ? {} : { ilce: satir.ilce }),
      adres: satir.adres,
      ...(satir.posta_kodu === null ? {} : { postaKodu: satir.posta_kodu }),
    },
  },
  varsayilanTeslimat: satir.varsayilan_teslimat,
  varsayilanFatura: satir.varsayilan_fatura,
});

// Teslimatın satırdaki alanları.
const teslimatAlanlari = (teslimat: Teslimat) => ({
  ad: teslimat.ad,
  soyad: teslimat.soyad,
  telefon: teslimat.telefon ?? null,
  ulke: teslimat.adres.ulke,
  il: teslimat.adres.il ?? null,
  ilce: teslimat.adres.ilce ?? null,
  adres: teslimat.adres.adres,
  posta_kodu: teslimat.adres.postaKodu ?? null,
});

// Müşterinin satırını kilitler: aynı müşterinin adres işlemleri sırayla çalışır.
const musteriyiKilitle = async (islem: VeritabaniIslemi, musteri: string) => {
  await islem
    .select({ kimlik: musteriler.kimlik })
    .from(musteriler)
    .where(eq(musteriler.kimlik, musteri))
    .for("update");
};

const adresSayisi = async (islem: VeritabaniIslemi, musteri: string): Promise<number> => {
  const [satir] = await islem
    .select({ sayi: count() })
    .from(musteriAdresleri)
    .where(eq(musteriAdresleri.musteri_kimligi, musteri));
  return satir?.sayi ?? 0;
};

const varsayilaniVarMi = async (
  islem: VeritabaniIslemi,
  musteri: string,
  tur: VarsayilanAdresTuru,
): Promise<boolean> => {
  const [satir] = await islem
    .select({ kimlik: musteriAdresleri.kimlik })
    .from(musteriAdresleri)
    .where(and(eq(musteriAdresleri.musteri_kimligi, musteri), eq(kolonlar[tur], true)));
  return satir !== undefined;
};

// Türün varsayılanını bırakır (verilen adres dışındakiler).
const varsayilaniBirak = async (
  islem: VeritabaniIslemi,
  musteri: string,
  tur: VarsayilanAdresTuru,
  haric?: string,
) => {
  await islem
    .update(musteriAdresleri)
    .set(tur === "teslimat" ? { varsayilan_teslimat: false } : { varsayilan_fatura: false })
    .where(
      and(
        eq(musteriAdresleri.musteri_kimligi, musteri),
        eq(kolonlar[tur], true),
        ...(haric === undefined ? [] : [ne(musteriAdresleri.kimlik, haric)]),
      ),
    );
};

const enYeniOnce = [desc(musteriAdresleri.olusturulma_zamani), desc(musteriAdresleri.kimlik)];

export const adresServisi = (site: Site) => {
  // Teslimatın mağaza ayarına bağlı kuralları (ödemeyle aynı işlev); alan formdaki yoludur.
  const kurallariDenetle = async (vt: Veritabani, teslimat: Teslimat) => {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const hata = teslimatKuraliHatasi(site, ayarlar, teslimat);
    if (hata !== undefined) {
      throw new BilinenHata("dogrulama", [{ alan: `teslimat.${hata.alan}`, kod: hata.kod }]);
    }
  };

  // Müşterinin adresleri: önce varsayılan teslimat adresi, sonra en yeni.
  const adresListesi = async (
    vt: Veritabani | VeritabaniIslemi,
    musteri: string,
  ): Promise<KayitliAdres[]> => {
    const satirlar = await vt
      .select()
      .from(musteriAdresleri)
      .where(eq(musteriAdresleri.musteri_kimligi, musteri))
      .orderBy(desc(musteriAdresleri.varsayilan_teslimat), ...enYeniOnce);
    return satirlar.map(kayitliAdres);
  };

  // Müşterinin kendi adresini kilitli işlemde bulur.
  const kendiAdresi = async (islem: VeritabaniIslemi, musteri: string, kimlik: string) => {
    const [satir] = await islem
      .select()
      .from(musteriAdresleri)
      .where(
        and(eq(musteriAdresleri.kimlik, kimlik), eq(musteriAdresleri.musteri_kimligi, musteri)),
      );
    if (satir === undefined) throw adresYok();
    return satir;
  };

  // Kilit alınmış işlemde yeni adres; varsayılanı olmayan türde ilk adres varsayılan olur.
  const ekleIslemde = async (
    islem: VeritabaniIslemi,
    musteri: string,
    girdi: Pick<AdresFormu, "baslik" | "teslimat"> & Partial<AdresFormu>,
  ): Promise<string> => {
    const varsayilan = {
      teslimat:
        girdi.varsayilanTeslimat === true || !(await varsayilaniVarMi(islem, musteri, "teslimat")),
      fatura:
        girdi.varsayilanFatura === true || !(await varsayilaniVarMi(islem, musteri, "fatura")),
    };
    if (varsayilan.teslimat) await varsayilaniBirak(islem, musteri, "teslimat");
    if (varsayilan.fatura) await varsayilaniBirak(islem, musteri, "fatura");
    const [yazilan] = await islem
      .insert(musteriAdresleri)
      .values({
        musteri_kimligi: musteri,
        baslik: girdi.baslik,
        ...teslimatAlanlari(girdi.teslimat),
        varsayilan_teslimat: varsayilan.teslimat,
        varsayilan_fatura: varsayilan.fatura,
        olusturulma_zamani: sql`clock_timestamp()`,
        guncellenme_zamani: sql`clock_timestamp()`,
      })
      .returning({ kimlik: musteriAdresleri.kimlik });
    if (yazilan === undefined) throw new Error("Adres yazılamadı.");
    return yazilan.kimlik;
  };

  const adresEkle = async (
    vt: Veritabani,
    musteri: string,
    girdi: AdresFormu,
  ): Promise<KayitliAdres[]> => {
    await kurallariDenetle(vt, girdi.teslimat);
    return vt.transaction(async (islem) => {
      await musteriyiKilitle(islem, musteri);
      if ((await adresSayisi(islem, musteri)) >= musteriAdresiSinirlari.enCok) {
        throw new BilinenHata("is-kurali", [
          { alan: "adresler", kod: "adres-siniri" satisfies AdresHatasi },
        ]);
      }
      await ekleIslemde(islem, musteri, girdi);
      return adresListesi(islem, musteri);
    });
  };

  // Adresin bütün alanları yeniden yazılır. İşaretlenen tür öncekini bırakır; işareti kaldırılan tür boş kalır.
  const adresDegistir = async (
    vt: Veritabani,
    musteri: string,
    kimlik: string,
    girdi: AdresFormu,
  ): Promise<KayitliAdres[]> => {
    await kurallariDenetle(vt, girdi.teslimat);
    return vt.transaction(async (islem) => {
      await musteriyiKilitle(islem, musteri);
      await kendiAdresi(islem, musteri, kimlik);
      if (girdi.varsayilanTeslimat) await varsayilaniBirak(islem, musteri, "teslimat", kimlik);
      if (girdi.varsayilanFatura) await varsayilaniBirak(islem, musteri, "fatura", kimlik);
      await islem
        .update(musteriAdresleri)
        .set({
          baslik: girdi.baslik,
          ...teslimatAlanlari(girdi.teslimat),
          varsayilan_teslimat: girdi.varsayilanTeslimat,
          varsayilan_fatura: girdi.varsayilanFatura,
          guncellenme_zamani: sql`clock_timestamp()`,
        })
        .where(eq(musteriAdresleri.kimlik, kimlik));
      return adresListesi(islem, musteri);
    });
  };

  // Kalıcı siler. Varsayılan adres silinince kalanların en yenisi o türde varsayılan olur.
  const adresSil = async (
    vt: Veritabani,
    musteri: string,
    kimlik: string,
  ): Promise<KayitliAdres[]> =>
    vt.transaction(async (islem) => {
      await musteriyiKilitle(islem, musteri);
      const silinen = await kendiAdresi(islem, musteri, kimlik);
      await islem.delete(musteriAdresleri).where(eq(musteriAdresleri.kimlik, kimlik));
      const [enYeni] = await islem
        .select({ kimlik: musteriAdresleri.kimlik })
        .from(musteriAdresleri)
        .where(eq(musteriAdresleri.musteri_kimligi, musteri))
        .orderBy(...enYeniOnce)
        .limit(1);
      if (enYeni !== undefined && (silinen.varsayilan_teslimat || silinen.varsayilan_fatura)) {
        await islem
          .update(musteriAdresleri)
          .set({
            ...(silinen.varsayilan_teslimat ? { varsayilan_teslimat: true } : {}),
            ...(silinen.varsayilan_fatura ? { varsayilan_fatura: true } : {}),
          })
          .where(eq(musteriAdresleri.kimlik, enYeni.kimlik));
      }
      return adresListesi(islem, musteri);
    });

  // "Varsayılan yap": adres verilen türlerde varsayılan olur, önceki varsayılan bırakılır.
  const varsayilanYap = async (
    vt: Veritabani,
    musteri: string,
    kimlik: string,
    turler: readonly VarsayilanAdresTuru[],
  ): Promise<KayitliAdres[]> =>
    vt.transaction(async (islem) => {
      await musteriyiKilitle(islem, musteri);
      await kendiAdresi(islem, musteri, kimlik);
      for (const tur of turler) await varsayilaniBirak(islem, musteri, tur, kimlik);
      await islem
        .update(musteriAdresleri)
        .set({
          ...(turler.includes("teslimat") ? { varsayilan_teslimat: true } : {}),
          ...(turler.includes("fatura") ? { varsayilan_fatura: true } : {}),
        })
        .where(eq(musteriAdresleri.kimlik, kimlik));
      return adresListesi(islem, musteri);
    });

  // Ödeme adımının "Adreslerime kaydet"i: ödeme oturumunun işleminde. Teslimat ödemenin kurallarından geçmiştir.
  // Sınır doluysa ya da aynı adres (bütün alanları aynı) kayıtlıysa hiçbir şey yazmaz.
  const odemedenKaydet = async (
    islem: VeritabaniIslemi,
    musteri: string,
    girdi: { baslik: string; teslimat: Teslimat },
  ): Promise<void> => {
    await musteriyiKilitle(islem, musteri);
    if ((await adresSayisi(islem, musteri)) >= musteriAdresiSinirlari.enCok) return;
    const alanlar = teslimatAlanlari(girdi.teslimat);
    const [ayni] = await islem
      .select({ kimlik: musteriAdresleri.kimlik })
      .from(musteriAdresleri)
      .where(
        and(
          eq(musteriAdresleri.musteri_kimligi, musteri),
          ...Object.entries(alanlar).map(
            ([alan, deger]) =>
              sql`${musteriAdresleri[alan as keyof typeof alanlar]} is not distinct from ${deger}`,
          ),
        ),
      );
    if (ayni !== undefined) return;
    await ekleIslemde(islem, musteri, girdi);
  };

  return { adresListesi, adresEkle, adresDegistir, adresSil, varsayilanYap, odemedenKaydet };
};
