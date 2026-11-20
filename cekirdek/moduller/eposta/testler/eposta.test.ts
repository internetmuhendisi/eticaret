// E-posta modülü gerçek veritabanı ve gerçek yerel posta kutusuyla (kart 0032, karar 0050).
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { type AddressInfo, createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calistiriciKur } from "../../../arka-plan-isleri/calistirici.ts";
import { isAl } from "../../../arka-plan-isleri/kuyruk.ts";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import type { Site } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import { isDurumu } from "../../../kayitlar/arka-plan.ts";
import { epostaAyari, epostaDurumu } from "../../../kayitlar/eposta.ts";
import { doldur } from "../../../metinler/doldur.ts";
import { cekirdekSurumu } from "../../../surum.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { epostaGondericisi } from "../gonderici.ts";
import { epostaKaydiniGonder, gonderilmemeNedeni } from "../gonderim.ts";
import { epostaGonderIsi, epostaKayitTemizligiIsi } from "../isler.ts";
import { epostaKayitlari } from "../model.ts";
import { epostaOlustur } from "../sablon.ts";
import { epostaGonder } from "../servis.ts";

type DenemeSitesi = Awaited<ReturnType<typeof denemeSitesiAc>>;
let deneme: DenemeSitesi;
let vt: Veritabani;
let izlenenler: IzlenenHata[];

const site = (ayarlar: Partial<Site["ayarlar"]> = {}) =>
  ({
    kimlik: { gorunenAd: "Deneme <Mağaza>" },
    ayarlar: { dil: "tr", epostaGonderenAdresi: "gonderen@ornek.test", ...ayarlar },
    // Ad mağaza sahibinin ayarından gelir (kart 0071): kimliktekinden farklı ki kimlikten okunursa yakalansın.
    baslangic: { magazaAdi: "Ayardaki <Mağaza>" },
  }) as unknown as Site;

const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
const kutu = `http://127.0.0.1:${kutuPortu}`;
const gonderimAdresi = `smtp://localhost:${smtpPortu}`;
const alici = () => `alici-${randomBytes(6).toString("hex")}@ornek.test`;
const yakalanan = async (adres: string) => {
  const yanit = await fetch(`${kutu}/api/v1/search?query=${encodeURIComponent(`to:"${adres}"`)}`);
  return ((await yanit.json()) as { messages: { ID: string }[] }).messages;
};
const kayit = async (kimlik: string) => {
  const [satir] = await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.kimlik, kimlik));
  if (!satir) throw new Error("kayıt yok");
  return satir;
};

// Çalıştırıcı siteyi SITE_KLASORU'ndan okur; site adı çekirdekte geçmesin diye geçici klasör açılır.
const siteKlasoru = join(mkdtempSync(join(tmpdir(), "eposta-")), "eposta-deneme");

beforeAll(async () => {
  mkdirSync(siteKlasoru);
  writeFileSync(
    join(siteKlasoru, "kimlik.json"),
    JSON.stringify({
      kodAdi: "eposta-deneme",
      gorunenAd: "E-posta Denemesi",
      tur: "demo",
      adresler: {},
      cekirdekSurumu,
      teslimDurumu: { magazaSahibiHesabi: "gerekmez", yurtDisiAktarimBelgeleri: "gerekmez" },
    }),
  );
  writeFileSync(
    join(siteKlasoru, "ayarlar.json"),
    JSON.stringify({ paraBirimi: "XTS", epostaGonderenAdresi: "gonderen@ornek.test" }),
  );
  deneme = await denemeSitesiAc("eposta");
  vt = deneme.vt;
}, 60_000);
afterAll(async () => {
  rmSync(dirname(siteKlasoru), { recursive: true, force: true });
  await deneme?.sil();
}, 60_000);
beforeEach(() => {
  izlenenler = [];
  hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
});
afterEach(() => {
  hataIzlemeAraciniBagla(undefined);
  vi.restoreAllMocks();
});

const gercekGonderici = () => {
  const gonderici = epostaGondericisi(gonderimAdresi);
  if (!gonderici) throw new Error("EPOSTA_SUNUCUSU yerel posta kutusunu göstermeli.");
  return gonderici;
};

