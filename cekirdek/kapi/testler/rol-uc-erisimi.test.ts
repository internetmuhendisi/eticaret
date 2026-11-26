// Her rolün her uçtaki erişimi, gerçek veritabanıyla (kart 0030, karar 0047, .claude/rules/yetki.md).
// Uç listesi uygulamanın adres dosyalarından okunur, kimse elle yazmaz. Makinenin gerçekten yakaladığı,
// yalnız bu testte duran örnek uçlarla gösterilir (ornek-adresler/): uygulamada yönetici ve müşteri ucu
// azdır (kart 0113'ten beri tema uçları).
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { stokBildirimiTalepleri } from "../../eklentiler/stoga-gelince-haber-ver/model.ts";
import { stokBildirimiServisi } from "../../eklentiler/stoga-gelince-haber-ver/servis.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { belgeKaydet } from "../../moduller/dosya/servis.ts";
import { baslangicRolleri } from "../../moduller/ekip/baslangic-rolleri.ts";
import { favoriler } from "../../moduller/favori/model.ts";
import { favoriServisi } from "../../moduller/favori/servis.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { adresServisi } from "../../moduller/musteri/adres.ts";
import { adresFormuSemasi } from "../../moduller/musteri/adres-semalari.ts";
import { musteriAdresleri, musteriler, musteriOnaylari } from "../../moduller/musteri/model.ts";
import { odemeOturumlari } from "../../moduller/odeme/model.ts";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { sifreDogrula } from "../../moduller/oturum/sifre.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { siparisFaturaServisi } from "../../moduller/siparis/fatura.ts";
import {
  havaleBildirimleri,
  siparisIadeTalepleri,
  siparisler,
} from "../../moduller/siparis/model.ts";
import { stokAyirmalari } from "../../moduller/stok/model.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { yorumlar } from "../../moduller/yorum/model.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { DosyaYaniti, dosyaYanitla, hataliYanit } from "../zarf.ts";
import {
  belgedekiIzinler,
  erisebilirMi,
  erisimleriDene,
  type KayitliUc,
  kapiDisiAdresler,
  kisiler,
  oturumCerezi,
  uclariOku,
  uygulamaAdresleri,
} from "./erisim-denemesi.ts";

const ornekler = join(import.meta.dirname, "ornek-adresler");
const belge = readFileSync(join(import.meta.dirname, "..", "uclar.md"), "utf8");

const belgeUret = (satirlar: Record<string, string>): string =>
  Object.entries(satirlar)
    .map(([baslik, izin]) => `### ${baslik}\n\n- İzin: \`${izin}\`. Sınır: \`genel\`.\n`)
    .join("\n");

