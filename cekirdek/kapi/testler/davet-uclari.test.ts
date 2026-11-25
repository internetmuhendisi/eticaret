// Ekibe davetin uçları gerçek istek ve veritabanıyla (kart 0275, karar 0179):
// - Mağaza sahibi davet gönderir: bağlantı yanıtta bir kez döner, önbelleğe alınmaz; geri alır.
// - Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi davet gönderemez ve geri alamaz; hiçbir şey yazılmaz.
// - Kabul sayfası bağlantının davetini okur; kabul hesabı açar ve iki aşamalı kurulumun ara adımını çerezine yazar
//   (oturum çerezi yazılmaz); ara adım kurulum durumundadır.
// - Kullanılmış ve uydurma bağlantı aynı gövdeyi alır, çerez yazılmaz. Alanın kuralı (kısa şifre, boş ad) 400.
// Her rolün erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { girisAdimiCerezi } from "../../kayitlar/oturum.ts";
import { roller, yoneticiDavetleri, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { ekibiOku } from "../../moduller/ekip/servis.ts";
import { epostaGondericisi } from "../../moduller/eposta/gonderici.ts";
import { epostaKaydiniGonder } from "../../moduller/eposta/gonderim.ts";
import { epostaKayitlari } from "../../moduller/eposta/model.ts";
import { girisAdiminiOku } from "../../moduller/oturum/iki-asamali-giris.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { yoneticiDavetKabulUcu, yoneticiDavetOkuUcu } from "../herkese-acik/yonetici-davet.ts";
import { ekipDavetGeriAlUcu, ekipDavetUcu } from "../yonetici/ekip.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));
const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("davet-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
}, 60_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const yeniEposta = () => {
  sayac += 1;
  return `davet${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
};

type Kisi = "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri";
const hesap = async (kisi: Kisi) => {
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta: yeniEposta(), sifre });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return { kimlik: hesapKimligi, oturum: await oturumCerezi(vt, tur, hesapKimligi) };
};

const istek = (yol: string, oturum: string | undefined, govde: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/${yol}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: JSON.stringify(govde),
  });

const davetEt = (oturum: string | undefined, eposta: string) =>
  ekipDavetUcu(istek("yonetici/ekip-davet", oturum, { eposta, roller: ["gorevli"] }));

const anahtari = (baglanti: string) =>
  new URLSearchParams(new URL(baglanti).hash.slice(1)).get("anahtar") ?? "";

describe("davet gönderme ve geri alma", () => {
  it("mağaza sahibi gönderir, bağlantı bir kez ve önbelleksiz döner; geri alır", async () => {
    const sahip = await hesap("magaza-sahibi");
    const yanit = await davetEt(sahip.oturum, yeniEposta());
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    const { veri } = (await yanit.json()) as { veri: { kimlik: string; baglanti: string } };
    expect(veri.baglanti).toMatch(/^https:\/\/deneme\.example\/yonetim\/giris\/davet#anahtar=/);

    const geriAl = await ekipDavetGeriAlUcu(
      istek("yonetici/ekip-davet-geri-al", sahip.oturum, { kimlik: veri.kimlik }),
    );
    expect(geriAl.status).toBe(200);
    const oku = await yoneticiDavetOkuUcu(
      istek("herkese-acik/yonetici-davet-oku", undefined, { anahtar: anahtari(veri.baglanti) }),
    );
    expect(oku.status).toBe(422);
  });

  it("görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi gönderemez ve geri alamaz", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { veri } = (await (await davetEt(sahip.oturum, yeniEposta())).json()) as {
      veri: { kimlik: string };
    };
    const once = await vt.select().from(yoneticiDavetleri);
    for (const [kisi, beklenen] of [
      ["gorevli", 403],
      ["rolsuz", 403],
      ["musteri", 401],
      [undefined, 401],
    ] as const) {
      const oturum = kisi === undefined ? undefined : (await hesap(kisi)).oturum;
      expect((await davetEt(oturum, yeniEposta())).status, String(kisi)).toBe(beklenen);
      const geriAl = await ekipDavetGeriAlUcu(
        istek("yonetici/ekip-davet-geri-al", oturum, { kimlik: veri.kimlik }),
      );
      expect(geriAl.status, String(kisi)).toBe(beklenen);
    }
    expect(await vt.select().from(yoneticiDavetleri)).toEqual(once);
  });
});

describe("davet e-postası", () => {
  it("kuyruktan yerel posta kutusuna düşer; konu mağazanın adıyla, gövdede bağlantı ve roller", async () => {
    const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
    const sahip = await hesap("magaza-sahibi");
    const eposta = yeniEposta();
    const yanit = await ekipDavetUcu(
      istek("yonetici/ekip-davet", sahip.oturum, {
        eposta,
        roller: ["gorevli", "siparis-gorevlisi"],
      }),
    );
    const { veri } = (await yanit.json()) as { veri: { baglanti: string } };
    const [kayit] = await vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.alici, eposta));
    expect(kayit?.sablon).toBe("yonetici-daveti");
    await epostaKaydiniGonder(vt, kayit?.kimlik ?? "", {
      site,
      gonderici: epostaGondericisi(`smtp://localhost:${smtpPortu}`),
    });
    const arama = await fetch(
      `http://127.0.0.1:${kutuPortu}/api/v1/search?query=${encodeURIComponent(`to:"${eposta}"`)}`,
    );
    const { messages } = (await arama.json()) as { messages: { ID: string; Subject: string }[] };
    expect(messages).toHaveLength(1);
    expect(messages[0]?.Subject).toContain(site.baslangic.magazaAdi ?? site.kimlik.gorunenAd);
    const ileti = (await (
      await fetch(`http://127.0.0.1:${kutuPortu}/api/v1/message/${messages[0]?.ID}`)
    ).json()) as { Text: string; HTML: string };
    expect(ileti.Text).toContain(veri.baglanti);
    expect(ileti.Text).toContain("Görevli, Sipariş görevlisi");
    expect(ileti.HTML).toContain(veri.baglanti.replaceAll("&", "&amp;"));
  });
});

