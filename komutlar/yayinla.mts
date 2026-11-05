// Bir siteyi yayınlar (kart 0021, karar 0035).
//
//   pnpm yayinla siteler/<kod adı> deneme
//
// Önce kilitler: kontrol hattı bu kayıt için yeşil, kaydedilmemiş değişiklik yok, hat dosyası ana
// daldakiyle aynı (yayin-hazirligi.mts), ardından hızlı sunucu denetimi yeşil. Site klasörü ve görüntü bu kayıttan gelir; sürüm yalnız
// kimlik dosyasından okunur. Sağlık kontrolü geçmezse eski kutu çalışmaya devam eder ve komut
// sebebi söyleyip kırmızı biter. Her çalıştırma yayın kaydına yazılır. Şimdilik yalnız deneme
// ortamına yayın yapılır (kullanıcı kararı).

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { yayinOrtami } from "./on-kapi.mts";
import { kok, kayitlariOku as sunuculariOku } from "./sunucu.mts";
import { yayinla } from "./yayin.mts";
import {
  kayittanSiteKlasoru,
  yayinGoruntusunuHazirla,
  yayinKilitleri,
} from "./yayin-hazirligi.mts";

let gecici: string | undefined;
try {
  const [klasor, ortam] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami) {
    throw new Error(`Kullanım: pnpm yayinla siteler/<kod adı> ${yayinOrtami}`);
  }
  const kayit = yayinKilitleri();
  console.log(`kilitler    geçti (kayıt ${kayit.slice(0, 12)})`);
  const yerel = kayittanSiteKlasoru(kayit, klasor);
  gecici = dirname(dirname(yerel));
  const sonuc = siteKlasorunuDogrula(yerel);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kimlik } = sonuc.site;
  // Sunucu denetimi kırmızıysa yayın yapılmaz (hızlı kapı taramasıyla, yaklaşık bir dakika).
  // Yalnız bu sitenin yayındaki kutusuyla ilgili bir ölçüm kırmızıysa yayın sürer: bozuk bir
  // siteye düzeltme yayınlanabilmeli.
  const denetim = spawnSync("node", [join(kok, "komutlar", "sunucu-denetle.mts"), "--hizli"], {
    encoding: "utf8",
  });
  const kalanlar = (denetim.stdout ?? "").split("\n").filter((satir) => satir.startsWith("HATA"));
  // Süzgeç yalnız denetim sonuna kadar çalıştıysa geçerlidir: özet satırındaki sayı HATA satırlarının
  // sayısıyla aynı olmalı, hata çıktısı boş olmalı. Sitenin numarası yoksa süzgeç geçirmez.
  const ozet = (denetim.stdout ?? "").match(/Denetim kırmızı: (\d+) ölçüm tutmadı\./);
  const tamamlandi =
    ozet !== null && Number(ozet[1]) === kalanlar.length && !denetim.stderr?.trim();
  const buSiteninki = (satir: string) =>
    satir.includes(`${yayinOrtami}/${kimlik.kodAdi} yayındaki kutusu`) &&
    !satir.includes("site numarası yok");
  if (
    denetim.status !== 0 &&
    (!tamamlandi || kalanlar.length === 0 || !kalanlar.every(buSiteninki))
  ) {
    throw new Error(
      `Sunucu denetimi kırmızı, yayın yapılmaz:\n  ${kalanlar.filter((k) => !buSiteninki(k)).join("\n  ") || denetim.stderr.trim()}`,
    );
  }
  console.log(
    denetim.status === 0
      ? "denetim     sunucu denetimi yeşil"
      : `denetim     yalnız bu sitenin kutusu kırmızı, düzeltme yayını sürüyor: ${kalanlar.join("; ")}`,
  );
  const etiket = yayinGoruntusunuHazirla(kimlik.cekirdekSurumu, kayit);
  const [sunucu] = sunuculariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const yayin = await yayinla({
    ipv4: sunucu.ipv4,
    ortam: yayinOrtami,
    kimlik,
    siteNumarasi: siteNumarasiAl(kimlik.kodAdi),
    klasor: yerel,
    etiket,
    kayit,
    yaz: (satir) => console.log(satir),
  });
  if (yayin.sonuc !== "basarili") throw new Error(`Yayın ${yayin.no} başarısız: ${yayin.neden}`);
  console.log(`yayında     ${kimlik.kodAdi} yayın ${yayin.no}, sürüm ${yayin.surum}`);
  if (yayin.neden) console.log(yayin.neden);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
} finally {
  // Kayıttan çıkarılan geçici klasör silinir.
  if (gecici) rmSync(gecici, { recursive: true, force: true });
}
