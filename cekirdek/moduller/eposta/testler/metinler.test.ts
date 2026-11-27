// Mağaza sahibinin e-posta metinleri ve gönderen bilgileri (kart 0279, karar 0197): gerçek veritabanı ve yerel posta
// kutusuyla. Metin parçalara çevrilir, kaydı sürümle yazılır, kuyruğa giren e-postaya o anki metin yazılır, gönderimde
// değerler kaçırılır; gönderen adı, yanıt adresi ve alt bilgiye ek gönderilen e-postada.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import { epostaDurumu } from "../../../kayitlar/eposta.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { epostaGondericisi } from "../gonderici.ts";
import { epostaKaydiniGonder } from "../gonderim.ts";
import { metniCoz, parcalariYaz, varsayilanParcalar } from "../metin-birimleri.ts";
import {
  bilgiAdlari,
  epostaGondereniniKaydet,
  epostaMetinleriniOku,
  epostaMetniServisi,
} from "../metin-servisi.ts";
import { epostaKayitlari, epostaMetinleri } from "../model.ts";
import { denemeEpostasiGonder, epostaOnizlemesi } from "../onizleme.ts";
import { ornekEposta } from "../ornek.ts";
import { epostaGonder } from "../servis.ts";

type DenemeSitesi = Awaited<ReturnType<typeof denemeSitesiAc>>;
let deneme: DenemeSitesi;
let vt: Veritabani;

const ornekSite = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site = (ayarlar: Partial<Site["ayarlar"]> = {}): Site => ({
  ...ornekSite,
  kimlik: { ...ornekSite.kimlik, adresler: {} },
  ayarlar: {
    ...ornekSite.ayarlar,
    dil: "tr",
    epostaGonderenAdresi: "gonderen@ornek.test",
    ...ayarlar,
  },
  baslangic: { ...ornekSite.baslangic, magazaAdi: "Metin Mağazası" },
});
const yonetici = { tur: "yonetici" as const, kimlik: randomUUID() };
const adlar = bilgiAdlari("tr");
const servis = epostaMetniServisi(site());

const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
const kutu = `http://127.0.0.1:${kutuPortu}`;
const gonderici = () => {
  const g = epostaGondericisi(`smtp://localhost:${smtpPortu}`);
  if (!g) throw new Error("Yerel posta kutusu yok.");
  return g;
};
const alici = () => `alici-${randomBytes(6).toString("hex")}@ornek.test`;
// Alıcının e-postası posta kutusundan (tek e-posta beklenir).
const gelen = async (adres: string) => {
  const arama = await fetch(`${kutu}/api/v1/search?query=${encodeURIComponent(`to:"${adres}"`)}`);
  const { messages } = (await arama.json()) as { messages: { ID: string }[] };
  expect(messages.length).toBe(1);
  return (await (await fetch(`${kutu}/api/v1/message/${messages[0]?.ID}`)).json()) as {
    From: { Name: string };
    ReplyTo: { Address: string }[];
    Subject: string;
    HTML: string;
    Text: string;
  };
};
const reddi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Reddedilmedi.");
};
const satir = async (kod: string) =>
  (await epostaMetinleriniOku(vt, "tr")).find((s) => s.kod === kod);

beforeAll(async () => {
  deneme = await denemeSitesiAc("eposta-metni");
  vt = deneme.vt;
}, 60_000);
afterAll(async () => {
  await deneme?.sil();
}, 60_000);

describe("metnin parçaları", () => {
  it("bilinen bilgi harf büyüklüğünden bağımsız tanınır, bilinmeyen ayrılır, süslü parantez yazı kalır", () => {
    const cozum = metniCoz("Merhaba [MÜŞTERİ ADI], {ad} [İndirim kodu] [Sipariş no][Tutar]", {
      adlar,
      izinli: ["ad", "numara", "magaza"],
      dil: "tr",
    });
    expect(cozum.parcalar).toEqual([
      { yazi: "Merhaba " },
      { bilgi: "ad" },
      { yazi: ", {ad} [İndirim kodu] " },
      { bilgi: "numara" },
      { yazi: "[Tutar]" },
    ]);
    expect(cozum.bilinmeyenler).toEqual(["İndirim kodu", "Tutar"]);
  });

  it("varsayılan metin köşeli parantezli adlarla yazılır ve aynı parçalara geri çözülür", () => {
    const parcalar = varsayilanParcalar("Merhaba {ad}, {numara} numaralı siparişiniz {bilinmez}.");
    const yazi = parcalariYaz(parcalar, adlar);
    expect(yazi).toBe("Merhaba [Müşteri adı], [Sipariş no] numaralı siparişiniz {bilinmez}.");
    expect(metniCoz(yazi, { adlar, izinli: ["ad", "numara"], dil: "tr" }).parcalar).toEqual(
      parcalar,
    );
  });
});

