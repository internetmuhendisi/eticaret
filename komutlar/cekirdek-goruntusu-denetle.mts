// Çekirdeğin Docker görüntüsünü denetler (kart 0015, karar 0027). Görüntüde .env dosyası,
// site klasörü, sitenin adı ya da .env'deki bir gizli değer varsa, görüntü kök kullanıcıyla
// çalışıyorsa ya da sürüm etiketi çekirdek sürümüyle uyuşmuyorsa kırmızı biter.
// Tarama kendi izini bulamazsa (araç eksik, adım hata verdi) kırmızı biter, sessizce geçmez.
// Çalıştırma: pnpm cekirdek-goruntusu-denetle [görüntü]   (verilmezse altyapi-cekirdek:<sürüm>)
//             pnpm cekirdek-goruntusu-denetle --kendi-testi
//               (bilerek bozulmuş bir görüntü üretir ve kontrolün onu yakaladığını gösterir)

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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
// Görüntünün üretildiği kayıt (cekirdek-goruntusu.mts yazar, yayın komutu okur).
export const kayitEtiketi = "org.opencontainers.image.revision";

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

// Kutudaki tarama betiği. Aranan değerlerin ilk satırı bir izdir: betik izi bir dosyaya ve
// bir .env dosyasına yazar, her grep çağrısına izin dosyasını da ekler. Tarama gerçekten
// çalıştıysa iz iki taramada da bulunur; bulunmazsa ya da bir adım hata verirse denetim kırmızıdır.
const izKlasoru = "/tmp/denetim-izi";
const taramaBetigi = [
  "set -eo pipefail",
  "cat > /tmp/aranan",
  `mkdir ${izKlasoru}`,
  `head -n 1 /tmp/aranan > ${izKlasoru}/icerik`,
  `: > ${izKlasoru}/.env`,
  "find / -xdev \\( -name '.env' -o -name '.env.*' -o -name kimlik.json -o -name ayarlar.json -o -name KURALLAR.md -o -type d -name siteler \\) -print | sed 's/^/ad: /'",
  `find / -xdev -type f ! -path /tmp/aranan -print0 | xargs -0 sh -c 'grep -lF -f /tmp/aranan "$@" ${izKlasoru}/icerik' _ | sed 's/^/icerik: /'`,
  "echo tarama-bitti",
].join("\n");

