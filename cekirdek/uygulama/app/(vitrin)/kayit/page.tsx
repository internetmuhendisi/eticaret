// Vitrinin müşteri kayıt sayfası (kart 0033; kart 0237 ile taslağın düzeni). Kayıttan sonra müşteri geldiği sayfaya
// döner (dönüş adresi giriş sayfasınınkiyle aynı kuralla), verilmemişse ana sayfaya.
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";
import { vitrinAdresleri, vitrinDonusParametresi, vitrinDonusu } from "../../../../vitrin/adresler";
import { GirisDuzeni, HesapYararlari } from "../../../../vitrin/hesap/giris-duzeni";
import { KayitFormu } from "../../../../vitrin/kayit-formu";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../../../../vitrin/yalniz-gezinti";

export const generateMetadata = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.kayit.baslik")),
  }),
);

export default async function MusteriKayitSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  musteriSayfasiniAc();
  const verilen = (await searchParams)[vitrinDonusParametresi];
  const donus = Array.isArray(verilen) ? verilen[0] : verilen;
  return (
    <GirisDuzeni
      baslik={metin("vitrin.kayit.baslik")}
      adres={vitrinAdresleri.kayit}
      yan={<HesapYararlari baslik={metin("vitrin.hesap.yararlar.nedenHesap")} />}
    >
      <KayitFormu donus={vitrinDonusu(donus)} />
    </GirisDuzeni>
  );
}
