// Geri yüklemenin ve provanın dosya adımları (kart 0093, karar 0207), gerçek veritabanıyla. Sunucu betiğinin
// gövdesi bu bilgisayarda çalışır: ortak parça (ortak.sh) projedekidir, depo yerel bir klasördür (sahte rc),
// şifreleme yoktur (age kopyayı olduğu gibi verir; gerçek şifreleme pnpm yedek-denemesi ile sunucuda ölçülür).
// Dosya listesi sitenin kullanıcısıyla, kutunun yerel soketinden okunur (karar 0206).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { belgeKaydet, dosyaSil } from "../../cekirdek/moduller/dosya/servis.ts";
import type { Veritabani } from "../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../cekirdek/veritabani/testler/deneme-sitesi.ts";
import { dosyaFarklari, dosyaGetirmeBetigi, dosyaProvasi, ozetiOku } from "../yedek.mts";

const kok = join(import.meta.dirname, "..", "..");
const anahtar = `AGE-SECRET-KEY-1${"Q".repeat(58)}`;
const ozetle = (icerik: Buffer) => createHash("sha256").update(icerik).digest("hex");

const kutu = spawnSync(
  "docker",
  [
    ...["compose", "-f", join(kok, "sunucu", "compose.yaml"), "--env-file", join(kok, ".env")],
    ...["ps", "-q", "veritabani"],
  ],
  { encoding: "utf8" },
).stdout.trim();

let site: { vt: Veritabani; sil: () => Promise<void> };
let ad = "";
let kodAdi = "";
let gecici = "";
let canli = "";
let depo = "";
const adlar: string[] = [];

beforeAll(async () => {
  if (!kutu) throw new Error("Veritabanı kutusu bulunamadı (pnpm veritabani-baslat).");
  const acilan = await denemeSitesiAc("yedek-dosya");
  site = acilan;
  ad = decodeURIComponent(new URL(acilan.baglantiAdresi).pathname.slice(1));
  kodAdi = ad.replace(/^site_/, "").replaceAll("_", "-");
  gecici = mkdtempSync(join(tmpdir(), "yedek-dosyalar-"));
  canli = join(gecici, "dosyalar", "deneme", kodAdi);
  depo = join(gecici, "depo", "kova", "deneme", kodAdi, "dosyalar");
  mkdirSync(canli, { recursive: true });
  for (const metin of ["birinci", "ikinci", "silinecek"]) {
    const sonuc = await belgeKaydet(site.vt, Buffer.from(`%PDF-1.4 ${metin}`), canli);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    adlar.push(`${sonuc.dosya.kimlik}.pdf`);
  }
  // Silinmiş işaretli dosya listede yoktur: diskte olması gerekmez.
  const silinen = adlar.pop() as string;
  await dosyaSil(site.vt, silinen.replace(".pdf", ""));
  unlinkSync(join(canli, silinen));
}, 60_000);

afterAll(async () => {
  await site?.sil();
  if (gecici) rmSync(gecici, { recursive: true, force: true });
});

// Her testten önce depoda her dosyanın bir kopyası vardır (gece işinin yaptığı gibi).
beforeEach(() => {
  rmSync(join(gecici, "depo"), { recursive: true, force: true });
  mkdirSync(depo, { recursive: true });
  for (const a of adlar) copyFileSync(join(canli, a), join(depo, `${a}.20261101T000000Z.age`));
});

