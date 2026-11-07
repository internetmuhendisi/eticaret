// E-posta modülü gerçek veritabanı ve gerçek yerel posta kutusuyla (kart 0032, karar 0050).
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isAl } from "../../../arka-plan-isleri/kuyruk.ts";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import type { Site } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import { epostaDurumu } from "../../../kayitlar/eposta.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { epostaGondericisi } from "../gonderici.ts";
import { epostaKaydiniGonder, gonderilmemeNedeni } from "../gonderim.ts";
import { epostaGonderIsi } from "../isler.ts";
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
  }) as unknown as Site;

const kutu = `http://127.0.0.1:${process.env["POSTA_KUTUSU_PORTU"]}`;
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

beforeAll(async () => {
  deneme = await denemeSitesiAc("eposta");
  vt = deneme.vt;
}, 60_000);
afterAll(async () => {
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
  const gonderici = epostaGondericisi(process.env["EPOSTA_SUNUCUSU"]);
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
    undefined,
  ])("yerel olmayan ya da boş adrese bağlanmaz: %s", (adres) => {
    expect(epostaGondericisi(adres ?? "")).toBeUndefined();
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

  it("değişkenler doldurulur ve kaçırılır, bilinmeyen yer olduğu gibi kalır", () => {
    const { html, metin } = epostaOlustur({
      dil: "tr",
      magazaAdi: "M",
      sablon: "deneme",
      degiskenler: { ad: "<i>Ali</i>" },
      tanim: {
        konu: "eposta.deneme.konu",
        baslik: "eposta.ortak.altBilgi",
        govde: ["eposta.deneme.govde"],
      },
    });
    expect(html).not.toContain("{magaza}");
    expect(metin).not.toContain("{magaza}");
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
    await epostaKaydiniGonder(vt, kimlik, false, {
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
    expect(ileti.From.Name).toBe("Deneme <Mağaza>");
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
    await expect(
      vt.transaction(async (islem) => {
        await epostaGonder(islem, { kime: adres, sablon: "deneme" });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, adres))).toEqual(
      [],
    );
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
    await epostaKaydiniGonder(vt, kimlik, false, secenek);
    await epostaKaydiniGonder(vt, kimlik, false, secenek);
    expect((await yakalanan(adres)).length).toBe(1);
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
      await epostaKaydiniGonder(vt, kimlik, false, { site: site(ayarlar), gonderici });
      const satir = await kayit(kimlik);
      expect(satir.durum).toBe(epostaDurumu.gonderilmedi);
      expect(satir.son_hata).toBe(neden);
      expect(satir.degiskenler).toBeNull();
      expect(izlenenler.length).toBe(1);
      expect(JSON.stringify(izlenenler[0])).not.toContain(adres);
      expect(await yakalanan(adres)).toEqual([]);
    },
  );

  it("hizmet hata verirse iş yeniden dener, kayıt bekler; son denemede başarısız olur, özet maskeli", async () => {
    const adres = alici();
    const kimlik = await epostaGonder(vt, { kime: adres, sablon: "deneme" });
    const bozuk = async () => {
      throw new Error(`reddedildi ${adres}`);
    };
    const secenek = { site: site(), gonderici: bozuk };
    await expect(epostaKaydiniGonder(vt, kimlik, false, secenek)).rejects.toThrow();
    expect((await kayit(kimlik)).durum).toBe(epostaDurumu.bekliyor);
    await expect(epostaKaydiniGonder(vt, kimlik, true, secenek)).rejects.toThrow();
    const satir = await kayit(kimlik);
    expect(satir.durum).toBe(epostaDurumu.basarisiz);
    expect(satir.son_hata).not.toContain(adres);
    expect(satir.degiskenler).toBeNull();
  });

  it("kuyruktan alınan iş kayıtlı türdür", async () => {
    await vt.delete(arkaPlanIsleri);
    const kimlik = await epostaGonder(vt, { kime: alici(), sablon: "deneme" });
    const is = await isAl(vt, [epostaGonderIsi.tur], "s");
    expect(is?.girdi).toEqual({ kayitKimligi: kimlik });
  });
});
