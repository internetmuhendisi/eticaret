// Panelin içindeki bildirimler gerçek veritabanıyla (kart 0280, karar 0198):
// - Karar 0154'ün her olayı panelde bildirim yazar, olayla aynı işlemde (geri alınan işlemde yok), aynı olay bir
//   yöneticiye bir kez; e-postası kapatılmış bildirim de yazılır (karar 0185). Elle sipariş ve mağazanın iptali yazmaz.
// - Alıcı kişidir: olayın iznine sahip silinmemiş yöneticiler (mağaza sahibi her şeyi, görevli sipariş, stok ve
//   yorumu, sipariş görevlisi yalnız siparişi, içerik editörü hiçbirini; kartla ödemenin ikisini yalnız mağaza
//   sahibi). Okurken izin yeniden sorulur: rolü değişen yönetici eski bildirimlerini görmez.
// - Okundu: tek bildirim, hepsi, başkasının kimliği; okunma anı değişmez; sayı.
// - Satır kişisel veri taşımaz; ekranın yazısı kayıttan kurulur, kişisel bilgisi silinmiş siparişte ad yoktur.
// - Temizlik okunduğu andan süre geçeni siler, okunmamışı bırakmaz değil: okunmamış kalır.
// - İzni olan yöneticiler sorgusu izin sorusuyla aynı cevabı verir; veritabanının bildirim listesi kayıtla aynıdır.

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { izinler } from "../../../kayitlar/izinler.ts";
import {
  type YoneticiBildirimi,
  yoneticiBildirimleri,
} from "../../../kayitlar/yonetici-bildirimi.ts";
import { takvimGunuYazisi } from "../../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { gizliGeciyor } from "../../../testler/gizli-deger.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import {
  panelBildiriminiKur,
  panelBildirimListesi,
} from "../../../yonetim-paneli/bildirimler/veri.ts";
import {
  izniOlanYoneticiler,
  rolleriAyarla,
  rolVer,
  tamYetkiliYoneticiAc,
  yoneticiHesabiKapat,
  yoneticininIzniVarMi,
  yoneticininYetkileri,
} from "../../ekip/servis.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { siparisAyarlari } from "../../siparis/ayarlar.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { iadeTalebiServisi } from "../../siparis/iade-talebi.ts";
import { havaleIptalTaramasi } from "../../siparis/iptal.ts";
import { siparisler } from "../../siparis/model.ts";
import { elleSiparisSemasi } from "../../siparis/semalar.ts";
import { siparisServisi } from "../../siparis/servis.ts";
import { kisiselVeriTemizligi } from "../../siparis/temizlik.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { yorumServisi } from "../../yorum/servis.ts";
import { panelBildirimleri } from "../model.ts";
import {
  gorulebilenBildirimler,
  okunanBildirimleriTemizle,
  okunduYap,
  okunmamisSayisi,
  panelBildirimleriniOku,
} from "../panel.ts";
import { yoneticiBildirimiYaz } from "../servis.ts";