// Müşteri girişindeki her uç burada başka müşterinin kaydını isteyen bir senaryo yazar: kapı kaydın kime
// ait olduğunu bilemez, süzmek ucun işidir (karar 0040). Senaryosu olmayan uç testi kırmızıya düşürür.
// Senaryo A'nın oturumuyla B'nin kaydını ister. İstek gerçekten işlenmeli (200): reddedilen ya da şemadan
// geçmeyen istek hiçbir şey kanıtlamaz. Senaryo B'ye veri hazırlayıp aranan değerleri verir (adres, sipariş
// gibi); verilmezse B'nin e-postası aranır. Yazma yapan uçta B'nin kaydının değişmediğini ucu yazan ölçer.
// Kaydı kimliğiyle hedefleyen uçta (adres değiştir, sil, varsayılan yap; kart 0237) B'nin kaydı A için yoktur:
// senaryo beklenen durumu (404) verir ve B'nin kaydının değişmediğini ucu yazan ölçer.
type Musteri = { kimlik: string; eposta: string };
type MusteriSenaryosu = (
  b: Musteri,
  a: Musteri,
) => Promise<{
  sorgu?: string;
  govde?: unknown;
  aranan?: string[];
  durum?: number;
}>;
const musteriSenaryolari: Record<string, MusteriSenaryosu> = {
  // Uç girdi almaz, kimliği yalnız kapıdan okur: A kendi e-postasını görür, B'ninkini göremez.
  "GET /kapi/musteri/hesabim": async () => ({}),
  // B ürüne yorum yazmış; A aynı ürünü sorar. Cevap A'nındır: "yazabilir". B'nin yorumuna bakılsaydı
  // "yorum-yazildi" dönerdi.
  "GET /kapi/musteri/yorum-izni": async (b) => {
    const urun = await yorumluUrun(b.kimlik);
    return { sorgu: `?urun=${urun}`, aranan: [b.eposta, "yorum-yazildi"] };
  },
  // B ürüne yorum yazmış; A aynı ürüne yazar ve yazabilir (B'nin yorumu A'nınki sayılmaz). B'nin yorumu
  // değişmez (aşağıdaki test ölçer).
  "POST /kapi/musteri/yorum": async (b) => {
    const urun = await yorumluUrun(b.kimlik);
    return {
      govde: {
        urun,
        puan: 4,
        metin: "A'nın yorumu",
        ad: "Deneme Müşteri",
        robotCevabi: await soruyuCoz(await robotSorusuUret()),
      },
    };
  },
  // B'nin favorisi var; A kendi listesini ister. B'nin ürünü A'nın listesinde görünmez.
  "GET /kapi/musteri/favoriler": async (b) => {
    const urun = await favoriUrunu(b.kimlik);
    return { aranan: [b.eposta, urun] };
  },
  // A, B'nin favorisindeki ürünü çıkarmaya çalışır: yalnız kendi listesinden çıkar (zaten yok). B'nin favorisi
  // yerinde kalır (aşağıdaki test ölçer).
  "POST /kapi/musteri/favori": async (b) => {
    const urun = await favoriUrunu(b.kimlik);
    return { govde: { urun, favoride: false }, aranan: [b.eposta, urun] };
  },
  // A başka bir ürünü birleştirir: cevap yalnız A'nın listesidir, B'nin ürünü yoktur, B'ninki değişmez.
  // B tükenmiş birim için talep bırakmış; A aynı birimi ister. Talep A'nın hesabının e-postasıyla yazılır, B'nin
  // talebi değişmez (ucu yazan aşağıda ölçer).
  "POST /kapi/musteri/stok-bildirimi": async (b) => {
    const birim = await talepliBirim(b.eposta);
    return { govde: { birim } };
  },
  // A ve B'nin havale siparişi var; A kendi siparişini bildirir. Yanıtta B'nin numarası ve e-postası yoktur; A'nın
  // B'nin numarasıyla gönderdiği bildirim bulunamaz, B'nin siparişine bildirim yazılmaz (aşağıdaki test ölçer).
  "POST /kapi/musteri/havale-bildirimi": async (b, a) => {
    const bninki = await siparisVer(b.kimlik);
    const aninki = await siparisVer(a.kimlik);
    return { govde: havaleBildirimi(aninki), aranan: [b.eposta, bninki] };
  },
  // Kart 0239: A, B'nin siparişine iade talebi açmaya ve onu iptal etmeye çalışır: sipariş A için yoktur (404); B'nin
  // siparişine talep yazılmaz, sipariş iptal olmaz (aşağıdaki test ölçer).
  "POST /kapi/musteri/iade-talebi": async (b) => {
    const bninki = await siparisVer(b.kimlik);
    return {
      govde: { numara: bninki, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" },
      aranan: [b.eposta, bninki],
      durum: 404,
    };
  },
  "POST /kapi/musteri/siparis-iptali": async (b) => {
    const bninki = await siparisVer(b.kimlik);
    return {
      govde: { numara: bninki, gorulenDurum: "odeme-bekleniyor" },
      aranan: [b.eposta, bninki],
      durum: 404,
    };
  },
  // B'nin siparişinin faturası dosyalı (kart 0268); A, B'nin numarasıyla ister: bulunamadı, dosya gelmez.
  "GET /kapi/musteri/siparis-faturasi": async (b) => {
    const bninki = await siparisVer(b.kimlik);
    const dosya = await belgeKaydet(vt, Buffer.from(`%PDF-1.7\n${b.eposta}\n%%EOF\n`, "latin1"));
    if (!dosya.tamam) throw new Error(dosya.hata);
    await siparisFaturaServisi(denemeSitesi()).yaz(vt, sistemIslemi("test"), {
      numara: bninki,
      gorulen: null,
      fatura: { numara: `F-${bninki}`, tarih: "2026-11-17", dosya: dosya.dosya.kimlik },
      eposta: false,
    });
    return { sorgu: `?numara=${bninki}`, aranan: [b.eposta, `F-${bninki}`], durum: 404 };
  },
  // B'nin siparişi ayırt edilebilir bir adla teslim ediliyor; A'nın siparişi yok: A'ya öneri boş gelir.
  "GET /kapi/musteri/son-teslimat": async (b) => {
    const ad = `B${randomBytes(4).toString("hex")}`;
    await siparisVer(b.kimlik, ad);
    return { aranan: [b.eposta, ad] };
  },
  "POST /kapi/musteri/favori-birlestir": async (b) => {
    const urun = await favoriUrunu(b.kimlik);
    return { govde: { urunler: [await yayindakiUrun()] }, aranan: [b.eposta, urun] };
  },
  // B'nin ödeme oturumu birimin bir adedini ayırmış (stok 2); A bir önceki oturum olarak B'ninkini verir. A'nın
  // oturumu kendi hesabına açılır, B'nin oturumu ve ayırması silinmez (aşağıdaki test ölçer), yanıtta B yoktur.
  // B'nin ayırt edilebilir adlı adresi var; A kendi defterini ister: B'nin adresi görünmez (kart 0237).
  "GET /kapi/musteri/adresler": async (b) => {
    const { ad } = await adresliMusteri(b.kimlik);
    return { aranan: [b.eposta, ad] };
  },
  // A kendi adresini ekler: cevap yalnız A'nın defteridir. B'nin adresi değişmez (aşağıdaki test ölçer).
  "POST /kapi/musteri/adres": async (b) => {
    const { ad } = await adresliMusteri(b.kimlik);
    return { govde: adresGirdisi("A"), aranan: [b.eposta, ad] };
  },
  // A, B'nin adresini kimliğiyle değiştirmeye, silmeye ve varsayılan yapmaya çalışır: adres A için yoktur (404),
  // B'nin adresi değişmez (aşağıdaki test ölçer).
  "POST /kapi/musteri/adres-degistir": async (b) => {
    const { ad, kimlik } = await adresliMusteri(b.kimlik);
    return { govde: { kimlik, ...adresGirdisi("A") }, aranan: [b.eposta, ad], durum: 404 };
  },
  "POST /kapi/musteri/adres-sil": async (b) => {
    const { ad, kimlik } = await adresliMusteri(b.kimlik);
    return { govde: { kimlik }, aranan: [b.eposta, ad], durum: 404 };
  },
  "POST /kapi/musteri/adres-varsayilan": async (b) => {
    const { ad, kimlik } = await adresliMusteri(b.kimlik);
    return { govde: { kimlik, turler: ["teslimat"] }, aranan: [b.eposta, ad], durum: 404 };
  },
  // Uç girdi almaz: A kendi e-postasını ve iznini görür (kart 0237).
  "GET /kapi/musteri/hesap-bilgileri": async () => ({}),
  // A kendi iznini verir; B'nin onay satırı yazılmaz (aşağıdaki test ölçer).
  "POST /kapi/musteri/pazarlama-izni": async () => ({ govde: { verildi: true } }),
  // A kendi şifresini değiştirir (testin müşterisinin şifresi); B'nin şifresi değişmez (aşağıdaki test ölçer).
  "POST /kapi/musteri/sifre-degistir": async () => ({
    govde: { mevcutSifre: musteriSifresi, yeniSifre: "yepyeni-bir-deneme-sifresi" },
  }),
  "POST /kapi/musteri/odeme": async (b) => {
    const { birim, oturum } = await odemedekiBirim(b.kimlik);
    return {
      govde: {
        bilgiler: odemeBilgileri,
        kalemler: [{ birim, adet: 1 }],
        robotCevabi: await soruyuCoz(await robotSorusuUret()),
        onceki: oturum,
      },
      aranan: [b.eposta, oturum],
    };
  },
};

// Müşterinin havaleyle verdiği sipariş (kart 0214); teslimatın adı ayırt edilebilir.
const siparisVer = async (musteri: string, ad = "Teslim") => {
  const { birim } = await odemedekiBirim(musteri, false);
  const { siparis } = await odemeServisi(denemeSitesi()).siparisVer(
    vt,
    {
      kim: { tur: "uye", musteri },
      bilgiler: odemeBilgileriSemasi.parse({
        ...odemeBilgileri,
        odemeYontemi: { yontem: "havale" },
        teslimat: { ...odemeBilgileri.teslimat, ad },
      }),
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  return siparis.numara;
};

const havaleBildirimi = (numara: string) => ({
  numara,
  gonderen: "A Müşteri",
  hesap: bankaHesabi,
  tutar: "10,00",
  odemeTarihi: new Date().toISOString().slice(0, 10),
});

const odemeBilgileri = {
  odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
  teslimat: {
    ad: "A",
    soyad: "Müşteri",
    telefon: "+90 555 000 00 00",
    adres: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme No: 1",
      postaKodu: "06420",
    },
  },
  fatura: { tur: "bireysel", adresAyni: true },
  onBilgilendirmeOnayi: true,
  mesafeliSatisOnayi: true,
  pazarlamaIzni: false,
};

// Testin müşterilerinin şifresi (şifre değiştirme senaryosu şu anki şifre olarak verir).
const musteriSifresi = "uzun-bir-deneme-sifresi";

// Adres defterinin girdisi (kart 0237); adı ayırt edilebilir.
const adresGirdisi = (ad: string) => ({
  baslik: "Ev",
  teslimat: { ...odemeBilgileri.teslimat, ad },
  varsayilanTeslimat: false,
  varsayilanFatura: false,
});

// Müşterinin defterine ayırt edilebilir adlı bir adres yazar.
const adresliMusteri = async (musteri: string) => {
  const ad = `B${randomBytes(4).toString("hex")}`;
  const [adres] = await adresServisi(denemeSitesi()).adresEkle(
    vt,
    musteri,
    adresFormuSemasi.parse(adresGirdisi(ad)),
  );
  if (adres === undefined) throw new Error("Adres yazılamadı.");
  return { ad, kimlik: adres.kimlik };
};

// Stoğu 2 olan yayındaki ürünün birimi; B'nin ödeme oturumu bir adedini ayırmış (ayir: false ise ayırma yok).
const odemedekiBirim = async (bKimligi: string, ayir = true) => {
  const site = denemeSitesi();
  const urunSrv = urunServisi(() => "Europe/Istanbul");
  const urun = await urunSrv.urunEkle(vt, sistemIslemi("test"), {
    ad: `Ödemede ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  await siteninFiyatServisi(site).fiyatYaz(vt, sistemIslemi("test"), birim, { satisFiyati: 1_000 });
  await stokServisi().stokDuzelt(vt, sistemIslemi("test"), birim, {
    yeniMiktar: 2,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  if (!ayir) return { birim, oturum: "" };
  const { oturum } = await odemeServisi(site).odemeOturumuAc(
    vt,
    {
      kim: { tur: "uye", musteri: bKimligi },
      bilgiler: odemeBilgileriSemasi.parse(odemeBilgileri),
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  return { birim, oturum };
};

const yayindakiUrun = () =>
  urunServisi(() => "Europe/Istanbul").urunEkle(vt, sistemIslemi("test"), {
    ad: `Favorili ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });

// B'nin favorisindeki yayında bir ürün.
const favoriUrunu = async (bKimligi: string) => {
  const urun = await yayindakiUrun();
  await favoriServisi(denemeSitesi()).favoriDegistir(vt, bKimligi, urun, true);
  return urun;
};

// Stoğu olmayan yayındaki ürünün birimi; B'nin e-postasıyla bekleyen bir talebi var. Deneme sitesinde eklenti
// açıktır (ornek-siteler/gecerli/ayarlar.json).
const talepliBirim = async (bEpostasi: string) => {
  const urunSrv = urunServisi(() => "Europe/Istanbul");
  const urun = await urunSrv.urunEkle(vt, sistemIslemi("test"), {
    ad: `Tükenmiş ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  await stokBildirimiServisi(denemeSitesi()).talepYaz(vt, birim, bEpostasi);
  return birim;
};

// B'nin yorum yazdığı yayındaki bir ürün; "yalnız satın alanlar" kapalı (herkes yazabilsin).
const yorumluUrun = async (bKimligi: string) => {
  await siteninServisi(denemeSitesi()).degistir(vt, sistemIslemi("test"), {
    yorumYalnizSatinAlanlar: false,
  });
  const urun = await urunServisi(() => "Europe/Istanbul").urunEkle(vt, sistemIslemi("test"), {
    ad: `Yorumlu ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  await yorumServisi(denemeSitesi()).yorumYaz(vt, bKimligi, {
    urun,
    puan: 2,
    metin: "B'nin yorumu",
    ad: "B Müşteri",
  });
  return urun;
};
const denemeSitesi = () =>
  siteKlasorunuOku(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"));

const senaryosuzUclar = (uclar: readonly KayitliUc[], senaryolar: Record<string, unknown>) =>
  uclar
    .filter(({ giris }) => giris === "musteri")
    .map(({ baslik }) => baslik)
    .filter((baslik) => !(baslik in senaryolar));

let vt: Veritabani;
let sil: () => Promise<void>;
// Havalenin banka hesabı (beforeAll ekler); kapıda ödeme açıktır.
let bankaHesabi = "";
let sayac = 0;

const yeniMusteri = async () => {
  sayac += 1;
  const eposta = `musteri${sayac}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", {
    eposta,
    sifre: musteriSifresi,
  });
  return { kimlik: hesapKimligi, eposta };
};

// A'nın oturumuyla B'nin kaydını ister, B'nin e-postası yanıtta olmamalı.
const baskasininKaydi = async ({ yontem, yol, uc }: KayitliUc, senaryo: MusteriSenaryosu) => {
  const a = await yeniMusteri();
  const b = await yeniMusteri();
  const { sorgu = "", govde, aranan = [b.eposta], durum = 200 } = await senaryo(b, a);
  const yanit = await uc(
    new Request(`http://yerel${yol}${sorgu}`, {
      method: yontem,
      headers: {
        "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
        cookie: await oturumCerezi(vt, "musteri", a.kimlik),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    }),
  );
  const metin = await yanit.text();
  const sorunlar = [
    ...(yanit.status === durum ? [] : [`istek işlenmedi (${yanit.status}, beklenen ${durum})`]),
    ...aranan.filter((deger) => metin.includes(deger)).map((deger) => `yanıtta ${deger}`),
  ];
  return { durum: yanit.status, metin, a, b, sorunlar };
};

let dosyaKlasoru = "";

beforeAll(async () => {
  const site = await denemeSitesiAc("erisim");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  // Dosya yükleyen uç (kart 0094) klasörü okur; gönderilen gövde görsel olmadığı için hiçbir dosya yazılmaz.
  dosyaKlasoru = mkdtempSync(join(tmpdir(), "erisim-dosya-"));
  vi.stubEnv("DOSYA_KLASORU", dosyaKlasoru);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
  // Ödeme yöntemleri (kart 0214): havale bir hesapla ve kapıda ödeme açık.
  const yontemler = odemeYontemiServisi(denemeSitesi());
  await yontemler.yontemleriDegistir(vt, sistemIslemi("test"), {
    yontemler: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit"],
    havaleIptalSuresi: "3",
  });
  const { bankaHesaplari } = await yontemler.hesapEkle(vt, sistemIslemi("test"), {
    banka: "Deneme",
    sahip: "Deneme",
    iban: "TR420001000000000000000001",
  });
  bankaHesabi = bankaHesaplari[0]?.kimlik ?? "";
});

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(dosyaKlasoru, { recursive: true, force: true });
  await sil();
});

describe("uygulamanın uçları", () => {
  it("liste adres dosyalarından gelir, belgedeki bütün izinler okunur", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(uclar.length).toBeGreaterThan(0);
    expect(uclar.map(({ baslik }) => baslik).toSorted()).toEqual(
      [...belgedekiIzinler(belge).keys()].toSorted(),
    );
  });

  // Süre sınırı ölçümle (kart 0325): 159 uçta 7 kişi, yerelde iki işlemciyle 0,76–0,80 sn (kişiler aynı anda; sırayla
  // 1,1–1,4 sn). Hattın yükü adımı 4 kata kadar uzattı (hat 45780640237: sırayla 5,0 sn, Vitest'in 5 sn sınırı). Her yeni
  // uç yerelde yaklaşık 5 ms ekler. 20 sn, bugünkü en kötü tahminin (yaklaşık 3,2 sn) 5 katından fazladır.
  it("her kişi her uçta izin kaydının söylediğini görür", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(await erisimleriDene(vt, uclar, belge)).toEqual([]);
    vi.restoreAllMocks();
  }, 20_000);

  it("kapı dışında ya da başka adla yazılmış adres yok, sahip panelinde de", () => {
    const uygulama = join(uygulamaAdresleri, "..");
    const sahipPaneli = resolve(import.meta.dirname, "../../../sahip-paneli");
    expect(kapiDisiAdresler(uygulama)).toEqual([]);
    expect(kapiDisiAdresler(join(sahipPaneli, "app"))).toEqual([]);
    expect(kapiDisiAdresler(join(sahipPaneli, "src"))).toEqual([]);
  });

  it("müşteri girişindeki her ucun başka müşteri senaryosu var", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(senaryosuzUclar(uclar, musteriSenaryolari)).toEqual([]);
    for (const uc of uclar.filter(({ giris }) => giris === "musteri")) {
      const senaryo = musteriSenaryolari[uc.baslik];
      if (senaryo === undefined) continue;
      expect((await baskasininKaydi(uc, senaryo)).sorunlar).toEqual([]);
    }
  });

  it("yorum yazan uç B'nin yorumuna dokunmaz, A'nın yorumunu A adına yazar", async () => {
    const uc = (await uclariOku(uygulamaAdresleri)).find(
      ({ baslik }) => baslik === "POST /kapi/musteri/yorum",
    );
    const senaryo = musteriSenaryolari["POST /kapi/musteri/yorum"];
    if (uc === undefined || senaryo === undefined) throw new Error("Yorum ucu yok.");
    const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
    expect(sorunlar).toEqual([]);
    const satirlar = await vt
      .select({ musteri: yorumlar.musteri_kimligi, metin: yorumlar.metin, puan: yorumlar.puan })
      .from(yorumlar)
      .where(inArray(yorumlar.musteri_kimligi, [a.kimlik, b.kimlik]));
    expect(satirlar.toSorted((x, y) => x.metin.localeCompare(y.metin))).toEqual([
      { musteri: a.kimlik, metin: "A'nın yorumu", puan: 4 },
      { musteri: b.kimlik, metin: "B'nin yorumu", puan: 2 },
    ]);
  });
});

