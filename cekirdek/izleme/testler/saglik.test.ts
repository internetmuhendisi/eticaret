// Sağlık ucu gerçek veritabanıyla (kart 0013). Yerel veritabanı kutusu açık olmalı.
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { kimlikSemasi } from "../../ayar-semasi/kimlik.ts";
import { saglikUcu } from "../../kapi/herkese-acik/saglik.ts";
import { cekirdekSurumu } from "../../surum.ts";
import { baglan, baglantiyiKapat } from "../../veritabani/baglanti.ts";
import { saglikDurumu } from "../saglik.ts";

// Hiçbir şeyin dinlemediği bir port: veritabanına ulaşılamaz.
const ulasilamayanAdres = "postgres://yok@127.0.0.1:1/yok";

const saglikIstegi = () => new Request("http://yerel/kapi/herkese-acik/saglik");

describe("sağlık ucu", () => {
  afterEach(() => vi.restoreAllMocks());
  afterAll(baglantiyiKapat);

  it("veritabanı ayaktayken zarfla, durumu ve sürümüyle cevap verir", async () => {
    const yanit = await saglikUcu(saglikIstegi());
    expect(yanit.status).toBe(200);
    expect(await yanit.json()).toEqual({
      basarili: true,
      veri: { uygulama: "ayakta", veritabani: "ayakta", cekirdekSurumu },
    });
  });

  it("veritabanına ulaşılamazsa hizmet kullanılamıyor koduyla cevap verir", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { VERITABANI_ADRESI: asil } = process.env;
    await baglantiyiKapat();
    Object.assign(process.env, { VERITABANI_ADRESI: ulasilamayanAdres });
    try {
      const yanit = await saglikUcu(saglikIstegi());
      expect(yanit.status).toBe(503);
      expect(await yanit.json()).toEqual({
        basarili: false,
        hata: {
          kod: "hizmet-kullanilamiyor",
          ayrinti: { uygulama: "ayakta", veritabani: "kapali", cekirdekSurumu },
        },
      });
    } finally {
      await baglantiyiKapat();
      Object.assign(process.env, { VERITABANI_ADRESI: asil });
    }
  });

  it("servis ulaşılamayan veritabanında bilinen hatayı verir", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const veritabani = baglan(ulasilamayanAdres);
    try {
      await expect(saglikDurumu(() => veritabani)).rejects.toMatchObject({
        kod: "hizmet-kullanilamiyor",
      });
    } finally {
      await veritabani.$client.end();
    }
  });

  it("çekirdek sürümü büyük.orta.küçük biçiminde", () => {
    expect(kimlikSemasi.shape.cekirdekSurumu.safeParse(cekirdekSurumu).success).toBe(true);
  });
});
