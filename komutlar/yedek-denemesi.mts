// Yedeğin sunucudaki denemesi (kart 0024, karar 0037). Çalıştırma: pnpm yedek-denemesi
//
// Geçici bir deneme sitesi bilinen verilerle kurulur, kısa süreli kilitle yedeklenir. Ölçülenler:
// - Yedek depoda, şifreli (bilinen veri dosyada geçmiyor), sonucu kayıtta.
// - Süresi dolmamış yedek kalıcı silinemiyor; silme işareti kaldırılınca yedek geri geliyor.
// - Prova yeşil; başka sitenin anahtarı yedeği açamıyor; bozuk dosya reddediliyor.
// - Geri yükleme veriyi yedekteki hâline döndürüyor, önce o anki durumun yedeğini alıyor; eski şifre
//   artık bağlanamıyor, yeni şifre bağlanıyor; Örnek Mağaza'nın veritabanı değişmiyor; ara
//   veritabanı kalmıyor.
// - Süresi dolan yedek temizleniyor, yeni yedek kalıyor.
// - Depo yalnız kendi veri merkezinden görünüyor.
// - Dosyalar (kart 0093, karar 0207): dosya yedeği depoda ve şifreli, süresi dolmamış kopyası kalıcı silinemiyor,
//   başka sitenin anahtarı açamıyor; prova dosyaları karşılaştırıyor; geri yükleme diskten giden dosyaları aynı
//   içerikle ve sitenin kullanıcısına ait olarak geri getiriyor, sonradan eklenen dosyaya dokunmuyor.
// Sonunda deneme sitesi, anahtarları, dosya klasörü ve depodaki dosyaları silinir. Değerler ekrana basılmaz.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import {
  denemeSiteNumarasi,
  gizliKlasor,
  gizliKok,
  kutuKullanicisi,
  type Ortam,
  silmeBetigi,
} from "./gizli-bilgi.mts";
import { guvenliOturum } from "./site-ust-bilgi.mts";
import { kayitlariOku, kok, sshKomutu } from "./sunucu.mts";
import {
  postgresGoruntusu,
  siteAgi,
  siteVeritabaniniHazirla,
  sunucudaCalistir,
  veritabaniKutusu,
  veritabaniKutusunuKur,
} from "./sunucu-veritabani.mts";
import { sunucuDosyaKlasoru } from "./yayin.mts";
import {
  anahtarCiftiUret,
  ayariOku,
  degistirmeBetigi,
  dosyaYedegiBetigi,
  geriAlmaBetigi,
  geriYukle,
  kaydaYazBetigi,
  kayitlariCoz,
  kokBetigi,
  konumHatalari,
  konumOlcmeBetigi,
  ozetFarklari,
  ozetiOku,
  provaYap,
  siteBilgisiSatiri,
  sonYedegiBulBetigi,
  tabloOzetiKomutu,
  yanaAcmaBetigi,
  yedekAlmaBetigi,
  yedekKoku,
} from "./yedek.mts";

const ortam: Ortam = "deneme";
const ornek = siteKlasorunuOku(`${kok}/siteler/ornek-magaza`).kimlik;
const a = ornek.kodAdi;
const b = { kodAdi: "yd-deneme", numara: denemeSiteNumarasi, surum: ornek.cekirdekSurumu };
const db = siteVeritabaniAdi(b.kodAdi);
const dbKutusu = veritabaniKutusu(ortam);
const kilitSn = 120;
const marjSn = 30;
const isaret = `BILINEN-VERI-${randomBytes(8).toString("hex")}`;