describe("adres ve hesap bilgileri uçları (kart 0237)", () => {
  it.each([
    "POST /kapi/musteri/adres",
    "POST /kapi/musteri/adres-degistir",
    "POST /kapi/musteri/adres-sil",
    "POST /kapi/musteri/adres-varsayilan",
  ])("%s B'nin adresine dokunmaz", async (baslik) => {
    const uc = (await uclariOku(uygulamaAdresleri)).find((kayit) => kayit.baslik === baslik);
    const senaryo = musteriSenaryolari[baslik];
    if (uc === undefined || senaryo === undefined) throw new Error("Adres ucu yok.");
    const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
    expect(sorunlar).toEqual([]);
    const satirlar = await vt
      .select({
        musteri: musteriAdresleri.musteri_kimligi,
        ad: musteriAdresleri.ad,
        varsayilan: musteriAdresleri.varsayilan_teslimat,
        guncellenme: musteriAdresleri.guncellenme_zamani,
        olusturulma: musteriAdresleri.olusturulma_zamani,
      })
      .from(musteriAdresleri)
      .where(inArray(musteriAdresleri.musteri_kimligi, [a.kimlik, b.kimlik]));
    const bninkiler = satirlar.filter(({ musteri }) => musteri === b.kimlik);
    expect(bninkiler).toHaveLength(1);
    // B'nin tek adresi ilk adres olduğu için varsayılandır, A'nın isteğiyle değişmedi.
    expect(bninkiler[0]?.ad.startsWith("B")).toBe(true);
    expect(bninkiler[0]?.varsayilan).toBe(true);
    expect(bninkiler[0]?.guncellenme).toEqual(bninkiler[0]?.olusturulma);
    expect(satirlar.filter(({ musteri }) => musteri === a.kimlik)).toHaveLength(
      baslik === "POST /kapi/musteri/adres" ? 1 : 0,
    );
  });

  it("pazarlama izni yalnız A'nın onayını yazar, şifre değiştirme yalnız A'nın şifresini değiştirir", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    for (const baslik of [
      "POST /kapi/musteri/pazarlama-izni",
      "POST /kapi/musteri/sifre-degistir",
    ]) {
      const uc = uclar.find((kayit) => kayit.baslik === baslik);
      const senaryo = musteriSenaryolari[baslik];
      if (uc === undefined || senaryo === undefined) throw new Error(`${baslik} yok.`);
      const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
      expect(sorunlar).toEqual([]);
      const onaylar = await vt
        .select({ musteri: musteriOnaylari.musteri_kimligi })
        .from(musteriOnaylari)
        .where(inArray(musteriOnaylari.musteri_kimligi, [a.kimlik, b.kimlik]));
      expect(onaylar.filter(({ musteri }) => musteri === b.kimlik)).toEqual([]);
      const hesaplar = await vt
        .select({
          kimlik: musteriler.kimlik,
          ozet: musteriler.sifre_ozeti,
          guncellenme: musteriler.guncellenme_zamani,
        })
        .from(musteriler)
        .where(inArray(musteriler.kimlik, [a.kimlik, b.kimlik]));
      const bninki = hesaplar.find(({ kimlik }) => kimlik === b.kimlik);
      expect(await sifreDogrula(musteriSifresi, bninki?.ozet ?? "")).toBe(true);
      const aninki = hesaplar.find(({ kimlik }) => kimlik === a.kimlik);
      expect(await sifreDogrula(musteriSifresi, aninki?.ozet ?? "")).toBe(
        baslik.endsWith("pazarlama-izni"),
      );
    }
  });
});