vi.setConfig({ testTimeout: 120_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
const site: Site = {
  ...klasor,
  ayarlar: { ...klasor.ayarlar, epostaGonderenAdresi: "bildirim@ornek.test" },
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
    odemeYontemleri: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit", "kart"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [{ kimlik: firmaKimligi, ad: "Deneme Kargo" }],
    musteriIptali: "kargoya-verilene-kadar",
    dusukStokEsigi: 3,
    yorumYalnizSatinAlanlar: false,
  },
};
const odeme = odemeServisi(site);
const bicim = siteninBicimleyicisi(site.ayarlar);
const para = (kurus: number) => bicim.para(kurus);
const yonetim = siparisYonetimi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const sistem = () => ({ tur: "yonetici" as const, kimlik: randomUUID() });

// Rolleriyle yöneticiler: mağaza sahibi, görevli, sipariş görevlisi, içerik editörü.
const hazirla = async () => {
  vi.stubEnv("SITE_ADRESI", "");
  const deneme = await denemeSitesiAc("panel-bildirimi");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const { hesapKimligi: sahip } = await tamYetkiliYoneticiAc(
    vt,
    { eposta: `sahip-${randomUUID().slice(0, 8)}@ornek.test`, sifre: "uzun-bir-sifre-123" },
    sistem(),
  );
  const rolluAc = async (rol: string) => {
    const { hesapKimligi } = await hesapAc(vt, "yonetici", {
      eposta: `${rol}-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-sifre-123",
    });
    await rolVer(vt, { yoneticiKimligi: hesapKimligi, rolKodu: rol }, sistem());
    return hesapKimligi;
  };
  const kisiler = {
    sahip,
    gorevli: await rolluAc("gorevli"),
    siparisGorevlisi: await rolluAc("siparis-gorevlisi"),
    editor: await rolluAc("icerik-editoru"),
  };
  const urunAc = async (g: { ad?: string; miktar?: number } = {}) => {
    const urun = await urunSrv.urunEkle(vt, sistem(), {
      ad: g.ad ?? `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, sistem(), birim, { satisFiyati: 10_000 });
    await stok.stokDuzelt(vt, sistem(), birim, {
      yeniMiktar: g.miktar ?? 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, kisiler, urunAc, musteriAc };
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad: "Deniz",
      soyad: "Yılmaz",
      telefon: "0555 123 45 67",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Gizli Sokak No: 42",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });
const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi,
  ek: { musteri?: string } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? {
          tur: "misafir",
          eposta: `musteri-${randomUUID().slice(0, 8)}@ornek.test`,
          hesap: { ac: false },
        }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(vt, { kim, bilgiler: bilgiler(yontem), kalemler }, 3600);
  return sonuc.siparis.numara;
};

const siparisi = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

// Bir yöneticinin satırları (izinden bağımsız, veritabanında olduğu gibi).
const satirlari = (vt: Veritabani, yonetici: string) =>
  vt
    .select()
    .from(panelBildirimleri)
    .where(eq(panelBildirimleri.yonetici_kimligi, yonetici))
    .orderBy(panelBildirimleri.olusturma_zamani, panelBildirimleri.kimlik);
const turleri = async (vt: Veritabani, yonetici: string) =>
  (await satirlari(vt, yonetici)).map((s) => s.bildirim);
const oku = async (vt: Veritabani, yonetici: string) =>
  panelBildirimleriniOku(vt, yonetici, await yoneticininYetkileri(vt, yonetici));

describe("olaylar", () => {
  it("her olay panelde bildirim yazar; elle sipariş ve mağazanın iptali yazmaz; e-postası kapalı bildirim de yazılır", async () => {
    const h = await hazirla();
    const kim = sistem();
    // E-postası kapalı bildirimler de panelde görünür (karar 0185).
    await siparisAyarlari(site).yoneticiBildirimleriniKaydet(h.vt, kim, {
      alicilar: "",
      kapalilar: siparisAyarlari(site).gorunenBildirimler(),
    });
    const { urun, birim } = await h.urunAc({ ad: "Deneme Fincanı", miktar: 5 });
    // Yeni sipariş, düşük stok (5 → 3) ve havale bildirimi.
    const havaleli = await ver(h.vt, [{ birim, adet: 2 }], havale);
    const { eposta, toplam: havaleToplami } = await siparisi(h.vt, havaleli);
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta },
      {
        numara: havaleli,
        gonderen: "Deniz Yılmaz",
        hesap: site.baslangic.bankaHesaplari?.[0]?.kimlik ?? "",
        tutar: bicim.paraYazisi(havaleToplami),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    // İade talebi.
    const musteri = await h.musteriAc();
    const talepli = await ver(h.vt, [{ birim, adet: 1 }], kapida, { musteri });
    for (const [islem, gorulenDurum] of [
      ["hazirlamaya-al", "odeme-bekleniyor"],
      ["kargoya-ver", "hazirlaniyor"],
      ["teslim-edildi", "kargoda"],
    ] as const) {
      await yonetim.islemYap(h.vt, kim, {
        numara: talepli,
        islem,
        gorulenDurum,
        ...(islem === "kargoya-ver" ? { kargo: { firma: firmaKimligi } } : {}),
      });
    }
    await iadeTalebiServisi(site).talepAc(
      h.vt,
      { tur: "musteri", musteri },
      { numara: talepli, kalemler: [{ sira: 0, adet: 1 }], neden: "beden-uymadi" },
    );
    // Süresi dolan havalenin ve müşterinin iptali; stok 2 → 1 → 0 tükendi. Ödemesi bildirilmiş havale kendiliğinden
    // iptal olmaz: süresi dolan ayrı siparişle.
    const sureli = await ver(h.vt, [{ birim, adet: 1 }], havale);
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 second' where numara = ${sureli}`,
    );
    const musterininki = await ver(h.vt, [{ birim, adet: 1 }], kapida, { musteri });
    await iadeTalebiServisi(site).musteriIptali(
      h.vt,
      { tur: "musteri", musteri },
      { numara: musterininki, gorulenDurum: "odeme-bekleniyor" },
    );
    expect(await havaleIptalTaramasi(h.vt)).toBe(1);
    // Yorum.
    await yorumServisi(site).yorumYaz(h.vt, musteri, {
      urun,
      puan: 4,
      ad: "Ayşe Kaya",
      metin: "Kahve için ideal.",
    });
    // Mağazanın iptali ve elle sipariş bildirim yazmaz.
    const { birim: ikinci } = await h.urunAc();
    const magazaninki = await ver(h.vt, [{ birim: ikinci, adet: 1 }], kapida);
    const oncesi = (await satirlari(h.vt, h.kisiler.sahip)).length;
    await iadeServisi(site).iadeYap(h.vt, kim, {
      numara: magazaninki,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "stok-yok",
    });
    await odeme.elleSiparisVer(
      h.vt,
      randomUUID(),
      elleSiparisSemasi.parse({
        musteri: { tur: "misafir", eposta: "elle@ornek.test" },
        kalemler: [{ birim: ikinci, adet: 1 }],
        bilgiler: {
          odemeYontemi: havale,
          teslimat: bilgiler(havale).teslimat,
          fatura: { tur: "bireysel", adresAyni: true },
          metinlerIletildi: true,
        },
        musteriyeEposta: true,
      }),
    );
    expect((await satirlari(h.vt, h.kisiler.sahip)).length).toBe(oncesi);

    const sahipinkiler = await turleri(h.vt, h.kisiler.sahip);
    expect([...new Set(sahipinkiler)].sort()).toEqual(
      ["havale-bildirimi", "iade-talebi", "iptal", "stok", "yeni-siparis", "yorum"].sort(),
    );
    expect(sahipinkiler.filter((b) => b === "iptal")).toHaveLength(2);
    // Stok: 5 → 3 düşük, 2 → 1 ve 1 → 0: yalnız 0'a inen tükendi uyarır (her uyarı ayrı bildirim).
    const stoklar = (await satirlari(h.vt, h.kisiler.sahip)).filter((s) => s.bildirim === "stok");
    expect(stoklar.map((s) => s.ozet)).toEqual([
      { tur: "dusuk", miktar: 3 },
      { tur: "tukendi", miktar: 0 },
    ]);
    expect(stoklar.every((s) => s.kayit_kimligi === birim)).toBe(true);

    // Ekranın yazısı kayıttan kurulur.
    const liste = await panelBildirimListesi(h.vt, h.kisiler.sahip, site);
    expect(liste.okunmamis).toBe(sahipinkiler.length);
    const basliklar = liste.bildirimler.map((b) => b.baslik);
    expect(basliklar).toContain(`Yeni sipariş: ${havaleli}`);
    expect(basliklar).toContain(`Havale bildirildi: ${havaleli}`);
    expect(basliklar).toContain(`İade talebi: ${talepli}`);
    expect(basliklar).toContain(`Sipariş iptal edildi: ${musterininki}`);
    expect(basliklar).toContain("Stok azaldı: Deneme Fincanı");
    expect(basliklar).toContain("Tükendi: Deneme Fincanı");
    expect(basliklar).toContain("Yorum onay bekliyor");
    const yeni = liste.bildirimler.find((b) => b.baslik === `Yeni sipariş: ${havaleli}`);
    expect(yeni?.alt).toBe(`Deniz Y. · ${para(havaleToplami)} · Havale / EFT`);
    expect(yeni?.adres).toBe(`/yonetim/siparisler/ayrinti?numara=${encodeURIComponent(havaleli)}`);
    expect(liste.bildirimler.find((b) => b.baslik === "Yorum onay bekliyor")?.alt).toBe(
      "Deneme Fincanı · 4 yıldız",
    );
    expect(liste.bildirimler.find((b) => b.baslik === "Tükendi: Deneme Fincanı")?.adres).toBe(
      `/yonetim/urunler/urun?kimlik=${urun}`,
    );
    expect(
      liste.bildirimler.find((b) => b.baslik === `Sipariş iptal edildi: ${musterininki}`)?.alt,
    ).toBe("Deniz Y. · Müşteri iptal etti");
  });

  it("satır kişisel veri taşımaz; kişisel bilgisi silinmiş siparişte ad yazılmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const { eposta, toplam } = await siparisi(h.vt, numara);
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta },
      {
        numara,
        gonderen: "Deniz Yılmaz",
        hesap: site.baslangic.bankaHesaplari?.[0]?.kimlik ?? "",
        tutar: bicim.paraYazisi(toplam),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    const satirlar = await satirlari(h.vt, h.kisiler.sahip);
    expect(satirlar).toHaveLength(2);
    const yazi = JSON.stringify(satirlar);
    for (const gizli of [eposta, "Deniz", "Yılmaz", "Gizli Sokak", "555 123 45 67", "06420"]) {
      expect(gizliGeciyor(yazi, gizli), gizli).toBe(false);
    }
    expect(
      (await panelBildirimListesi(h.vt, h.kisiler.sahip, site)).bildirimler.map((b) => b.alt),
    ).toEqual([`Deniz Y. · ${para(toplam)}`, `Deniz Y. · ${para(toplam)} · Havale / EFT`]);
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${site.ayarlar.kisiselVeriSaklamaYili}, days => 1) where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    const sonra = (await panelBildirimListesi(h.vt, h.kisiler.sahip, site)).bildirimler;
    expect(sonra.map((b) => b.alt)).toEqual([para(toplam), `${para(toplam)} · Havale / EFT`]);
    expect(sonra.map((b) => b.baslik)).toEqual([
      `Havale bildirildi: ${numara}`,
      `Yeni sipariş: ${numara}`,
    ]);
  });

  it("olayla aynı işlemde: geri alınan işlemde satır yok; aynı olay bir kez", async () => {
    const h = await hazirla();
    const veri = { gun: "2026-11-20", sayi: 2 };
    await expect(
      h.vt.transaction(async (islem) => {
        await yoneticiBildirimiYaz(islem, {
          bildirim: "kartla-odeme-uyusmazligi",
          anahtar: "deneme:geri-alinan",
          kayit: null,
          veri,
        });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await satirlari(h.vt, h.kisiler.sahip)).toEqual([]);
    for (let i = 0; i < 2; i++) {
      await yoneticiBildirimiYaz(h.vt, {
        bildirim: "kartla-odeme-uyusmazligi",
        anahtar: "deneme:iki-kez",
        kayit: null,
        veri,
      });
    }
    const satirlar = await satirlari(h.vt, h.kisiler.sahip);
    expect(satirlar.map((s) => [s.bildirim, s.ozet])).toEqual([["kartla-odeme-uyusmazligi", veri]]);
    const [bildirim] = (await panelBildirimListesi(h.vt, h.kisiler.sahip, site)).bildirimler;
    expect(bildirim?.baslik).toBe("Kartla ödemeler kuruluşun kaydıyla uyuşmuyor");
    expect(bildirim?.alt).toBe(
      `${takvimGunuYazisi(site.ayarlar.dil, "2026-11-20", "kisa")} · 2 ödeme`,
    );
  });
});

describe("alıcılar ve izin", () => {
  it("olayın iznine sahip yöneticiler; kartla ödemenin ikisi yalnız mağaza sahibine; silinmiş yöneticiye yazılmaz", async () => {
    const h = await hazirla();
    const kapatilan = await hesapAc(h.vt, "yonetici", {
      eposta: `kapatilan-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-sifre-123",
    });
    await rolVer(h.vt, { yoneticiKimligi: kapatilan.hesapKimligi, rolKodu: "gorevli" }, sistem());
    await yoneticiHesabiKapat(
      h.vt,
      { yoneticiKimligi: kapatilan.hesapKimligi },
      { tur: "yonetici", kimlik: h.kisiler.sahip },
    );
    const { urun, birim } = await h.urunAc({ miktar: 4 });
    const numara = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const musteri = await h.musteriAc();
    await yorumServisi(site).yorumYaz(h.vt, musteri, {
      urun,
      puan: 5,
      ad: "Ayşe Kaya",
      metin: "Güzel.",
    });
    const { kimlik: siparis } = await siparisi(h.vt, numara);
    await yoneticiBildirimiYaz(h.vt, {
      bildirim: "bekleyen-iade",
      anahtar: "deneme:bekleyen",
      kayit: siparis,
      veri: { numara, neden: "kismi-red" },
    });
    await yoneticiBildirimiYaz(h.vt, {
      bildirim: "kartla-odeme-uyusmazligi",
      anahtar: "deneme:uyusmazlik",
      kayit: null,
      veri: { gun: "2026-11-20", sayi: 1 },
    });
    const sirali = async (k: string) => [...(await turleri(h.vt, k))].sort();
    expect(await sirali(h.kisiler.sahip)).toEqual(
      ["bekleyen-iade", "kartla-odeme-uyusmazligi", "stok", "yeni-siparis", "yorum"].sort(),
    );
    expect(await sirali(h.kisiler.gorevli)).toEqual(["stok", "yeni-siparis", "yorum"]);
    expect(await sirali(h.kisiler.siparisGorevlisi)).toEqual(["yeni-siparis"]);
    expect(await sirali(h.kisiler.editor)).toEqual([]);
    expect(await sirali(kapatilan.hesapKimligi)).toEqual([]);
    // Bekleyen iadenin yazısı.
    const bekleyen = (await panelBildirimListesi(h.vt, h.kisiler.sahip, site)).bildirimler.find(
      (b) => b.baslik === `Kartla iade takıldı: ${numara}`,
    );
    expect(bekleyen?.alt).toBe("Bir kısmını kuruluş reddetti, elle bakın");
  });

  it("okurken izin yeniden sorulur: rolü değişen yönetici eski bildirimlerini görmez, okundu yapamaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const gorevli = h.kisiler.gorevli;
    expect((await oku(h.vt, gorevli)).okunmamis).toBe(1);
    await rolleriAyarla(
      h.vt,
      { yoneticiKimligi: gorevli, roller: ["icerik-editoru"] },
      { tur: "yonetici", kimlik: h.kisiler.sahip },
    );
    expect(await oku(h.vt, gorevli)).toEqual({ okunmamis: 0, satirlar: [] });
    const yetkili = await yoneticininYetkileri(h.vt, gorevli);
    expect(await okunduYap(h.vt, gorevli, yetkili, { hepsi: true })).toBe(0);
    // Satır yerinde kalır: rolü geri verilince görünür.
    expect(await turleri(h.vt, gorevli)).toEqual(["yeni-siparis"]);
    await rolleriAyarla(
      h.vt,
      { yoneticiKimligi: gorevli, roller: ["gorevli"] },
      { tur: "yonetici", kimlik: h.kisiler.sahip },
    );
    expect((await oku(h.vt, gorevli)).okunmamis).toBe(1);
  });

  it("izni olan yöneticiler her izinde izin sorusuyla aynı", async () => {
    const h = await hazirla();
    const kisiler = Object.values(h.kisiler);
    const yoneticiIzinleri = Object.entries(izinler)
      .filter(([, tanim]) => tanim.giris === "yonetici")
      .map(([ad]) => ad as Parameters<typeof izniOlanYoneticiler>[1]);
    for (const izin of yoneticiIzinleri) {
      const olanlar = await izniOlanYoneticiler(h.vt, izin);
      for (const kisi of kisiler) {
        expect(olanlar.includes(kisi), `${izin} ${kisi}`).toBe(
          await yoneticininIzniVarMi(h.vt, kisi, izin),
        );
      }
    }
  });
});

describe("okundu ve temizlik", () => {
  it("tek bildirim, hepsi, başkasının kimliği; okunma anı değişmez; sayı", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    for (let i = 0; i < 3; i++) await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const sahip = h.kisiler.sahip;
    const yetkili = await yoneticininYetkileri(h.vt, sahip);
    const { satirlar, okunmamis } = await oku(h.vt, sahip);
    expect(okunmamis).toBe(3);
    const [ilk, ikinci] = satirlar;
    if (ilk === undefined || ikinci === undefined) throw new Error("Bildirim yok.");
    // Başkasının satırı (görevlininki) sahibin kimliğiyle değişmez, tersi de.
    const gorevlininki = (await satirlari(h.vt, h.kisiler.gorevli))[0]?.kimlik ?? "";
    expect(await okunduYap(h.vt, sahip, yetkili, { kimlik: gorevlininki })).toBe(0);
    expect((await oku(h.vt, h.kisiler.gorevli)).okunmamis).toBe(3);
    expect(await okunduYap(h.vt, sahip, yetkili, { kimlik: "bozuk" })).toBe(0);

    expect(await okunduYap(h.vt, sahip, yetkili, { kimlik: ilk.kimlik })).toBe(1);
    expect(await okunmamisSayisi(h.vt, sahip, yetkili)).toBe(2);
    const [okunan] = await h.vt
      .select()
      .from(panelBildirimleri)
      .where(eq(panelBildirimleri.kimlik, ilk.kimlik));
    // İkinci kez okundu yapılınca anı değişmez.
    expect(await okunduYap(h.vt, sahip, yetkili, { kimlik: ilk.kimlik })).toBe(0);
    expect(await okunduYap(h.vt, sahip, yetkili, { hepsi: true })).toBe(2);
    const [sonra] = await h.vt
      .select()
      .from(panelBildirimleri)
      .where(eq(panelBildirimleri.kimlik, ilk.kimlik));
    expect(sonra?.okunma_zamani).toEqual(okunan?.okunma_zamani);
    const listesi = await oku(h.vt, sahip);
    expect(listesi.okunmamis).toBe(0);
    expect(listesi.satirlar.every((s) => s.okundu)).toBe(true);
    // Okunmuş bildirim listede kalır, en yeni önce.
    expect(listesi.satirlar.map((s) => s.kimlik)[0]).toBe(ilk.kimlik);
  });

  it("temizlik okunduğu andan süre geçeni siler; okunmamış kalır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    for (let i = 0; i < 3; i++) await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const sahip = h.kisiler.sahip;
    const [eski, yeni, okunmamis] = await satirlari(h.vt, sahip);
    if (eski === undefined || yeni === undefined || okunmamis === undefined) throw new Error();
    await h.vt.execute(
      sql`update panel_bildirimleri set olusturma_zamani = now() - interval '400 days' where yonetici_kimligi = ${sahip}`,
    );
    await h.vt.execute(
      sql`update panel_bildirimleri set okunma_zamani = now() - interval '30 days 1 second' where kimlik = ${eski.kimlik}`,
    );
    await h.vt.execute(
      sql`update panel_bildirimleri set okunma_zamani = now() - interval '29 days 23 hours' where kimlik = ${yeni.kimlik}`,
    );
    expect(await okunanBildirimleriTemizle(h.vt, 30)).toBe(1);
    expect((await satirlari(h.vt, sahip)).map((s) => s.kimlik).sort()).toEqual(
      [yeni.kimlik, okunmamis.kimlik].sort(),
    );
    expect(
      await h.vt
        .select()
        .from(panelBildirimleri)
        .where(
          and(
            eq(panelBildirimleri.yonetici_kimligi, sahip),
            eq(panelBildirimleri.kimlik, eski.kimlik),
          ),
        ),
    ).toEqual([]);
  });
});

describe("kayıt", () => {
  it("veritabanının bildirim listesi kayıtla aynı; görülebilen türler izinden", async () => {
    const h = await hazirla();
    const {
      rows: [satir],
    } = await h.vt.execute<{ tanim: string }>(
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'panel_bildirimleri_bildirim'`,
    );
    const listede = [...(satir?.tanim ?? "").matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect([...listede].sort()).toEqual([...yoneticiBildirimleri].sort());
    const gorevli = await yoneticininYetkileri(h.vt, h.kisiler.gorevli);
    expect(gorulebilenBildirimler(gorevli).sort()).toEqual(
      (
        [
          "havale-bildirimi",
          "iade-talebi",
          "iptal",
          "stok",
          "yeni-siparis",
          "yorum",
        ] satisfies YoneticiBildirimi[]
      ).sort(),
    );
  });

  it("panelBildiriminiKur her türü yazar (kayıt bulunamazsa da)", () => {
    const an = new Date("2026-11-20T09:00:00Z");
    const simdi = new Date("2026-11-20T09:05:00Z");
    for (const bildirim of yoneticiBildirimleri) {
      const ozetler: Record<YoneticiBildirimi, Record<string, unknown>> = {
        "yeni-siparis": {},
        "havale-bildirimi": { tutar: 100 },
        "iade-talebi": { adet: 2 },
        iptal: { neden: "havale-suresi-doldu" },
        stok: { tur: "dusuk", miktar: 2 },
        yorum: { puan: 3 },
        "kartla-odeme-uyusmazligi": { gun: "2026-11-20", sayi: 1 },
        "bekleyen-iade": { neden: "raporda-yok" },
      };
      const sonuc = panelBildiriminiKur(
        {
          kimlik: randomUUID(),
          bildirim,
          an,
          okundu: false,
          ozet: ozetler[bildirim],
          kayit: null,
        } as Parameters<typeof panelBildiriminiKur>[0],
        simdi,
        site,
      );
      expect(sonuc.baslik, bildirim).not.toBe("");
      expect(sonuc.zaman).toBe("5 dk. önce");
      expect(sonuc.adres.startsWith("/yonetim/")).toBe(true);
    }
  });
});