const sonuclar: { ad: string; gecti: boolean }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  sonuclar.push({ ad, gecti });
  console.log(`${gecti ? "tamam " : "HATA  "} ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

const [sunucu] = kayitlariOku();
if (!sunucu) {
  console.error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  process.exit(1);
}
const { ipv4 } = sunucu;
const calistir = (betik: string, sure = 600_000) => sunucudaCalistir(ipv4, betik, sure);
const dene = (betik: string) => {
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure: 600_000 });
  return { durum: sonuc.status ?? 1, cikti: sonuc.stdout, hata: sonuc.stderr };
};
const bekle = (ms: number) => new Promise((bitti) => setTimeout(bitti, ms));

const sql = (komut: string, hedef = db): string =>
  calistir(
    `docker exec -i ${guvenliOturum} ${dbKutusu} psql -U postgres -d ${hedef} -At -v ON_ERROR_STOP=1 <<'SQL_SONU'\n${komut}\nSQL_SONU\n`,
  ).trim();

// Veritabanının özeti: Örnek Mağaza'nın değişmediğini ölçer. Yalnız özet döner, veri basılmaz. Sitenin
// kullanıcısıyla çalışır: yönetici olarak sitenin kodunu çalıştırmaz (karar 0206).
const veritabaniOzeti = (kodAdi: string) => {
  const hedef = siteVeritabaniAdi(kodAdi);
  const tablolar = calistir(`${tabloOzetiKomutu(dbKutusu, hedef, hedef)}\n`).trim();
  const metin = tablolar
    .split("\n")
    .map((satir) => `OZ tablo ${satir}`)
    .join("\n");
  return ozetiOku(`OZ sema sabit\n${metin}`, "OZ");
};

// Sitenin kullanıcısıyla, kendi ağından, verilen gizli bilgi dosyasıyla bağlanmayı dener.
const baglan = (dosya: string): { baglandi: boolean; satir: string } => {
  const u = kutuKullanicisi(ortam, b.numara);
  const sonuc = dene(`set -eu
sudo docker run --rm --network ${siteAgi(ortam, b.kodAdi)} --user ${u}:${u} --read-only --cap-drop ALL --security-opt no-new-privileges:true -v ${dosya}:/run/secrets/a:ro ${postgresGoruntusu} sh -c 'psql "$(cat /run/secrets/a)" -Atc "select count(*) from yedek_denemesi"' 2>&1 | grep -v -E 'postgres(ql)?://' || true
`);
  const satir = sonuc.cikti.trim();
  return { baglandi: /^\d+$/.test(satir), satir: satir.slice(0, 200) };
};

const depoTemizle = (): void => {
  dene(
    kokBetigi(`for onek in denemeler ${ortam}/${b.kodAdi}; do
  rc ${ortam} delete --min-age 0s "depo:$KOVA/$onek" >/dev/null 2>&1 || true
  rc ${ortam} backend cleanup-hidden "depo:$KOVA/$onek" >/dev/null 2>&1 || true
done`),
  );
};

let eskiKopya = "";
let sonYukleme = 0;
const siteBilgisi = `${yedekKoku}/siteler/${ortam}/${b.kodAdi}`;
const dosyaKlasoru = sunucuDosyaKlasoru(ortam, b.kodAdi);
// Bilinen dosyalar: içerikleri bilinen işareti taşır (şifre denetimi), üçüncüsü silinmiş işaretlidir.
const dosyalar = [1, 2, 3].map((sira) => {
  const icerik = `${isaret}-dosya-${sira}-${randomBytes(16).toString("hex")}`;
  const kimlik = randomUUID();
  return {
    kimlik,
    ad: `${kimlik}.pdf`,
    icerik,
    ozet: createHash("sha256").update(icerik).digest("hex"),
    silinmis: sira === 3,
  };
});
// Diskteki dosyaların özetleri, sahipleri ve izinleri: "<ad> <özet> <sahip> <izin>".
const diskOzeti = () =>
  calistir(
    `sudo sh -c 'cd ${dosyaKlasoru} && for f in *; do printf "%s %s %s\\n" "$f" "$(sha256sum < "$f" | cut -d" " -f1)" "$(stat -c "%u %a" "$f")"; done'\n`,
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();

const temizle = async (): Promise<void> => {
  // Kilit dolmadan dosya silinemez; kısa kilidin dolması beklenir.
  const kalan = sonYukleme + (kilitSn + 5) * 1000 - Date.now();
  if (sonYukleme > 0 && kalan > 0) await bekle(kalan);
  depoTemizle();
  dene(`set +e
${eskiKopya ? `sudo rm -f ${eskiKopya}` : "true"}
sudo rm -f ${siteBilgisi}
sudo rm -rf ${dosyaKlasoru}
printf '%s\\n' 'DROP DATABASE IF EXISTS "${db}__geri" WITH (FORCE);' 'DROP DATABASE IF EXISTS "${db}__eski" WITH (FORCE);' 'DROP DATABASE IF EXISTS "${db}" WITH (FORCE);' 'DROP ROLE IF EXISTS "${db}";' | docker exec -i ${dbKutusu} psql -U postgres -d postgres -q >/dev/null
${silmeBetigi(ortam, b.kodAdi).replace("set -eu", "true")}
`);
  try {
    veritabaniKutusunuKur(ipv4, ortam);
  } catch (hata) {
    console.error(`temizlik: ${(hata as Error).message}`);
  }
  dene(`docker network rm ${siteAgi(ortam, b.kodAdi)} >/dev/null 2>&1 || true\n`);
  console.log(
    `silindi     deneme sitesi ${b.kodAdi} (veritabanı, gizli bilgi, ağ, depodaki dosyalar)`,
  );
};

const adimlar = async (): Promise<void> => {
  const ayar = ayariOku();
  depoTemizle();

  const konum = dene(konumOlcmeBetigi(ortam));
  const konumSorunlari = konumHatalari(konum.cikti, ayar.depo.konum);
  olc(
    `depo yalnız ${ayar.depo.konum} ucundan görünüyor`,
    konum.durum === 0 && konumSorunlari.length === 0,
    konumSorunlari.join("; "),
  );

  siteVeritabaniniHazirla(ipv4, ortam, b);
  sql(
    `SET ROLE "${db}"; CREATE TABLE yedek_denemesi (no int PRIMARY KEY, metin text NOT NULL); INSERT INTO yedek_denemesi VALUES (1, '${isaret}'), (2, 'ikinci'), (3, 'ucuncu');`,
  );
  const cift = anahtarCiftiUret();
  const baskaCift = anahtarCiftiUret();
  calistir(
    kokBetigi(
      `printf '%s\\n' '${siteBilgisiSatiri(cift.acik, kilitSn, marjSn)}' > ${siteBilgisi}\nchmod 0400 ${siteBilgisi}`,
    ),
  );

  // Dosyalar diskte (sitenin kullanıcısına ait, 0600) ve kayıtta (sitenin rolüyle).
  const u0 = kutuKullanicisi(ortam, b.numara);
  calistir(
    kokBetigi(`install -d -m 0700 -o ${u0} -g ${u0} ${dosyaKlasoru}
${dosyalar.map((d) => `printf '%s' '${d.icerik}' > ${dosyaKlasoru}/${d.ad}\nchown ${u0}:${u0} ${dosyaKlasoru}/${d.ad}\nchmod 0600 ${dosyaKlasoru}/${d.ad}`).join("\n")}`),
  );
  sql(
    `SET ROLE "${db}"; INSERT INTO dosyalar (kimlik, tur, boyut, genislik, yukseklik, icerik_ozeti, silinme_zamani) VALUES ${dosyalar.map((d) => `('${d.kimlik}', 'pdf', ${d.icerik.length}, 0, 0, '${d.ozet}', ${d.silinmis ? "now()" : "NULL"})`).join(", ")};`,
  );

  const ilkCikti = calistir(yedekAlmaBetigi(ortam, b.kodAdi, "deneme"));
  sonYukleme = Date.now();
  const ilkAn = sonYukleme;
  const dosya = calistir(sonYedegiBulBetigi(ortam, b.kodAdi)).trim();
  olc("yedek alındı, depoda duruyor", dosya !== "" && ilkCikti.includes(dosya), dosya);
  const kayit = kayitlariCoz(calistir(`sudo cat ${yedekKoku}/kayit.jsonl\n`)).at(-1);
  olc(
    "sonuç kayda yazıldı",
    kayit?.site === b.kodAdi && kayit?.sonuc === "basarili" && (kayit?.boyut ?? 0) > 0,
    `${kayit?.sonuc} ${kayit?.boyut}`,
  );

  // Dosya yedeği: her dosya bir kez, şifreli; sonuç kayıtta.
  const dosyaCikti = calistir(dosyaYedegiBetigi(ortam, b.kodAdi));
  // Kopyalar kısa kilitle gider: temizlik kilidin dolmasını bekler. Yenileme payı saklama süresinin yarısıdır.
  const dosyaYuklemesi = Date.now();
  sonYukleme = dosyaYuklemesi;
  const dosyaKaydi = kayitlariCoz(calistir(`sudo cat ${yedekKoku}/kayit.jsonl\n`)).at(-1);
  olc(
    "dosya yedeği alındı, kayda yazıldı",
    dosyaKaydi?.tur === "dosya" && dosyaKaydi.sonuc === "basarili" && dosyaKaydi.dosya === "3",
    `${dosyaKaydi?.tur} ${dosyaKaydi?.sonuc} ${dosyaKaydi?.dosya} ${dosyaCikti.trim().slice(0, 80)}`,
  );
  const ikinciDosya = calistir(dosyaYedegiBetigi(ortam, b.kodAdi));
  const ikinciKayit = kayitlariCoz(calistir(`sudo cat ${yedekKoku}/kayit.jsonl\n`)).at(-1);
  olc(
    "ikinci dosya yedeği bir şey göndermiyor",
    ikinciKayit?.tur === "dosya" && ikinciKayit.dosya === "0",
    ikinciDosya.trim().slice(0, 80),
  );
  const kopyalar = calistir(
    kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${b.kodAdi}/dosyalar"`),
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const kopya = kopyalar.find((ad) => ad.startsWith(dosyalar[0]?.ad ?? "-")) ?? "";
  const uzakKopya = `"depo:$KOVA/${ortam}/${b.kodAdi}/dosyalar/${kopya}"`;
  const kopyaIcerigi = calistir(
    kokBetigi(`g=$(mktemp -p "$K/gecici")
trap 'rm -f "$g"' EXIT
rc ${ortam} cat ${uzakKopya} > "$g"
printf 'bas=%s\\n' "$(head -c 21 "$g")"
printf 'isaret=%s\\n' "$(grep -a -c '${isaret}' "$g" || true)"`),
  );
  olc(
    "dosya yedeği şifreli: üç dosyanın kopyası depoda, bilinen içerik geçmiyor",
    kopyalar.length === 3 &&
      kopyaIcerigi.includes("bas=age-encryption.org") &&
      kopyaIcerigi.includes("isaret=0"),
    `${kopyalar.length} kopya`,
  );
  const baskaAnahtarla = dene(
    kokBetigi(`anahtar='${baskaCift.acma}'
rc ${ortam} cat ${uzakKopya} | age -d -i <(printf '%s\\n' "$anahtar") >/dev/null`),
  );
  olc(
    "başka sitenin anahtarı dosya yedeğini açamıyor",
    baskaAnahtarla.durum !== 0 && /no identity matched/.test(baskaAnahtarla.hata),
    baskaAnahtarla.hata.trim().slice(0, 120),
  );
  dene(kokBetigi(`rc ${ortam} deletefile ${uzakKopya} >/dev/null 2>&1`));
  const kopyaSurumleri = calistir(
    kokBetigi(
      `rc ${ortam} lsf --files-only --s3-versions "depo:$KOVA/${ortam}/${b.kodAdi}/dosyalar"`,
    ),
  );
  const kopyaSurumu = kopyaSurumleri.split("\n").find((satir) => /-v\d{4}-/.test(satir)) ?? "";
  const kopyaSilme = dene(
    kokBetigi(
      `rc ${ortam} deletefile --s3-versions "depo:$KOVA/${ortam}/${b.kodAdi}/dosyalar/${kopyaSurumu}"`,
    ),
  );
  olc(
    "süresi dolmamış dosya yedeği kalıcı silinemiyor",
    kopyaSurumu !== "" && kopyaSilme.durum !== 0 && /object lock/.test(kopyaSilme.hata),
    kopyaSurumu ? "" : "sürüm bulunamadı",
  );
  // Silme işareti altındaki dosya görünmez: sonraki dosya yedeği yalnız onu yeniden gönderir. Öteki kopyalar
  // yenileme payı (kilitSn / 2) dolunca da gider; ölçüm ancak o süre dolmadan anlamlıdır, dolduysa kırmızıdır.
  calistir(dosyaYedegiBetigi(ortam, b.kodAdi));
  sonYukleme = Date.now();
  const gecen = Math.round((sonYukleme - dosyaYuklemesi) / 1000);
  const yeniden = kayitlariCoz(calistir(`sudo cat ${yedekKoku}/kayit.jsonl\n`)).at(-1);
  const gorunenler = calistir(
    kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${b.kodAdi}/dosyalar"`),
  );
  olc(
    "silme işaretli dosya bir sonraki dosya yedeğinde yeniden gidiyor, ötekiler gitmiyor",
    gecen < kilitSn / 2 - 5 &&
      yeniden?.tur === "dosya" &&
      yeniden.sonuc === "basarili" &&
      yeniden.dosya === "1" &&
      gorunenler.includes(dosyalar[0]?.ad ?? "-"),
    `${yeniden?.dosya} gönderildi, ilk gönderimden ${gecen} sn sonra (sınır ${kilitSn / 2 - 5} sn)`,
  );

  const uzak = `"depo:$KOVA/${ortam}/${b.kodAdi}/${dosya}"`;
  const icerik = calistir(
    kokBetigi(`g=$(mktemp -p "$K/gecici")
trap 'rm -f "$g"' EXIT
rc ${ortam} cat ${uzak} > "$g"
printf 'bas=%s\\n' "$(head -c 21 "$g")"
printf 'isaret=%s\\n' "$(grep -a -c '${isaret}' "$g" || true)"`),
  );
  olc(
    "yedek şifreli: bilinen veri dosyada geçmiyor",
    icerik.includes("bas=age-encryption.org") && icerik.includes("isaret=0"),
  );

  // Silme kilidi: sıradan silme yalnız işaret bırakır, sürümü kalıcı silmek reddedilir.
  dene(kokBetigi(`rc ${ortam} deletefile ${uzak} >/dev/null 2>&1`));
  const surumler = calistir(
    kokBetigi(`rc ${ortam} lsf --files-only --s3-versions "depo:$KOVA/${ortam}/${b.kodAdi}"`),
  );
  const surum = surumler.split("\n").find((satir) => /-v\d{4}-/.test(satir)) ?? "";
  const kaliciSilme = dene(
    kokBetigi(`rc ${ortam} deletefile --s3-versions "depo:$KOVA/${ortam}/${b.kodAdi}/${surum}"`),
  );
  olc(
    "süresi dolmamış yedek kalıcı silinemiyor",
    surum !== "" && kaliciSilme.durum !== 0 && /object lock/.test(kaliciSilme.hata),
    surum ? "" : "sürüm bulunamadı",
  );
  // Temizlik işareti kaldırır ve hata döner; alarm budur.
  const alarm = dene(`set -eu\nsudo ${yedekKoku}/gece.sh --temizle ${ortam} ${b.kodAdi}\n`);
  const alarmKaydi = kayitlariCoz(calistir(`sudo cat ${yedekKoku}/kayit.jsonl\n`)).at(-1);
  olc(
    "silme işareti temizlikte hata veriyor, kayda yazılıyor",
    alarm.durum !== 0 && alarmKaydi?.tur === "temizlik" && alarmKaydi?.sonuc === "basarisiz",
    alarmKaydi?.sebep ?? "",
  );
  calistir(kaydaYazBetigi(ortam, b.kodAdi, "temizlik-onay", "basarili", "", ""));
  const donen = calistir(sonYedegiBulBetigi(ortam, b.kodAdi)).trim();
  olc("silme işareti kalkınca yedek geri geliyor", donen === dosya, donen);

  const prova = provaYap(ipv4, ortam, b.kodAdi, dosya, cift.acma);
  olc(
    "prova: yedek ayrı veritabanına açıldı, içerik aynı",
    prova.farklar.length === 0 && prova.tablolar > 0 && prova.satirlar >= 3,
    prova.farklar.join("; ") || `${prova.tablolar} tablo, ${prova.satirlar} satır`,
  );
  olc(
    "prova: silinmemiş iki dosyanın depodaki kopyası ve diskteki hâli kayıtla tutuyor",
    prova.farklar.length === 0 && prova.dosyalar === 2,
    `${prova.dosyalar} dosya`,
  );

  // Ret sebebi de ölçülür: başka bir hata (ör. betik hatası) yanlışlıkla "reddedildi" sayılmasın.
  const provaHatasi = (dosyaAdi: string, acma: string): string => {
    try {
      provaYap(ipv4, ortam, b.kodAdi, dosyaAdi, acma);
      return "";
    } catch (hata) {
      return (hata as Error).message;
    }
  };
  const baskaHata = provaHatasi(dosya, baskaCift.acma);
  olc(
    "başka sitenin anahtarı yedeği açamıyor",
    /no identity matched/.test(baskaHata),
    baskaHata.slice(0, 120),
  );

  const bozukAd = dosya.replace(".dump.age", "-bozuk.dump.age");
  calistir(
    kokBetigi(`g=$(mktemp -d -p "$K/gecici")
trap 'rm -rf "$g"' EXIT
rc ${ortam} cat ${uzak} > "$g/${bozukAd}"
boyut=$(stat -c %s "$g/${bozukAd}")
printf 'X' | dd of="$g/${bozukAd}" bs=1 seek=$((boyut - 20)) conv=notrunc 2>/dev/null
RC_BAGLA="$g:/veri:ro" rc ${ortam} copyto "/veri/${bozukAd}" "depo:$KOVA/${ortam}/${b.kodAdi}/${bozukAd}"`),
  );
  const bozukHata = provaHatasi(bozukAd, cift.acma);
  olc(
    "bozuk yedek reddediliyor",
    /age: error|failed to decrypt/.test(bozukHata),
    bozukHata.slice(0, 120),
  );

  // Yer değiştirmeden sonra bir adım tutmazsa eski veritabanı yerine döner.
  sql(`SET ROLE "${db}"; INSERT INTO yedek_denemesi VALUES (9, 'geri-alma-isareti');`);
  calistir(yanaAcmaBetigi(ortam, b.kodAdi, dosya, cift.acma));
  calistir(degistirmeBetigi(ortam, b.kodAdi));
  const yerDegisti = sql("SELECT count(*) FROM yedek_denemesi WHERE no = 9;");
  calistir(geriAlmaBetigi(ortam, b.kodAdi));
  const yerineDondu = sql("SELECT count(*) FROM yedek_denemesi WHERE no = 9;");
  olc(
    "tutmayan geri yüklemede eski veritabanı yerine dönüyor",
    yerDegisti === "0" && yerineDondu === "1",
    `değişince ${yerDegisti}, geri alınınca ${yerineDondu}`,
  );
  // Canlı hiç yokken de önceki veri yerine gelir.
  calistir(yanaAcmaBetigi(ortam, b.kodAdi, dosya, cift.acma));
  calistir(degistirmeBetigi(ortam, b.kodAdi));
  sql(`DROP DATABASE "${db}" WITH (FORCE);`, "postgres");
  calistir(geriAlmaBetigi(ortam, b.kodAdi));
  olc(
    "canlı yokken de eski veritabanı yerine geliyor",
    sql("SELECT count(*) FROM yedek_denemesi WHERE no = 9;") === "1",
  );
  sql("DELETE FROM yedek_denemesi WHERE no = 9;");

  // Geri yükleme: veri değişir, yedek dönünce değişiklik gider; Örnek Mağaza etkilenmez.
  const ornekOnce = veritabaniOzeti(a);
  sql(
    `SET ROLE "${db}"; UPDATE yedek_denemesi SET metin = 'degisti' WHERE no = 2; INSERT INTO yedek_denemesi VALUES (4, 'sonradan'); DELETE FROM yedek_denemesi WHERE no = 3;`,
  );
  const gizliDosya = `${gizliKlasor(ortam, b.kodAdi)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const u = kutuKullanicisi(ortam, b.numara);
  eskiKopya = calistir(
    `set -eu\nk=$(sudo mktemp -p ${gizliKok} .deneme.XXXXXX)\nsudo cp ${gizliDosya} "$k"\nsudo chown ${u}:${u} "$k"\nsudo chmod 0400 "$k"\necho "$k"\n`,
  ).trim();
  const yedekSayisiOnce = calistir(
    `sudo grep -c '"tur":"geri-yukleme-oncesi".*"site":"${b.kodAdi}"\\|"site":"${b.kodAdi}".*"tur":"geri-yukleme-oncesi"' ${yedekKoku}/kayit.jsonl || true\n`,
  ).trim();
  const diskOnce = diskOzeti();
  const sonradan = `${randomUUID()}.pdf`;
  calistir(
    kokBetigi(`rm -f ${dosyaKlasoru}/${dosyalar[0]?.ad} ${dosyaKlasoru}/${dosyalar[1]?.ad}