// Sunucu betiğinin kök kabuğundaki gövdesi, sahte depo ve araçlarla.
const calistir = (betik: string) => {
  const govde = betik
    .split("\n")
    .slice(betik.split("\n").findIndex((satir) => satir.includes("ortak.sh")) + 1)
    .join("\n")
    .replace(/\nKOK_SONU\n?$/, "")
    .replaceAll("veritabani-deneme", kutu);
  writeFileSync(join(gecici, "ayar"), "KOVA=kova\nRCLONE_GORUNTUSU=x\n");
  mkdirSync(join(gecici, "gecici"), { recursive: true });
  const sahte = `
rc() {
  shift
  local komut="$1"; shift
  case "$komut" in
    lsf)
      local yol="\${@: -1}"; yol="$DEPO/\${yol#depo:}"
      [ -d "$yol" ] || return 0
      (cd "$yol" && find . -type f | sed 's|^\\./||' | grep '^dosyalar/' | sort) ;;
    copy)
      local kaynak="$DEPO/\${1#depo:}" bag="\${RC_BAGLA%%:*}"
      mkdir -p "$bag/\${2#/g/}"
      while read -r f; do cp "$kaynak/$f" "$bag/\${2#/g/}/$f"; done <"$bag/\${4#/g/}" ;;
  esac
}
age() { cat; }
install() {
  local a=()
  while [ $# -gt 0 ]; do case "$1" in -o|-g) shift 2 ;; *) a+=("$1"); shift ;; esac; done
  command install "\${a[@]}"
}
`;
  return spawnSync(
    "bash",
    ["-c", `set -euo pipefail\n. ${join(kok, "sunucu", "yedek", "ortak.sh")}\n${sahte}\n${govde}`],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        YEDEK_KOKU: gecici,
        GIZLI_KOKU: join(gecici, "gizli"),
        DOSYA_KOKU: join(gecici, "dosyalar"),
        DEPO: join(gecici, "depo"),
        // timeout ayrı bir programı çalıştırır: sahte setpriv yolda durur, kullanıcı değişmez.
        PATH: `${aracKlasoru()}:${process.env["PATH"]}`,
      },
    },
  );
};

const aracKlasoru = () => {
  const arac = join(gecici, "arac");
  if (!existsSync(arac)) {
    mkdirSync(arac);
    writeFileSync(
      join(arac, "setpriv"),
      '#!/bin/bash\nwhile [ "$1" != "--" ]; do shift; done; shift; exec "$@"\n',
      { mode: 0o755 },
    );
  }
  return arac;
};

const getir = () => calistir(dosyaGetirmeBetigi("deneme", { kodAdi, numara: 1 }, ad, anahtar));

describe("geri yüklemede dosyalar", () => {
  it("diskte olmayan dosyalar depodan gelir, sitenin kullanıcısına ait ve aynı içerikle", () => {
    const ozetler = adlar.map((a) => ozetle(readFileSync(join(canli, a))));
    for (const a of adlar) unlinkSync(join(canli, a));
    const sonuc = getir();
    expect(sonuc.stderr).toBe("");
    expect(sonuc.stdout.trim()).toBe("dosya=2 yerinde=0 indirilen=2");
    adlar.forEach((a, sira) => {
      expect(ozetle(readFileSync(join(canli, a)))).toBe(ozetler[sira]);
      expect(statSync(join(canli, a)).mode & 0o777).toBe(0o600);
    });
    // Geçici adlı dosya kalmaz; geçici klasör temizlenir.
    expect(readdirSync(canli).sort()).toEqual([...adlar].sort());
    expect(readdirSync(join(gecici, "gecici"))).toEqual([]);
  });

  it("yerindeki dosyaya dokunulmaz, en yeni kopya seçilir", () => {
    const [ilk, ikinci] = adlar as [string, string];
    unlinkSync(join(canli, ikinci));
    // Eski kopya bozuk, yenisi doğru.
    writeFileSync(join(depo, `${ikinci}.20261101T000000Z.age`), "bozuk");
    copyFileSync(join(depo, `${ilk}.20261101T000000Z.age`), join(depo, `${ilk}.x`));
    writeFileSync(
      join(depo, `${ikinci}.20261120T000000Z.age`),
      readFileSync(join(depo, `${ilk}.x`))
        .toString()
        .replace("birinci", "ikinci"),
    );
    const sonuc = getir();
    expect(sonuc.stderr).toBe("");
    expect(sonuc.stdout.trim()).toBe("dosya=2 yerinde=1 indirilen=1");
    expect(readFileSync(join(canli, ikinci), "utf8")).toBe("%PDF-1.4 ikinci");
  });

  it.each([
    [
      "depoda kopyası yoksa",
      (a: string) => {
        unlinkSync(join(canli, a));
        unlinkSync(join(depo, `${a}.20261101T000000Z.age`));
      },
      "1 dosyanın depoda kopyası yok",
    ],
    [
      "diskteki içerik kayıtla tutmuyorsa",
      (a: string) => writeFileSync(join(canli, a), "değişmiş"),
      "1 dosyanın diskteki içeriği kayıtla tutmuyor",
    ],
    [
      "depodaki kopya kayıtla tutmuyorsa",
      (a: string) => {
        unlinkSync(join(canli, a));
        writeFileSync(join(depo, `${a}.20261101T000000Z.age`), "bozuk");
      },
      "dosyanın yedeği kayıtla tutmuyor",
    ],
  ])("%s durur, dosya yerine konmaz", (_ad, boz, ileti) => {
    const a = adlar[0] as string;
    const once = existsSync(join(canli, a)) ? readFileSync(join(canli, a)) : undefined;
    boz(a);
    const bozuk = existsSync(join(canli, a)) ? readFileSync(join(canli, a)) : undefined;
    const sonuc = getir();
    expect(sonuc.status).not.toBe(0);
    expect(sonuc.stderr).toContain(ileti);
    // Diskte değişen bir şey yok.
    expect(existsSync(join(canli, a)) ? readFileSync(join(canli, a)) : undefined).toEqual(bozuk);
    if (once) writeFileSync(join(canli, a), once);
    else copyFileSync(join(depo, `${a}.20261101T000000Z.age`), join(canli, a));
  });
});

