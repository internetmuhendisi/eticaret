// Geliştirme taraması (kart 0251, karar 0184): uygulamanın sayfaları geliştirme sunucusunda gerçek tarayıcıda açılır.
// Konsolda hata, yakalanmamış hata ve hidrasyon uyarısı olmamalıdır. React'ın yalnız geliştirmede yazdığı uyarılar
// (eksik ya da yinelenen anahtar, geçersiz iç içe öğe, denetimli ve denetimsiz alan, hidrasyon farkı) canlı derlemede
// yazılmaz; tarayıcı testleri canlıdaki gibi derlenmiş sunucuda çalıştığı için bu uyarılar bu taramayla yakalanır.
//
// Sayfalar gerçek veriyle açılır: değişken parçalı sayfanın örnek değerli adresi (isinma.ts) yalnız bulunamadı
// sayfasını çizer. Bu yüzden vitrinin her sayfa türü sitenin kataloğundaki kayıtla (vitrin-sayfalari.ts), bileşen
// kataloğunun her parçası kendi sayfasıyla, panelin ayrıntı ekranları veritabanındaki ilk kayıtla açılır (sipariş ve
// müşteri ekranı yalnız kayıt varsa: hatta asıl aşamanın testleri yazmıştır). Sayfa listeleri uygulamanın
// klasöründen ve kayıtlardan okunur: yeni sayfa kendiliğinden taramaya girer, yeni ayrıntı ekranı buraya eklenir.
//
// Tarama aynı zamanda sayfaları derletir (eski ısınmanın tarayıcı turu, kart 0164): geliştirme aşamasının öteki
// testleri bundan sonra çalışır (playwright.gelistirme.config.ts). Önce girişsiz sayfalar; sonra deneme yöneticisi
// şifre ve iki aşamalı kurulumdan geçer (kurulum sayfası), panelin her sayfasını açar; sonra kurulumu bitmiş hesapla
// yeniden girer (giriş kodu sayfası).
//
// Yalnız sayfa açılışını ölçer: açılır pencere ya da form gibi etkileşimlerde ve React'ın çift çiziminde (StrictMode)
// çıkan sorunlar yalnız geliştirme aşamasındaki etiketli testlerde ölçülür, öteki etkileşimlerde yalnız disiplindir.
import { expect, test } from "@playwright/test";
import { and, asc, eq, isNull } from "drizzle-orm";
import { katalogAdresi, katalogParcalari } from "../../katalog/kayit";
import { yoneticiler } from "../../moduller/ekip/model";
import { blogYazilari, sabitSayfalar } from "../../moduller/icerik/model";
import { musteriler } from "../../moduller/musteri/model";
import { siparisler } from "../../moduller/siparis/model";
import { urunler } from "../../moduller/urun/model";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import {
  blogYazisiEkraniAdresi,
  ekipKisiAdresi,
  musteriAyrintisiAdresi,
  sayfaEkraniAdresi,
  siparisAyrintisiAdresi,
  siparisFisiAdresi,
  urunEkraniAdresi,
} from "../../yonetim-paneli/adresler";
import { yalnizGelistirmedeEtiketi } from "./gelistirme-etiketleri";
import { girissizSayfalar, panelAdresleri } from "./isinma";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { ekranSayfalari } from "./vitrin-sayfalari";
import { paneleGir, sifreyleGir, yoneticiAc } from "./yonetici";

// İlk derleme hattın makinesinde 10 saniyeyi geçebilir (hat 45665957128); her adım derlemeyi bekleyecek kadar uzun.
const derlemeSuresi = 120_000;

// Taramanın istemci adresi testlerin kullanmadığı bloktadır (isinma.ts ile aynı kural): giriş ucunun sınırını
// testlerle paylaşmaz.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "192.0.2.8" } });

const vitrinSayfalari = (): string[] => [
  ...new Set([
    ...girissizSayfalar(),
    ...Object.values(ekranSayfalari).map(({ adres }) => adres),
    ...katalogParcalari.map(({ kod }) => `${katalogAdresi}/${kod}`),
  ]),
];

