// Siparişin faturası (kart 0268, karar 0170): mağazanın kendi e-fatura ya da e-arşiv sisteminde kestiği faturanın
// numarası, tarihi ve isteğe bağlı PDF'i siparişe yazılır. Gerçek e-fatura bağlantısı yoktur.
//
// Kurallar:
// - Yazma ve kaldırma siparişin satırını kilitler; ekranın gördüğü fatura (gorulen) bugünkünden farklıysa "cakisma",
//   hiçbir şey yazılmaz. Her yazma ve kaldırma değişiklik kaydına girer (numara, tarih, dosyanın kimliği).
// - Dosya önce fatura-yukle ucuyla belge olarak kaydedilir (belgeKaydet), kimliğiyle gelir. Yalnız silinmemiş bir
//   belge bağlanır; başka bir siparişin faturası olan dosya bağlanmaz. Değiştirilen ya da kaldırılan dosya silinmiş
//   işaretlenir (dosyanın kendisi yerinde kalır, kalıcı silme kart 0093).
// - Kişisel bilgisi silinmiş siparişe dosya bağlanmaz (PDF kişisel bilgi taşır); numara ve tarih yazılabilir.
// - "Faturanız hazır" e-postası (kutu işaretliyse) faturanın yazımıyla aynı işlemde, değişiklik kaydının kimliğiyle
//   yazılır: aynı yazıma ikinci e-posta gitmez. Kişisel bilgisi silinmiş siparişe yazılmaz (siparisEpostasiYaz).
// - Dosya üç yoldan okunur: panel (siparişi gören yönetici), üye (yalnız kendi hesabının siparişi) ve takip (geçerli
//   takip anahtarının siparişi). Yanıt indirilecek dosyadır, sayfada açılmaz (DosyaYaniti, indirme).
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { belgeBoyutu, belgeOku, dosyaSil } from "../dosya/servis.ts";
import { siparisEpostasiYaz } from "./epostalar.ts";
import { siparisler } from "./model.ts";
import type { SiparisFaturasiGirdisi, SiparisFaturasiKaldirGirdisi } from "./semalar.ts";

export type SiparisFaturasi = {
  numara: string;
  // Takvim günü, "YYYY-AA-GG".
  tarih: string;
  dosya: { kimlik: string; boyut: number } | null;
};

type Satir = {
  kimlik: string;
  numara: string;
  faturaNumarasi: string | null;
  faturaTarihi: string | null;
  faturaDosyasi: string | null;
  kisiselVeriSilindi: boolean;
};

const satirSutunlari = {
  kimlik: siparisler.kimlik,
  numara: siparisler.numara,
  faturaNumarasi: siparisler.fatura_numarasi,
  faturaTarihi: siparisler.fatura_tarihi,
  faturaDosyasi: siparisler.fatura_dosyasi,
  kisiselVeriSilindi: sql<boolean>`${siparisler.kisisel_veri_silinme_zamani} is not null`,
};

// Satırın faturası ekranın gördüğüyle aynı mı (dosyanın boyutu karşılaştırılmaz).
const gorulenAyniMi = (satir: Satir, gorulen: SiparisFaturasiGirdisi["gorulen"]): boolean =>
  gorulen === null
    ? satir.faturaNumarasi === null
    : satir.faturaNumarasi === gorulen.numara &&
      satir.faturaTarihi === gorulen.tarih &&
      satir.faturaDosyasi === gorulen.dosya;

const kayitDegeri = (satir: {
  numara: string | null;
  tarih: string | null;
  dosya: string | null;
}): Record<string, unknown> | null =>
  satir.numara === null ? null : { numara: satir.numara, tarih: satir.tarih, dosya: satir.dosya };

const kilitle = async (islem: VeritabaniIslemi, numara: string): Promise<Satir> => {
  const [satir] = await islem
    .select(satirSutunlari)
    .from(siparisler)
    .where(eq(siparisler.numara, numara))
    .for("update");
  if (satir === undefined) throw new BilinenHata("bulunamadi");
  return satir;
};

