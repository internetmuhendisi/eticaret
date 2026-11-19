// Panelin elle siparişinin aramaları (kart 0236, karar 0148). Sipariş kendisi ödeme servisinin elleSiparisVer'iyle
// kurulur (cekirdek/moduller/odeme/servis.ts); burada yalnız ekranın ürün ve müşteri seçimi vardır.
//
// - Ürün: vitrin aramasının harf kuralıyla (aramaKosulu), yalnız sayfası vitrinde açılan ürünler, en uygun önce. Her
//   ürünün silinmemiş birimleri satır satır, sepetin hesabıyla (fiyat, satılabilirlik ve seçim sepetGorunumu'ndan):
//   satılamayan birim de listelenir ama eklenemez.
// - Müşteri: üye müşterinin e-postasında arama (harf ayrımsız, joker yok), silinmiş hesap gelmez. Her müşterinin son
//   siparişindeki teslimat (kişisel bilgisi silinmemiş) tek sorguyla, adres önerisi olarak.
import { and, asc, desc, inArray, isNull, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { sepetGorunumu } from "../../vitrin/sepet/veri.ts";
import { musteriler } from "../musteri/model.ts";
import type { Teslimat } from "../odeme/semalar.ts";
import { aramaKosulu, aramaSorgusu, uygunlukPuani } from "../urun/arama.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { siparisler } from "./model.ts";

export const elleSiparisSinirlari = { urun: 10, musteri: 10 } as const;

export type ElleSiparisBirimi = {
  birim: string;
  ad: string;
  secim: string;
  yaziliFiyat: string | null;
  satilabilir: boolean;
};

export const elleSiparisUrunleri = async (
  vt: Veritabani,
  site: Site,
  ara: string,
): Promise<ElleSiparisBirimi[]> => {
  const sorgu = aramaSorgusu(ara);
  if (sorgu === undefined) return [];
  const bulunanlar = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(and(aramaKosulu(sorgu), vitrinKosulu("sayfa", { tukenenUrun: "goster" })))
    .orderBy(desc(uygunlukPuani(sorgu)), desc(urunler.olusturma_zamani), asc(urunler.kimlik))
    .limit(elleSiparisSinirlari.urun);
  if (bulunanlar.length === 0) return [];
  const birimler = await vt
    .select({ kimlik: urunBirimleri.kimlik, urun: urunBirimleri.urun_kimligi })
    .from(urunBirimleri)
    .where(
      and(
        inArray(
          urunBirimleri.urun_kimligi,
          bulunanlar.map((urun) => urun.kimlik),
        ),
        isNull(urunBirimleri.silinme_zamani),
      ),
    )
    .orderBy(asc(urunBirimleri.sira), asc(urunBirimleri.kimlik));
  const sira = new Map(bulunanlar.map((urun, yer) => [urun.kimlik, yer]));
  const sirali = [...birimler]
    .sort((a, b) => (sira.get(a.urun) ?? 0) - (sira.get(b.urun) ?? 0))
    .slice(0, 50);
  const gorunum = await sepetGorunumu(
    vt,
    site,
    sirali.map((birim) => ({ birim: birim.kimlik, adet: 1 })),
  );
  return gorunum.satirlar.flatMap((satir) =>
    satir.urun === undefined
      ? []
      : [
          {
            birim: satir.birim,
            ad: satir.urun.ad,
            secim: satir.secim.map(({ secenek, deger }) => `${secenek}: ${deger}`).join(" · "),
            yaziliFiyat: satir.yaziliTutar ?? null,
            satilabilir: satir.satilabilir,
          },
        ],
  );
};

export type ElleSiparisMusterisi = { kimlik: string; eposta: string; sonTeslimat: Teslimat | null };

export const elleSiparisMusterileri = async (
  vt: Veritabani,
  ara: string,
): Promise<ElleSiparisMusterisi[]> => {
  const aranan = ara.trim();
  if (aranan === "") return [];
  const bulunanlar = await vt
    .select({ kimlik: musteriler.kimlik, eposta: musteriler.eposta })
    .from(musteriler)
    .where(
      and(
        isNull(musteriler.silinme_zamani),
        sql`strpos(${aramaAnahtariSql(musteriler.eposta)}, ${aramaAnahtariSql(sql`${aranan}::text`)}) > 0`,
      ),
    )
    .orderBy(asc(musteriler.eposta))
    .limit(elleSiparisSinirlari.musteri);
  if (bulunanlar.length === 0) return [];
  const sonlar = await vt
    .selectDistinctOn([siparisler.musteri_kimligi], {
      musteri: siparisler.musteri_kimligi,
      teslimat: siparisler.teslimat,
    })
    .from(siparisler)
    .where(
      and(
        inArray(
          siparisler.musteri_kimligi,
          bulunanlar.map((musteri) => musteri.kimlik),
        ),
        isNull(siparisler.kisisel_veri_silinme_zamani),
      ),
    )
    .orderBy(
      siparisler.musteri_kimligi,
      desc(siparisler.olusturma_zamani),
      desc(siparisler.kimlik),
    );
  return bulunanlar.map((musteri) => ({
    ...musteri,
    sonTeslimat: sonlar.find((son) => son.musteri === musteri.kimlik)?.teslimat ?? null,
  }));
};
