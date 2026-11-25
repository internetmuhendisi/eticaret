// Tema demosunda kapı (kart 0116, karar 0127): ziyaretçi yalnız gezer. Müşteri girişindeki her uç ve hesap, bildirim
// ya da e-posta doğuran herkese açık uç "bulunamadı" verir; vitrinin okuduğu ve panelin kullandığı uç açıktır. Demo
// olmayan sitede aynı uç olduğu gibi çalışır.
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { ucTanimla } from "../uc.ts";
import { uclariOku, uygulamaAdresleri } from "./erisim-denemesi.ts";

const siteler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const siteyiKur = (ad: "tema-demosu" | "gecerli") => {
  (globalThis as Record<symbol, unknown>)[siteAnahtari] = siteKlasorunuOku(resolve(siteler, ad));
};

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[siteAnahtari];
  vi.restoreAllMocks();
});

describe("tema demosunda kapı", () => {
  it("kapalı uçlar: müşteri girişinin hepsi, müşterinin hesabı, şifresi, stok bildirimi ve siparişin takibi", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    const kapali = uclar
      .filter((kayit) => kayit.uc.tanim?.temaDemosunda === "kapali")
      .map((kayit) => kayit.baslik);
    const musteriGirisi = uclar
      .filter((kayit) => kayit.giris === "musteri")
      .map((kayit) => kayit.baslik);
    expect(musteriGirisi.length).toBeGreaterThan(0);
    expect(kapali.toSorted()).toEqual(
      [
        ...musteriGirisi,
        // Hesap durumu (kart 0187): demoda tarayıcı oturum sormaz, uç da kapalıdır.
        "GET /kapi/herkese-acik/hesap-durumu",
        "POST /kapi/herkese-acik/musteri-cikis",
        "POST /kapi/herkese-acik/musteri-giris",
        "POST /kapi/herkese-acik/musteri-kayit",
        "POST /kapi/herkese-acik/musteri-sifre-sifirlama",
        "POST /kapi/herkese-acik/musteri-sifre-yenile",
        // Kart 0213: ödeme adımı sipariş doğurur.
        "POST /kapi/herkese-acik/odeme",
        // Kart 0214: havale bildirimi siparişe yazar.
        "POST /kapi/herkese-acik/havale-bildirimi",
        "POST /kapi/herkese-acik/stok-bildirimi",
        // Kart 0238: sipariş takibi kişisel veri gösterir.
        "POST /kapi/herkese-acik/siparis-takibi",
        "DELETE /kapi/herkese-acik/siparis-takibi",
        // Kart 0239: üye olmayanın iade talebi ve iptali siparişe yazar.
        "POST /kapi/herkese-acik/siparis-takibi/iade-talebi",
        "POST /kapi/herkese-acik/siparis-takibi/iptal",
        // Kart 0268: takipteki fatura dosyası kişisel veri taşır.
        "GET /kapi/herkese-acik/siparis-takibi/fatura",
        // Kart 0215: kartla ödemenin dönüşü ve bildirimi sipariş doğurur, taksit tablosu kuruluşa gider.
        "POST /kapi/herkese-acik/kartla-odeme/donus",
        "POST /kapi/herkese-acik/kartla-odeme/bildirim",
        "GET /kapi/herkese-acik/kartla-odeme/taksitler",
        // Kart 0275: davetin kabulü yönetici hesabı doğurur, okuması davetin e-postasını gösterir.
        "POST /kapi/herkese-acik/yonetici-davet-oku",
        "POST /kapi/herkese-acik/yonetici-davet-kabul",
      ].toSorted(),
    );
    // Panel ve sahip girişleri açıktır: demonun paneli altyapı sahibinindir.
    expect(
      uclar.filter(
        (kayit) =>
          (kayit.giris === "yonetici" || kayit.giris === "sahip") &&
          kayit.uc.tanim?.temaDemosunda !== "acik",
      ),
    ).toEqual([]);
  });

  const kapaliUc = (isle: () => Promise<unknown>) =>
    ucTanimla({
      giris: "herkese-acik",
      temaDemosunda: "kapali",
      sema: z.strictObject({ ad: z.string().min(1) }),
      izin: herkeseAcik,
      sinir: "genel",
      isle,
    });
  const istek = (yol: string) => new Request(`http://yerel/kapi/herkese-acik/${yol}`);

  it("demoda kapalı uç girdiye ve servise bakmadan bulunamadı verir", async () => {
    siteyiKur("tema-demosu");
    const isle = vi.fn(async () => ({}));
    for (const yol of ["kapali?ad=deneme", "kapali?ad=&fazla=1"]) {
      const yanit = await kapaliUc(isle)(istek(yol));
      expect(yanit.status, yol).toBe(404);
      expect(await yanit.json()).toEqual({ basarili: false, hata: { kod: "bulunamadi" } });
    }
    expect(isle).not.toHaveBeenCalled();
  });

  it("demo olmayan sitede aynı uç çalışır", async () => {
    siteyiKur("gecerli");
    const yanit = await kapaliUc(async () => ({ tamam: true }))(istek("kapali?ad=deneme"));
    expect(yanit.status).toBe(200);
    expect(await yanit.json()).toEqual({ basarili: true, veri: { tamam: true } });
  });

  it("demoda müşteri girişindeki gerçek uç oturuma bakmadan bulunamadı verir", async () => {
    siteyiKur("tema-demosu");
    const hesabim = (await uclariOku(uygulamaAdresleri)).find(
      (kayit) => kayit.baslik === "GET /kapi/musteri/hesabim",
    );
    if (hesabim === undefined) throw new Error("hesabım ucu yok");
    const yanit = await hesabim.uc(new Request("http://yerel/kapi/musteri/hesabim"));
    expect(yanit.status).toBe(404);
    // Demo olmayan sitede aynı istek girişsiz sayılır (401): 404'ü yalnız demo verir.
    siteyiKur("gecerli");
    const gercekte = await hesabim.uc(new Request("http://yerel/kapi/musteri/hesabim"));
    expect(gercekte.status).toBe(401);
  });
});