printf 'sonradan' > ${dosyaKlasoru}/${sonradan}
chown ${u}:${u} ${dosyaKlasoru}/${sonradan}`),
  );
  await geriYukle(ipv4, ortam, b, dosya, cift.acma);
  sonYukleme = Date.now();
  const satirlar = sql("SELECT no || '=' || metin FROM yedek_denemesi ORDER BY no;");
  olc(
    "geri yükleme veriyi yedekteki hâline döndürdü",
    satirlar === `1=${isaret}\n2=ikinci\n3=ucuncu`,
    `${satirlar.split("\n").length} satır`,
  );
  const yedekSayisiSonra = calistir(
    `sudo grep -c '"site":"${b.kodAdi}".*"tur":"geri-yukleme-oncesi"' ${yedekKoku}/kayit.jsonl || true\n`,
  ).trim();
  olc(
    "geri yüklemeden önce o anki durumun yedeği alındı",
    Number(yedekSayisiSonra) > Number(yedekSayisiOnce),
    `${yedekSayisiOnce} → ${yedekSayisiSonra}`,
  );
  const diskSonra = diskOzeti();
  olc(
    "geri yükleme diskten giden dosyaları aynı içerikle, sitenin kullanıcısına ait getirdi",
    diskOnce.every((satir) => diskSonra.includes(satir)) &&
      dosyalar.every((d) =>
        diskSonra.some((satir) => satir.startsWith(`${d.ad} ${d.ozet} ${u} 600`)),
      ),
    `${diskOnce.length} → ${diskSonra.length} dosya`,
  );
  olc(
    "sonradan eklenen dosyaya dokunulmadı",
    diskSonra.some((satir) => satir.startsWith(`${sonradan} `)),
  );
  const sahip = sql(
    `SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '${db}'; SELECT tableowner FROM pg_tables WHERE tablename = 'yedek_denemesi';`,
  );
  olc("geri yüklenen veritabanı sitenin kullanıcısına ait", sahip === `${db}\n${db}`, sahip);
  const yeniBag = baglan(gizliDosya);
  olc("yeni şifreyle bağlanıyor", yeniBag.baglandi, yeniBag.satir);
  const eskiBag = baglan(eskiKopya);
  olc(
    "eski şifreyle bağlanamıyor",
    !eskiBag.baglandi && /password authentication failed/.test(eskiBag.satir),
    eskiBag.satir,
  );
  const artik = sql(
    `SELECT count(*) FROM pg_database WHERE datname LIKE '${db}\\_\\_%';`,
    "postgres",
  );
  olc("ara veritabanı kalmadı", artik === "0", artik);
  const ornekFarklari = ozetFarklari(ornekOnce, veritabaniOzeti(a));
  olc(`${a} etkilenmedi`, ornekFarklari.length === 0, ornekFarklari.join("; "));

  // Süresi dolan yedek temizlenir, yeni yedek kalır.
  const yeniCikti = calistir(yedekAlmaBetigi(ortam, b.kodAdi, "deneme"));
  sonYukleme = Date.now();
  const yeniDosya = yeniCikti.match(/\d{8}T\d{6}Z-[a-z-]+\.dump\.age/)?.[0] ?? "";
  const kalan = ilkAn + (kilitSn + marjSn + 5) * 1000 - Date.now();
  if (kalan > 0) await bekle(kalan);
  const temizlik = dene(`set -eu\nsudo ${yedekKoku}/gece.sh --temizle ${ortam} ${b.kodAdi}\n`);
  const kalanlar = calistir(
    kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${b.kodAdi}"`),
  );
  olc(
    "süresi dolan yedek silindi, yeni yedek kaldı",
    temizlik.durum === 0 && !kalanlar.includes(dosya) && kalanlar.includes(yeniDosya),
    temizlik.hata.trim().slice(-120),
  );
};

try {
  console.log(`${sunucu.ad}: geçici ${b.kodAdi} sitesiyle yedek deneniyor...`);
  await adimlar();
} catch (hata) {
  sonuclar.push({ ad: "deneme çalıştı", gecti: false });
  console.log(`HATA   deneme çalıştı  (${(hata as Error).message})`);
} finally {
  await temizle();
}

const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `Deneme yeşil: ${sonuclar.length} ölçüm geçti.`
    : `Deneme kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