describe("gönderici", () => {
  it.each([
    "smtp://smtp.gmail.com:587",
    "smtp://email-smtp.eu-central-1.amazonaws.com:587",
    "smtp://localhost.ornek.com:25",
    "http://localhost:1025",
    "gecersiz",
    "",
  ])("yerel olmayan ya da boş adrese bağlanmaz: %s", (adres) => {
    expect(epostaGondericisi(adres)).toBeUndefined();
  });

  it("ortamda adres yoksa gönderici yoktur", () => {
    vi.stubEnv("EPOSTA_SUNUCUSU", "");
    expect(epostaGondericisi()).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("süreç kapanınca sessiz sunucuyu beklemez", async () => {
    const baglantilar: Socket[] = [];
    const sunucu = createServer((baglanti) => {
      baglanti.on("error", () => {});
      baglantilar.push(baglanti);
    });
    await new Promise<void>((coz) => sunucu.listen(0, "127.0.0.1", coz));
    const { port } = sunucu.address() as AddressInfo;
    const gonderici = epostaGondericisi(`smtp://127.0.0.1:${port}`);
    if (!gonderici) throw new Error("gönderici yok");
    const ileti = {
      kimden: { ad: "A", adres: "a@ornek.test" },
      kime: "b@ornek.test",
      konu: "k",
      metin: "m",
      html: "h",
      mesajKimligi: "<x@ornek.test>",
    };
    const durdur = new AbortController();
    const bekleyen = gonderici(ileti, durdur.signal);
    setTimeout(() => durdur.abort(new Error("durduruldu")), 50);
    await expect(bekleyen).rejects.toThrow("durduruldu");
    for (const baglanti of baglantilar) baglanti.destroy();
    sunucu.close();
  });

  it("yerel posta kutusuna bağlanır", () => {
    expect(epostaGondericisi("smtp://posta-kutusu:1025")).toBeDefined();
    expect(epostaGondericisi("smtp://localhost:51025")).toBeDefined();
  });
});

describe("şablon", () => {
  const icerik = (alanlar: { logoAdresi?: string; degiskenler?: Record<string, string> } = {}) =>
    epostaOlustur({
      dil: "tr",
      magazaAdi: "Deneme <b>Mağaza</b>",
      sablon: "deneme",
      degiskenler: {},
      ...alanlar,
    });

  it("mağaza adını taşır, HTML'de kaçırır, düz metin karşılığı vardır", () => {
    const { konu, metin, html } = icerik();
    expect(konu).toContain("Deneme <b>Mağaza</b>");
    expect(metin).toContain("Deneme <b>Mağaza</b>");
    expect(metin).not.toContain("<strong>");
    expect(html).toContain("Deneme &lt;b&gt;Mağaza&lt;/b&gt;");
    expect(html).not.toContain("<b>Mağaza");
  });

  it("logo varsa logo, yoksa ad görünür; adres kaçırılır", () => {
    expect(icerik().html).not.toContain("<img");
    const { html } = icerik({ logoAdresi: 'https://ornek.test/l.png"><script>' });
    expect(html).toContain("<img");
    expect(html).not.toContain("<script>");
  });

  it("yerleri doldurur, bilinmeyen yer kalır, değer yeniden işlenmez", () => {
    expect(doldur("{ad} {yok}", { ad: "{yok} $&" })).toBe("{yok} $& {yok}");
  });

  it("logo yüksekliği kayıttan gelir", () => {
    expect(icerik({ logoAdresi: "https://ornek.test/l.png" }).html).toContain(
      `height="${epostaAyari.logoYuksekligi}"`,
    );
  });
});

describe("logo (kart 0073)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Sitenin ilk logosu olan örnek klasör; logo adresi sitenin adresi ve logo ucundan kurulur.
  const logoluSite = () =>
    ({
      ...site(),
      kimlik: { gorunenAd: "Deneme <Mağaza>", adresler: {} },
      markaLogosu: {
        yol: join(
          import.meta.dirname,
          "../../../ayar-semasi/testler/ornek-siteler/marka-logolu/marka/logo.webp",
        ),
        tur: "webp",
      },
    }) as Site;

  const gonderilen = async (secilen: Site): Promise<string> => {
    const kimlik = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
    let html = "";
    await epostaKaydiniGonder(vt, kimlik, {
      site: secilen,
      gonderici: async (ileti) => {
        html = ileti.html;
      },
    });
    return html;
  };

  it("logo varsa e-posta logoyu logo ucundan, sitenin adresiyle alır", async () => {
    vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test");
    const site = logoluSite();
    const html = await gonderilen(site);
    // Özet logonun içeriğinden gelir: logo değişince adres de değişir.
    const ozet = createHash("sha256")
      .update(readFileSync(site.markaLogosu?.yol ?? ""))
      .digest("hex")
      .slice(0, 16);
    expect(html).toContain(`<img src="https://magaza.ornek.test/kapi/herkese-acik/logo?s=${ozet}"`);
  });

  it("logo ya da sitenin adresi yoksa e-postada logo yok, ad var", async () => {
    vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test");
    const logosuz = await gonderilen(site());
    expect(logosuz).not.toContain("<img");
    expect(logosuz).toContain("Ayardaki &lt;Mağaza&gt;");
    vi.stubEnv("SITE_ADRESI", "");
    const adressiz = await gonderilen(logoluSite());
    expect(adressiz).not.toContain("<img");
    expect(adressiz).toContain("Ayardaki &lt;Mağaza&gt;");
  });
});

describe("gönderim", () => {
  it("e-posta kuyruktan gider, gerçek posta kutusuna düşer, kayıt tutulur, değişkenler silinir", async () => {
    const adres = alici();
    const kimlik = await epostaGonder(vt, {
      kime: adres,
      sablon: "deneme",
      degiskenler: { a: "b" },
    });
    expect(await yakalanan(adres)).toEqual([]);
    expect((await kayit(kimlik)).durum).toBe(epostaDurumu.bekliyor);

    const uyari = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await epostaKaydiniGonder(vt, kimlik, {
      site: site({ epostaYanitAdresi: "yanit@ornek.test" }),
      gonderici: gercekGonderici(),
    });
    const gunlukMetni = uyari.mock.calls.map(([satir]) => String(satir)).join("");
    uyari.mockRestore();

    const iletiler = await yakalanan(adres);
    expect(iletiler.length).toBe(1);
    const ileti = (await (await fetch(`${kutu}/api/v1/message/${iletiler[0]?.ID}`)).json()) as {
      From: { Address: string; Name: string };
      ReplyTo: { Address: string }[];
      Subject: string;
      Text: string;
      HTML: string;
      MessageID: string;
    };
    expect(ileti.From.Address).toBe("gonderen@ornek.test");
    expect(ileti.From.Name).toBe("Ayardaki <Mağaza>");
    expect(ileti.HTML).toContain("Ayardaki &lt;Mağaza&gt;");
    expect(ileti.HTML).not.toContain("Deneme &lt;Mağaza&gt;");
    expect(ileti.ReplyTo[0]?.Address).toBe("yanit@ornek.test");
    // Posta kutusu HTML'den de metin türetir; düz metin bölümünün gerçekten gittiği hamdan okunur.
    const ham = await (await fetch(`${kutu}/api/v1/message/${iletiler[0]?.ID}/raw`)).text();
    expect(ham).toContain("Content-Type: text/plain");
    expect(ham).toContain("Content-Type: text/html");
    expect(ileti.HTML).toContain("<h1>");
    expect(ileti.MessageID).toContain(kimlik);

    const satir = await kayit(kimlik);
    expect(satir.durum).toBe(epostaDurumu.gonderildi);
    expect(satir.gonderilme_zamani).not.toBeNull();
    expect(satir.degiskenler).toBeNull();
    expect(satir.alici).toBe(adres);
    // Alıcı günlükte kısaltılır.
    expect(gunlukMetni).toContain("e-posta gönderildi");
    expect(gunlukMetni).not.toContain(adres);
    expect(gunlukMetni).toContain(`${adres[0]}***@ornek.test`);
  });

  it("alıcı kuyruk tablosuna girmez, iş yalnız kaydın kimliğini taşır", async () => {
    const adres = alici();
    const kimlik = await epostaGonder(vt, { kime: adres, sablon: "deneme" });
    const isler = await vt.select().from(arkaPlanIsleri);
    const is = isler.find((satir) => JSON.stringify(satir.girdi).includes(kimlik));
    expect(is?.tur).toBe(epostaGonderIsi.tur);
    expect(JSON.stringify(is)).not.toContain(adres);
  });

  it("işlem geri alınırsa kayıt da iş de kalmaz", async () => {
    const adres = alici();
    const isSayisi = (await vt.select().from(arkaPlanIsleri)).length;
    await expect(
      vt.transaction(async (islem) => {
        await epostaGonder(islem, { kime: adres, sablon: "deneme" });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, adres))).toEqual(
      [],
    );
    const isler = await vt.select().from(arkaPlanIsleri);
    expect(isSayisi).toBe(isler.length);
  });

  it("geçersiz alıcı ve bilinmeyen şablon reddedilir", async () => {
    await expect(epostaGonder(vt, { kime: "adres-degil", sablon: "deneme" })).rejects.toThrow();
    await expect(
      epostaGonder(vt, { kime: alici(), sablon: "uydurma" as "deneme" }),
    ).rejects.toThrow();
  });

  it("iş yeniden çalışırsa e-posta ikinci kez gitmez", async () => {
    const adres = alici();
    const kimlik = await epostaGonder(vt, { kime: adres, sablon: "deneme" });
    const secenek = { site: site(), gonderici: gercekGonderici() };
    await epostaKaydiniGonder(vt, kimlik, secenek);
    await epostaKaydiniGonder(vt, kimlik, secenek);
    expect((await yakalanan(adres)).length).toBe(1);
  });

  it("aynı anda iki deneme de tek e-posta gönderir", async () => {
    const kimlik = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
    let gonderilen = 0;
    const yavas = async () => {
      gonderilen += 1;
      await new Promise((coz) => setTimeout(coz, 100));
    };
    const secenek = { site: site(), gonderici: yavas };
    await Promise.all([
      epostaKaydiniGonder(vt, kimlik, secenek),
      epostaKaydiniGonder(vt, kimlik, secenek),
    ]);
    expect(gonderilen).toBe(1);
  });

  it.each([
    ["gönderici yok", undefined, {}, gonderilmemeNedeni.gondericiYok],
    [
      "gönderen adresi yok",
      async () => {},
      { epostaGonderenAdresi: undefined },
      gonderilmemeNedeni.gonderenAdresiYok,
    ],
  ])(
    "%s: gitmez, yeniden denenmez, araca bir kez düşer",
    async (_ad, gonderici, ayarlar, neden) => {
      const adres = alici();
      const kimlik = await epostaGonder(vt, {
        kime: adres,
        sablon: "deneme",
        degiskenler: { a: "b" },
      });
      await epostaKaydiniGonder(vt, kimlik, { site: site(ayarlar), gonderici });
      const satir = await kayit(kimlik);
      expect(satir.durum).toBe(epostaDurumu.gonderilmedi);
      expect(satir.son_hata).toBe(neden);
      expect(satir.degiskenler).toBeNull();
      expect(izlenenler.length).toBe(1);
      expect(JSON.stringify(izlenenler[0])).not.toContain(adres);
      expect(await yakalanan(adres)).toEqual([]);
    },
  );

  it("hizmet hata verirse kayıt bekler, özet maskeli", async () => {
    const adres = alici();
    const kimlik = await epostaGonder(vt, { kime: adres, sablon: "deneme" });
    const bozuk = async () => {
      throw new Error(`reddedildi ${adres}`);
    };
    await expect(
      epostaKaydiniGonder(vt, kimlik, { site: site(), gonderici: bozuk }),
    ).rejects.toThrow();
    const satir = await kayit(kimlik);
    expect(satir.durum).toBe(epostaDurumu.bekliyor);
    expect(satir.son_hata).not.toContain(adres);
  });

  describe("gerçek çalıştırıcıyla", () => {
    const calistir = () => calistiriciKur({ vt, isler: [epostaGonderIsi] }).birIsCalistir();
    const isiniBul = async (kimlik: string) => {
      const isler = await vt.select().from(arkaPlanIsleri);
      const is = isler.find((satir) => JSON.stringify(satir.girdi).includes(kimlik));
      if (!is) throw new Error("iş yok");
      return is;
    };
    beforeEach(async () => {
      await vt.delete(arkaPlanIsleri);
      vi.stubEnv("SITE_KLASORU", siteKlasoru);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("kuyruktan gider, posta kutusuna düşer", async () => {
      vi.stubEnv("EPOSTA_SUNUCUSU", gonderimAdresi);
      const adres = alici();
      const kimlik = await epostaGonder(vt, { kime: adres, sablon: "deneme" });
      expect(await calistir()).toBe(true);
      expect((await kayit(kimlik)).durum).toBe(epostaDurumu.gonderildi);
      expect((await isiniBul(kimlik)).durum).toBe(isDurumu.bitti);
      expect((await yakalanan(adres)).length).toBe(1);
    });

    it("hak bitince kayıt başarısız olur, değişkenler silinir, araca gider", async () => {
      vi.stubEnv("EPOSTA_SUNUCUSU", "smtp://127.0.0.1:1");
      const kimlik = await epostaGonder(vt, {
        kime: alici(),
        sablon: "deneme",
        degiskenler: { a: "b" },
      });
      await vt
        .update(arkaPlanIsleri)
        .set({ en_cok_deneme: 1 })
        .where(eq(arkaPlanIsleri.kimlik, (await isiniBul(kimlik)).kimlik));
      await calistir();
      const satir = await kayit(kimlik);
      expect(satir.durum).toBe(epostaDurumu.basarisiz);
      expect(satir.degiskenler).toBeNull();
      expect((await isiniBul(kimlik)).durum).toBe(isDurumu.hata);
      expect(izlenenler.length).toBe(1);
    });

    it("süreç son denemede öldüyse kayıt da kapanır", async () => {
      const kimlik = await epostaGonder(vt, {
        kime: alici(),
        sablon: "deneme",
        degiskenler: { a: "b" },
      });
      await vt
        .update(arkaPlanIsleri)
        .set({
          durum: isDurumu.calisiyor,
          deneme_sayisi: 5,
          en_cok_deneme: 5,
          kilit_sahibi: "olen",
          kilit_bitis: new Date(Date.now() - 1000),
        })
        .where(eq(arkaPlanIsleri.kimlik, (await isiniBul(kimlik)).kimlik));
      await calistir();
      const satir = await kayit(kimlik);
      expect(satir.durum).toBe(epostaDurumu.basarisiz);
      expect(satir.degiskenler).toBeNull();
    });

    it("temizlik yalnız süresi dolan kaydı siler", async () => {
      const eski = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
      const yeni = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
      await vt
        .update(epostaKayitlari)
        .set({
          olusturulma_zamani: new Date(Date.now() - (epostaAyari.kayitSaklamaGun + 1) * 86_400_000),
        })
        .where(eq(epostaKayitlari.kimlik, eski));
      await epostaKayitTemizligiIsi.calistir(
        {},
        { vt, isKimligi: "x", deneme: 1, sinyal: new AbortController().signal },
      );
      await expect(kayit(eski)).rejects.toThrow("kayıt yok");
      expect((await kayit(yeni)).durum).toBe(epostaDurumu.bekliyor);
    });
  });

  it("kuyruktan alınan iş kayıtlı türdür", async () => {
    await vt.delete(arkaPlanIsleri);
    const kimlik = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
    const is = await isAl(vt, [epostaGonderIsi.tur], "s");
    expect(is?.girdi).toEqual({ kayitKimligi: kimlik });
  });
});

describe("şifre sıfırlama şablonu (kart 0034)", () => {
  const baglanti = "https://site.ornek/sifre-yenile#anahtar=abc&x=<y>";
  const icerik = epostaOlustur({
    dil: "tr",
    magazaAdi: "Mağaza",
    sablon: "sifre-sifirlama",
    degiskenler: { baglanti, dakika: "60" },
  });

  it("bağlantı düz metinde ve HTML'de vardır, HTML'de kaçırılır, süre metne girer", () => {
    expect(icerik.metin).toContain(baglanti);
    expect(icerik.metin).toContain("60 dakika");
    expect(icerik.html).toContain(
      'href="https://site.ornek/sifre-yenile#anahtar=abc&amp;x=&lt;y&gt;"',
    );
    expect(icerik.html).not.toContain("<y>");
  });

  it("bağlantısı olmayan şablonda bağlantı satırı çıkmaz", () => {
    const degisti = epostaOlustur({
      dil: "tr",
      magazaAdi: "Mağaza",
      sablon: "sifre-degisti",
      degiskenler: {},
    });
    expect(degisti.html).not.toContain("<a ");
  });
});