// Panelin ayrıntı ekranları: her birinin veritabanındaki ilk silinmemiş kaydı.
const panelAyrintilari = async (yoneticiEpostasi: string): Promise<string[]> => {
  const vt = baglan(veritabaniAdresi());
  const [urun] = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(isNull(urunler.silinme_zamani))
    .orderBy(asc(urunler.kimlik))
    .limit(1);
  const [yazi] = await vt
    .select({ kimlik: blogYazilari.kimlik })
    .from(blogYazilari)
    .where(isNull(blogYazilari.silinme_zamani))
    .limit(1);
  const [sayfa] = await vt
    .select({ kimlik: sabitSayfalar.kimlik })
    .from(sabitSayfalar)
    .where(isNull(sabitSayfalar.silinme_zamani))
    .limit(1);
  const [yonetici] = await vt
    .select({ kimlik: yoneticiler.kimlik })
    .from(yoneticiler)
    .where(and(eq(yoneticiler.eposta, yoneticiEpostasi), isNull(yoneticiler.silinme_zamani)))
    .limit(1);
  const [musteri] = await vt
    .select({ kimlik: musteriler.kimlik })
    .from(musteriler)
    .where(isNull(musteriler.silinme_zamani))
    .limit(1);
  const [siparis] = await vt
    .select({ numara: siparisler.numara })
    .from(siparisler)
    .where(isNull(siparisler.kisisel_veri_silinme_zamani))
    .limit(1);
  return [
    ...(urun ? [urunEkraniAdresi(urun.kimlik)] : []),
    ...(yazi ? [blogYazisiEkraniAdresi(yazi.kimlik)] : []),
    ...(sayfa ? [sayfaEkraniAdresi(sayfa.kimlik)] : []),
    ...(yonetici ? [ekipKisiAdresi(yonetici.kimlik)] : []),
    ...(musteri ? [musteriAyrintisiAdresi(musteri.kimlik)] : []),
    ...(siparis
      ? [siparisAyrintisiAdresi(siparis.numara), siparisFisiAdresi([siparis.numara], false)]
      : []),
  ];
};

test("geliştirme sunucusunda her sayfa konsolda hata ve hidrasyon uyarısı olmadan açılır", {
  tag: yalnizGelistirmedeEtiketi,
}, async ({ page }) => {
  const vitrin = vitrinSayfalari();
  const yonetici = yoneticiAc();
  const panel = [...panelAdresleri(), ...(await panelAyrintilari(yonetici.eposta))];
  test.setTimeout(derlemeSuresi * (vitrin.length + panel.length + 4));
  page.setDefaultTimeout(derlemeSuresi);

  // Konsol bütün tarama boyunca dinlenir: sayfa bağlandıktan sonra tarayıcıda gelen veriyle çizilen listelerin
  // iletisi de sayılır. İleti, sayfa bağlandığında okunan adrese yazılır; geç gelen ileti sonraki adrese düşer.
  const iletiler = konsoluDinle(page);
  const hatalar: string[] = [];
  let okunan = 0;
  const sayfayiTara = async (adres: string) => {
    const yanit = await page.goto(adres, { timeout: derlemeSuresi });
    await sayfaHazir(page, { sure: derlemeSuresi });
    const yeni = iletiler.slice(okunan);
    okunan = iletiler.length;
    // Bulunamadı sayfasının kendi 404'ü beklenir: yalnız o bir ileti ayıklanır, sayfadaki başka 404 kalır.
    const belgeninIletisi =
      yanit?.status() === 404
        ? yeni.findIndex((ileti) => /^Failed to load resource: .*status of 404/.test(ileti))
        : -1;
    hatalar.push(
      ...yeni.filter((_, sira) => sira !== belgeninIletisi).map((ileti) => `${adres}: ${ileti}`),
    );
  };

  const [ilkSayfa, ...otekiler] = vitrin;
  if (ilkSayfa === undefined) throw new Error("Taranacak vitrin sayfası yok.");
  await sayfayiTara(ilkSayfa);
  // Tarama geliştirme sunucusunda olmalıdır: canlı derlemede geliştirme uyarısı yazılmaz, tarama boş yere yeşil
  // kalırdı (3000 portunda başka bir sunucu açık kalırsa ayar onu kullanır). Geliştirme göstergesi yalnız
  // geliştirme sunucusunun sayfasındadır.
  await expect(page.locator("nextjs-portal")).toHaveCount(1);
  for (const adres of otekiler) await sayfayiTara(adres);

  await paneleGir(page, yonetici, { beklemeSuresi: derlemeSuresi });
  for (const adres of panel) await sayfayiTara(adres);

  await page.context().clearCookies();
  await page.goto("/yonetim/giris");
  await sifreyleGir(page, yonetici);
  await expect(page).toHaveURL(/\/yonetim\/giris\/kod/, { timeout: derlemeSuresi });
  await sayfaHazir(page, { sure: derlemeSuresi });
  hatalar.push(...iletiler.slice(okunan).map((ileti) => `/yonetim/giris/kod: ${ileti}`));

  expect(hatalar).toEqual([]);
});
