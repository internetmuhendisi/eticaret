// Sitenin başlangıç kuponlarını (baslangic/kuponlar.json, kart 0312, karar 0187) bir kez yazar. Şema ve kurallar
// baslangic-semasi.ts'te.
//
// - Ne zaman: arka plan süreci açılırken, katalogdan sonra (arka-plan-isleri/baslangic.ts): kapsamdaki ürün ve
//   kategoriler adres adıyla bulunur. Sitede hiç kupon satırı (silinmiş bile olsa) yoksa yazılır; sonra dosya
//   kullanılmaz, mağaza sahibinin sildiği kupon geri gelmez.
// - Nasıl: servisle, tek işlemde; değişiklik kaydında yazan "baslangic-kupon" adlı sistem işlemidir. İşlem kendi
//   danışma kilidini alır: aynı anda açılan iki süreç kuponları iki kez yazmaz.
// - Kurulumdan önce silinen ürün ya da kategori kapsamdan düşer; kapsamında hiç kayıt kalmayan kupon yazılmaz ve
//   döner (çağıran hatayı bir kez kaydeder).
import { and, inArray, isNull, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kategoriler } from "../kategori/model.ts";
import { urunler } from "../urun/model.ts";
import { kuponlar } from "./model.ts";
import { kuponServisi } from "./servis.ts";

export const baslangicKuponYazari = sistemIslemi("baslangic-kupon");

// Kuponlar yazıldıysa "yazildi" ve kapsamı boş kaldığı için yazılmayan kodlar; dosya boşsa ya da kuponlar kuruluysa
// "kurulu".
export const kuponBaslangiciniKur = async (
  vt: Veritabani,
  site: Site,
): Promise<{ sonuc: "kurulu" } | { sonuc: "yazildi"; atlananlar: string[] }> => {
  if (site.kuponBaslangici.length === 0) return { sonuc: "kurulu" };
  return vt.transaction(async (islem) => {
    await islem.execute(sql`select pg_advisory_xact_lock(hashtext('kupon-baslangici'))`);
    const [var_] = await islem.select({ kimlik: kuponlar.kimlik }).from(kuponlar).limit(1);
    if (var_ !== undefined) return { sonuc: "kurulu" as const };
    const adresler = site.kuponBaslangici.flatMap((kupon) => kupon.kapsamAdresAdlari);
    const [urunSatirlari, kategoriSatirlari] =
      adresler.length === 0
        ? [[], []]
        : await Promise.all([
            islem
              .select({ kimlik: urunler.kimlik, adresAdi: urunler.adres_adi })
              .from(urunler)
              .where(and(inArray(urunler.adres_adi, adresler), isNull(urunler.silinme_zamani))),
            islem
              .select({ kimlik: kategoriler.kimlik, adresAdi: kategoriler.adres_adi })
              .from(kategoriler)
              .where(
                and(inArray(kategoriler.adres_adi, adresler), isNull(kategoriler.silinme_zamani)),
              ),
          ]);
    const urunKimlikleri = new Map(urunSatirlari.map((satir) => [satir.adresAdi, satir.kimlik]));
    const kategoriKimlikleri = new Map(
      kategoriSatirlari.map((satir) => [satir.adresAdi, satir.kimlik]),
    );
    const servis = kuponServisi(site);
    const atlananlar: string[] = [];
    for (const kupon of site.kuponBaslangici) {
      const harita = kupon.kapsam === "urunler" ? urunKimlikleri : kategoriKimlikleri;
      const kapsamKayitlari = kupon.kapsamAdresAdlari.flatMap((adresAdi) => {
        const kimlik = harita.get(adresAdi);
        return kimlik === undefined ? [] : [kimlik];
      });
      if (kupon.kapsam !== "hepsi" && kapsamKayitlari.length === 0) {
        atlananlar.push(kupon.kod);
        continue;
      }
      const zaman = (yerel: string | undefined) =>
        yerel === undefined ? null : (yerelZamandan(yerel, site.ayarlar.saatDilimi) ?? null);
      await servis.ekle(islem, baslangicKuponYazari, {
        kod: kupon.kod,
        ad: kupon.ad ?? null,
        tur: kupon.tur,
        deger: kupon.deger,
        kapsam: kupon.kapsam,
        kapsamKayitlari,
        enAzTutar: kupon.enAzTutar ?? null,
        baslangic: zaman(kupon.baslangic),
        bitis: zaman(kupon.bitis),
        toplamSinir: kupon.toplamSinir ?? null,
        kisiBasiSinir: kupon.kisiBasiSinir ?? null,
        indirimdeGecmez: kupon.indirimdeGecmez,
        acik: kupon.acik,
      });
    }
    return { sonuc: "yazildi" as const, atlananlar };
  });
};
