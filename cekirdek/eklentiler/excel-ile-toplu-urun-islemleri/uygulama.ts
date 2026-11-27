// Önizlemesi onaylanan bir ürün grubunun yazılması (kart 0315). Grup (aynı ürün kodlu satırlar ya da kodsuz tek
// satır) tek işlemdedir: ürün kilidi alınır, önizlemede görülen değerler yeniden okunur, biri değişmişse hiçbir şey
// yazılmaz ("sitede-degisti"). Her parça kendi servisiyle yazılır: ürün (urunEkle, urunDegistir), seçenek, değer ve
// birleşim, fiyat (fiyatYaz), stok (stokDuzelt, görülen miktarla ve "Excel ile içe aktarma" sebebiyle). Servislerin
// kuralları ve değişiklik kayıtları panelinkilerle aynıdır.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunKilidiAl } from "../../moduller/urun/kilit.ts";
import type { UrunDegisikligi } from "../../moduller/urun/semalar.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { birlesimAnahtari, secenekleriOku } from "../../moduller/urun/varyant.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import type { Gorulen, Yazilacak } from "./denetim.ts";
import { type Sozluk, urunleriOku } from "./katalog.ts";
import { birimSutunlari, ortakSutunlar } from "./sutunlar.ts";

export type UygulanacakSatir = { no: number; yazilacak: Yazilacak; gorulen: Gorulen | null };