describe("favori uçları", () => {
  it.each(["POST /kapi/musteri/favori", "POST /kapi/musteri/favori-birlestir"])(
    "%s B'nin favorisine dokunmaz",
    async (baslik) => {
      const uc = (await uclariOku(uygulamaAdresleri)).find((kayit) => kayit.baslik === baslik);
      const senaryo = musteriSenaryolari[baslik];
      if (uc === undefined || senaryo === undefined) throw new Error("Favori ucu yok.");
      const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
      expect(sorunlar).toEqual([]);
      const satirlar = await vt
        .select({ musteri: favoriler.musteri_kimligi })
        .from(favoriler)
        .where(inArray(favoriler.musteri_kimligi, [a.kimlik, b.kimlik]));
      expect(satirlar.filter(({ musteri }) => musteri === b.kimlik)).toHaveLength(1);
      expect(satirlar.filter(({ musteri }) => musteri === a.kimlik)).toHaveLength(
        baslik.endsWith("birlestir") ? 1 : 0,
      );
    },
  );
});

describe("stoğa gelince haber ver ucu", () => {
  it("B'nin talebine dokunmaz, A'nın talebini A'nın hesabının e-postasıyla yazar", async () => {
    const baslik = "POST /kapi/musteri/stok-bildirimi";
    const uc = (await uclariOku(uygulamaAdresleri)).find((kayit) => kayit.baslik === baslik);
    const senaryo = musteriSenaryolari[baslik];
    if (uc === undefined || senaryo === undefined) throw new Error("Stok bildirimi ucu yok.");
    const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
    expect(sorunlar).toEqual([]);
    const satirlar = await vt
      .select({ eposta: stokBildirimiTalepleri.eposta, durum: stokBildirimiTalepleri.durum })
      .from(stokBildirimiTalepleri)
      .where(inArray(stokBildirimiTalepleri.eposta, [a.eposta, b.eposta]));
    expect(satirlar).toHaveLength(2);
    expect(satirlar).toEqual(
      expect.arrayContaining([
        { eposta: a.eposta, durum: "bekliyor" },
        { eposta: b.eposta, durum: "bekliyor" },
      ]),
    );
  });
});

