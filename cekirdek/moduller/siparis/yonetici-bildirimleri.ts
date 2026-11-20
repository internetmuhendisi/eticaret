// Siparişin yönetici bildirimleri (kart 0241, karar 0154): geçmiş satırıyla aynı işlemde, satırın kimliğiyle kuyruğa
// girer (gecmis.ts). Veri kısadır: müşterinin adı ve soyadının baş harfi, adresinden ülke, il ve ilçe; e-posta, telefon
// ve açık adres yok. Arka plan süreci de yükler (iptal.ts): içe aktarmalar uzantılıdır.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { SiparisGecmisiNedeni } from "../../kayitlar/siparis.ts";
import type { YoneticiBildirimi } from "../../kayitlar/yonetici-bildirimi.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { yoneticiBildirimiYaz } from "../yonetici-bildirimi/servis.ts";
import { kisaAdVerisi } from "../yonetici-bildirimi/veri.ts";
import { havaleBildirimleri, siparisIadeTalepleri, siparisKalemleri, siparisler } from "./model.ts";

export const siparisYoneticiBildirimiYaz = async (
  islem: VeritabaniIslemi,
  g: { siparis: string; bildirim: YoneticiBildirimi; anahtar: string; neden: SiparisGecmisiNedeni },
): Promise<void> => {
  const [s] = await islem.select().from(siparisler).where(eq(siparisler.kimlik, g.siparis));
  if (s === undefined) throw new Error("Bildirimin siparişi yok.");
  const kalemler = await islem
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, s.kimlik))
    .orderBy(asc(siparisKalemleri.sira));
  switch (g.bildirim) {
    case "yeni-siparis": {
      const { ulke, il, ilce } = s.teslimat.adres;
      await yoneticiBildirimiYaz(islem, {
        bildirim: "yeni-siparis",
        anahtar: g.anahtar,
        veri: {
          numara: s.numara,
          musteri: kisaAdVerisi(`${s.teslimat.ad} ${s.teslimat.soyad}`),
          uye: s.musteri_kimligi !== null,
          odemeYontemi: s.odeme_yontemi,
          kapidaSecenegi: s.kapida_secenegi,
          bolge: {
            ulke,
            ...(il === undefined ? {} : { il }),
            ...(ilce === undefined ? {} : { ilce }),
          },
          adet: kalemler.reduce((toplam, k) => toplam + k.adet, 0),
          kalem: kalemler.length,
          toplam: s.toplam,
        },
      });
      return;
    }
    case "havale-bildirimi": {
      const [bildirim] = await islem
        .select()
        .from(havaleBildirimleri)
        .where(eq(havaleBildirimleri.siparis_kimligi, s.kimlik))
        .orderBy(desc(havaleBildirimleri.olusturma_zamani), desc(havaleBildirimleri.kimlik))
        .limit(1);
      if (bildirim === undefined) throw new Error("Havale bildirimi yok.");
      await yoneticiBildirimiYaz(islem, {
        bildirim: "havale-bildirimi",
        anahtar: g.anahtar,
        veri: {
          numara: s.numara,
          gonderen: kisaAdVerisi(bildirim.gonderen),
          banka: bildirim.banka,
          odemeTarihi: bildirim.odeme_tarihi,
          tutar: bildirim.tutar,
        },
      });
      return;
    }
    case "iade-talebi": {
      const [talep] = await islem
        .select()
        .from(siparisIadeTalepleri)
        .where(
          and(
            eq(siparisIadeTalepleri.siparis_kimligi, s.kimlik),
            inArray(siparisIadeTalepleri.durum, ["bekliyor"]),
          ),
        )
        .limit(1);
      if (talep === undefined) throw new Error("İade talebi yok.");
      await yoneticiBildirimiYaz(islem, {
        bildirim: "iade-talebi",
        anahtar: g.anahtar,
        veri: {
          numara: s.numara,
          kalemler: talep.kalemler.flatMap(({ sira, adet }) => {
            const kalem = kalemler.find((k) => k.sira === sira);
            return kalem === undefined
              ? []
              : [{ ad: kalem.urun_adi, secim: kalem.secim.map((s) => s.deger), adet }];
          }),
          neden: talep.neden,
          teslim: s.teslim_zamani?.toISOString() ?? null,
        },
      });
      return;
    }
    case "iptal":
      await yoneticiBildirimiYaz(islem, {
        bildirim: "iptal",
        anahtar: g.anahtar,
        veri: {
          numara: s.numara,
          neden: g.neden === "havale-suresi-doldu" ? "havale-suresi-doldu" : "musteri-iptali",
          toplam: s.toplam,
        },
      });
      return;
    default:
      throw new Error(`Siparişin bu yönetici bildirimi yok: ${g.bildirim}`);
  }
};