// Grubu yazar. Bilinen hata (servisin kuralı, sitede değişen değer) çağırana gider: işlem geri alınır, satırlar
// "uygulanamadı" işaretlenir.
export const grubuUygula = async (
  islem: VeritabaniIslemi,
  site: Site,
  sozluk: Sozluk,
  kim: DegisikligiYapan,
  satirlar: readonly UygulanacakSatir[],
): Promise<void> => {
  const ilk = satirlar[0];
  if (ilk === undefined) return;
  const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
  const fiyatSrv = siteninFiyatServisi(site);
  const stokSrv = stokServisi();
  const { ortak } = ilk.yazilacak;

  let urun: string;
  // Birimin kimliği ve önizlemede görülen stoğu, satır numarasıyla.
  const birimler = new Map<number, { kimlik: string; gorulenStok: number }>();

  if (ilk.yazilacak.urun.tur === "var") {
    urun = ilk.yazilacak.urun.kimlik;
    await urunKilidiAl(islem);
    const [simdi] = await urunleriOku(islem, site, sozluk, [urun]);
    if (simdi === undefined) throw new BilinenHata("bulunamadi");
    // Önizlemeden sonra değişen ortak bilgi ya da birim.
    for (const satir of satirlar) {
      const gorulen = satir.gorulen;
      if (gorulen === null) continue;
      // Yalnız yazılacak alanlar karşılaştırılır: arada başka alanı değişen ürün (ör. fiyatı yazılırken siparişle
      // düşen stok) yine yazılır.
      const yazilanOrtak = ortakSutunlar.filter((sutun) => sutun in ortak);
      if (yazilanOrtak.some((sutun) => gorulen.ortak[sutun] !== simdi.duz[sutun])) {
        throw new BilinenHata("cakisma", [{ alan: "urun", kod: "sitede-degisti" }]);
      }
      if (gorulen.birim !== null && satir.yazilacak.birim.tur === "var") {
        const kimlik = satir.yazilacak.birim.kimlik;
        const birim = simdi.birimler.find((b) => b.kimlik === kimlik);
        const gorulenBirim = gorulen.birim;
        const { alanlar } = satir.yazilacak;
        const yazilanBirim = birimSutunlari.filter((sutun) =>
          sutun === "stokKodu" || sutun === "barkod"
            ? alanlar[sutun] !== undefined
            : sutun === "stok"
              ? alanlar.stok !== undefined
              : alanlar.fiyat !== undefined,
        );
        if (
          birim === undefined ||
          yazilanBirim.some((sutun) => gorulenBirim[sutun] !== birim.duz[sutun])
        ) {
          throw new BilinenHata("cakisma", [{ alan: "birim", kod: "sitede-degisti" }]);
        }
      }
    }
    const basitBirimi = satirlar.find(
      (s) => s.yazilacak.birim.tur === "var" && s.yazilacak.birim.basit,
    );
    const degisiklik: UrunDegisikligi = { ...ortak };
    if (basitBirimi !== undefined) {
      const { stokKodu, barkod } = basitBirimi.yazilacak.alanlar;
      if (stokKodu !== undefined) degisiklik.stokKodu = stokKodu;
      if (barkod !== undefined) degisiklik.barkod = barkod;
    }
    if (Object.keys(degisiklik).length > 0)
      await urunSrv.urunDegistir(islem, kim, urun, degisiklik);
    // Var olan birleşimler ve yeni birleşimler.
    let secenekler = (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
    for (const satir of satirlar) {
      const birim = satir.yazilacak.birim;
      const { stokKodu, barkod } = satir.yazilacak.alanlar;
      if (birim.tur === "var") {
        if (!birim.basit && (stokKodu !== undefined || barkod !== undefined)) {
          await urunSrv.birlesimDegistir(islem, kim, birim.kimlik, {
            ...(stokKodu === undefined ? {} : { stokKodu }),
            ...(barkod === undefined ? {} : { barkod }),
          });
        }
        const gorulenStok = simdi.birimler.find((b) => b.kimlik === birim.kimlik)?.stok ?? 0;
        birimler.set(satir.no, { kimlik: birim.kimlik, gorulenStok });
        continue;
      }
      const degerler: string[] = [];
      for (const { secenek: secenekAdi, deger } of birim.degerler) {
        const secenek = secenekler.find(
          (s) => s.ad.toLocaleLowerCase("tr") === secenekAdi.toLocaleLowerCase("tr"),
        );
        if (secenek === undefined)
          throw new BilinenHata("cakisma", [{ alan: "secenekler", kod: "sitede-degisti" }]);
        let degerKimligi = secenek.degerler.find(
          (d) => d.ad.toLocaleLowerCase("tr") === deger.toLocaleLowerCase("tr"),
        )?.kimlik;
        if (degerKimligi === undefined) {
          degerKimligi = await urunSrv.degerEkle(islem, kim, secenek.kimlik, { ad: deger });
          secenekler =
            (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
        }
        degerler.push(degerKimligi);
      }
      const kimlik = await urunSrv.birlesimEkle(islem, kim, urun, {
        degerler,
        ...(stokKodu === undefined || stokKodu === null ? {} : { stokKodu }),
        ...(barkod === undefined || barkod === null ? {} : { barkod }),
      });
      birimler.set(satir.no, { kimlik, gorulenStok: 0 });
    }
  } else {
    // Yeni ürün: önce ürün (basit birimiyle), sonra seçenekler. İlk seçenek basit birimi ilk değerlerin birleşimine
    // çevirir (karar 0163); dosyada o birleşim yoksa birleşimler eklenmeden önce silinir (birleşim sınırı).
    const tek = ilk.yazilacak.secenekler.length === 0 ? ilk : undefined;
    urun = await urunSrv.urunEkle(islem, kim, {
      ad: ortak.ad ?? "",
      vergiSinifi: ilk.yazilacak.urun.vergiSinifi,
      ...(ilk.yazilacak.urun.kod === null ? {} : { adresAdi: ilk.yazilacak.urun.kod }),
      ...(ortak.durum === undefined ? {} : { durum: ortak.durum }),
      ...(ortak.kategoriler === undefined ? {} : { kategoriler: ortak.kategoriler }),
      ...(ortak.marka === undefined || ortak.marka === null ? {} : { marka: ortak.marka }),
      ...(ortak.etiketler === undefined ? {} : { etiketler: ortak.etiketler }),
      ...(ortak.ozellikler === undefined ? {} : { ozellikler: ortak.ozellikler }),
      ...(tek?.yazilacak.alanlar.stokKodu ? { stokKodu: tek.yazilacak.alanlar.stokKodu } : {}),
      ...(tek?.yazilacak.alanlar.barkod ? { barkod: tek.yazilacak.alanlar.barkod } : {}),
    });
    const okunan = await urunSrv.urunuOku(islem, urun);
    const ilkBirim = okunan?.birimler.find((b) => !b.silindi)?.kimlik;
    if (ilkBirim === undefined) throw new Error("Yeni ürünün birimi okunamadı.");
    if (tek !== undefined) {
      birimler.set(tek.no, { kimlik: ilkBirim, gorulenStok: 0 });
    } else {
      for (const secenek of ilk.yazilacak.secenekler) {
        await urunSrv.secenekEkle(islem, kim, urun, { ad: secenek.ad, degerler: secenek.degerler });
      }
      const secenekler =
        (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
      const degerKimlikleri = (birim: Yazilacak["birim"]) =>
        birim.tur === "yeni"
          ? birim.degerler.map(({ secenek: secenekAdi, deger }) => {
              const secenek = secenekler.find(
                (s) => s.ad.toLocaleLowerCase("tr") === secenekAdi.toLocaleLowerCase("tr"),
              );
              const kimlik = secenek?.degerler.find(
                (d) => d.ad.toLocaleLowerCase("tr") === deger.toLocaleLowerCase("tr"),
              )?.kimlik;
              if (kimlik === undefined) throw new Error("Yeni ürünün değeri okunamadı.");
              return kimlik;
            })
          : [];
      const ilkAnahtar = birlesimAnahtari(secenekler.map((s) => s.degerler[0]?.kimlik ?? ""));
      const ilkVar = satirlar.some(
        (s) => birlesimAnahtari(degerKimlikleri(s.yazilacak.birim)) === ilkAnahtar,
      );
      if (!ilkVar) await urunSrv.birlesimSil(islem, kim, ilkBirim);
      for (const satir of satirlar) {
        const degerler = degerKimlikleri(satir.yazilacak.birim);
        const { stokKodu, barkod } = satir.yazilacak.alanlar;
        const alanlar = {
          ...(stokKodu === undefined || stokKodu === null ? {} : { stokKodu }),
          ...(barkod === undefined || barkod === null ? {} : { barkod }),
        };
        if (ilkVar && birlesimAnahtari(degerler) === ilkAnahtar) {
          if (Object.keys(alanlar).length > 0)
            await urunSrv.birlesimDegistir(islem, kim, ilkBirim, alanlar);
          birimler.set(satir.no, { kimlik: ilkBirim, gorulenStok: 0 });
        } else {
          const kimlik = await urunSrv.birlesimEkle(islem, kim, urun, { ...alanlar, degerler });
          birimler.set(satir.no, { kimlik, gorulenStok: 0 });
        }
      }
    }
  }

  // Fiyat ve stok, her birimde kendi servisiyle.
  for (const satir of satirlar) {
    const birim = birimler.get(satir.no);
    if (birim === undefined) continue;
    const { fiyat, stok } = satir.yazilacak.alanlar;
    if (fiyat !== undefined) await fiyatSrv.fiyatYaz(islem, kim, birim.kimlik, fiyat);
    if (stok !== undefined) {
      await stokSrv.stokDuzelt(islem, kim, birim.kimlik, {
        yeniMiktar: stok,
        gorulenMiktar: birim.gorulenStok,
        sebep: "excel-ice-aktarma",
      });
    }
  }
};
