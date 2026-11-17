// Kartla ödeme servisi (kart 0215, karar 0142). Ödeme formu baslat.ts'te başlatılır; burada ödemenin sonucu işlenir.
//
// Kurallar:
// - Ödemenin başarılı olup olmadığı yalnız ödeme kuruluşuna yapılan imzalı sonuç sorgusuyla öğrenilir. Tarayıcının
//   dönüşü ve kuruluşun bildirimi yalnız belirteci getirir; ikisi de aynı işlevi (tamamla) çağırır.
// - Sipariş tek kez kurulur: ödeme satırı kilitlenir, yalnız "başlatıldı"daki ödeme sipariş kurar; sipariş oturuma
//   tekildir. İkinci dönüş ya da bildirim var olan siparişi bulur.
// - Ödeme alındı ama sipariş kurulamadıysa (stok yok, fiyat değişti) ödeme aynı gün iptal edilir (kullanıcı kararı),
//   ayrılan stok bırakılır. İptal edilemezse ödeme "başlatıldı"da kalır, hata kaydedilir; tarama yeniden dener.
// - Başarısız ödemede ayrılan stok bırakılır. Sonucu bilinmeyen ödeme tarama ile sorulur; kuruluş uzun süre sonuç
//   vermezse ödeme başarısız sayılır.
// - Eklenti kapalıyken de başlatılmış ödeme tamamlanır (parası çekilmiş müşterinin siparişi kaybolmaz); yeni ödeme
//   başlatılmaz, taksit tablosu verilmez.
// - Siteler her gün kuruluşun işlem raporuyla karşılaştırılır; uyuşmayan ödeme hata izlemeye yazılır.
import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type KartOdemesiDurumu, kartlaOdemeAyari } from "../../kayitlar/eklentiler.ts";
import type { OdemeDonusSonucu } from "../../kayitlar/odeme.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis.ts";
import { eklentiliSiparisiKur, SiparisKurulamadi } from "../../moduller/odeme/oturum-hesabi.ts";
import { sepetiHesapla } from "../../moduller/sepet/hesap.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { erisimOzeti } from "../../moduller/siparis/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/kimlik.ts";
import { eklentiAcikMi } from "../acik.ts";
import { kurulusAnahtarlari } from "./baslat.ts";
import {
  type BankaTaksitleri,
  gununIslemleri,
  KurulusHatasi,
  odemeSonucu,
  odemeyiIptalEt,
  taksitSecenekleri,
} from "./iyzico.ts";
import { type KartOdemesi, kartOdemeleri } from "./model.ts";

const stok = stokServisi();

// Ürün sayfasının taksit tablosu (tutarlar sitenin biçimiyle yazılı).
export type TaksitTablosu = {
  enCok: number;
  bankalar: (Omit<BankaTaksitleri, "taksitler"> & {
    taksitler: { sayi: number; aylik: string; toplam: string }[];
  })[];
};

export type TamamlamaSonucu =
  // Sipariş kuruldu ya da zaten vardı. Erişim anahtarı yalnız müşterinin dönüşünde verilir (çerez olur).
  | { tur: "siparis"; numara: string; erisimAnahtari?: string }
  | { tur: "donus"; sonuc: OdemeDonusSonucu };

// Ödeme satırının bugünkü durumundan müşteriye söylenecek sonuç.
const durumSonucu = (durum: KartOdemesiDurumu): OdemeDonusSonucu =>
  durum === "basarisiz" ? "reddedildi" : durum === "iptal-edildi" ? "stok-yok" : "yarida-kaldi";

class ZatenSonuclandi extends Error {}