describe("kayıt", () => {
  it("varsayılanla aynı alan yazılmaz, değişen yazılır; sürüm artar, kayda yalnız alan adları girer", async () => {
    const once = await satir("kargoya-verildi");
    expect(once?.surum).toBe(0);
    expect(once?.degisen).toEqual([]);
    // Kapanışta e-posta adresi: değişiklik kaydı e-posta taşıyan değeri reddeder, metin kayda girmez.
    const { surum } = await servis.kaydet(vt, yonetici, {
      kod: "kargoya-verildi",
      konu: once?.konu ?? "",
      giris: "Selam [Müşteri adı], [Sipariş no] [Kargo firması] ile yolda: [Takip no].",
      kapanis: "Sorunuz olursa destek@ornek.test adresine yazın.",
      surum: 0,
    });
    expect(surum).toBe(1);
    const sonra = await satir("kargoya-verildi");
    expect(sonra?.degisen).toEqual(["giris", "kapanis"]);
    expect(sonra?.giris).toBe(
      "Selam [Müşteri adı], [Sipariş no] [Kargo firması] ile yolda: [Takip no].",
    );
    expect(sonra?.degistiren).toBe(yonetici.kimlik);
    const [tablo] = await vt
      .select()
      .from(epostaMetinleri)
      .where(eq(epostaMetinleri.kod, "kargoya-verildi"));
    expect(tablo?.konu).toBeNull();
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_kimligi, yonetici.kimlik));
    expect(kayitlar.map((k) => [k.islem, k.yeni_deger])).toEqual([
      ["eposta-metni.degisti", { kod: "kargoya-verildi", alanlar: ["giris", "kapanis"] }],
    ]);

    // Aynı metin ikinci kez yazılmaz, sürüm değişmez.
    expect(
      await servis.kaydet(vt, yonetici, {
        kod: "kargoya-verildi",
        konu: sonra?.konu ?? "",
        giris: sonra?.giris ?? "",
        kapanis: sonra?.kapanis ?? "",
        surum: 1,
      }),
    ).toEqual({ surum: 1 });
  });

  it("ekranın gördüğü sürüm eskiyse çakışır, hiçbir şey yazılmaz", async () => {
    const once = await satir("teslim-edildi");
    const girdi = {
      kod: "teslim-edildi" as const,
      konu: "Teslim: [Sipariş no]",
      giris: "Merhaba [Müşteri adı].",
      kapanis: "",
      surum: 0,
    };
    await servis.kaydet(vt, yonetici, girdi);
    expect(await reddi(servis.kaydet(vt, yonetici, { ...girdi, giris: "Başka" }))).toEqual({
      kod: "cakisma",
      ayrinti: undefined,
    });
    expect((await satir("teslim-edildi"))?.giris).toBe("Merhaba [Müşteri adı].");
    expect(once?.surum).toBe(0);
  });

  it.each([
    ["boş konu", { konu: "  " }, [{ alan: "konu", kod: "too_small" }]],
    ["boş giriş", { giris: "" }, [{ alan: "giris", kod: "too_small" }]],
    ["konuda satır sonu", { konu: "a\nb" }, [{ alan: "konu", kod: "metin-gecersiz" }]],
    ["denetim karakteri", { kapanis: "a\u0007" }, [{ alan: "kapanis", kod: "metin-gecersiz" }]],
    ["uzun kapanış", { kapanis: "a".repeat(1001) }, [{ alan: "kapanis", kod: "too_big" }]],
    [
      "birimin kullanamadığı bilgi",
      { giris: "Merhaba [Takip no]" },
      [{ alan: "giris", kod: "bilinmeyen-bilgi" }],
    ],
  ])("%s: alanın koduyla reddedilir, hiçbir şey yazılmaz", async (_ad, boz, beklenen) => {
    const once = await satir("musteriye-not");
    expect(
      await reddi(
        servis.kaydet(vt, yonetici, {
          kod: "musteriye-not",
          konu: once?.konu ?? "",
          giris: once?.giris ?? "",
          kapanis: "",
          surum: once?.surum ?? 0,
          ...boz,
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: beklenen });
    expect(await satir("musteriye-not")).toEqual(once);
  });

  it("varsayılana dönüş bütün alanları çekirdeğin metnine döndürür", async () => {
    const once = await satir("havale-onaylandi");
    const { surum } = await servis.kaydet(vt, yonetici, {
      kod: "havale-onaylandi",
      konu: "Ödeme geldi [Sipariş no]",
      giris: "[Tutar] alındı.",
      kapanis: "Teşekkürler",
      surum: 0,
    });
    await servis.varsayilanaDon(vt, yonetici, { kod: "havale-onaylandi", surum });
    const sonra = await satir("havale-onaylandi");
    expect({ ...sonra, surum: 0 }).toEqual({ ...once, surum: 0 });
    expect(sonra?.surum).toBe(2);
    expect(sonra?.degistiren).toBeNull();
  });
});