describe("geri yüklemede sitenin klasörü", () => {
  it("diskteki bağ izlenmez: aynı içeriği gösterse de tutmuyor sayılır, adı söylenir", () => {
    const a = adlar[0] as string;
    const yol = join(canli, a);
    const asil = readFileSync(yol);
    const baska = join(gecici, "klasor-disi");
    writeFileSync(baska, asil);
    unlinkSync(yol);
    symlinkSync(baska, yol);
    try {
      const sonuc = getir();
      expect(sonuc.status).not.toBe(0);
      expect(sonuc.stderr).toContain("1 dosyanın diskteki içeriği kayıtla tutmuyor");
      expect(sonuc.stderr).toContain(`diskteki içeriği tutmayanlar (${canli}): ${a}`);
    } finally {
      unlinkSync(yol);
      writeFileSync(yol, asil);
    }
  });
});

describe("provada dosyalar", () => {
  const prova = () => {
    const sonuc = calistir(
      `x\n. /srv/altyapi/yedek/ortak.sh\nanahtar='${anahtar}'\ng="$(mktemp -d -p "$K/gecici")"\ntrap 'rm -rf "$g"' EXIT\n${dosyaProvasi("deneme", kodAdi, kutu, ad, ad)}`,
    );
    expect(sonuc.stderr).toBe("");
    const yedek = ozetiOku(sonuc.stdout, "YEDEK");
    const canliOzet = ozetiOku(sonuc.stdout, "CANLI");
    return { yedek: yedek.dosya, canli: canliOzet.dosya, farklar: dosyaFarklari(canliOzet, yedek) };
  };

  it("her kayıtlı dosyanın kopyası depoda ve diskte, özetler tutuyor", () => {
    expect(prova()).toEqual({
      yedek: { toplam: 2, bulunan: 2, tutan: 2 },
      canli: { toplam: 2, bulunan: 2, tutan: 2 },
      farklar: [],
    });
  });

  it("depoda olmayan ve bozuk kopya, diskte olmayan ve değişmiş dosya fark sayılır", () => {
    const [ilk, ikinci] = adlar as [string, string];
    unlinkSync(join(depo, `${ilk}.20261101T000000Z.age`));
    writeFileSync(join(depo, `${ikinci}.20261101T000000Z.age`), "bozuk");
    const ilkIcerik = readFileSync(join(canli, ilk));
    const ikinciIcerik = readFileSync(join(canli, ikinci));
    unlinkSync(join(canli, ilk));
    writeFileSync(join(canli, ikinci), "değişmiş");
    try {
      const r = prova();
      expect(r.yedek).toEqual({ toplam: 2, bulunan: 1, tutan: 0 });
      expect(r.canli).toEqual({ toplam: 2, bulunan: 1, tutan: 0 });
      expect(r.farklar).toEqual([
        "dosyalar (yedek): 1 dosyanın depoda kopyası yok",
        "dosyalar (yedek): 1 dosyanın kopyası açılınca kayıtla tutmuyor",
        "dosyalar (canlı): 1 dosyanın diskte yok",
        "dosyalar (canlı): 1 dosyanın diskteki içeriği kayıtla tutmuyor",
      ]);
    } finally {
      writeFileSync(join(canli, ilk), ilkIcerik);
      writeFileSync(join(canli, ikinci), ikinciIcerik);
    }
  });

  it("dosya satırı okunamazsa fark sayılır", () => {
    expect(dosyaFarklari(ozetiOku("", "CANLI"), ozetiOku("YEDEK dosya 1 x 1", "YEDEK"))).toEqual([
      "dosyalar (yedek): özet okunamadı",
      "dosyalar (canlı): özet okunamadı",
    ]);
  });
});