export const kartlaOdemeServisi = (site: Site) => {
  const odemeyiBul = async (vt: Veritabani, belirtec: string) =>
    (await vt.select().from(kartOdemeleri).where(eq(kartOdemeleri.belirtec, belirtec)).limit(1))[0];

  // Ödendi: siparişin numarası; müşterinin dönüşünde erişim anahtarı yenilenir (eski anahtarın özeti silinir).
  const varolanSiparis = async (
    vt: Veritabani,
    odeme: KartOdemesi,
    erisimVer: boolean,
  ): Promise<TamamlamaSonucu> => {
    if (odeme.siparis_kimligi === null) return { tur: "donus", sonuc: "bilinmiyor" };
    // Erişim anahtarı belirteçle yalnız bir kez verilir (bağımsız kontrolün bulgusu): sipariş bildirimle ya da taramayla
    // kurulduysa müşterinin ilk dönüşü alır, sonraki dönüşler almaz.
    const ilkErisim =
      erisimVer &&
      (
        await vt
          .update(kartOdemeleri)
          .set({ erisim_verildi: true })
          .where(
            and(eq(kartOdemeleri.kimlik, odeme.kimlik), eq(kartOdemeleri.erisim_verildi, false)),
          )
          .returning({ kimlik: kartOdemeleri.kimlik })
      ).length === 1;
    const erisimAnahtari = ilkErisim
      ? Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url")
      : undefined;
    const kosul = eq(siparisler.kimlik, odeme.siparis_kimligi);
    const [siparis] =
      erisimAnahtari === undefined
        ? await vt.select({ numara: siparisler.numara }).from(siparisler).where(kosul)
        : await vt
            .update(siparisler)
            .set({ erisim_ozeti: erisimOzeti(erisimAnahtari) })
            .where(kosul)
            .returning({ numara: siparisler.numara });
    if (siparis === undefined) return { tur: "donus", sonuc: "bilinmiyor" };
    return {
      tur: "siparis",
      numara: siparis.numara,
      ...(erisimAnahtari === undefined ? {} : { erisimAnahtari }),
    };
  };

  // Ödeme alındı ama sipariş kurulamadı: satır kilitliyken ödeme iptal edilir, ayırma bırakılır.
  const iptalEt = async (
    vt: Veritabani,
    odeme: KartOdemesi,
    odemeKimligi: string,
  ): Promise<boolean> => {
    const anahtarlar = kurulusAnahtarlari();
    if (anahtarlar === undefined) return false;
    try {
      return await vt.transaction(async (islem) => {
        const [kilitli] = await islem
          .select({ durum: kartOdemeleri.durum })
          .from(kartOdemeleri)
          .where(eq(kartOdemeleri.kimlik, odeme.kimlik))
          .for("update");
        if (kilitli?.durum !== "baslatildi") return kilitli?.durum === "iptal-edildi";
        await odemeyiIptalEt(
          odeme.ortam as Site["ayarlar"]["kartlaOdemeOrtami"],
          anahtarlar,
          odemeKimligi,
          odeme.oturum_kimligi,
        );
        await islem
          .update(kartOdemeleri)
          .set({
            durum: "iptal-edildi",
            odeme_kimligi: odemeKimligi,
            sonuc_zamani: sql`now()`,
          })
          .where(eq(kartOdemeleri.kimlik, odeme.kimlik));
        await stok.ayirmayiBirak(islem, odeme.oturum_kimligi);
        return true;
      });
    } catch (hata) {
      // Para çekildi, sipariş yok, iptal edilemedi: hata izlemeye gider, tarama yeniden dener.
      hatayiKaydet(hata, { islem: "kartla-odeme-iptal", oturum: odeme.oturum_kimligi });
      return false;
    }
  };

  // Dönüşün, bildirimin ve taramanın ortak işlevi. erisimVer: müşterinin tarayıcısı (dönüş) için erişim anahtarı.
  const tamamla = async (
    vt: Veritabani,
    belirtec: string,
    { erisimVer }: { erisimVer: boolean },
  ): Promise<TamamlamaSonucu & { kurulus?: "bekliyor" | "inceleme" | "ulasilamadi" }> => {
    const odeme = await odemeyiBul(vt, belirtec);
    if (odeme === undefined) return { tur: "donus", sonuc: "yarida-kaldi" };
    if (odeme.durum === "odendi") return varolanSiparis(vt, odeme, erisimVer);
    if (odeme.durum !== "baslatildi") {
      return { tur: "donus", sonuc: durumSonucu(odeme.durum as KartOdemesiDurumu) };
    }
    const anahtarlar = kurulusAnahtarlari();
    if (anahtarlar === undefined) {
      hatayiKaydet(new Error("Kartla ödemenin anahtarları yok; ödeme tamamlanamadı."), {
        islem: "kartla-odeme-tamamla",
        oturum: odeme.oturum_kimligi,
      });
      return { tur: "donus", sonuc: "bilinmiyor", kurulus: "ulasilamadi" };
    }
    const ortam = odeme.ortam as Site["ayarlar"]["kartlaOdemeOrtami"];
    let sonuc: Awaited<ReturnType<typeof odemeSonucu>>;
    try {
      sonuc = await odemeSonucu(ortam, anahtarlar, belirtec);
    } catch (hata) {
      hatayiKaydet(hata, { islem: "kartla-odeme-sonuc", oturum: odeme.oturum_kimligi });
      return { tur: "donus", sonuc: "bilinmiyor", kurulus: "ulasilamadi" };
    }

    if (sonuc.tur === "bekliyor") {
      return {
        tur: "donus",
        sonuc: "yarida-kaldi",
        kurulus: sonuc.inceleme === true ? "inceleme" : "bekliyor",
      };
    }
    if (sonuc.tur === "basarisiz") {
      await vt.transaction(async (islem) => {
        const [degisen] = await islem
          .update(kartOdemeleri)
          .set({ durum: "basarisiz", sonuc_zamani: sql`now()` })
          .where(and(eq(kartOdemeleri.kimlik, odeme.kimlik), eq(kartOdemeleri.durum, "baslatildi")))
          .returning({ kimlik: kartOdemeleri.kimlik });
        if (degisen !== undefined) await stok.ayirmayiBirak(islem, odeme.oturum_kimligi);
      });
      return { tur: "donus", sonuc: "reddedildi" };
    }

    // Kuruluşun sonucu başka bir oturumu ya da tutarı söylüyorsa sipariş kurulmaz: karşılaştırma yakalar.
    if (
      sonuc.oturum !== odeme.oturum_kimligi ||
      sonuc.tutar !== odeme.tutar ||
      sonuc.paraBirimi !== odeme.para_birimi
    ) {
      hatayiKaydet(new Error("Ödeme kuruluşunun sonucu ödemeyle uyuşmuyor."), {
        islem: "kartla-odeme-tamamla",
        oturum: odeme.oturum_kimligi,
        odemeKimligi: sonuc.odemeKimligi,
      });
      return { tur: "donus", sonuc: "bilinmiyor" };
    }

    try {
      const siparis = await eklentiliSiparisiKur(
        vt,
        site,
        {
          oturum: odeme.oturum_kimligi,
          odeme: { yontem: "kart" },
          tahsilat: {
            odenen: sonuc.odenen,
            taksit: sonuc.taksit,
            odemeKimligi: sonuc.odemeKimligi,
          },
          tutar: sonuc.tutar,
          paraBirimi: sonuc.paraBirimi,
        },
        {
          // Yalnız başlatılmış ödeme sipariş kurar: ikinci dönüş ya da bildirim kilitte bekler, sonra bunu görür.
          once: async (islem) => {
            const [kilitli] = await islem
              .select({ durum: kartOdemeleri.durum })
              .from(kartOdemeleri)
              .where(eq(kartOdemeleri.kimlik, odeme.kimlik))
              .for("update");
            if (kilitli?.durum !== "baslatildi") throw new ZatenSonuclandi();
          },
          sonra: async (islem, kurulan) => {
            await islem
              .update(kartOdemeleri)
              .set({
                durum: "odendi",
                odeme_kimligi: sonuc.odemeKimligi,
                odenen: sonuc.odenen,
                taksit: sonuc.taksit,
                siparis_kimligi: kurulan.kimlik,
                sonuc_zamani: sql`now()`,
                erisim_verildi: erisimVer,
              })
              .where(eq(kartOdemeleri.kimlik, odeme.kimlik));
          },
        },
      );
      return {
        tur: "siparis",
        numara: siparis.numara,
        ...(erisimVer ? { erisimAnahtari: siparis.erisimAnahtari } : {}),
      };
    } catch (hata) {
      if (hata instanceof ZatenSonuclandi) {
        const simdiki = await odemeyiBul(vt, belirtec);
        if (simdiki?.durum === "odendi") return varolanSiparis(vt, simdiki, erisimVer);
        return {
          tur: "donus",
          sonuc: durumSonucu((simdiki?.durum ?? "baslatildi") as KartOdemesiDurumu),
        };
      }
      if (hata instanceof SiparisKurulamadi) {
        // Aynı anda gelen öteki yol (bildirim, dönüş) siparişi kurmuş olabilir (bağımsız kontrolün bulgusu): son adet
        // onun siparişine düştüyse bu yolun ön denetimi stok yok der. Önce satır yeniden okunur.
        const simdiki = await odemeyiBul(vt, belirtec);
        if (simdiki?.durum === "odendi") return varolanSiparis(vt, simdiki, erisimVer);
        const iptal = await iptalEt(vt, odeme, sonuc.odemeKimligi);
        if (!iptal) return { tur: "donus", sonuc: "bilinmiyor" };
        return {
          tur: "donus",
          sonuc: hata.neden === "sepet-degisti" ? "sepet-degisti" : "stok-yok",
        };
      }
      throw hata;
    }
  };

  // Sonucu bilinmeyen ödemeleri sorar (zamanlı iş): müşteri dönmedi ve bildirim gelmedi. Kuruluş ödemenin sürdüğünü
  // ya da hiç olmadığını söylerse ve başlatılalı bekleyenSorguDakika'nın dört katı geçtiyse ödeme başarısız sayılır.
  const bekleyenleriSor = async (vt: Veritabani): Promise<number> => {
    const esik = sql`now() - make_interval(mins => ${kartlaOdemeAyari.bekleyenSorguDakika})`;
    // En az sorulan önce: sonuçlanamayan ödemeler yenilerini tıkamaz. Sorma süresini geçen ödeme sorulmaz (sonucu
    // günlük karşılaştırmada görünür).
    const bekleyenler = await vt
      .select()
      .from(kartOdemeleri)
      .where(
        and(
          eq(kartOdemeleri.durum, "baslatildi"),
          lt(kartOdemeleri.olusturma_zamani, esik),
          gte(
            kartOdemeleri.olusturma_zamani,
            sql`now() - make_interval(days => ${kartlaOdemeAyari.sormaGun})`,
          ),
        ),
      )
      .orderBy(
        sql`${kartOdemeleri.son_sorgu_zamani} asc nulls first`,
        kartOdemeleri.olusturma_zamani,
      )
      .limit(kartlaOdemeAyari.taramaParti);
    let islenen = 0;
    for (const odeme of bekleyenler) {
      try {
        await vt
          .update(kartOdemeleri)
          .set({ son_sorgu_zamani: sql`now()` })
          .where(eq(kartOdemeleri.kimlik, odeme.kimlik));
        const sonuc = await tamamla(vt, odeme.belirtec, { erisimVer: false });
        islenen += 1;
        if (sonuc.kurulus === "bekliyor") {
          // Uzun süre sonuçlanmayan ödeme: kuruluşun formunun süresi çoktan doldu, ayırma bırakılır.
          await vt.transaction(async (islem) => {
            const [degisen] = await islem
              .update(kartOdemeleri)
              .set({ durum: "basarisiz", sonuc_zamani: sql`now()` })
              .where(
                and(
                  eq(kartOdemeleri.kimlik, odeme.kimlik),
                  eq(kartOdemeleri.durum, "baslatildi"),
                  lt(
                    kartOdemeleri.olusturma_zamani,
                    sql`now() - make_interval(mins => ${kartlaOdemeAyari.bekleyenSorguDakika * 4})`,
                  ),
                ),
              )
              .returning({ kimlik: kartOdemeleri.kimlik });
            if (degisen !== undefined) await stok.ayirmayiBirak(islem, odeme.oturum_kimligi);
          });
        }
      } catch (hata) {
        hatayiKaydet(hata, { islem: "kartla-odeme-tarama", oturum: odeme.oturum_kimligi });
      }
    }
    return islenen;
  };

  // Uyuşmazlık türleri: kuruluşta ödendi ama sitede sipariş yok; sitede ödendi ama kuruluşta ödeme yok; tutar farklı.
  type Uyusmazlik = {
    tur: "siparis-yok" | "odeme-yok" | "tutar-farkli";
    odemeKimligi: string | undefined;
    oturum: string | undefined;
  };

  // Bir günün (sitenin takvimiyle, YYYY-AA-GG) karşılaştırması. Eklenti kapalıysa ve son günlerde ödeme yoksa yapılmaz.
  const karsilastir = async (vt: Veritabani, gun: string): Promise<Uyusmazlik[] | undefined> => {
    const anahtarlar = kurulusAnahtarlari();
    if (anahtarlar === undefined) return undefined;
    const ortam = site.ayarlar.kartlaOdemeOrtami;
    if (!eklentiAcikMi(site, "kartla-odeme")) {
      const [yakin] = await vt
        .select({ kimlik: kartOdemeleri.kimlik })
        .from(kartOdemeleri)
        .where(
          gte(
            kartOdemeleri.olusturma_zamani,
            sql`now() - make_interval(days => ${kartlaOdemeAyari.kapandiktanSonraGun})`,
          ),
        )
        .limit(1);
      if (yakin === undefined) return undefined;
    }
    const islemler = await gununIslemleri(ortam, anahtarlar, gun);
    const gunde = sql<boolean>`coalesce((${kartOdemeleri.sonuc_zamani} at time zone ${site.ayarlar.saatDilimi})::date = ${gun}::date, false)`;
    // Bizim kayıtlarımız: o gün sonuçlananlar ve raporda geçen ödemeler (gün sınırında başlayıp ertesi gün ödenen de).
    const raporKimlikleri = islemler.map((islem) => islem.odemeKimligi);
    const raporOturumlari = islemler.flatMap((islem) =>
      islem.oturum !== undefined && kimlikMi(islem.oturum) ? [islem.oturum] : [],
    );
    const bizimkiler = await vt
      .select({
        oturum_kimligi: kartOdemeleri.oturum_kimligi,
        odeme_kimligi: kartOdemeleri.odeme_kimligi,
        durum: kartOdemeleri.durum,
        odenen: kartOdemeleri.odenen,
        gunde,
      })
      .from(kartOdemeleri)
      .where(
        and(
          eq(kartOdemeleri.ortam, ortam),
          or(
            gunde,
            raporKimlikleri.length === 0
              ? sql`false`
              : inArray(kartOdemeleri.odeme_kimligi, raporKimlikleri),
            raporOturumlari.length === 0
              ? sql`false`
              : inArray(kartOdemeleri.oturum_kimligi, raporOturumlari),
          ),
        ),
      );
    const iptaller = new Set(
      islemler.filter((islem) => islem.tur === "iptal").map((islem) => islem.odemeKimligi),
    );
    const odemeler = islemler.filter(
      (islem) => islem.tur === "odeme" && islem.basarili && !iptaller.has(islem.odemeKimligi),
    );
    const uyusmazliklar: Uyusmazlik[] = [];
    for (const islem of odemeler) {
      const bizim = bizimkiler.find(
        (odeme) =>
          odeme.odeme_kimligi === islem.odemeKimligi ||
          (islem.oturum !== undefined && odeme.oturum_kimligi === islem.oturum),
      );
      if (bizim?.durum !== "odendi") {
        uyusmazliklar.push({
          tur: "siparis-yok",
          odemeKimligi: islem.odemeKimligi,
          oturum: islem.oturum,
        });
      } else if (islem.odenen !== undefined && bizim.odenen !== islem.odenen) {
        uyusmazliklar.push({
          tur: "tutar-farkli",
          odemeKimligi: islem.odemeKimligi,
          oturum: bizim.oturum_kimligi,
        });
      }
    }
    for (const odeme of bizimkiler.filter((odeme) => odeme.durum === "odendi" && odeme.gunde)) {
      if (!odemeler.some((islem) => islem.odemeKimligi === odeme.odeme_kimligi)) {
        uyusmazliklar.push({
          tur: "odeme-yok",
          odemeKimligi: odeme.odeme_kimligi ?? undefined,
          oturum: odeme.oturum_kimligi,
        });
      }
    }
    for (const uyusmazlik of uyusmazliklar) {
      hatayiKaydet(new Error("Kartla ödeme, ödeme kuruluşunun kaydıyla uyuşmuyor."), {
        islem: "kartla-odeme-karsilastirma",
        gun,
        ...uyusmazlik,
      });
    }
    return uyusmazliklar;
  };

  // Ürün sayfasının taksit tablosu: birimin bir adedinin müşterinin ödeyeceği tutarıyla (vergi dahil), bankalara göre.
  // Tutarlar sitenin biçimiyle yazılı gider (tarayıcı biçimlendirmez). Eklenti kapalıysa ya da ayar "gösterme" ise
  // bulunamadı.
  const taksitTablosu = async (vt: Veritabani, birim: string): Promise<TaksitTablosu> => {
    const anahtarlar = kurulusAnahtarlari();
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    if (
      !eklentiAcikMi(site, "kartla-odeme") ||
      anahtarlar === undefined ||
      !ayarlar.kartlaOdemeUrunSayfasindaTaksit
    ) {
      throw new BilinenHata("bulunamadi");
    }
    const hesap = await sepetiHesapla(vt, site, [{ birim, adet: 1 }]);
    const satir = hesap.satirlar[0];
    if (satir === undefined || !satir.satilabilir || satir.tutar === undefined) {
      throw new BilinenHata("bulunamadi");
    }
    const tutar =
      satir.vergi === undefined ? satir.tutar : satir.vergi.vergisiz + satir.vergi.vergi;
    const enCok = ayarlar.kartlaOdemeEnCokTaksit;
    const bicim = siteninBicimleyicisi(site.ayarlar);
    try {
      const bankalar = await taksitSecenekleri(site.ayarlar.kartlaOdemeOrtami, anahtarlar, tutar);
      return {
        enCok,
        bankalar: bankalar
          .map((banka) => ({
            ...banka,
            taksitler: banka.taksitler
              .filter((taksit) => taksit.sayi <= enCok)
              .map((taksit) => ({
                sayi: taksit.sayi,
                aylik: bicim.para(taksit.aylik),
                toplam: bicim.para(taksit.toplam),
              })),
          }))
          .filter((banka) => banka.taksitler.length > 0),
      };
    } catch (hata) {
      if (!(hata instanceof KurulusHatasi)) throw hata;
      hatayiKaydet(hata, { islem: "kartla-odeme-taksit" });
      throw new BilinenHata("hizmet-kullanilamiyor");
    }
  };

  return { tamamla, bekleyenleriSor, karsilastir, taksitTablosu };
};