describe("gönderim", () => {
  it("kuyruğa girdiği anki metinle gider; değerler kaçırılır, kapanış düğmeden sonra", async () => {
    const adres = alici();
    await servis.kaydet(vt, yonetici, {
      kod: "siparis-iptali-magaza",
      konu: "<b>İptal</b> [Sipariş no]",
      giris: "Sayın [Müşteri adı], [Sipariş no] iptal oldu. <i>{ad}</i>",
      kapanis: "Kapanış satırı",
      surum: 0,
    });
    const ornek = ornekEposta(site(), "siparis-iptali-magaza", {
      kok: "https://magaza.ornek.test",
      gosterim: "vergi-dahil",
    });
    if (ornek.veri === undefined) throw new Error("Örnek yok.");
    const kimlik = await epostaGonder(vt, {
      kime: adres,
      sablon: ornek.sablon,
      veri: { ...ornek.veri, ad: "<script>x</script>" } as unknown as Record<string, unknown>,
    });
    // Kuyruktayken metin değişir: bekleyen e-posta eski metinle gider.
    const bugunku = await satir("siparis-iptali-magaza");
    await servis.kaydet(vt, yonetici, {
      kod: "siparis-iptali-magaza",
      konu: "Yeni konu",
      giris: "Yeni giriş",
      kapanis: "",
      surum: bugunku?.surum ?? 0,
    });
    await epostaKaydiniGonder(vt, kimlik, { site: site(), gonderici: gonderici() });
    const ileti = await gelen(adres);
    expect(ileti.Subject).toBe(`<b>İptal</b> ${ornek.veri.numara}`);
    expect(ileti.HTML).toContain(
      `Sayın &lt;script&gt;x&lt;/script&gt;, ${ornek.veri.numara} iptal oldu. &lt;i&gt;{ad}&lt;/i&gt;`,
    );
    expect(ileti.HTML).not.toContain("<script>");
    expect(ileti.HTML).not.toContain("Yeni giriş");
    // Kapanış gövdenin sonundadır: girişten ve ürün tablosunun toplamından sonra (test sitesinin adresi yoktur,
    // düğme çizilmez).
    const kapanisYeri = ileti.Text.indexOf("Kapanış satırı");
    expect(kapanisYeri).toBeGreaterThan(ileti.Text.indexOf("Toplam"));
    expect(ileti.Text.indexOf("Toplam")).toBeGreaterThan(ileti.Text.indexOf("Sayın"));
    // Kayıt gönderilince metinleri bırakır.
    const [kayit] = await vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, kimlik));
    expect(kayit?.durum).toBe(epostaDurumu.gonderildi);
    expect(kayit?.metinler).toBeNull();
  });

  it("şifre yenilemede giriş ve kapanış değişir; bağlantı ve güvenlik uyarısı kalır", async () => {
    const adres = alici();
    await servis.kaydet(vt, yonetici, {
      kod: "sifre-sifirlama",
      konu: "[Mağaza adı] şifreniz",
      giris: "Bağlantı [Bağlantı süresi] dakika geçerli.",
      kapanis: "İyi alışverişler",
      surum: 0,
    });
    const kimlik = await epostaGonder(vt, {
      kime: adres,
      sablon: "sifre-sifirlama",
      degiskenler: { baglanti: "https://magaza.ornek.test/sifre#a=b", dakika: "60" },
    });
    await epostaKaydiniGonder(vt, kimlik, { site: site(), gonderici: gonderici() });
    const ileti = await gelen(adres);
    expect(ileti.Subject).toBe("Metin Mağazası şifreniz");
    expect(ileti.Text).toContain("Bağlantı 60 dakika geçerli.");
    expect(ileti.Text).toContain("Bunu siz istemediyseniz");
    expect(ileti.HTML).toContain("https://magaza.ornek.test/sifre#a=b");
    expect(ileti.Text.indexOf("İyi alışverişler")).toBeGreaterThan(
      ileti.Text.indexOf("Yeni şifre belirle"),
    );
  });

  it("gönderen adı, yanıt adresi ve alt bilgiye ek gönderilen e-postada; ek yönetici e-postasında yok", async () => {
    await epostaGondereniniKaydet(vt, site(), yonetici, {
      gonderenAdi: "Metin Destek",
      yanitAdresi: "destek@ornek.test",
      altBilgiEki: "Hafta içi 09.00–18.00\n  Hafta sonu kapalı  ",
    });
    const musteri = alici();
    await epostaKaydiniGonder(vt, await epostaGonder(vt, { kime: musteri, sablon: "hos-geldin" }), {
      site: site(),
      gonderici: gonderici(),
    });
    const ileti = await gelen(musteri);
    expect(ileti.From.Name).toBe("Metin Destek");
    expect(ileti.ReplyTo[0]?.Address).toBe("destek@ornek.test");
    // Ek satır satır yazılır, satırların boşluğu atılır.
    expect(ileti.Text).toMatch(/Hafta içi 09\.00–18\.00\r?\nHafta sonu kapalı$/);
    const yoneticiAdresi = alici();
    await epostaKaydiniGonder(
      vt,
      await epostaGonder(vt, { kime: yoneticiAdresi, sablon: "deneme" }),
      { site: site(), gonderici: gonderici() },
    );
    expect((await gelen(yoneticiAdresi)).Text).not.toContain("Hafta içi");

    // Boş yazı ayarı boşaltır: ad mağaza adına, yanıt gönderen adresine döner.
    await epostaGondereniniKaydet(vt, site(), yonetici, {
      gonderenAdi: "",
      yanitAdresi: "",
      altBilgiEki: "",
    });
    const ayarlar = await siteninServisi(site()).oku(vt);
    expect([
      ayarlar.epostaGonderenAdi,
      ayarlar.epostaYanitAdresi,
      ayarlar.epostaAltBilgiEki,
    ]).toEqual([undefined, undefined, undefined]);
    // Yanıt adresi ve ek değişiklik kaydına değersiz girer.
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kim_kimligi, yonetici.kimlik),
          eq(degisiklikKayitlari.islem, "magaza-ayari.degisti"),
        ),
      );
    expect(JSON.stringify(kayitlar)).not.toContain("destek@ornek.test");
    expect(JSON.stringify(kayitlar)).not.toContain("Hafta içi");
  });

  it.each([
    ["gönderen adında @", { gonderenAdi: "a@b.test" }, "gonderenAdi", "gonderen-adi-eposta"],
    ["gönderen adında satır sonu", { gonderenAdi: "a\nb" }, "gonderenAdi", "metin-gecersiz"],
    ["geçersiz yanıt adresi", { yanitAdresi: "destek" }, "yanitAdresi", "invalid_format"],
    ["uzun ek", { altBilgiEki: "a".repeat(501) }, "altBilgiEki", "too_big"],
  ])("%s: alanın koduyla reddedilir", async (_ad, boz, alan, kod) => {
    const once = await siteninServisi(site()).oku(vt);
    expect(
      await reddi(
        epostaGondereniniKaydet(vt, site(), yonetici, {
          gonderenAdi: "Geçerli",
          yanitAdresi: "",
          altBilgiEki: "",
          ...boz,
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan, kod }] });
    expect(await siteninServisi(site()).oku(vt)).toEqual(once);
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("birimin bilgileri konu ve kapanışta da dolar; giriş ve kapanışın satır sonları HTML'de kalır", async () => {
    const onizleme = await epostaOnizlemesi(vt, site(), {
      kod: "kargoya-verildi",
      konu: "Kargonuz [Kargo firması] ile yolda",
      giris: "Birinci satır\nikinci satır",
      kapanis: "Takip: [Takip no]\nİyi günler",
    });
    expect(onizleme.konu).toBe("Kargonuz Örnek Kargo ile yolda");
    expect(onizleme.html).toContain("Birinci satır<br>ikinci satır");
    expect(onizleme.html).toContain("Takip: 4821 0057 3316<br>İyi günler");
    const havale = await epostaOnizlemesi(vt, site(), {
      kod: "havale-onaylandi",
      konu: "Ödeme: [Tutar]",
      giris: "Alındı",
      kapanis: "",
    });
    expect(havale.konu).toMatch(/^Ödeme: \S+/);
    expect(havale.konu).not.toBe("Ödeme: ");
  });

  it("ayrışık harfle yapıştırılan bilgi adı tanınır, kayıt birleşik harfle saklanır", () => {
    const ayrisik = "Görüşürüz [Müşteri adı]".normalize("NFD");
    expect(ayrisik).not.toBe("Görüşürüz [Müşteri adı]");
    expect(metniCoz(ayrisik, { adlar, izinli: ["ad"], dil: "tr" })).toEqual({
      parcalar: [{ yazi: "Görüşürüz " }, { bilgi: "ad" }],
      bilinmeyenler: [],
    });
  });

  it("yöneticinin şifre e-postası mağaza sahibinin metnini ve alt bilgiye eki almaz", async () => {
    const bugunku = await satir("sifre-sifirlama");
    await servis.kaydet(vt, yonetici, {
      kod: "sifre-sifirlama",
      konu: "Müşteri konusu",
      giris: "Müşteriye özel giriş",
      kapanis: "İyi alışverişler",
      surum: bugunku?.surum ?? 0,
    });
    await epostaGondereniniKaydet(vt, site(), yonetici, {
      gonderenAdi: "",
      yanitAdresi: "",
      altBilgiEki: "Kampanya satırı",
    });
    for (const sablon of ["yonetici-sifre-sifirlama", "yonetici-sifre-degisti"] as const) {
      const adres = alici();
      await epostaKaydiniGonder(
        vt,
        await epostaGonder(vt, {
          kime: adres,
          sablon,
          degiskenler: { baglanti: "https://magaza.ornek.test/yonetim/sifre#a=b", dakika: "60" },
        }),
        { site: site(), gonderici: gonderici() },
      );
      const ileti = await gelen(adres);
      expect(ileti.Subject).not.toBe("Müşteri konusu");
      expect(ileti.Text).not.toContain("Müşteriye özel giriş");
      expect(ileti.Text).not.toContain("İyi alışverişler");
      expect(ileti.Text).not.toContain("Kampanya satırı");
    }
    await epostaGondereniniKaydet(vt, site(), yonetici, {
      gonderenAdi: "",
      yanitAdresi: "",
      altBilgiEki: "",
    });
  });
});

