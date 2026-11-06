// Yedek işini sunucuya kurar (kart 0024, karar 0037). Tekrar çalıştırılabilir.
//
//   pnpm yedek-kur
//
// Veritabanı açılmış her site için anahtar çifti yoksa üretir: açma anahtarı yalnız bu bilgisayara
// (~/.altyapi/yedek-anahtarlari), açık anahtar sunucu/yedek/ayar.json'a yazılır. Kovayı silme
// kilidiyle açar. Betikleri, depo anahtarını ve zamanlayıcıyı sunucuya kurar.
// Yeni site açılınca yeniden çalıştırılır ve yeni açma anahtarının kopyası şifre yöneticisine konur.

import { type Ortam, ortamMi } from "./gizli-bilgi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
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
  kayitlariCoz,
  kokBetigi,
  kurmaBetigi,
  type YedekAyari,
  yedekAlmaBetigi,
  yedekKoku,
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

// Uyarı kurulum yarıda kalsa da basılır: ikinci çalıştırmada bu anahtar "yeni" sayılmaz.
const yeniler: string[] = [];
try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const ayar = ayariOku();
  const { erisim, gizli } = depoAnahtarlari();
  const depoAyari = depoAyariMetni(ayar.depo.konum, erisim, gizli);
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
    // Başarılı gece kaydı olmayan sitenin ilk yedeği alınır: denetim ilk geceyi beklemesin. Ayardan
    // değil kayıttan bakılır, yarıda kalan kurulum sonraki çalıştırmada tamamlanır.
    const kayit = sshKomutu(
      sunucu.ipv4,
      `sudo sh -c 'cat ${yedekKoku}/kayit.jsonl 2>/dev/null || true'`,
    );
    if (kayit.status !== 0) throw new Error(`Yedek kaydı okunamadı: ${kayit.stderr.trim()}`);
    const kayitlar = kayitlariCoz(kayit.stdout);
    for (const kodAdi of Object.keys(ayar.siteler[ortam] ?? {})) {
      const var_ = kayitlar.some(
        (k) => k.ortam === ortam && k.site === kodAdi && k.tur === "gece" && k.sonuc === "basarili",
      );
      if (var_) continue;
      const ilk = sunucudaCalistir(sunucu.ipv4, yedekAlmaBetigi(ortam, kodAdi, "gece"), 900_000);
      console.log(ilk.trim());
    }
    console.log(
      `kuruldu     ${ortam}: betikler, depo anahtarı, zamanlayıcı, kova ${ayar.depo.kova}`,
    );
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
} finally {
  for (const yol of yeniler) {
    console.log(`\nYENİ AÇMA ANAHTARI: ${yol}\nKopyasını şifre yöneticinize koyun.`);
  }
}
