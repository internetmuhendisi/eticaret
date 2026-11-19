// Müşterinin hesap bilgileri gerçek veritabanıyla (kart 0237):
// - Kampanya izni: bugünkü hâli en yeni onay satırıdır; verilir ve geri alınır, aynı hâle yeni satır yazılmaz,
//   aynı anda gelen iki değişiklik tek satır yazar.
// - Şifre değiştirme: yanlış şu anki şifre alanın hatasıdır ve şifreyi değiştirmez; doğruysa yeni şifre geçer,
//   eskisi geçmez, hesabın bütün eski oturumları kapanır, dönen yeni oturum çalışır, "şifreniz değişti" e-postası
//   yazılır; yanlış denemeler girişin deneme sınırına sayılır.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { girisDenemeSiniri } from "../../../kayitlar/oturum.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { girisYap, oturumAc, oturumuDogrula } from "../../oturum/servis.ts";
import { musteriOnaylari } from "../model.ts";
import {
  hesapBilgileri,
  musteriKaydet,
  musteriSifreDegistir,
  pazarlamaIzniniDegistir,
} from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const sifre = "uzun-bir-deneme-sifresi";
const yeniSifre = "yepyeni-bir-deneme-sifresi";
const sure = 3600;

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("hesap-bilgileri"));
});
afterAll(async () => {
  await sil();
});

const musteriAc = async (pazarlamaIzni = false) => {
  const eposta = `m-${randomUUID().slice(0, 8)}@ornek.test`;
  await musteriKaydet(
    vt,
    { eposta, sifre, uyelikOnayi: true, kvkkOnayi: true, pazarlamaIzni },
    sure,
  );
  const giris = await girisYap(vt, "musteri", { eposta, sifre }, sure);
  if (giris === null) throw new Error("Giriş olmadı.");
  return { eposta, kimlik: giris.hesapKimligi, anahtar: giris.anahtarlar.kisaAnahtar };
};

const pazarlamaSatirlari = async (musteri: string) =>
  vt
    .select({ verildi: musteriOnaylari.verildi })
    .from(musteriOnaylari)
    .where(and(eq(musteriOnaylari.musteri_kimligi, musteri), eq(musteriOnaylari.tur, "pazarlama")));

const hatasi = (vaat: Promise<unknown>) =>
  vaat.then(
    () => undefined,
    (hata: { kod?: string; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );

describe("kampanya izni", () => {
  it("kayıttaki izin okunur; verilir ve geri alınır, aynı hâle satır yazılmaz", async () => {
    const { kimlik, eposta } = await musteriAc(false);
    expect(await hesapBilgileri(vt, kimlik)).toEqual({ eposta, pazarlamaIzni: false });
    await pazarlamaIzniniDegistir(vt, kimlik, true);
    expect((await hesapBilgileri(vt, kimlik))?.pazarlamaIzni).toBe(true);
    await pazarlamaIzniniDegistir(vt, kimlik, true);
    await pazarlamaIzniniDegistir(vt, kimlik, false);
    expect((await hesapBilgileri(vt, kimlik))?.pazarlamaIzni).toBe(false);
    await pazarlamaIzniniDegistir(vt, kimlik, false);
    expect((await pazarlamaSatirlari(kimlik)).map(({ verildi }) => verildi)).toEqual(
      expect.arrayContaining([false, true, false]),
    );
    expect(await pazarlamaSatirlari(kimlik)).toHaveLength(3);
  });

  it("aynı anda gelen iki değişiklik tek satır yazar", async () => {
    const { kimlik } = await musteriAc(false);
    await Promise.all([
      pazarlamaIzniniDegistir(vt, kimlik, true),
      pazarlamaIzniniDegistir(vt, kimlik, true),
    ]);
    expect(await pazarlamaSatirlari(kimlik)).toHaveLength(2);
  });

  it("olmayan hesap okunmaz", async () => {
    expect(await hesapBilgileri(vt, randomUUID())).toBeNull();
  });
});

describe("şifre değiştirme", () => {
  it("yanlış şu anki şifre alanın hatasıdır, şifre değişmez, oturum açık kalır", async () => {
    const { kimlik, eposta, anahtar } = await musteriAc();
    expect(
      await hatasi(
        musteriSifreDegistir(
          vt,
          kimlik,
          { mevcutSifre: "yanlis-sifre-12", yeniSifre },
          "test-yanlis",
          sure,
        ),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "mevcutSifre", kod: "sifre-yanlis" }] });
    expect(await girisYap(vt, "musteri", { eposta, sifre }, sure)).not.toBeNull();
    expect(await oturumuDogrula(vt, "musteri", anahtar)).toEqual({ hesapKimligi: kimlik });
  });

  it("doğruysa yeni şifre geçer, eskisi geçmez, eski oturumlar kapanır, yeni oturum çalışır, e-posta yazılır", async () => {
    const { kimlik, eposta, anahtar } = await musteriAc();
    const ikinciCihaz = await oturumAc(vt, "musteri", kimlik, sure);
    const yeni = await musteriSifreDegistir(
      vt,
      kimlik,
      { mevcutSifre: sifre, yeniSifre },
      "test-dogru",
      sure,
    );
    expect(await girisYap(vt, "musteri", { eposta, sifre }, sure)).toBeNull();
    expect(await girisYap(vt, "musteri", { eposta, sifre: yeniSifre }, sure)).not.toBeNull();
    expect(await oturumuDogrula(vt, "musteri", anahtar)).toBeNull();
    expect(await oturumuDogrula(vt, "musteri", ikinciCihaz.kisaAnahtar)).toBeNull();
    expect(await oturumuDogrula(vt, "musteri", yeni.kisaAnahtar)).toEqual({ hesapKimligi: kimlik });
    const epostalar = await vt
      .select({ sablon: epostaKayitlari.sablon })
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.alici, eposta));
    expect(epostalar.map(({ sablon }) => sablon)).toContain("sifre-degisti");
  });

  it("yanlış denemeler girişin deneme sınırına sayılır", async () => {
    const { kimlik } = await musteriAc();
    const baglanti = `test-sinir-${randomUUID()}`;
    for (let sira = 0; sira < girisDenemeSiniri.hesap.deneme; sira += 1) {
      await hatasi(
        musteriSifreDegistir(
          vt,
          kimlik,
          { mevcutSifre: "yanlis-sifre-12", yeniSifre },
          baglanti,
          sure,
        ),
      );
    }
    expect(
      (
        await hatasi(
          musteriSifreDegistir(vt, kimlik, { mevcutSifre: sifre, yeniSifre }, baglanti, sure),
        )
      )?.kod,
    ).toBe("istek-siniri");
  });
});
