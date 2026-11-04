// Çekirdeğin Docker görüntüsünü denetler (kart 0015, karar 0027). Görüntüde .env dosyası,
// site klasörü, sitenin adı ya da .env'deki bir gizli değer varsa, görüntü kök kullanıcıyla
// çalışıyorsa ya da sürüm etiketi çekirdek sürümüyle uyuşmuyorsa kırmızı biter.
// Çalıştırma: pnpm cekirdek-goruntusu-denetle [görüntü]   (verilmezse cekirdek:<sürüm>)
//             pnpm cekirdek-goruntusu-denetle --kendi-testi
//               (bilerek bozulmuş bir görüntü üretir ve kontrolün onu yakaladığını gösterir)

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { cekirdekSurumu } from "../cekirdek/surum.ts";

const kok = join(import.meta.dirname, "..");
// Görüntünün adı yalnız burada yazar. Bu bilgisayarda başka projelerin "cekirdek" adlı
// görüntüleri olabildiği için ad altyapının yerel ortamıyla (altyapi-yerel) aynı önekle başlar.
export const goruntuAdi = "altyapi-cekirdek";
export const goruntuEtiketi = `${goruntuAdi}:${cekirdekSurumu}`;

const docker = (argumanlar: string[], girdi?: string) =>
  spawnSync("docker", argumanlar, { encoding: "utf8", input: girdi, maxBuffer: 64 * 1024 * 1024 });

// .env'deki değerler. Kısa değerler (port gibi) gizli sayılmaz, rastlantıyla eşleşir.
const gizliDegerler = (): { ad: string; deger: string }[] => {
  const dosya = join(kok, ".env");
  if (!existsSync(dosya)) return [];
  const degerler = Object.entries(parseEnv(readFileSync(dosya, "utf8")));
  return degerler.flatMap(([ad, deger = ""]) => {
    const parcalar = [deger];
    // Adresin içindeki şifre ayrıca aranır.
    if (URL.canParse(deger)) parcalar.push(decodeURIComponent(new URL(deger).password));
    return parcalar.filter((parca) => parca.length >= 8).map((parca) => ({ ad, deger: parca }));
  });
};

// Kayıttaki sitelerin kod adı ve görünen adı. Derlemede site okunsaydı görüntüde geçerdi.
const siteAdlari = (): string[] =>
  readdirSync(join(kok, "siteler"), { withFileTypes: true })
    .filter((girdi) => girdi.isDirectory())
    .flatMap((girdi) => {
      const { kimlik } = siteKlasorunuOku(join(kok, "siteler", girdi.name));
      return [kimlik.kodAdi, kimlik.gorunenAd];
    });

type Bilgi = { Config: { User?: string; Env?: string[]; Labels?: Record<string, string> } };