describe("ödeme ucu", () => {
  it("B'nin oturumuna ve ayırmasına dokunmaz, A'nın oturumunu A'nın hesabına açar", async () => {
    const baslik = "POST /kapi/musteri/odeme";
    const uc = (await uclariOku(uygulamaAdresleri)).find((kayit) => kayit.baslik === baslik);
    const senaryo = musteriSenaryolari[baslik];
    if (uc === undefined || senaryo === undefined) throw new Error("Ödeme ucu yok.");
    const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
    expect(sorunlar).toEqual([]);
    const oturumlar = await vt
      .select({
        kimlik: odemeOturumlari.kimlik,
        musteri: odemeOturumlari.musteri_kimligi,
        eposta: odemeOturumlari.eposta,
      })
      .from(odemeOturumlari)
      .where(inArray(odemeOturumlari.musteri_kimligi, [a.kimlik, b.kimlik]));
    expect(
      oturumlar
        .map(({ musteri, eposta }) => ({ musteri, eposta }))
        .toSorted((x, y) => x.eposta.localeCompare(y.eposta)),
    ).toEqual(
      [
        { musteri: a.kimlik, eposta: a.eposta },
        { musteri: b.kimlik, eposta: b.eposta },
      ].toSorted((x, y) => x.eposta.localeCompare(y.eposta)),
    );
    const bninki = oturumlar.find(({ musteri }) => musteri === b.kimlik)?.kimlik ?? "";
    expect(
      await vt
        .select()
        .from(stokAyirmalari)
        .where(inArray(stokAyirmalari.oturum_kimligi, [bninki])),
    ).toHaveLength(1);
  });
});

