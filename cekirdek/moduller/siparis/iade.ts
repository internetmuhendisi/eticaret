// İptal, tam ve kısmi iade (kart 0235, karar 0147). Tek akıştır: tutar ve vergi iade-hesabi.ts'ten, para dönüşü
// kartla ödemede eklentiden (cekirdek/eklentiler/odeme-yontemleri.ts, iadeEt), öteki yöntemlerde mağaza sahibinin
// elinden (kaydedilince yapılmış sayılır, kullanıcı kararı).
//
// Kurallar:
// - Siparişin satırı kilitlenir; ekranın gördüğü durum geçerli değilse "cakisma". Bir siparişte aynı anda en çok bir
//   bekleyen iade olur (tekil indeks): ikinci iade "cakisma" alır. Bekleyen iade varken durum işlemi de yapılmaz
//   (yonetim.ts).
// - Para kuruluştan dönecekse iade önce "bekliyor" yazılır ve işlem biter; kuruluşa işlemin dışında gidilir. Sonuç
//   tamamsa iade tamamlanır, redse "basarisiz" olur (hiçbir şey değişmez), belirsizse bekler (eklentinin taraması
//   iadeSonucunuIsle'yi çağırır).
// - İade tamamlanınca aynı işlemde: siparişin durumu (iptal, kısmi iade, iade edildi), stok (seçildiyse; yalnız bu
//   siparişin düşürüp henüz geri konmamış adedi), sipariş geçmişi ve değişiklik kaydı.
// - Müşterinin kendi iptali (kart 0239, iade-talebi.ts) aynı akıştır: kaynak "musteri", geçmişe musteri-iptali yazılır.
//   Ayarın izin verdiği durum (ayar işlemden hemen önce okunur) ve ödeme kuralı siparişin kilidi altında denetlenir: ödemesi alınmış ve parası
//   kuruluştan dönmeyen siparişi müşteri iptal edemez (kullanıcı kararı).
// - Onaylanan iade talebinden yapılan iade talebe bağlanır (talep_kimligi); talep onaylanmış olmalı ve ondan
//   yürüyen ya da tamamlanmış başka iade olmamalı (tekil indeks). Tutarı yine mağaza sahibinin seçimi verir.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { eklentiliIadeEt, eklentiliMi } from "../../eklentiler/odeme-yontemleri.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { OdemeYontemi } from "../../kayitlar/odeme.ts";
import {
  type IadeKaynagi,
  type IadeNedeni,
  type IadeTuru,
  iadeyeAcikDurumlar,
  type SiparisDurumu,
} from "../../kayitlar/siparis.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { stokGecmisi } from "../stok/model.ts";
import { stokServisi } from "../stok/servis.ts";
import { gecmiseYaz, kimSutunlari } from "./gecmis.ts";
import { IadeHesapHatasi, type IadeSecimi, iadeyiHesapla } from "./iade-hesabi.ts";
import {
  type SiparisIadesi,
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisKalemleri,
  siparisler,
} from "./model.ts";

const stok = stokServisi();

export type IadeGirdisi = {
  numara: string;
  tur: IadeTuru;
  gorulenDurum: SiparisDurumu;
  kalemler: IadeSecimi["kalemler"];
  kargo: boolean;
  // Elle tutar, sitenin para biçimiyle yazı ("349,90"); yoksa hesaplanan tutar.
  tutar?: string | undefined;
  stogaKoy: boolean;
  neden: IadeNedeni;
  aciklama?: string | undefined;
  // Onaylanan iade talebinden yapılan iade (kart 0239).
  talep?: string | undefined;
  // Müşterinin kendi iptali (kart 0239): ayarın izin verdiği durumlar. Verilmezse iade mağazanındır.
  musteriIptali?: { izinliDurumlar: readonly SiparisDurumu[] } | undefined;
};

export type IadeSonucu = {
  numara: string;
  durum: SiparisDurumu;
  iade: "tamamlandi" | "bekliyor" | "basarisiz";
};

// Siparişin düşürüp henüz geri konmamış adedi, birim başına (iptal ve iade aynı kural).
const geriKonabilir = async (islem: VeritabaniIslemi, siparis: string) => {
  const satirlar = await islem
    .select({
      birim: stokGecmisi.birim_kimligi,
      adet: sql<number>`sum(${stokGecmisi.onceki_miktar} - ${stokGecmisi.sonraki_miktar})::int`,
    })
    .from(stokGecmisi)
    .where(
      and(
        eq(stokGecmisi.kaynak_kimligi, siparis),
        inArray(stokGecmisi.sebep, ["siparis", "siparis-iptali", "siparis-iadesi"]),
      ),
    )
    .groupBy(stokGecmisi.birim_kimligi);
  return new Map(satirlar.map((satir) => [satir.birim, satir.adet]));
};

