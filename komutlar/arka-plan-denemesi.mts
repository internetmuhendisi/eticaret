// Arka plan kuyruğunun yayındaki sitede gerçek denemesi (kart 0031, karar 0049).
// Çalıştırma: pnpm arka-plan-denemesi siteler/<kod-adi>
//
// Yayındaki sitenin arka plan kutusunda örnek bir iş ile bilerek hata veren bir iş kuyruğa girer.
// Ölçülenler: iki kutu da ayakta ve sağlıklı; örnek iş bir denemede bitiyor; hatalı iş iki kez
// denenip hata olarak kalıyor; hata, işaretiyle, site adı ve sürümüyle hata izleme aracında bir kez
// görünüyor. Deneme kendi satırlarını siler; araçtaki kayıt kalır, işaretinden tanınır.
import { randomInt } from "node:crypto";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { arkaPlanDosyalari } from "../cekirdek/kayitlar/arka-plan.ts";
import { olaylariOku, olaySorunlari } from "./hata-izleme.mts";
import { arkaPlanKutuAdi } from "./kutu-kurali.mts";
import { hataIzlemeOrtami, siteKutusuAdi, yayindakiSiteleriOku, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { etkinYayinSurumu, kayitlariOku as yayinKayitlariniOku } from "./yayin.mts";

const harfler = "abcdefghijklmnopqrstuvwxyz";
const isaret = Array.from({ length: 16 }, () => harfler[randomInt(26)]).join("");

let hataSayisi = 0;
const olc = (gecti: boolean, ad: string, ayrinti = "") => {
  hataSayisi += Number(!gecti);
  console.log(`${gecti ? "tamam" : "HATA "}  ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

try {
  const [klasor] = process.argv.slice(2);
  if (!klasor) throw new Error("Kullanım: pnpm arka-plan-denemesi <site klasörü>");
  const dogrulama = siteKlasorunuDogrula(klasor);
  if (!dogrulama.gecerli) throw new Error(`${klasor} geçersiz: ${dogrulama.hatalar.join("; ")}`);
  const { kodAdi } = dogrulama.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const { ipv4 } = sunucu;
  const no = yayindakiSiteleriOku(ipv4)[kodAdi];
  if (no === undefined) throw new Error(`${kodAdi} yayında değil. Önce: pnpm yayinla`);
  const surum = etkinYayinSurumu(yayinKayitlariniOku(ipv4, yayinOrtami, kodAdi), no);
  if (surum === undefined) throw new Error(`${kodAdi} yayınının sürümü kayıtta yok.`);
  const site = siteKutusuAdi(yayinOrtami, kodAdi, no);
  const kutu = arkaPlanKutuAdi(site);
  console.log(`işaret      ${isaret}`);

  for (const ad of [site, kutu]) {
    const durum = sshKomutu(ipv4, `docker inspect -f '{{.State.Health.Status}}' ${ad}`);
    olc(durum.stdout.trim() === "healthy", `${ad} sağlıklı`, durum.stdout.trim());
  }

  const cikti = sshKomutu(ipv4, `docker exec ${kutu} node ${arkaPlanDosyalari.deneme} ${isaret}`, {
    sure: 120_000,
  });
  const satir = (ad: string) => cikti.stdout.match(new RegExp(`^${ad}=(.*)$`, "m"))?.[1];
  olc(
    satir("basarili") === "bitti 1",
    "örnek iş arka plan sürecinde bir denemede bitti",
    satir("basarili"),
  );
  olc(
    satir("hatali") === "hata 2",
    "hatalı iş yeniden denendi, hata olarak kaldı",
    satir("hatali"),
  );

  // Bugsink olayı kuyruktan işler; görünene kadar beklenir.
  let olaylar = olaylariOku(ipv4, hataIzlemeOrtami, kodAdi, isaret);
  for (let tur = 0; tur < 15 && olaylar.length === 0; tur++) {
    await new Promise((bekle) => setTimeout(bekle, 2000));
    olaylar = olaylariOku(ipv4, hataIzlemeOrtami, kodAdi, isaret);
  }
  const sorunlar =
    olaylar.length === 1 && olaylar[0]
      ? olaySorunlari(olaylar[0], {
          site: kodAdi,
          surum,
          ortam: hataIzlemeOrtami,
          kaynak: "sunucu",
        })
      : [`araçta ${olaylar.length} kayıt`];
  olc(
    sorunlar.length === 0,
    "hata, hata izleme aracında bir kez, etiketli ve maskeli",
    sorunlar.join("; "),
  );

  const bellek = sshKomutu(
    ipv4,
    `docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' ${site} ${kutu}`,
  );
  for (const metin of bellek.stdout.trim().split("\n")) console.log(`bellek      ${metin}`);
} catch (hata) {
  olc(false, "deneme çalıştı", (hata as Error).message);
}
console.log(hataSayisi === 0 ? "Deneme yeşil." : `Deneme kırmızı: ${hataSayisi} ölçüm kaldı.`);
process.exit(hataSayisi === 0 ? 0 : 1);
