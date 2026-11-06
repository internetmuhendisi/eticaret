// Hata izleme aracının gerçek denemesi (kart 0022, kart 0049, karar 0036, karar 0043). Yayındaki bir
// sitede hatalar bilerek çıkarılır ve araçta okunur:
// - sunucu: sitenin kutusunda uygulamanın hata katmanından (izleme/hata-denemesi.mjs),
// - tarayıcı: sitenin deneme adresi gerçek bir tarayıcıda açılır, yakalanmamış bir hata çıkarılır,
// - uç ve ara katman: ortamın veritabanı kutusu kısa süre durdurulur, çalışan uygulamaya kutunun
//   içinden istek atılır. İlk ölçüm ayrı süreçte kendi bağlantısını kurar; bu ölçüm uygulamanın
//   açılışta bağladığı aracı dener.
// Veritabanı kapatıldıktan sonra hata ve Ctrl-C durumunda da açılır, birkaç kez denenir. Açılamazsa
// (sunucuya ulaşılamıyorsa) komut bunu ve elle açma komutunu söyler. Süreç zorla öldürülürse açılmaz;
// bu durumu pnpm sunucu-denetle görür.
// Ayrıca ön kapının 1 MB gövde sınırı sitenin gönderim adresiyle ölçülür.
// Araçtaki kayıtta site kod adı, çekirdek sürümü ve ortam etiketi olmalı; uydurma bilgilerin hiçbiri
// açık, ziyaretçi adresi, istek başlığı ve çerez hiç olmamalı.
//
//   pnpm hata-izleme-denemesi <site klasörü> [--goster]
//
// --goster araçtaki kayıtları ekrana yazar (maskelenmiş hâlleriyle). Deneme kayıtları araçta kalır;
// işaretleriyle, uç ve ara katman kayıtları zamanlarıyla ayırt edilir.

import { randomInt } from "node:crypto";
import { chromium } from "@playwright/test";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import {
  gonderimAdresiniCoz,
  hataIzlemeDegiskenleri,
  type Olay,
} from "../cekirdek/izleme/hata-izleme-araci.ts";
import {
  denemeDegerleri,
  denemeMesaji,
} from "../cekirdek/izleme/hata-izleme-denemesi-degerleri.ts";
import {
  denemeIstekleri,
  kutuIstekBetigi,
  olayBaglamiTutuyor,
  olaylariOku,
  olaySorunlari,
  sonOlaylariOku,
} from "./hata-izleme.mts";
import {
  denemeAdresi,
  hataIzlemeAdresi,
  hataIzlemeOrtami,
  saglikYolu,
  siteKutusuAdi,
  yayindakiSiteleriOku,
} from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { veritabaniKutusu } from "./sunucu-veritabani.mts";

const harfler = "abcdefghijklmnopqrstuvwxyz";
const isaretUret = (): string => Array.from({ length: 16 }, () => harfler[randomInt(26)]).join("");