describe("davetin kabulü", () => {
  it("okur; kabul hesabı açar ve yalnız ara adımın çerezini yazar; ikinci kabul ve uydurma aynı gövde", async () => {
    const sahip = await hesap("magaza-sahibi");
    const eposta = yeniEposta();
    const { veri } = (await (await davetEt(sahip.oturum, eposta)).json()) as {
      veri: { baglanti: string };
    };
    const anahtar = anahtari(veri.baglanti);

    const oku = await yoneticiDavetOkuUcu(
      istek("herkese-acik/yonetici-davet-oku", undefined, { anahtar }),
    );
    expect(oku.status).toBe(200);
    expect(((await oku.json()) as { veri: unknown }).veri).toEqual({ eposta, roller: ["gorevli"] });

    // Alanın kuralları uçta: kısa şifre ve boş ad hiçbir şey yazmaz.
    for (const govde of [
      { anahtar, ad: "Ece", sifre: "kisa" },
      { anahtar, ad: "  ", sifre },
      { anahtar, ad: "Satır\nsonu", sifre },
    ]) {
      const yanit = await yoneticiDavetKabulUcu(
        istek("herkese-acik/yonetici-davet-kabul", undefined, govde),
      );
      expect(yanit.status).toBe(400);
    }

    const kabul = await yoneticiDavetKabulUcu(
      istek("herkese-acik/yonetici-davet-kabul", undefined, { anahtar, ad: "Ece Deniz", sifre }),
    );
    expect(kabul.status).toBe(200);
    expect(((await kabul.json()) as { veri: unknown }).veri).toEqual({ sonraki: "kurulum" });
    const cerezler = kabul.headers.getSetCookie();
    expect(cerezler).toHaveLength(1);
    expect(cerezler[0]?.startsWith(`${girisAdimiCerezi}=`)).toBe(true);
    const adimAnahtari = cerezler[0]?.split(";")[0]?.split("=")[1];
    const adim = await girisAdiminiOku(vt, adimAnahtari);
    expect(adim?.durum).toBe("kurulum");
    expect(adim?.eposta).toBe(eposta);
    expect((await ekibiOku(vt, { kimlik: adim?.hesapKimligi ?? "" }))[0]).toMatchObject({
      ad: "Ece Deniz",
      roller: ["gorevli"],
    });

    const ikinci = await yoneticiDavetKabulUcu(
      istek("herkese-acik/yonetici-davet-kabul", undefined, { anahtar, ad: "Başka", sifre }),
    );
    const uydurma = await yoneticiDavetKabulUcu(
      istek("herkese-acik/yonetici-davet-kabul", undefined, {
        anahtar: randomBytes(32).toString("base64url"),
        ad: "Başka",
        sifre,
      }),
    );
    expect(ikinci.status).toBe(422);
    expect(uydurma.status).toBe(422);
    expect(await ikinci.json()).toEqual(await uydurma.json());
    expect(ikinci.headers.getSetCookie()).toEqual([]);
    expect(uydurma.headers.getSetCookie()).toEqual([]);
  });
});