describe("havale bildirimi ucu", () => {
  it("A, B'nin siparişine bildirim yazamaz; A'nın bildirimi A'nın siparişine yazılır", async () => {
    const baslik = "POST /kapi/musteri/havale-bildirimi";
    const uc = (await uclariOku(uygulamaAdresleri)).find((kayit) => kayit.baslik === baslik);
    const senaryo = musteriSenaryolari[baslik];
    if (uc === undefined || senaryo === undefined) throw new Error("Havale bildirimi ucu yok.");
    const { a, b, sorunlar } = await baskasininKaydi(uc, senaryo);
    expect(sorunlar).toEqual([]);
    const bninki = await siparisVer(b.kimlik);
    const yanit = await uc.uc(
      new Request(`http://yerel${uc.yol}`, {
        method: "POST",
        headers: {
          "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
          cookie: await oturumCerezi(vt, "musteri", a.kimlik),
        },
        body: JSON.stringify(havaleBildirimi(bninki)),
      }),
    );
    expect(yanit.status).toBe(404);
    const bildirimler = await vt
      .select({ siparis: siparisler.musteri_kimligi })
      .from(havaleBildirimleri)
      .innerJoin(siparisler, eq(siparisler.kimlik, havaleBildirimleri.siparis_kimligi))
      .where(inArray(siparisler.musteri_kimligi, [a.kimlik, b.kimlik]));
    expect(bildirimler).toEqual([{ siparis: a.kimlik }]);
  });
});

describe("iade talebi ve iptal uçları (kart 0239)", () => {
  it("A'nın B'nin siparişine talebi ve iptali B'nin siparişini değiştirmez", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    for (const baslik of ["POST /kapi/musteri/iade-talebi", "POST /kapi/musteri/siparis-iptali"]) {
      const uc = uclar.find((kayit) => kayit.baslik === baslik);
      const senaryo = musteriSenaryolari[baslik];
      if (uc === undefined || senaryo === undefined) throw new Error(`${baslik} yok.`);
      const { b, sorunlar } = await baskasininKaydi(uc, senaryo);
      expect(sorunlar).toEqual([]);
      const bninkiler = await vt
        .select({ kimlik: siparisler.kimlik, durum: siparisler.durum })
        .from(siparisler)
        .where(eq(siparisler.musteri_kimligi, b.kimlik));
      expect(bninkiler.length).toBeGreaterThan(0);
      expect(bninkiler.every((siparis) => siparis.durum === "odeme-bekleniyor")).toBe(true);
      const talepler = await vt
        .select()
        .from(siparisIadeTalepleri)
        .where(
          inArray(
            siparisIadeTalepleri.siparis_kimligi,
            bninkiler.map((siparis) => siparis.kimlik),
          ),
        );
      expect(talepler).toEqual([]);
    }
  });
});

describe("kişi listesi", () => {
  it("girişsiz, müşteri, rolsüz yönetici ve kayıttaki her rol var", () => {
    expect(kisiler.map(({ tur }) => tur)).toEqual(expect.arrayContaining(["girissiz", "musteri"]));
    const yoneticiler = kisiler.filter((kisi) => kisi.tur === "yonetici");
    expect(yoneticiler.length).toBeGreaterThanOrEqual(3);
  });

  it("beklenti izin kaydından çıkar", () => {
    const [girissiz, musteri, rolsuz, ...roller] = kisiler;
    if (girissiz === undefined || musteri === undefined || rolsuz === undefined) {
      throw new Error("Kişi eksik.");
    }
    for (const kisi of kisiler) expect(erisebilirMi(kisi, "herkese-acik")).toBe(true);
    expect(erisebilirMi(girissiz, "ekip.gor")).toBe(false);
    expect(erisebilirMi(musteri, "ekip.gor")).toBe(false);
    expect(erisebilirMi(rolsuz, "ekip.kendi-hesabi.gor")).toBe(false);
    expect(erisebilirMi(musteri, "musteri.kendi-hesabi.gor")).toBe(true);
    for (const rol of roller) {
      expect(erisebilirMi(rol, "musteri.kendi-hesabi.gor")).toBe(false);
      expect(erisebilirMi(rol, "ekip.kendi-hesabi.gor")).toBe(true);
    }
  });

  // Kart 0076, 0077, 0078 ve 0086 (kullanıcı kararları): her rol ürünü, kategoriyi, markayı, etiketi ve
  // özelliği görür ve değiştirir, yalnız tam yetkili siler. Uçlar panel ekranlarıyla gelir; o zaman bu
  // beklenti her uçta gerçek veritabanıyla denenir.

  // Katalog rolleri (kart 0274, karar 0178): ürünü değiştirebilen roller (mağaza sahibi ve görevli). Kartlar 0076-0086
  // ve 0080, 0082'nin kullanıcı kararları bu roller içindir; sipariş görevlisi ve içerik editörü kataloğa dokunmaz.
  const katalogRolleri = () => {
    const [, , , ...roller] = kisiler;
    const secilen = roller.filter((rol) => erisebilirMi(rol, "urun.degistir"));
    expect(secilen.length).toBeGreaterThanOrEqual(2);
    return secilen;
  };

  it.each([
    ["ürün", "urun.gor", "urun.degistir", "urun.sil"],
    ["kategori", "kategori.gor", "kategori.degistir", "kategori.sil"],
    ["marka", "marka.gor", "marka.degistir", "marka.sil"],
    ["etiket", "etiket.gor", "etiket.degistir", "etiket.sil"],
    // Kart 0086 (kullanıcı kararı): görevli özelliği görür ve değiştirir, silemez.
    ["özellik", "ozellik.gor", "ozellik.degistir", "ozellik.sil"],
  ] as const)(
    "%s izinleri: her katalog rolü görür ve değiştirir, yalnız tam yetkili siler",
    (_ad, gor, degistir, sil) => {
      const [girissiz, musteri, rolsuz] = kisiler;
      for (const kisi of [girissiz, musteri, rolsuz]) {
        if (kisi === undefined) throw new Error("Kişi eksik.");
        for (const izin of [gor, degistir, sil]) {
          expect(erisebilirMi(kisi, izin)).toBe(false);
        }
      }
      for (const rol of katalogRolleri()) {
        if (rol.tur !== "yonetici" || rol.rolKodu === null) throw new Error("Rol eksik.");
        expect(erisebilirMi(rol, gor)).toBe(true);
        expect(erisebilirMi(rol, degistir)).toBe(true);
        expect(erisebilirMi(rol, sil)).toBe(baslangicRolleri[rol.rolKodu].tamYetki);
      }
    },
  );

  // Kart 0080 (kullanıcı kararı): her rol fiyatı görür, yalnız tam yetkili değiştirir.
  it("fiyat izinleri: her katalog rolü görür, yalnız tam yetkili değiştirir", () => {
    const [girissiz, musteri, rolsuz] = kisiler;
    for (const kisi of [girissiz, musteri, rolsuz]) {
      if (kisi === undefined) throw new Error("Kişi eksik.");
      expect(erisebilirMi(kisi, "fiyat.gor")).toBe(false);
      expect(erisebilirMi(kisi, "fiyat.degistir")).toBe(false);
    }
    for (const rol of katalogRolleri()) {
      if (rol.tur !== "yonetici" || rol.rolKodu === null) throw new Error("Rol eksik.");
      expect(erisebilirMi(rol, "fiyat.gor")).toBe(true);
      expect(erisebilirMi(rol, "fiyat.degistir")).toBe(baslangicRolleri[rol.rolKodu].tamYetki);
    }
  });

  // Kart 0082 (kullanıcı kararı): her rol stoğu görür ve elle düzeltir.
  it("stok izinleri: her katalog rolü görür ve düzeltir", () => {
    const [girissiz, musteri, rolsuz] = kisiler;
    for (const kisi of [girissiz, musteri, rolsuz]) {
      if (kisi === undefined) throw new Error("Kişi eksik.");
      expect(erisebilirMi(kisi, "stok.gor")).toBe(false);
      expect(erisebilirMi(kisi, "stok.duzelt")).toBe(false);
    }
    for (const rol of katalogRolleri()) {
      if (rol.tur !== "yonetici" || rol.rolKodu === null) throw new Error("Rol eksik.");
      expect(erisebilirMi(rol, "stok.gor")).toBe(true);
      expect(erisebilirMi(rol, "stok.duzelt")).toBe(true);
    }
  });

  // Kart 0274 (karar 0178): sipariş görevlisi ve içerik editörü kataloğu, fiyatı ve stoğu değiştiremez, ekibi göremez;
  // sipariş görevlisi siparişleri yönetir ama iade yapamaz, içerik editörü içerikle vitrini yönetir ve menüye bağlamak
  // için ürünleri yalnız görür.
  it("sipariş görevlisi ve içerik editörü yalnız kendi işlerini yapar", () => {
    const [, , , ...roller] = kisiler;
    const rol = (kod: string) => {
      const bulunan = roller.find((kisi) => kisi.tur === "yonetici" && kisi.rolKodu === kod);
      if (bulunan === undefined) throw new Error(`${kod} denenmedi.`);
      return bulunan;
    };
    const siparisci = rol("siparis-gorevlisi");
    const editor = rol("icerik-editoru");
    const yasak = [
      "urun.degistir",
      "urun.sil",
      "kategori.degistir",
      "fiyat.degistir",
      "stok.duzelt",
      "ekip.gor",
      "ekip.rol-ata",
      "magaza-ayarlari.degistir",
      "tema.degistir",
    ] as const;
    for (const izin of yasak) {
      expect(erisebilirMi(siparisci, izin)).toBe(false);
      expect(erisebilirMi(editor, izin)).toBe(false);
    }
    for (const izin of ["siparis.yonet", "siparis.havale-onayla", "musteri.gor"] as const) {
      expect(erisebilirMi(siparisci, izin)).toBe(true);
      expect(erisebilirMi(editor, izin)).toBe(false);
    }
    expect(erisebilirMi(siparisci, "siparis.iade")).toBe(false);
    for (const izin of [
      "icerik.degistir",
      "icerik.sil",
      "duzen.degistir",
      "menu.degistir",
      "urun.gor",
    ] as const) {
      expect(erisebilirMi(editor, izin)).toBe(true);
    }
    expect(erisebilirMi(siparisci, "icerik.gor")).toBe(false);
  });
});