export const goruntuyuDenetle = (goruntu: string, ekAranan: string[] = []): string[] => {
  const sorunlar: string[] = [];
  const inceleme = docker(["image", "inspect", goruntu]);
  if (inceleme.status !== 0) return [`${goruntu}: görüntü bulunamadı.`];
  const gecmis = docker(["history", "--no-trunc", "--format", "{{.CreatedBy}}", goruntu]);
  if (gecmis.status !== 0) return [`${goruntu}: görüntünün geçmişi okunamadı.`];
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

  const gizliler = [...gizliDegerler().map(({ deger }) => deger), ...ekAranan];
  const gizliAdlar = new Set(gizliDegerler().map(({ ad }) => ad));
  for (const satir of ayar.Env ?? []) {
    const [ad = ""] = satir.split("=");
    if (gizliAdlar.has(ad)) sorunlar.push(`ortam: görüntüye gizli değişken yazılmış (${ad}).`);
  }

  // Görüntünün bilgi alanları (ortam, etiketler, katmanların komutları) gizli değer için
  // burada, kutu açılmadan taranır. Değerin kendisi hiçbir zaman yazılmaz.
  const bilgiMetni = `${inceleme.stdout}\n${gecmis.stdout}`;
  if (gizliler.some((deger) => bilgiMetni.includes(deger))) {
    sorunlar.push("bilgi: görüntünün bilgi alanlarında ya da geçmişinde gizli değer geçiyor.");
  }

  // Dosya adları ve içerikleri kutunun içinde, ağsız ve geçici bir kutuda taranır.
  // Aranan değerler kutuya komut satırıyla değil standart girdiyle gider.
  const iz = `denetim-izi-${randomUUID()}`;
  const aranan = [iz, ...new Set([...gizliler, ...siteAdlari()])];
  const betik = taramaBetigi;
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
  const satirlar = new Set(tarama.stdout.split("\n").filter(Boolean));
  const izIcerigi = `icerik: ${izKlasoru}/icerik`;
  const izAdi = `ad: ${izKlasoru}/.env`;
  if (
    tarama.status !== 0 ||
    !satirlar.has("tarama-bitti") ||
    !satirlar.has(izIcerigi) ||
    !satirlar.has(izAdi)
  ) {
    return [
      ...sorunlar,
      `tarama: kutu içindeki tarama çalışmadı (${tarama.stderr.trim().split("\n")[0] || "iz bulunamadı"}).`,
    ];
  }
  for (const satir of satirlar) {
    if (satir === izIcerigi || satir === izAdi || !satir.includes(": ")) continue;
    if (satir.startsWith("ad: ")) {
      sorunlar.push(`dosya: görüntüde olmaması gereken dosya var (${satir.slice(4)}).`);
    }
    if (satir.startsWith("icerik: ")) {
      sorunlar.push(`içerik: ${satir.slice(8)} dosyasında gizli değer ya da site adı geçiyor.`);
    }
  }

  const kimlik = docker(["run", "--rm", "--network", "none", "--entrypoint", "id", goruntu, "-u"]);
  const kullaniciNo = kimlik.stdout.trim();
  if (kimlik.status !== 0 || !/^\d+$/.test(kullaniciNo)) {
    sorunlar.push("kullanıcı: kutunun kullanıcısı okunamadı.");
  } else if (kullaniciNo === "0") {
    sorunlar.push("kullanıcı: kutu kök kullanıcıyla açılıyor (id 0).");
  }

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

// Bilerek bozulmuş görüntü: kök kullanıcı, yanlış sürüm etiketi, .env dosyası, site klasörü,
// dosyaya ve etikete gömülmüş gizli değer. Gizli değer uydurmadır, her çalışmada yeniden
// üretilir; .env'deki gerçek değerler bozuk örneğe hiçbir zaman verilmez, çünkü Docker
// derleme argümanlarını ve komutlarını kendi derleme kaydında saklar.
// İkinci bozuk örnek grep'i olmayan görüntüdür: tarama çalışamaz, denetim sessizce geçmemelidir.
const bozukOrnegiDenetle = (
  ad: string,
  satirlar: string[],
  ekAranan: string[],
  beklenen: string[],
): string[] => {
  const bozuk = `${goruntuAdi}-${ad}:${cekirdekSurumu}`;
  const uretim = docker(
    ["build", "-q", "-t", bozuk, "-"],
    `${[`FROM ${goruntuEtiketi}`, ...satirlar].join("\n")}\n`,
  );
  if (uretim.status !== 0) {
    console.error(`Bozuk örnek üretilemedi (${ad}): ${uretim.stderr.trim()}`);
    return beklenen;
  }
  const sorunlar = goruntuyuDenetle(bozuk, ekAranan);
  docker(["image", "rm", "-f", bozuk]);
  const eksik = beklenen.filter((onek) => !sorunlar.some((sorun) => sorun.startsWith(onek)));
  for (const onek of beklenen) {
    console.log(`${eksik.includes(onek) ? "KAÇTI     " : "yakalandı "}  ${onek.slice(0, -1)}`);
  }
  return eksik;
};

const kendiTesti = (): boolean => {
  const sahteGizli = `sahte-gizli-${randomUUID()}`;
  const eksikler = [
    ...bozukOrnegiDenetle(
      "bozuk-ornek",
      [
        "USER root",
        "RUN mkdir -p /uygulama/siteler/deneme && echo '{}' > /uygulama/siteler/deneme/kimlik.json",
        `RUN echo 'GIZLI=${sahteGizli}' > /uygulama/.env`,
        `LABEL org.opencontainers.image.version="0.0.0" deneme="${sahteGizli}"`,
      ],
      [sahteGizli],
      ["kullanıcı:", "sürüm etiketi:", "bilgi:", "dosya:", "içerik:"],
    ),
    ...bozukOrnegiDenetle(
      "grepsiz-ornek",
      ["USER root", "RUN rm /bin/grep", "USER node"],
      [],
      ["tarama:"],
    ),
  ];
  return eksikler.length === 0;
};

if (import.meta.main) {
  const [arguman] = process.argv.slice(2);
  const gecti =
    arguman === "--kendi-testi"
      ? kendiTesti()
      : sonucuYaz(arguman ?? goruntuEtiketi, goruntuyuDenetle(arguman ?? goruntuEtiketi));
  process.exit(gecti ? 0 : 1);
}
