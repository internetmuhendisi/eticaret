// Paralel açma (kart 0051, karar 0048): site veritabanları aynı anda açılınca ortak izin kayıtları
// çakışmaz, ortak veritabanları kapalı kalır. Gerçek psql süreçleriyle zorlanır.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { veritabaniAcmaKomutu } from "../../../komutlar/site-veritabani.mts";
import { baglan, siteVeritabaniAdi } from "../baglanti.ts";
import { yoneticiAdresi } from "./adresler.ts";
import { denemeVeritabaniniKaldir } from "./deneme-sitesi.ts";

const ayniAnda = 8;
const turSayisi = 5;
const ek = randomBytes(4).toString("hex");
const adlar: string[] = [];

const ac = (ad: string): Promise<{ kod: number | null; hata: string }> =>
  new Promise((coz, reddet) => {
    const { komut, argumanlar, girdi, ortam } = veritabaniAcmaKomutu(
      ad,
      randomBytes(24).toString("hex"),
    );
    const surec = spawn(komut, argumanlar, { env: ortam, stdio: ["pipe", "ignore", "pipe"] });
    let hata = "";
    surec.stderr.on("data", (parca) => {
      hata += String(parca);
    });
    surec.on("error", reddet);
    surec.on("close", (kod) => coz({ kod, hata }));
    surec.stdin.end(girdi);
  });

afterAll(async () => {
  // Biri kaldırılamazsa ötekiler yine kaldırılır, hata sonra görünür.
  const sonuclar = await Promise.allSettled(adlar.map(denemeVeritabaniniKaldir));
  expect(sonuclar.filter((sonuc) => sonuc.status === "rejected")).toEqual([]);
}, 120_000);

describe("paralel veritabanı açma", () => {
  it("aynı anda açılan veritabanları çakışmaz, ortak veritabanları kapalı kalır", async () => {
    for (let tur = 0; tur < turSayisi; tur += 1) {
      const buTur = Array.from({ length: ayniAnda }, (_, sira) =>
        siteVeritabaniAdi(`paralel-${ek}-${tur}-${sira}`),
      );
      adlar.push(...buTur);
      const sonuclar = await Promise.all(buTur.map(ac));
      expect(sonuclar.filter((sonuc) => sonuc.kod !== 0)).toEqual([]);
    }
    const yonetici = baglan(yoneticiAdresi("postgres"));
    try {
      const { rows } = await yonetici.execute(
        sql`select has_database_privilege('public', 'postgres', 'CONNECT') as postgres,
                   has_database_privilege('public', 'template1', 'CONNECT') as template1`,
      );
      expect(rows).toEqual([{ postgres: false, template1: false }]);
    } finally {
      await yonetici.$client.end();
    }
  }, 120_000);
});