export const siparisFaturaServisi = (site: Site) => {
  // Faturanın tarihi e-postada günün öğlesidir: sitenin saat diliminde biçimlenince aynı gün yazar.
  const ogle = (tarih: string): string =>
    (
      yerelZamandan(`${tarih}T12:00`, site.ayarlar.saatDilimi) ?? new Date(`${tarih}T12:00Z`)
    ).toISOString();

  const yaz = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: SiparisFaturasiGirdisi,
  ): Promise<{ numara: string; fatura: SiparisFaturasi }> =>
    vt.transaction(async (islem) => {
      const satir = await kilitle(islem, girdi.numara);
      if (!gorulenAyniMi(satir, girdi.gorulen)) {
        throw new BilinenHata("cakisma", [{ alan: "fatura", kod: "fatura-degisti" }]);
      }
      const { fatura } = girdi;
      let boyut: number | null = null;
      if (fatura.dosya !== null) {
        if (fatura.dosya !== satir.faturaDosyasi && satir.kisiselVeriSilindi) {
          throw new BilinenHata("is-kurali", [
            { alan: "fatura.dosya", kod: "kisisel-veri-silindi" },
          ]);
        }
        const bulunan = await belgeBoyutu(islem, fatura.dosya);
        if (bulunan === undefined) {
          throw new BilinenHata("dogrulama", [{ alan: "fatura.dosya", kod: "dosya-yok" }]);
        }
        const [baskasi] = await islem
          .select({ kimlik: siparisler.kimlik })
          .from(siparisler)
          .where(
            and(eq(siparisler.fatura_dosyasi, fatura.dosya), ne(siparisler.kimlik, satir.kimlik)),
          );
        if (baskasi !== undefined) {
          throw new BilinenHata("dogrulama", [{ alan: "fatura.dosya", kod: "dosya-kullanimda" }]);
        }
        boyut = bulunan;
      }
      const eski = {
        numara: satir.faturaNumarasi,
        tarih: satir.faturaTarihi,
        dosya: satir.faturaDosyasi,
      };
      const yeni = { numara: fatura.numara, tarih: fatura.tarih, dosya: fatura.dosya };
      const sonuc: SiparisFaturasi = {
        numara: fatura.numara,
        tarih: fatura.tarih,
        dosya: fatura.dosya === null || boyut === null ? null : { kimlik: fatura.dosya, boyut },
      };
      // Aynı fatura yeniden yazılmaz, kayda ve e-postaya girmez.
      if (eski.numara === yeni.numara && eski.tarih === yeni.tarih && eski.dosya === yeni.dosya) {
        return { numara: satir.numara, fatura: sonuc };
      }
      await islem
        .update(siparisler)
        .set({
          fatura_numarasi: yeni.numara,
          fatura_tarihi: yeni.tarih,
          fatura_dosyasi: yeni.dosya,
          fatura_zamani: sql`clock_timestamp()`,
        })
        .where(eq(siparisler.kimlik, satir.kimlik));
      if (eski.dosya !== null && eski.dosya !== yeni.dosya) {
        await dosyaSil(islem, eski.dosya);
      }
      const kayit = await degisikligiKaydet(islem, {
        kim,
        islem: "siparis.fatura-yazildi",
        kayit: { tur: "siparis", kimlik: satir.kimlik },
        eski: kayitDegeri(eski),
        yeni: kayitDegeri(yeni),
      });
      if (girdi.eposta) {
        await siparisEpostasiYaz(islem, {
          siparis: satir.kimlik,
          sablon: "fatura-hazir",
          olayAnahtari: `siparis-faturasi:${kayit.kimlik}`,
          ek: {
            fatura: { numara: yeni.numara, tarih: ogle(yeni.tarih), dosya: yeni.dosya !== null },
          },
        });
      }
      return { numara: satir.numara, fatura: sonuc };
    });

  const kaldir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: SiparisFaturasiKaldirGirdisi,
  ): Promise<{ numara: string }> =>
    vt.transaction(async (islem) => {
      const satir = await kilitle(islem, girdi.numara);
      if (!gorulenAyniMi(satir, girdi.gorulen)) {
        throw new BilinenHata("cakisma", [{ alan: "fatura", kod: "fatura-degisti" }]);
      }
      await islem
        .update(siparisler)
        .set({
          fatura_numarasi: null,
          fatura_tarihi: null,
          fatura_dosyasi: null,
          fatura_zamani: null,
        })
        .where(eq(siparisler.kimlik, satir.kimlik));
      if (satir.faturaDosyasi !== null) {
        await dosyaSil(islem, satir.faturaDosyasi);
      }
      await degisikligiKaydet(islem, {
        kim,
        islem: "siparis.fatura-kaldirildi",
        kayit: { tur: "siparis", kimlik: satir.kimlik },
        eski: kayitDegeri({
          numara: satir.faturaNumarasi,
          tarih: satir.faturaTarihi,
          dosya: satir.faturaDosyasi,
        }),
        yeni: null,
      });
      return { numara: satir.numara };
    });

  // Bir siparişin faturası (panel ve müşterinin görünüşü); yoksa null. Dosyası silinmişse dosyasız.
  const oku = async (vt: Veritabani, siparisKimligi: string): Promise<SiparisFaturasi | null> => {
    const [satir] = await vt
      .select(satirSutunlari)
      .from(siparisler)
      .where(eq(siparisler.kimlik, siparisKimligi));
    if (satir === undefined || satir.faturaNumarasi === null || satir.faturaTarihi === null) {
      return null;
    }
    const boyut =
      satir.faturaDosyasi === null ? undefined : await belgeBoyutu(vt, satir.faturaDosyasi);
    return {
      numara: satir.faturaNumarasi,
      tarih: satir.faturaTarihi,
      dosya:
        satir.faturaDosyasi === null || boyut === undefined
          ? null
          : { kimlik: satir.faturaDosyasi, boyut },
    };
  };

  // Faturanın dosyası: koşula uyan siparişin bağlı belgesi; yoksa undefined. Koşul okuyanın yetkisidir.
  const dosyaOku = async (
    vt: Veritabani,
    kosul: { numara: string; musteri?: string; kimlik?: string },
  ) => {
    const kosullar = [eq(siparisler.numara, kosul.numara), isNotNull(siparisler.fatura_dosyasi)];
    if (kosul.musteri !== undefined) kosullar.push(eq(siparisler.musteri_kimligi, kosul.musteri));
    if (kosul.kimlik !== undefined) kosullar.push(eq(siparisler.kimlik, kosul.kimlik));
    const [satir] = await vt
      .select({ numara: siparisler.numara, dosya: siparisler.fatura_dosyasi })
      .from(siparisler)
      .where(and(...kosullar));
    if (satir?.dosya === null || satir?.dosya === undefined) return undefined;
    const belge = await belgeOku(vt, satir.dosya);
    return belge === undefined ? undefined : { ...belge, siparis: satir.numara };
  };

  return { yaz, kaldir, oku, dosyaOku };
};