export const goruntuyuDenetle = (goruntu: string): string[] => {
  const sorunlar: string[] = [];
  const inceleme = docker(["image", "inspect", goruntu]);
  if (inceleme.status !== 0) return [`${goruntu}: görüntü bulunamadı.`];
  const [bilgi] = JSON.parse(inceleme.stdout) as Bilgi[];
  const ayar = bilgi?.Config ?? {};

  const kullanici = ayar.User ?? "";
  if (kullanici === "" || kullanici === "root" || kullanici.split(":")[0] === "0") {
    sorunlar.push(`kullanıcı: görüntü kök kullanıcıyla çalışıyor ("${kullanici || "tanımsız"}").`);
  }
  const surum = ayar.Labels?.["org.opencontainers.image.version"];
  if (surum !== cekirdekSurumu) {
    sorunlar.push(`sürüm etiketi: "${surum}", çekirdeğin sürümü "${cekirdekSurumu}".`);
  }

  const gizliler = gizliDegerler();
  const gizliAdlar = new Set(gizliler.map(({ ad }) => ad));
  for (const satir of ayar.Env ?? []) {
    const [ad = ""] = satir.split("=");
    if (gizliAdlar.has(ad)) sorunlar.push(`ortam: görüntüye gizli değişken yazılmış (${ad}).`);
  }

  // Dosya adları ve içerikleri kutunun içinde, ağsız ve geçici bir kutuda taranır.
  // Aranan değerler kutuya komut satırıyla değil standart girdiyle gider.
  const aranan = [...new Set([...gizliler.map(({ deger }) => deger), ...siteAdlari()])];
  const betik = [
    "cat > /tmp/aranan",
    "find / -xdev \\( -name '.env' -o -name '.env.*' -o -name kimlik.json -o -name ayarlar.json -o -name KURALLAR.md -o -type d -name siteler \\) -print | sed 's/^/ad: /'",
    "find / -xdev -type f ! -path /tmp/aranan -print0 | xargs -0 grep -lF -f /tmp/aranan | sed 's/^/icerik: /'",
    "true",
  ].join("; ");
  const tarama = docker(
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--user",
      "root",
      "--entrypoint",
      "sh",
      goruntu,
      "-c",
      betik,
    ],
    `${aranan.join("\n")}\n`,
  );
  if (tarama.status !== 0) return [...sorunlar, `tarama çalışmadı: ${tarama.stderr.trim()}`];
  for (const satir of tarama.stdout.split("\n").filter(Boolean)) {
    if (satir.startsWith("ad: "))
      sorunlar.push(`dosya: görüntüde olmaması gereken dosya var (${satir.slice(4)}).`);
    if (satir.startsWith("icerik: ")) {
      sorunlar.push(`içerik: ${satir.slice(8)} dosyasında gizli değer ya da site adı geçiyor.`);
    }
  }

  const kimlik = docker(["run", "--rm", "--network", "none", "--entrypoint", "id", goruntu, "-u"]);
  if (kimlik.stdout.trim() === "0")
    sorunlar.push("kullanıcı: kutu kök kullanıcıyla açılıyor (id 0).");

  return sorunlar;
};

const sonucuYaz = (goruntu: string, sorunlar: string[]): boolean => {
  if (sorunlar.length === 0) {
    console.log(`geçti       ${goruntu}`);
    return true;
  }
  console.error(`kaldı       ${goruntu}`);
  for (const sorun of sorunlar) console.error(`  ${sorun}`);
  return false;
};

// Bilerek bozulmuş görüntü: kök kullanıcı, .env dosyası, site klasörü ve gömülü gizli değer.
const kendiTesti = (): boolean => {
  const bozuk = `${goruntuAdi}-bozuk-ornek:${cekirdekSurumu}`;
  const gizli = gizliDegerler()[0]?.deger ?? "deneme-gizli-deger-123";
  const dockerfile = [
    `FROM ${goruntuEtiketi}`,
    "USER root",
    // Değer derleme argümanıyla gelir, Dockerfile'a ve komut satırına yazılmaz.
    "ARG GIZLI",
    "RUN mkdir -p /uygulama/siteler/deneme && echo '{}' > /uygulama/siteler/deneme/kimlik.json",
    `RUN printf 'GIZLI=%s\\n' "$GIZLI" > /uygulama/.env`,
    'LABEL org.opencontainers.image.version="0.0.0"',
  ].join("\n");
  const uretim = spawnSync("docker", ["build", "-q", "-t", bozuk, "--build-arg", "GIZLI", "-"], {
    encoding: "utf8",
    input: `${dockerfile}\n`,
    env: { ...process.env, GIZLI: gizli },
  });
  if (uretim.status !== 0) {
    console.error(`Bozuk örnek üretilemedi: ${uretim.stderr.trim()}`);
    return false;
  }
  const sorunlar = goruntuyuDenetle(bozuk);
  docker(["image", "rm", "-f", bozuk]);
  const beklenen = ["kullanıcı:", "sürüm etiketi:", "dosya:", "içerik:"];
  const eksik = beklenen.filter((onek) => !sorunlar.some((sorun) => sorun.startsWith(onek)));
  for (const onek of beklenen) {
    console.log(`${eksik.includes(onek) ? "KAÇTI     " : "yakalandı "}  ${onek.slice(0, -1)}`);
  }
  return eksik.length === 0;
};

if (import.meta.main) {
  const [arguman] = process.argv.slice(2);
  const gecti =
    arguman === "--kendi-testi"
      ? kendiTesti()
      : sonucuYaz(arguman ?? goruntuEtiketi, goruntuyuDenetle(arguman ?? goruntuEtiketi));
  process.exit(gecti ? 0 : 1);
}
