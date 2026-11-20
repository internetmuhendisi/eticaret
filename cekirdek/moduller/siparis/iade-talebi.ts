// Müşterinin iade talebi ve kendi iptali (kart 0239, karar 0145, 0151). Talep tutarı belirlemez: mağaza sahibi onaylar
// ya da reddeder, onaylanan talebin iadesini kart 0235'in akışıyla ("İade yap", iade.ts) kendisi yapar. Müşterinin
// iptali de o akıştır (iadeYap, kaynak "musteri").
//
// Kurallar:
// - Talep yalnız teslim edilmiş ya da kısmen iade edilmiş siparişte, teslimden sonra iade talebi süresi (site ayarı,
//   gün) dolmadan açılır. Süre veritabanının saatiyle denetlenir: son an teslim_zamani + süredir, o an kapalıdır.
// - Siparişin satırı kilitlenir. Bir siparişte en çok bir bekleyen talep olur (tekil indeks; ikincisi "cakisma").
// - İstenen adet talep edilebilir adedi aşamaz (talepEdilebilirAdetler): iade edilmiş ya da iadesi bekleyen adet ve
//   onaylanmış ama iadesi yapılmamış talepteki adet istenemez; reddedilen talebin adedi yeniden istenebilir.
// - Talep, onay ve ret sipariş geçmişine yazılır, siparişin durumu değişmez. Onay ve ret değişiklik kaydına da girer
//   (talebin açıklaması ve ret açıklaması kayda girmez: müşterinin ya da müşteriye yazılan serbest metindir).
// - Sahip: giriş yapmış müşteri (siparişi kendi hesabıyla verilmiş olmalı) ya da sipariş takibinin anahtarıyla
//   doğrulanmış üye olmayan müşteri (siparişin kimliği). Başkasının siparişi bulunamadıdır.
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  type IadeTalebiDurumu,
  iadeyeAcikDurumlar,
  type MusteriIadeNedeni,
  musteriIptaliTanimlari,
  type SiparisDurumu,
} from "../../kayitlar/siparis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { gecmiseYaz, uyeOlmayanMusteri } from "./gecmis.ts";
import { type IadeSonucu, iadeServisi } from "./iade.ts";
import { siparisIadeleri, siparisIadeTalepleri, siparisKalemleri, siparisler } from "./model.ts";

// Talebin ve iptalin sahibi: hesap ya da takip anahtarıyla bulunan sipariş.
export type TalepSahibi = { tur: "musteri"; musteri: string } | { tur: "takip"; siparis: string };

const yapan = (sahip: TalepSahibi): DegisikligiYapan =>
  sahip.tur === "musteri" ? { tur: "musteri", kimlik: sahip.musteri } : uyeOlmayanMusteri;

const sahibininMi = (
  siparis: { kimlik: string; musteri_kimligi: string | null },
  sahip: TalepSahibi,
): boolean =>
  sahip.tur === "musteri"
    ? siparis.musteri_kimligi === sahip.musteri
    : siparis.kimlik === sahip.siparis;

export type TalepGirdisi = {
  numara: string;
  kalemler: { sira: number; adet: number }[];
  neden: MusteriIadeNedeni;
  aciklama?: string | undefined;
};

type TalepSatiri = {
  kimlik: string;
  durum: string;
  kalemler: { sira: number; adet: number }[];
};
type IadeSatiri = {
  tur: string;
  durum: string;
  kalemler: { sira: number; adet: number }[];
  talep: string | null;
};

// Kalem başına talep edilebilir adet (saf): kalemin adedinden iade edilmiş ya da iadesi bekleyen adet, bekleyen
// talepteki adet ve onaylanmış ama iadesi (yürüyen ya da tamamlanmış) olmayan talepteki adet düşülür. Reddedilen
// talep ve başarısız iade sayılmaz. İptal ürün döndürmez, sayılmaz.
export const talepEdilebilirAdetler = (
  kalemler: readonly { sira: number; adet: number }[],
  iadeler: readonly IadeSatiri[],
  talepler: readonly TalepSatiri[],
): Map<number, number> => {
  const dusulen = new Map<number, number>();
  const dus = (liste: readonly { sira: number; adet: number }[]) => {
    for (const kalem of liste) dusulen.set(kalem.sira, (dusulen.get(kalem.sira) ?? 0) + kalem.adet);
  };
  const iadesiOlanTalepler = new Set<string>();
  for (const iade of iadeler) {
    if (iade.tur !== "iade" || (iade.durum !== "tamamlandi" && iade.durum !== "bekliyor")) continue;
    dus(iade.kalemler);
    if (iade.talep !== null) iadesiOlanTalepler.add(iade.talep);
  }
  for (const talep of talepler) {
    const acik =
      talep.durum === "bekliyor" ||
      (talep.durum === "onaylandi" && !iadesiOlanTalepler.has(talep.kimlik));
    if (acik) dus(talep.kalemler);
  }
  return new Map(
    kalemler.map((kalem) => [kalem.sira, Math.max(0, kalem.adet - (dusulen.get(kalem.sira) ?? 0))]),
  );
};

