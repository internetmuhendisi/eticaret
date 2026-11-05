// Hata izleme aracının gerçek denemesi (kart 0022, karar 0036). Yayındaki bir sitede iki hata
// bilerek çıkarılır ve araçta okunur:
// - sunucu: sitenin kutusunda uygulamanın hata katmanından (izleme/hata-denemesi.mjs),
// - tarayıcı: sitenin deneme adresi gerçek bir tarayıcıda açılır, yakalanmamış bir hata çıkarılır.
// İkisinin de içinde uydurma kişisel ve gizli bilgiler vardır. Araçtaki kayıtta site kod adı,
// çekirdek sürümü ve ortam etiketi olmalı; uydurma bilgilerin hiçbiri açık, ziyaretçi adresi,
// istek başlığı ve çerez hiç olmamalı.
//
//   pnpm hata-izleme-denemesi <site klasörü> [--goster]
//
// --goster araçtaki kayıtları ekrana yazar (maskelenmiş hâlleriyle). Deneme kayıtları araçta
// kalır; işaretleriyle ayırt edilir.

import { randomInt } from "node:crypto";
import { chromium } from "@playwright/test";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import type { Olay } from "../cekirdek/izleme/hata-izleme-araci.ts";
import {
  denemeDegerleri,
  denemeMesaji,
} from "../cekirdek/izleme/hata-izleme-denemesi-degerleri.ts";
import { olaylariOku, olaySorunlari } from "./hata-izleme.mts";
import {
  denemeAdresi,
  hataIzlemeAdresi,
  hataIzlemeOrtami,
  siteKutusuAdi,
  yayindakiSiteleriOku,
} from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";

const harfler = "abcdefghijklmnopqrstuvwxyz";
const isaretUret = (): string => Array.from({ length: 16 }, () => harfler[randomInt(26)]).join("");

const tarayicidaDene = async (kodAdi: string, isaret: string): Promise<number> => {
  const tarayici = await chromium.launch();
  try {
    const sayfa = await tarayici.newPage();
    await sayfa.goto(`https://${denemeAdresi(kodAdi)}/?anahtar=${denemeDegerleri.sorgu}`, {
      waitUntil: "networkidle",
    });
    const yanit = sayfa.waitForResponse(
      (y) =>
        y.url().startsWith(`https://${hataIzlemeAdresi}/api/`) && y.request().method() === "POST",
      { timeout: 20_000 },
    );
    // Hiçbir sınırın yakalamadığı bir hata: tarayıcının kendi hata olayı.
    await sayfa.evaluate(
      ([mesaj, jwt]) => {
        const hata = new Error(mesaj);
        Object.assign(hata, { ayrinti: `Bearer ${jwt}` });
        window.dispatchEvent(new ErrorEvent("error", { error: hata, message: mesaj }));
      },
      [denemeMesaji(isaret, "tarayici"), denemeDegerleri.jwt] as const,
    );
    return (await yanit).status();
  } finally {
    await tarayici.close();
  }
};

try {
  const [klasor] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!klasor) throw new Error("Kullanım: pnpm hata-izleme-denemesi <site klasörü> [--goster]");
  const dogrulama = siteKlasorunuDogrula(klasor);
  if (!dogrulama.gecerli)
    throw new Error(`${klasor} geçersiz:\n  ${dogrulama.hatalar.join("\n  ")}`);
  const { kodAdi, cekirdekSurumu } = dogrulama.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const no = yayindakiSiteleriOku(sunucu.ipv4)[kodAdi];
  if (no === undefined) throw new Error(`${kodAdi} yayında değil. Önce: pnpm yayinla`);
  const isaret = isaretUret();
  console.log(`işaret      ${isaret}`);

  const kutu = siteKutusuAdi(hataIzlemeOrtami, kodAdi, no);
  const sunucuda = sshKomutu(
    sunucu.ipv4,
    `docker exec ${kutu} node izleme/hata-denemesi.mjs ${isaret}`,
  );
  const sunucuDurumu = sunucuda.stdout.match(/gonderim=(\d+)/)?.[1] ?? "yok";
  console.log(
    `${sunucuDurumu === "200" ? "tamam" : "HATA "}  sunucudaki hata araca gönderildi (${sunucuDurumu})`,
  );
  const tarayiciDurumu = await tarayicidaDene(kodAdi, isaret).catch((hata: Error) => hata.message);
  console.log(
    `${tarayiciDurumu === 200 ? "tamam" : "HATA "}  tarayıcıdaki hata araca gönderildi (${tarayiciDurumu})`,
  );

  // Bugsink olayı kuyruktan işler; iki olay görünene kadar beklenir.
  let olaylar: Olay[] = [];
  for (let deneme = 0; deneme < 15 && olaylar.length < 2; deneme++) {
    await new Promise((bekle) => setTimeout(bekle, 2000));
    olaylar = olaylariOku(sunucu.ipv4, hataIzlemeOrtami, kodAdi, isaret);
  }
  let hataSayisi = Number(sunucuDurumu !== "200") + Number(tarayiciDurumu !== 200);
  for (const kaynak of ["sunucu", "tarayici"]) {
    const bulunan = olaylar.filter((olay) => olay.tags?.kaynak === kaynak);
    const sorunlar =
      bulunan.length === 1
        ? olaySorunlari(bulunan[0] as Olay, {
            site: kodAdi,
            surum: cekirdekSurumu,
            ortam: hataIzlemeOrtami,
            kaynak,
          })
        : [`araçta ${bulunan.length} kayıt`];
    console.log(
      `${sorunlar.length === 0 ? "tamam" : "HATA "}  ${kaynak} hatası araçta: site adı, sürüm ve ortamla; kişisel ve gizli bilgi yok${sorunlar.length ? `: ${sorunlar.join("; ")}` : ""}`,
    );
    hataSayisi += Number(sorunlar.length > 0);
  }
  if (process.argv.includes("--goster")) console.log(JSON.stringify(olaylar, null, 2));
  console.log(
    hataSayisi === 0 ? "\nDeneme yeşil." : `\nDeneme kırmızı: ${hataSayisi} ölçüm tutmadı.`,
  );
  if (hataSayisi > 0) process.exitCode = 1;
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