describe("önizleme ve deneme", () => {
  it("önizleme kaydedilmemiş metni çizer, bilinmeyen bilgiyi yazı olarak gösterir, hiçbir şey yazmaz", async () => {
    const once = await satir("fatura-hazir");
    const onizleme = await epostaOnizlemesi(vt, site(), {
      kod: "fatura-hazir",
      konu: "Fatura [Sipariş no]",
      giris: "Merhaba [Müşteri adı], [İndirim kodu] <b>",
      kapanis: "",
    });
    expect(onizleme.konu).toMatch(/^Fatura [A-Z]+-\d+$/);
    expect(onizleme.html).toContain("Merhaba Deniz, [İndirim kodu] &lt;b&gt;");
    expect(await satir("fatura-hazir")).toEqual(once);
  });

  it("deneme e-postası formun metniyle yöneticiye gider; e-posta gidemeyen sitede gönderilmez", async () => {
    const adres = alici();
    vi.stubEnv("EPOSTA_SUNUCUSU", `smtp://localhost:${smtpPortu}`);
    await denemeEpostasiGonder(vt, site(), adres, {
      kod: "iade-talebi-alindi",
      konu: "Deneme [Sipariş no]",
      giris: "Talep alındı [Müşteri adı]",
      kapanis: "",
    });
    const [kayit] = await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, adres));
    if (kayit === undefined) throw new Error("Kayıt yok.");
    await epostaKaydiniGonder(vt, kayit.kimlik, { site: site(), gonderici: gonderici() });
    expect((await gelen(adres)).Text).toContain("Talep alındı Deniz");
    expect(
      await reddi(
        denemeEpostasiGonder(vt, site(), adres, {
          kod: "iade-talebi-alindi",
          konu: "a",
          giris: "[Takip no]",
          kapanis: "",
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "giris", kod: "bilinmeyen-bilgi" }] });
    expect(
      await reddi(
        denemeEpostasiGonder(vt, site({ epostaGonderenAdresi: undefined }), alici(), {
          kod: "iade-talebi-alindi",
          konu: "a",
          giris: "b",
          kapanis: "",
        }),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: "eposta-gidemez" });
    vi.unstubAllEnvs();
  });
});