// Müşterinin iptal edebildiği durumlar (site ayarı) ve ödeme kuralı; ekran düğmeyi bununla gösterir, servis kilit
// altında yeniden denetler (iade.ts).
export const musteriIptalEdebilirMi = (
  secenek: keyof typeof musteriIptaliTanimlari,
  siparis: { durum: SiparisDurumu; odendi: boolean; parasiKurulustan: boolean },
): boolean =>
  (musteriIptaliTanimlari[secenek] as readonly SiparisDurumu[]).includes(siparis.durum) &&
  (!siparis.odendi || siparis.parasiKurulustan);

export const iadeTalebiServisi = (site: Site) => {
  const talepAc = async (
    vt: Veritabani,
    sahip: TalepSahibi,
    girdi: TalepGirdisi,
  ): Promise<{ numara: string; talep: string }> => {
    const { iadeTalebiSuresi } = await siteninMagazaAyarlari(vt, site);
    return vt.transaction(async (islem) => {
      const [siparis] = await islem
        .select({
          kimlik: siparisler.kimlik,
          musteri_kimligi: siparisler.musteri_kimligi,
          durum: siparisler.durum,
          // Süre veritabanının saatiyle: son an kapalıdır.
          sureIcinde: sql<boolean>`${siparisler.teslim_zamani} is not null and now() < ${siparisler.teslim_zamani} + make_interval(days => ${iadeTalebiSuresi})`,
        })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      if (siparis === undefined || !sahibininMi(siparis, sahip)) {
        throw new BilinenHata("bulunamadi");
      }
      if (!(iadeyeAcikDurumlar.iade as readonly string[]).includes(siparis.durum)) {
        throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "talebe-kapali" }]);
      }
      if (!siparis.sureIcinde) {
        throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "sure-doldu" }]);
      }
      const [kalemler, iadeler, talepler] = await Promise.all([
        islem
          .select({ sira: siparisKalemleri.sira, adet: siparisKalemleri.adet })
          .from(siparisKalemleri)
          .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik)),
        islem
          .select({
            tur: siparisIadeleri.tur,
            durum: siparisIadeleri.durum,
            kalemler: siparisIadeleri.kalemler,
            talep: siparisIadeleri.talep_kimligi,
          })
          .from(siparisIadeleri)
          .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik)),
        islem
          .select({
            kimlik: siparisIadeTalepleri.kimlik,
            durum: siparisIadeTalepleri.durum,
            kalemler: siparisIadeTalepleri.kalemler,
          })
          .from(siparisIadeTalepleri)
          .where(eq(siparisIadeTalepleri.siparis_kimligi, siparis.kimlik)),
      ]);
      if (talepler.some((talep) => talep.durum === "bekliyor")) {
        throw new BilinenHata("cakisma", [{ alan: "numara", kod: "talep-bekliyor" }]);
      }
      const kalan = talepEdilebilirAdetler(kalemler, iadeler, talepler);
      const secilen = girdi.kalemler.filter((kalem) => kalem.adet > 0);
      if (secilen.length === 0) {
        throw new BilinenHata("dogrulama", [{ alan: "kalemler", kod: "kalem-yok" }]);
      }
      const hatalar = secilen.flatMap((kalem) => {
        const olabilir = kalan.get(kalem.sira);
        if (olabilir === undefined) return [{ alan: `kalemler.${kalem.sira}`, kod: "kalem-yok" }];
        return kalem.adet > olabilir ? [{ alan: `kalemler.${kalem.sira}`, kod: "adet-fazla" }] : [];
      });
      if (hatalar.length > 0) throw new BilinenHata("dogrulama", hatalar);
      const [talep] = await islem
        .insert(siparisIadeTalepleri)
        .values({
          siparis_kimligi: siparis.kimlik,
          durum: "bekliyor",
          kalemler: secilen.map(({ sira, adet }) => ({ sira, adet })),
          neden: girdi.neden,
          aciklama: girdi.aciklama ?? null,
          kim_turu: sahip.tur === "musteri" ? "musteri" : "sistem",
          kim_kimligi: sahip.tur === "musteri" ? sahip.musteri : null,
          kim_adi: sahip.tur === "musteri" ? null : (yapan(sahip) as { ad: string }).ad,
        })
        .returning({ kimlik: siparisIadeTalepleri.kimlik });
      if (talep === undefined) throw new Error("Talep yazılamadı.");
      const durum = siparis.durum as SiparisDurumu;
      await gecmiseYaz(islem, {
        siparis: siparis.kimlik,
        onceki: durum,
        sonraki: durum,
        neden: "iade-talebi-alindi",
        kim: yapan(sahip),
      });
      return { numara: girdi.numara, talep: talep.kimlik };
    });
  };

  // Mağazanın kararı: bekleyen talep onaylanır ya da müşteriye açıklamayla reddedilir. Talep artık bekliyor değilse
  // (arada karar verildi) "cakisma", hiçbir şey yazılmaz.
  const kararVer = async (
    vt: Veritabani,
    kim: DegisikligiYapan & { tur: "yonetici" | "sahip" },
    girdi: { numara: string; talep: string } & (
      | { karar: "onayla" }
      | { karar: "reddet"; retAciklamasi: string }
    ),
  ): Promise<{ numara: string; durum: IadeTalebiDurumu }> =>
    vt.transaction(async (islem) => {
      const [siparis] = await islem
        .select({ kimlik: siparisler.kimlik, durum: siparisler.durum })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      if (siparis === undefined) throw new BilinenHata("bulunamadi");
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
      if (talep.durum !== "bekliyor") {
        throw new BilinenHata("cakisma", [{ alan: "talep", kod: "talep-degisti" }]);
      }
      // Onay yalnız iadeye açık siparişte: iadesi bitmiş siparişte onaylanan talep hiç kapanmazdı (bağımsız kontrolün
      // bulgusu). Ret her zaman yapılır.
      if (
        girdi.karar === "onayla" &&
        !(iadeyeAcikDurumlar.iade as readonly string[]).includes(siparis.durum)
      ) {
        throw new BilinenHata("is-kurali", [{ alan: "talep", kod: "talebe-kapali" }]);
      }
      const yeni: IadeTalebiDurumu = girdi.karar === "onayla" ? "onaylandi" : "reddedildi";
      await islem
        .update(siparisIadeTalepleri)
        .set({
          durum: yeni,
          karar_veren_kimligi: kim.kimlik,
          karar_zamani: sql`now()`,
          ret_aciklamasi: girdi.karar === "reddet" ? girdi.retAciklamasi : null,
        })
        .where(eq(siparisIadeTalepleri.kimlik, girdi.talep));
      const durum = siparis.durum as SiparisDurumu;
      await gecmiseYaz(islem, {
        siparis: siparis.kimlik,
        onceki: durum,
        sonraki: durum,
        neden: girdi.karar === "onayla" ? "iade-talebi-onaylandi" : "iade-talebi-reddedildi",
        kim,
      });
      await degisikligiKaydet(islem, {
        kim,
        islem:
          girdi.karar === "onayla"
            ? "siparis.iade-talebi-onaylandi"
            : "siparis.iade-talebi-reddedildi",
        kayit: { tur: "siparis", kimlik: siparis.kimlik },
        eski: { talep: girdi.talep, durum: "bekliyor" },
        yeni: { talep: girdi.talep, durum: yeni },
      });
      return { numara: girdi.numara, durum: yeni };
    });

  // Müşterinin kendi iptali: ayar ve ödeme kuralı iadeYap'ta siparişin kilidi altında denetlenir. Kartla ödenmişse
  // para kuruluştan döner (iade "bekliyor" kalabilir). Bütün ürünler stoğa döner (taslak).
  const musteriIptali = async (
    vt: Veritabani,
    sahip: TalepSahibi,
    girdi: { numara: string; gorulenDurum: SiparisDurumu },
  ): Promise<IadeSonucu> => {
    const [{ musteriIptali: secenek }, [siparis]] = await Promise.all([
      siteninMagazaAyarlari(vt, site),
      vt
        .select({ kimlik: siparisler.kimlik, musteri_kimligi: siparisler.musteri_kimligi })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara)),
    ]);
    if (siparis === undefined || !sahibininMi(siparis, sahip)) throw new BilinenHata("bulunamadi");
    return iadeServisi(site).iadeYap(vt, yapan(sahip), {
      numara: girdi.numara,
      tur: "iptal",
      gorulenDurum: girdi.gorulenDurum,
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
      musteriIptali: { izinliDurumlar: musteriIptaliTanimlari[secenek] },
    });
  };

  // Siparişin talepleri (panelin ayrıntısı ve müşterinin görünüşü), eskiden yeniye; her talebin iadesi yapıldı mı.
  const talepler = async (vt: Veritabani, siparis: string) => {
    const [satirlar, iadeler] = await Promise.all([
      vt
        .select()
        .from(siparisIadeTalepleri)
        .where(eq(siparisIadeTalepleri.siparis_kimligi, siparis))
        .orderBy(siparisIadeTalepleri.olusturma_zamani, siparisIadeTalepleri.kimlik),
      vt
        .select({ talep: siparisIadeleri.talep_kimligi })
        .from(siparisIadeleri)
        .where(
          and(
            eq(siparisIadeleri.siparis_kimligi, siparis),
            inArray(siparisIadeleri.durum, ["tamamlandi", "bekliyor"]),
          ),
        ),
    ]);
    const iadeli = new Set(iadeler.map((iade) => iade.talep));
    return satirlar.map((satir) => ({ ...satir, iadeYapildi: iadeli.has(satir.kimlik) }));
  };

  return { talepAc, kararVer, musteriIptali, talepler };
};