describe("makine gerçekten yakalıyor", () => {
  const dogruBelge = belgeUret({
    "GET /kapi/yonetici/ekip-listesi": "ekip.gor",
    "GET /kapi/musteri/hesabim": "musteri.kendi-hesabi.gor",
  });

  it("doğru yazılmış yönetici ve müşteri ucu temiz geçer, izinsiz rol giremez", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    expect(uclar.map(({ baslik }) => baslik)).toEqual([
      "GET /kapi/musteri/hesabim",
      "GET /kapi/yonetici/ekip-listesi",
    ]);
    expect(await erisimleriDene(vt, uclar, dogruBelge)).toEqual([]);
  });

  it("uca belgeden farklı izin yazılınca kırmızı, yanlış açılan rol görünür", async () => {
    const uclar = await uclariOku(join(ornekler, "yanlis-izin"));
    const hatalar = await erisimleriDene(
      vt,
      uclar,
      belgeUret({ "POST /kapi/yonetici/rol-ata": "ekip.rol-ata" }),
    );
    expect(hatalar.join("\n")).toContain('uçta "ekip.kendi-hesabi.gor", belgede "ekip.rol-ata"');
    // Sınırlı rol bu uca hiç girmemeliydi, yanlış izin onu içeri aldı.
    expect(hatalar.join("\n")).toMatch(/rolü erişmemeliydi/);
  });

  it("kapıdan geçmeyen uç kırmızı: girişsiz ziyaretçi erişmemeliydi", async () => {
    const uclar = await uclariOku(join(ornekler, "atlayan"));
    const hatalar = await erisimleriDene(
      vt,
      uclar,
      belgeUret({ "GET /kapi/yonetici/ekip-listesi": "ekip.gor" }),
    );
    expect(hatalar.join("\n")).toContain("girişsiz ziyaretçi erişmemeliydi");
    expect(hatalar.join("\n")).toContain("müşteri erişmemeliydi");
  });

  it("belgede yazmayan ya da kayıtta olmayan izin kırmızı", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    const eksik = await erisimleriDene(vt, uclar, "");
    expect(eksik.join("\n")).toContain("belgede izni yok");
    const uydurma = await erisimleriDene(
      vt,
      uclar,
      belgeUret({
        "GET /kapi/yonetici/ekip-listesi": "uydurma.izin",
        "GET /kapi/musteri/hesabim": "musteri.kendi-hesabi.gor",
      }),
    );
    expect(uydurma.join("\n")).toContain("izin kaydında yok");
  });

  it("yeni eklenen uç listeye kendiliğinden girer, belgesiz olduğu için kırmızı", async () => {
    const klasor = mkdtempSync(join(tmpdir(), "erisim-"));
    try {
      const yeni = join(klasor, "yonetici", "yeni-uc");
      mkdirSync(yeni, { recursive: true });
      writeFileSync(
        join(yeni, "route.ts"),
        `export const DELETE = Object.assign(async () => new Response("{}"), {
          tanim: { giris: "yonetici", izin: "ekip.gor", sinir: "genel" },
        });\n`,
      );
      const uclar = await uclariOku(klasor);
      expect(uclar.map(({ baslik }) => baslik)).toEqual(["DELETE /kapi/yonetici/yeni-uc"]);
      expect(await erisimleriDene(vt, uclar, "")).toEqual([
        "DELETE /kapi/yonetici/yeni-uc: belgede izni yok",
      ]);
    } finally {
      rmSync(klasor, { recursive: true, force: true });
    }
  });

  it("yeni müşteri ucu senaryosu yazılmadan kırmızı", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    expect(senaryosuzUclar(uclar, {})).toEqual(["GET /kapi/musteri/hesabim"]);
    expect(senaryosuzUclar(uclar, { "GET /kapi/musteri/hesabim": () => ({}) })).toEqual([]);
  });

  it("süzen müşteri ucu başkasının kaydını vermez, kimliği girdiden alan uç verir", async () => {
    const senaryo: MusteriSenaryosu = async ({ kimlik }) => ({ sorgu: `?kimlik=${kimlik}` });
    const [dogru] = (await uclariOku(join(ornekler, "dogru"))).filter(
      ({ giris }) => giris === "musteri",
    );
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (dogru === undefined || bozuk === undefined) throw new Error("Örnek uç yok.");

    const iyi = await baskasininKaydi(dogru, senaryo);
    expect(iyi.durum).toBe(200);
    expect(iyi.metin).toContain(iyi.a.eposta);
    expect(iyi.sorunlar).toEqual([]);

    const kotu = await baskasininKaydi(bozuk, senaryo);
    expect(kotu.metin).toContain(kotu.b.eposta);
    expect(kotu.sorunlar).toEqual([`yanıtta ${kotu.b.eposta}`]);
  });

  it("işlenmeyen istek kanıt sayılmaz: yanlış parametreli senaryo kırmızı", async () => {
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (bozuk === undefined) throw new Error("Örnek uç yok.");
    const bosSenaryo: MusteriSenaryosu = async () => ({});
    expect((await baskasininKaydi(bozuk, bosSenaryo)).sorunlar).toEqual([
      "istek işlenmedi (400, beklenen 200)",
    ]);
  });

  it("senaryonun verdiği değer aranır: e-posta dönmese de sızıntı görünür", async () => {
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (bozuk === undefined) throw new Error("Örnek uç yok.");
    const sonuc = await baskasininKaydi(bozuk, async ({ kimlik }) => ({
      sorgu: `?kimlik=${kimlik}`,
      aranan: ["kayit"],
    }));
    expect(sonuc.sorunlar).toEqual(["yanıtta kayit"]);
  });

  it("izinli kişi reddedilirse de kırmızı", async () => {
    const reddeden = Object.assign(async () => new Response("", { status: 403 }), {
      tanim: {
        giris: "herkese-acik" as const,
        izin: "herkese-acik" as const,
        sinir: "genel" as const,
        temaDemosunda: "acik" as const,
      },
    });
    const hatalar = await erisimleriDene(
      vt,
      [
        {
          baslik: "GET /kapi/herkese-acik/x",
          yontem: "GET",
          yol: "/kapi/herkese-acik/x",
          giris: "herkese-acik",
          uc: reddeden,
        },
      ],
      belgeUret({ "GET /kapi/herkese-acik/x": "herkese-acik" }),
    );
    expect(hatalar.join("\n")).toContain("erişmeliydi");
  });

  it("önbellek başlığı olmayan yanıt kırmızı, dosya yanıtı kendi önbelleğiyle geçer (kart 0065)", async () => {
    const tanim = {
      giris: "herkese-acik" as const,
      izin: "herkese-acik" as const,
      sinir: "genel" as const,
      temaDemosunda: "acik" as const,
    };
    const dene = (uc: KayitliUc["uc"]) =>
      erisimleriDene(
        vt,
        [
          {
            baslik: "GET /kapi/herkese-acik/x",
            yontem: "GET",
            yol: "/kapi/herkese-acik/x",
            giris: "herkese-acik",
            uc,
          },
        ],
        belgeUret({ "GET /kapi/herkese-acik/x": "herkese-acik" }),
      );
    const basliksiz = await dene(
      Object.assign(async () => Response.json({ basarili: true, veri: {} }), { tanim }),
    );
    expect(basliksiz).toHaveLength(kisiler.length);
    expect(basliksiz.join("\n")).toContain("girişsiz ziyaretçi yanıtı önbelleğe alınabilir (200");
    const dosya = new DosyaYaniti(new Uint8Array([1]), "image/webp", "etiket");
    expect(
      await dene(Object.assign(async (istek: Request) => dosyaYanitla(dosya, istek), { tanim })),
    ).toEqual([]);
    // Dosya ucunun hatası zarfladır, önbelleksizdir; başlıksız hata kırmızı.
    expect(await dene(Object.assign(async () => hataliYanit("bulunamadi"), { tanim }))).toEqual([]);
    expect(
      await dene(
        Object.assign(
          async () =>
            new Response("{}", {
              status: 404,
              headers: { "X-Content-Type-Options": "nosniff", ETag: '"x"' },
            }),
          { tanim },
        ),
      ),
    ).toHaveLength(kisiler.length);
  });

  it("kapı dışındaki ve route.ts adı dışındaki adres yakalanır", () => {
    const klasor = mkdtempSync(join(tmpdir(), "erisim-app-"));
    try {
      for (const yol of [
        "kapi/yonetici/dogru/route.ts",
        "kapi/yonetici/uzanti/route.tsx",
        "gizli/js/route.js",
        "api/dis/route.ts",
      ]) {
        mkdirSync(join(klasor, yol, ".."), { recursive: true });
        writeFileSync(join(klasor, yol), "export {};\n");
      }
      expect(kapiDisiAdresler(klasor)).toEqual([
        "api/dis/route.ts",
        "gizli/js/route.js",
        "kapi/yonetici/uzanti/route.tsx",
      ]);
    } finally {
      rmSync(klasor, { recursive: true, force: true });
    }
  });
});