const tarayicidaDene = async (kodAdi: string, isaret: string): Promise<number> => {
  const tarayici = await chromium.launch();
  try {
    const sayfa = await tarayici.newPage();
    await sayfa.goto(`https://${denemeAdresi(kodAdi)}/?k=${denemeDegerleri.sorgu}`, {
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

const uyu = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Veritabanı açılmadan bu dosya bitmemeli: elle durdurulan kutu kendiliğinden açılmaz (karar 0033).
const veritabaniniAc = (ipv4: string, vt: string): boolean => {
  for (let deneme = 0; deneme < 5; deneme++) {
    if (deneme > 0) uyu(3000);
    if (sshKomutu(ipv4, `docker start ${vt}`).status === 0) return true;
  }
  console.error(
    `VERİTABANI KAPALI KALDI, ortamdaki siteler bakımda. Elle açın: ssh <sunucu> docker start ${vt}`,
  );
  process.exitCode = 1;
  return false;
};

// Sunucunun saati (milisaniye): araçtaki kayıtlar uygulamanın aynı makinedeki saatini taşır.
const sunucuSaati = (ipv4: string): number => {
  const zaman = Number(sshKomutu(ipv4, "date +%s%3N").stdout?.trim());
  if (!Number.isInteger(zaman) || zaman <= 0) throw new Error("Sunucunun saati okunamadı.");
  return zaman;
};

// Veritabanı dururken kutunun içinden istek atar, sonunda veritabanını açar ve sağlık ucunun
// düzelmesini bekler. Zaman aralığı yalnız veritabanının tam kapalı olduğu süreyi kapsar: kapanırken ve
// açılırken gelen yoklama hataları ayrı bir durumdur, ölçüme karışmaz.
const istekHatalariniCikar = async (ipv4: string, kutu: string) => {
  const vt = veritabaniKutusu(hataIzlemeOrtami);
  const kesinti = () => {
    veritabaniniAc(ipv4, vt);
    process.exit(130);
  };
  process.once("SIGINT", kesinti);
  process.once("SIGTERM", kesinti);
  let cikti = "";
  let aralik = { baslangic: 0, bitis: 0 };
  let acildi = false;
  try {
    const durdur = sshKomutu(ipv4, `docker stop --timeout 10 ${vt}`);
    if (durdur.status !== 0) {
      throw new Error(`Veritabanı durdurulamadı: ${durdur.stderr?.trim() ?? "ssh çalışmadı"}`);
    }
    const baslangic = sunucuSaati(ipv4);
    cikti = sshKomutu(ipv4, `docker exec -i ${kutu} node -`, {
      girdi: kutuIstekBetigi(denemeIstekleri),
    }).stdout;
    aralik = { baslangic, bitis: sunucuSaati(ipv4) };
  } finally {
    acildi = veritabaniniAc(ipv4, vt);
    process.off("SIGINT", kesinti);
    process.off("SIGTERM", kesinti);
  }
  const yanitlar = denemeIstekleri.map(
    (_, sira) => cikti.match(new RegExp(`^istek=${sira} (\\d+)$`, "m"))?.[1] ?? "yok",
  );
  if (!acildi) return { yanitlar, aralik, duzeldi: false };
  const saglikDurumu = kutuIstekBetigi([
    { ad: "", yol: saglikYolu, method: "GET", headers: {}, beklenenDurum: 200, baglam: {} },
  ]);
  for (let deneme = 0; deneme < 30; deneme++) {
    const yanit = sshKomutu(ipv4, `docker exec -i ${kutu} node -`, { girdi: saglikDurumu }).stdout;
    if (yanit?.includes("istek=0 200")) return { yanitlar, aralik, duzeldi: true };
    await new Promise((bekle) => setTimeout(bekle, 2000));
  }
  return { yanitlar, aralik, duzeldi: false };
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

  // Ön kapının gövde sınırı: sitenin kendi (herkese açık) gönderim adresiyle 2 MB'lık bir istek
  // araca gitmeden 413 almalı. Anahtarsız istek gövde okunmadan ret aldığı için anahtar gerekir.
  // Bugsink'in kendisi de büyük gövdeye 413 verir (ölçüldü); yanıt ön kapının kendisinden
  // gelmeli: "server: Caddy", araçtan geçen yanıtlardaki "via" başlığı yok.
  const gonderim = gonderimAdresiniCoz(
    sshKomutu(
      sunucu.ipv4,
      `docker exec ${kutu} printenv ${hataIzlemeDegiskenleri.adres}`,
    ).stdout.trim(),
  );
  const buyuk = gonderim
    ? await fetch(gonderim.adres, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${gonderim.anahtar}`,
        },
        body: "a".repeat(2 * 1024 * 1024),
      }).then(
        (yanit) =>
          `${yanit.status} ${yanit.headers.get("server") ?? "?"}${yanit.headers.has("via") ? " via" : ""}`,
        (hata: Error) => hata.message,
      )
    : "kutuda gönderim adresi yok";
  const sinirTamam = buyuk === "413 Caddy";
  console.log(
    `${sinirTamam ? "tamam" : "HATA "}  2 MB'lık gönderim ön kapıda 413 alıyor, araca ulaşmıyor (${buyuk})`,
  );

  // Bugsink olayı kuyruktan işler; iki olay görünene kadar beklenir.
  let olaylar: Olay[] = [];
  for (let deneme = 0; deneme < 15 && olaylar.length < 2; deneme++) {
    await new Promise((bekle) => setTimeout(bekle, 2000));
    olaylar = olaylariOku(sunucu.ipv4, hataIzlemeOrtami, kodAdi, isaret);
  }
  let hataSayisi =
    Number(sunucuDurumu !== "200") + Number(tarayiciDurumu !== 200) + Number(!sinirTamam);
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

  // Uç ve ara katman: gerçek uygulamanın kendi süreci, açılışta bağladığı araç (kart 0049).
  const { yanitlar, aralik, duzeldi } = await istekHatalariniCikar(sunucu.ipv4, kutu);
  console.log(`${duzeldi ? "tamam" : "HATA "}  veritabanı açıldı, sağlık ucu düzeldi`);
  hataSayisi += Number(!duzeldi);
  const aralikta = (olay: Olay) => {
    const zaman = Date.parse(String(olay.timestamp));
    return zaman >= aralik.baslangic && zaman <= aralik.bitis;
  };
  const bulunanlar = (kayitlar: Olay[]) =>
    denemeIstekleri.map((istek) =>
      kayitlar.filter(
        (olay) =>
          aralikta(olay) &&
          olay.tags?.kaynak === "sunucu" &&
          olayBaglamiTutuyor(olay, istek.baglam),
      ),
    );
  let sonOlaylar: Olay[] = [];
  const sinirSaniye = Math.floor(aralik.baslangic / 1000);
  for (let deneme = 0; deneme < 15; deneme++) {
    await new Promise((bekle) => setTimeout(bekle, 2000));
    sonOlaylar = sonOlaylariOku(sunucu.ipv4, hataIzlemeOrtami, kodAdi, sinirSaniye);
    if (bulunanlar(sonOlaylar).every((kayitlar) => kayitlar.length > 0)) break;
  }
  for (const [sira, kayitlar] of bulunanlar(sonOlaylar).entries()) {
    const istek = denemeIstekleri[sira];
    const yanit = yanitlar[sira];
    const sorunlar = [
      ...(yanit === String(istek?.beklenenDurum)
        ? []
        : [`yanıt ${yanit}, beklenen ${istek?.beklenenDurum}`]),
      ...(kayitlar.length === 0
        ? ["araçta kayıt yok"]
        : kayitlar.flatMap((olay) =>
            olaySorunlari(olay, {
              site: kodAdi,
              surum: cekirdekSurumu,
              ortam: hataIzlemeOrtami,
              kaynak: "sunucu",
              kisaltilmisEposta: false,
            }),
          )),
    ];
    console.log(
      `${sorunlar.length === 0 ? "tamam" : "HATA "}  ${istek?.ad} araçta: etiketli, kişisel ve gizli bilgi yok${sorunlar.length ? `: ${sorunlar.join("; ")}` : ""}`,
    );
    hataSayisi += Number(sorunlar.length > 0);
  }
  if (process.argv.includes("--goster")) {
    console.log(JSON.stringify([...olaylar, ...sonOlaylar], null, 2));
  }
  console.log(
    hataSayisi === 0 ? "\nDeneme yeşil." : `\nDeneme kırmızı: ${hataSayisi} ölçüm tutmadı.`,
  );
  if (hataSayisi > 0) process.exitCode = 1;
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