const hesapHatasi = (hata: unknown): never => {
  if (hata instanceof IadeHesapHatasi) {
    throw new BilinenHata(
      hata.kod === "tutar-fazla" || hata.kod === "odenmemis" ? "is-kurali" : "dogrulama",
      [{ alan: hata.alan, kod: hata.kod }],
    );
  }
  throw hata;
};

export const iadeServisi = (site: Site) => {
  // Bekleyen iadeyi tamamlar: siparişin durumu, stok, geçmiş ve değişiklik kaydı. Çağıranın işleminde; siparişin
  // satırı kilitli olmalıdır.
  const tamamla = async (
    islem: VeritabaniIslemi,
    iade: SiparisIadesi,
    kim: DegisikligiYapan,
  ): Promise<SiparisDurumu> => {
    const [siparis] = await islem
      .select({ kimlik: siparisler.kimlik, durum: siparisler.durum })
      .from(siparisler)
      .where(eq(siparisler.kimlik, iade.siparis_kimligi));
    if (siparis === undefined) throw new Error("İadenin siparişi yok.");
    const onceki = siparis.durum as SiparisDurumu;
    const kalemler = await islem
      .select({
        sira: siparisKalemleri.sira,
        adet: siparisKalemleri.adet,
        birim: siparisKalemleri.birim_kimligi,
      })
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, iade.siparis_kimligi));
    // Bütün kalemler ve kargo iade edildiyse "iade edildi".
    const tamamlananlar = await islem
      .select({ kalemler: siparisIadeleri.kalemler, kargo: siparisIadeleri.kargo_tutari })
      .from(siparisIadeleri)
      .where(
        and(
          eq(siparisIadeleri.siparis_kimligi, iade.siparis_kimligi),
          eq(siparisIadeleri.durum, "tamamlandi"),
        ),
      );
    const iadeEdilen = new Map<number, number>();
    for (const satir of [...tamamlananlar, { kalemler: iade.kalemler, kargo: iade.kargo_tutari }]) {
      for (const kalem of satir.kalemler)
        iadeEdilen.set(kalem.sira, (iadeEdilen.get(kalem.sira) ?? 0) + kalem.adet);
    }
    const [tutarlar] = await islem
      .select({
        toplam: siparisler.toplam,
        kargo: siparisler.kargo_tutari,
        kargoTuru: siparisler.kargo_turu,
      })
      .from(siparisler)
      .where(eq(siparisler.kimlik, iade.siparis_kimligi));
    const kargoIade =
      tutarlar?.kargoTuru !== "ucretli" ||
      [...tamamlananlar, { kargo: iade.kargo_tutari }].some((satir) => satir.kargo > 0);
    const butunUrunler = kalemler.every((kalem) => (iadeEdilen.get(kalem.sira) ?? 0) >= kalem.adet);
    const sonraki: SiparisDurumu =
      iade.tur === "iptal" ? "iptal" : butunUrunler && kargoIade ? "iade-edildi" : "kismi-iade";

    await islem
      .update(siparisIadeleri)
      .set({ durum: "tamamlandi", sonuc_zamani: sql`now()` })
      .where(eq(siparisIadeleri.kimlik, iade.kimlik));
    if (sonraki !== onceki) {
      await islem
        .update(siparisler)
        .set({ durum: sonraki })
        .where(eq(siparisler.kimlik, iade.siparis_kimligi));
    }
    if (iade.stoga_konacak) {
      const kalan = await geriKonabilir(islem, iade.siparis_kimligi);
      const geri = iade.kalemler.flatMap((secilen) => {
        const kalem = kalemler.find((k) => k.sira === secilen.sira);
        const olabilir = kalem === undefined ? 0 : (kalan.get(kalem.birim) ?? 0);
        const adet = Math.min(secilen.adet, olabilir);
        if (kalem !== undefined && adet > 0) kalan.set(kalem.birim, olabilir - adet);
        return kalem === undefined || adet <= 0 ? [] : [{ birim: kalem.birim, adet }];
      });
      if (geri.length > 0) {
        await stok.stokArtir(islem, kim, geri, {
          sebep: iade.tur === "iptal" ? "siparis-iptali" : "siparis-iadesi",
          kaynak: iade.siparis_kimligi,
        });
      }
    }
    await gecmiseYaz(islem, {
      siparis: iade.siparis_kimligi,
      onceki,
      sonraki,
      neden:
        iade.tur === "iade"
          ? "iade-yapildi"
          : (iade.kaynak as IadeKaynagi) === "musteri"
            ? "musteri-iptali"
            : "yonetici-iptali",
      kim,
    });
    await degisikligiKaydet(islem, {
      kim,
      islem: iade.tur === "iptal" ? "siparis.iptal-edildi" : "siparis.iade-edildi",
      kayit: { tur: "siparis", kimlik: iade.siparis_kimligi },
      eski: { durum: onceki },
      yeni: {
        durum: sonraki,
        iade: iade.kimlik,
        tutar: iade.tutar,
        kargo: iade.kargo_tutari,
        kalemler: iade.kalemler,
        stogaKondu: iade.stoga_konacak,
        neden: iade.neden,
        ...(iade.kaynak === "musteri" ? { kaynak: iade.kaynak } : {}),
        ...(iade.talep_kimligi === null ? {} : { talep: iade.talep_kimligi }),
      },
    });
    return sonraki;
  };

  const iadeYap = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: IadeGirdisi,
  ): Promise<IadeSonucu> => {
    const elleTutar =
      girdi.tutar === undefined || girdi.tur === "iptal"
        ? undefined
        : siteninBicimleyicisi(site.ayarlar).paraOku(girdi.tutar);
    if (girdi.tutar !== undefined && girdi.tur === "iade" && elleTutar === undefined) {
      throw new BilinenHata("dogrulama", [{ alan: "tutar", kod: "tutar-okunamadi" }]);
    }
    const secim: IadeSecimi = { kalemler: girdi.kalemler, kargo: girdi.kargo, elleTutar };
    const yazilan = await vt.transaction(async (islem) => {
      const [siparis] = await islem
        .select()
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      if (siparis === undefined) throw new BilinenHata("bulunamadi");
      if (siparis.durum !== girdi.gorulenDurum) {
        throw new BilinenHata("cakisma", [{ alan: "durum", kod: "durum-degisti" }]);
      }
      if (!(iadeyeAcikDurumlar[girdi.tur] as readonly string[]).includes(siparis.durum)) {
        throw new BilinenHata("is-kurali", [{ alan: "tur", kod: "gecis-yok" }]);
      }
      if (girdi.musteriIptali !== undefined) {
        if (
          girdi.tur !== "iptal" ||
          !(girdi.musteriIptali.izinliDurumlar as readonly string[]).includes(siparis.durum)
        ) {
          throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "iptal-kapali" }]);
        }
        // Ödemesi alınmış, parası kuruluştan dönmeyen sipariş: parayı mağaza gönderir (kullanıcı kararı).
        if (siparis.odeme_zamani !== null && !eklentiliMi(siparis.odeme_yontemi as OdemeYontemi)) {
          throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "iptal-magazadan" }]);
        }
      }
      if (girdi.talep !== undefined) {
        if (girdi.tur !== "iade") {
          throw new BilinenHata("dogrulama", [{ alan: "talep", kod: "talep-iptalde-yok" }]);
        }
        const [talep] = await islem
          .select({ durum: siparisIadeTalepleri.durum })
          .from(siparisIadeTalepleri)
          .where(
            and(
              eq(siparisIadeTalepleri.kimlik, girdi.talep),
              eq(siparisIadeTalepleri.siparis_kimligi, siparis.kimlik),
            ),
          );
        if (talep === undefined) throw new BilinenHata("bulunamadi");
        if (talep.durum !== "onaylandi") {
          throw new BilinenHata("cakisma", [{ alan: "talep", kod: "talep-onayli-degil" }]);
        }
        const [yapilan] = await islem
          .select({ kimlik: siparisIadeleri.kimlik })
          .from(siparisIadeleri)
          .where(
            and(
              eq(siparisIadeleri.talep_kimligi, girdi.talep),
              inArray(siparisIadeleri.durum, ["tamamlandi", "bekliyor"]),
            ),
          );
        if (yapilan !== undefined) {
          throw new BilinenHata("cakisma", [{ alan: "talep", kod: "talep-iade-edildi" }]);
        }
      }
      const oncekiler = await islem
        .select()
        .from(siparisIadeleri)
        .where(
          and(
            eq(siparisIadeleri.siparis_kimligi, siparis.kimlik),
            inArray(siparisIadeleri.durum, ["tamamlandi", "bekliyor"]),
          ),
        );
      if (oncekiler.some((iade) => iade.durum === "bekliyor")) {
        throw new BilinenHata("cakisma", [{ alan: "iade", kod: "iade-bekliyor" }]);
      }
      const kalemler = await islem
        .select()
        .from(siparisKalemleri)
        .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik));
      const odenen =
        siparis.odeme_zamani === null ? null : (siparis.tahsilat?.odenen ?? siparis.toplam);
      let hesap: ReturnType<typeof iadeyiHesapla>;
      try {
        hesap = iadeyiHesapla(
          {
            toplam: siparis.toplam,
            vergiToplami: siparis.vergi_toplami,
            vergiDokumu: siparis.vergi_dokumu,
            odenen,
            kalemler: kalemler.map((kalem) => ({
              sira: kalem.sira,
              adet: kalem.adet,
              vergisiz: kalem.vergisiz,
              vergi: kalem.vergi,
              vergiOranlari: kalem.vergi_oranlari,
            })),
          },
          oncekiler.map((iade) => ({
            tutar: iade.tutar,
            kargoTutari: iade.kargo_tutari,
            kalemler: iade.kalemler,
          })),
          girdi.tur,
          secim,
        );
      } catch (hata) {
        return hesapHatasi(hata);
      }
      const yontem = siparis.odeme_yontemi as OdemeYontemi;
      const kurulustan = hesap.tutar > 0 && eklentiliMi(yontem);
      const [iade] = await islem
        .insert(siparisIadeleri)
        .values({
          siparis_kimligi: siparis.kimlik,
          tur: girdi.tur,
          durum: "bekliyor",
          yontem: hesap.tutar === 0 ? "yok" : kurulustan ? "kurulus" : "elle",
          tutar: hesap.tutar,
          vergi_dokumu: hesap.vergiDokumu,
          kalemler: hesap.kalemler,
          kargo_tutari: hesap.kargoTutari,
          stoga_konacak: girdi.stogaKoy,
          neden: girdi.neden,
          aciklama: girdi.aciklama ?? null,
          kaynak: girdi.musteriIptali === undefined ? "yonetici" : "musteri",
          talep_kimligi: girdi.talep ?? null,
          ...kimSutunlari(kim),
        })
        .returning();
      if (iade === undefined) throw new Error("İade yazılamadı.");
      if (kurulustan) {
        return {
          iade,
          durum: siparis.durum as SiparisDurumu,
          istek: {
            yontem,
            kalemler: hesap.kalemler.map((secilen) => ({
              birim: kalemler.find((k) => k.sira === secilen.sira)?.birim_kimligi ?? "",
              tutar: secilen.tutar,
            })),
          },
        };
      }
      return { iade, durum: await tamamla(islem, iade, kim), istek: null };
    });
    if (yazilan.istek === null) {
      return { numara: girdi.numara, durum: yazilan.durum, iade: "tamamlandi" };
    }
    // Kuruluştan dönüş işlemin dışında: kuruluşu beklerken siparişin kilidi tutulmaz.
    const { yontem, kalemler } = yazilan.istek;
    if (!eklentiliMi(yontem)) throw new Error("Kuruluştan dönmeyen yöntem.");
    let sonuc: Awaited<ReturnType<typeof eklentiliIadeEt>>;
    try {
      sonuc = await eklentiliIadeEt(vt, site, yontem, {
        iade: yazilan.iade.kimlik,
        siparis: yazilan.iade.siparis_kimligi,
        tutar: yazilan.iade.tutar,
        kalemler,
        kargoTutari: yazilan.iade.kargo_tutari,
      });
    } catch (hata) {
      hatayiKaydet(hata, { kaynak: "siparis-iadesi", iade: yazilan.iade.kimlik });
      sonuc = "belirsiz";
    }
    return iadeSonucunuIsle(vt, yazilan.iade.kimlik, sonuc, kim);
  };

  // Kuruluşun sonucunu işler (iadeYap ve eklentinin taraması): tamamsa iade tamamlanır, redse başarısız olur, belirsizse
  // bekler. Yalnız bekleyen iadede bir şey yapar; aynı sonuç iki kez gelse de bir kez işlenir (siparişin kilidi).
  const iadeSonucunuIsle = async (
    vt: Veritabani,
    iadeKimligi: string,
    sonuc: "tamam" | "red" | "belirsiz",
    kim: DegisikligiYapan,
  ): Promise<IadeSonucu> =>
    vt.transaction(async (islem) => {
      const [bulunan] = await islem
        .select({ siparis: siparisIadeleri.siparis_kimligi })
        .from(siparisIadeleri)
        .where(eq(siparisIadeleri.kimlik, iadeKimligi));
      if (bulunan === undefined) throw new BilinenHata("bulunamadi");
      const [siparis] = await islem
        .select({ numara: siparisler.numara, durum: siparisler.durum })
        .from(siparisler)
        .where(eq(siparisler.kimlik, bulunan.siparis))
        .for("update");
      const [iade] = await islem
        .select()
        .from(siparisIadeleri)
        .where(eq(siparisIadeleri.kimlik, iadeKimligi));
      if (siparis === undefined || iade === undefined) throw new BilinenHata("bulunamadi");
      if (iade.durum !== "bekliyor" || sonuc === "belirsiz") {
        return {
          numara: siparis.numara,
          durum: siparis.durum as SiparisDurumu,
          iade: iade.durum as IadeSonucu["iade"],
        };
      }
      if (sonuc === "red") {
        await islem
          .update(siparisIadeleri)
          .set({ durum: "basarisiz", sonuc_zamani: sql`now()` })
          .where(eq(siparisIadeleri.kimlik, iadeKimligi));
        return { numara: siparis.numara, durum: siparis.durum as SiparisDurumu, iade: "basarisiz" };
      }
      // İadeyi isteyen kişi geçmişe ve kayda yazılır (taramanın sonucu da olsa).
      const isteyen: DegisikligiYapan =
        iade.kim_turu === "sistem"
          ? { tur: "sistem", ad: iade.kim_adi ?? "" }
          : {
              tur: iade.kim_turu as "yonetici" | "musteri" | "sahip",
              kimlik: iade.kim_kimligi ?? "",
            };
      const durum = await tamamla(islem, iade, kim.tur === "sistem" ? isteyen : kim);
      return { numara: siparis.numara, durum, iade: "tamamlandi" };
    });

  // Bekleyen iadeyi yeniden dener (mağaza sahibi): kuruluşun reddettiği parçalar yeniden gönderilir, belirsiz parçalar
  // taramayı bekler. İade bekliyor değilse "cakisma".
  const yenidenDene = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    numara: string,
  ): Promise<IadeSonucu> => {
    const [iade] = await vt
      .select({ iade: siparisIadeleri, yontem: siparisler.odeme_yontemi })
      .from(siparisIadeleri)
      .innerJoin(siparisler, eq(siparisler.kimlik, siparisIadeleri.siparis_kimligi))
      .where(and(eq(siparisler.numara, numara), eq(siparisIadeleri.durum, "bekliyor")));
    if (iade === undefined) throw new BilinenHata("cakisma", [{ alan: "iade", kod: "iade-yok" }]);
    const yontem = iade.yontem as OdemeYontemi;
    if (!eklentiliMi(yontem)) throw new Error("Bekleyen iade kuruluştan dönmüyor.");
    const kalemler = await vt
      .select({ sira: siparisKalemleri.sira, birim: siparisKalemleri.birim_kimligi })
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, iade.iade.siparis_kimligi));
    let sonuc: Awaited<ReturnType<typeof eklentiliIadeEt>>;
    try {
      sonuc = await eklentiliIadeEt(vt, site, yontem, {
        iade: iade.iade.kimlik,
        siparis: iade.iade.siparis_kimligi,
        tutar: iade.iade.tutar,
        kalemler: iade.iade.kalemler.map((secilen) => ({
          birim: kalemler.find((k) => k.sira === secilen.sira)?.birim ?? "",
          tutar: secilen.tutar,
        })),
        kargoTutari: iade.iade.kargo_tutari,
      });
    } catch (hata) {
      hatayiKaydet(hata, { kaynak: "siparis-iadesi", iade: iade.iade.kimlik });
      sonuc = "belirsiz";
    }
    return iadeSonucunuIsle(vt, iade.iade.kimlik, sonuc, kim);
  };

  // Siparişin iadeleri, en yeni önce (panelin ayrıntısı).
  const iadeler = (vt: Veritabani, siparis: string) =>
    vt
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.siparis_kimligi, siparis))
      .orderBy(desc(siparisIadeleri.olusturma_zamani), desc(siparisIadeleri.kimlik));

  return { iadeYap, iadeSonucunuIsle, yenidenDene, iadeler };
};
