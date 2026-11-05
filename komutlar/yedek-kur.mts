// Yedek işini sunucuya kurar (kart 0024, karar 0037). Tekrar çalıştırılabilir.
//
//   pnpm yedek-kur
//
// Veritabanı açılmış her site için anahtar çifti yoksa üretir: açma anahtarı yalnız bu bilgisayara
// (~/.altyapi/yedek-anahtarlari), açık anahtar sunucu/yedek/ayar.json'a yazılır. Kovayı silme
// kilidiyle açar. Betikleri, depo anahtarını ve zamanlayıcıyı sunucuya kurar.
// Yeni site açılınca yeniden çalıştırılır ve yeni açma anahtarının kopyası şifre yöneticisine konur.

import { type Ortam, ortamMi } from "./gizli-bilgi.mts";
import { kayitlariOku } from "./sunucu.mts";
import { siteListesiniOku, sunucudaCalistir, veritabaniOrtamlari } from "./sunucu-veritabani.mts";
import {
  acikAnahtariOku,
  anahtarCiftiUret,
  anahtarDosyasi,
  anahtarDosyasiniYaz,
  ayariOku,
  ayariYaz,
  depoAnahtarlari,
  depoAyariMetni,
  kokBetigi,
  kurmaBetigi,
  type YedekAyari,
} from "./yedek.mts";

const siteleriHazirla = (ipv4: string, ayar: YedekAyari, ortam: Ortam): string[] => {
  const yeniler: string[] = [];
  const siteler = { ...(ayar.siteler[ortam] ?? {}) };
  for (const kodAdi of siteListesiniOku(ipv4, ortam)) {
    if (siteler[kodAdi]) continue;
    let acik = acikAnahtariOku(ortam, kodAdi);
    if (!acik) {
      const cift = anahtarCiftiUret();
      anahtarDosyasiniYaz(ortam, kodAdi, cift.metin);
      acik = cift.acik;
      yeniler.push(anahtarDosyasi(ortam, kodAdi));
    }
    siteler[kodAdi] = { acik_anahtar: acik, saklama_gun: ayar.varsayilan_saklama_gun };
    console.log(`eklendi     ${ortam}/${kodAdi}: ${ayar.varsayilan_saklama_gun} gün`);
  }
  ayar.siteler[ortam] = siteler;
  return yeniler;
};

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const ayar = ayariOku();
  const { erisim, gizli } = depoAnahtarlari();
  const depoAyari = depoAyariMetni(ayar.depo.konum, erisim, gizli);
  const yeniler: string[] = [];
  for (const ortam of veritabaniOrtamlari.filter(ortamMi)) {
    yeniler.push(...siteleriHazirla(sunucu.ipv4, ayar, ortam));
    ayariYaz(ayar);
    const cikti = sunucudaCalistir(sunucu.ipv4, kurmaBetigi(ayar, ortam, depoAyari), 600_000);
    if (!cikti.includes("yedek=kuruldu")) throw new Error(`Kurulum bitmedi: ${cikti}`);
    // Kova varsa dokunulmaz. Silme kilidi yalnız kova açılırken etkinleşir; kilidin çalıştığını
    // pnpm yedek-denemesi ölçer, kilitli kovada sürümleme kapatılamaz.
    const surumleme = sunucudaCalistir(
      sunucu.ipv4,
      kokBetigi(
        `rc ${ortam} mkdir "depo:$KOVA" --s3-bucket-object-lock-enabled\nrc ${ortam} backend versioning "depo:$KOVA"`,
      ),
    );
    if (!surumleme.includes("Enabled")) throw new Error("Kovada sürümleme açık değil.");
    console.log(
      `kuruldu     ${ortam}: betikler, depo anahtarı, zamanlayıcı, kova ${ayar.depo.kova}`,
    );
  }
  for (const yol of yeniler) {
    console.log(`\nYENİ AÇMA ANAHTARI: ${yol}\nKopyasını şifre yöneticinize koyun.`);
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
