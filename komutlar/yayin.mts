// Sitenin sunucuya yayını ve geri dönüş (kart 0021, karar 0035). Komutlar (yayinla.mts,
// geri-don.mts, yayin-kaydi.mts, yayin-denemesi.mts) ve sunucu-gizli.mts bu dosyayı kullanır.
//
// - Yayın birimi: çekirdeğin görüntüsü + sitenin klasörü, ikisi de aynı kayıttan. Her yayının
//   numarası vardır; sunucuda kendi klasöründe (/srv/altyapi/yayin/<ortam>/<kod>/<no>/), kendi
//   görüntü etiketiyle (altyapi-yayin:<ortam>-<kod>-<no>) ve kendi kutusuyla (site-<ortam>-<kod>-<no>)
//   durur. etkin dosyası trafiği alan yayının numarasıdır.
// - Sıra: veritabanı değişiklikleri (0039), yeni kutu eski kutunun yanında açılır, sağlık ucu
//   kutunun içinden yoklanır, ön kapı yeni kutuya çevrilir, deneme adresi dışarıdan yoklanır,
//   eski kutu durdurulur. Bir adım geçmezse eski kutu hiç kesilmeden çalışmaya devam eder.
// - Yayın kaydı sunucuda, her site için ayrı dosyadadır (kayit.jsonl): her çalıştırma bir satır.
//   Geri dönüşün hedefi ve saklanacak yayınlar bu kayıttan hesaplanır.

import { spawnSync } from "node:child_process";
import type { Kimlik } from "../cekirdek/ayar-semasi/kimlik.ts";
import {
  degisiklikKlasoru,
  type GeriDonusNotu,
  geriDonusNotlari,
} from "../cekirdek/veritabani/guncelle.ts";
import { goruntuyuDenetle } from "./cekirdek-goruntusu-denetle.mts";
import { kutuGizliTanimi, type Ortam } from "./gizli-bilgi.mts";
import { kaliciKutu, siteSaglikYoklamasi } from "./kutu-kurali.mts";
import {
  denemeAdresi,
  kodAdiGecerli,
  onKapiyiKur,
  siteAgiAdi,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinKoku,
} from "./on-kapi.mts";
import { girisAnahtari, sshKomutu, sshSecenekleri, sunucuTanimi } from "./sunucu.mts";
import {
  goruntuyuGonder,
  siteVeritabaniniHazirla,
  sunucudaCalistir,
} from "./sunucu-veritabani.mts";

// --- Adlar ve yerleşim ---

const kodAdiniDenetle = (kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return kodAdi;
};
export const yayinKlasoru = (ortam: Ortam, kodAdi: string): string =>
  `${yayinKoku}/${ortam}/${kodAdiniDenetle(kodAdi)}`;
export const yayinGoruntusu = (ortam: Ortam, kodAdi: string, no: number): string =>
  `altyapi-yayin:${siteKutusuAdi(ortam, kodAdi, no).replace(/^site-/, "")}`;
const projeAdi = (ortam: Ortam, kodAdi: string, no: number): string =>
  `yayin-${siteKutusuAdi(ortam, kodAdi, no).replace(/^site-/, "")}`;

// Geri dönüş için saklanan son başarılı yayın sayısı (etkin olan dahil).
export const saklananYayinSayisi = 3;

// --- Sitenin kutusu ---

export const yayinKutusuTanimi = (
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  no: number,
) => {
  const gizli = kutuGizliTanimi(ortam, kodAdi, siteNumarasi);
  const ag = siteAgiAdi(ortam, kodAdi);
  return {
    name: projeAdi(ortam, kodAdi, no),
    services: {
      uygulama: {
        image: yayinGoruntusu(ortam, kodAdi, no),
        container_name: siteKutusuAdi(ortam, kodAdi, no),
        ...kaliciKutu,
        user: gizli.servis.user,
        secrets: gizli.servis.secrets,
        // Kod adı klasör adıyla aynı olmalıdır (kimlik şeması), klasör aynı adla bağlanır.
        environment: { ...gizli.servis.environment, SITE_KLASORU: `/siteler/${kodAdi}` },
        cap_drop: ["ALL"],
        cap_add: [] as string[],
        security_opt: ["no-new-privileges:true"],
        read_only: true,
        tmpfs: ["/tmp"],
        volumes: [`${yayinKlasoru(ortam, kodAdi)}/${no}/site:/siteler/${kodAdi}:ro`],
        networks: [ag],
        healthcheck: siteSaglikYoklamasi,
      },
    },
    secrets: gizli.gizliler,
    networks: { [ag]: { name: ag, external: true } },
  };
};

// --- Yayın kaydı ---

export type YayinKaydi = {
  no: number;
  tur: "yayin" | "geri-donus";
  // Trafiği alan yayının numarası (yayında kendisi, geri dönüşte dönülen yayın).
  etkin: number;
  kayit: string;
  surum: string;
  goruntu: string;
  zaman: string;
  sonuc: "basarili" | "basarisiz";
  neden?: string;
  // Yayın anında veritabanında uygulanmış değişiklik sayısı ve kayıttaki bütün değişikliklerin
  // geri dönüş notları. Veritabanına dokunulmadıysa null.
  degisiklikToplami: number | null;
  degisiklikNotlari: GeriDonusNotu[];
};

export const kayitlariCoz = (metin: string): YayinKaydi[] =>
  metin
    .split("\n")
    .filter((satir) => satir.trim())
    .map((satir, sira) => {
      try {
        return JSON.parse(satir) as YayinKaydi;
      } catch {
        throw new Error(`Yayın kaydının ${sira + 1}. satırı okunamadı.`);
      }
    });

// Trafiğin geçtiği yayınların sırası: başarılı yayın üste eklenir, başarılı geri dönüş üsttekini
// kaldırır. Üstteki etkin yayındır, altındaki geri dönüşün hedefidir.
export const etkinYigini = (kayitlar: YayinKaydi[]): number[] => {
  const yigin: number[] = [];
  for (const kayit of kayitlar) {
    if (kayit.sonuc !== "basarili") continue;
    if (kayit.tur === "yayin") yigin.push(kayit.etkin);
    else yigin.pop();
  }
  return yigin;
};

export const sonrakiNumara = (kayitlar: YayinKaydi[]): number =>
  Math.max(0, ...kayitlar.map((kayit) => kayit.no)) + 1;

// Geri dönüşün hedefi ve engeli. Veritabanında hedef yayından sonra uygulanmış değişikliklerden
// biri "yedekten" (ya da notsuz) ise dönülmez: eski kod yeni veritabanıyla çalışamayabilir.
export const geriDonusHedefi = (
  kayitlar: YayinKaydi[],
): { hedef: YayinKaydi; etkin: number } | { engel: string } => {
  const yigin = etkinYigini(kayitlar);
  const etkin = yigin.at(-1);
  const hedefNo = yigin.at(-2);
  if (etkin === undefined || hedefNo === undefined) {
    return { engel: "Dönülecek önceki bir başarılı yayın yok." };
  }
  const hedef = kayitlar.findLast(
    (kayit) => kayit.sonuc === "basarili" && kayit.tur === "yayin" && kayit.etkin === hedefNo,
  );
  if (!hedef || hedef.degisiklikToplami === null) {
    return { engel: `${hedefNo} numaralı yayının kaydı eksik.` };
  }
  const uygulananlar = kayitlar.filter((kayit) => kayit.degisiklikToplami !== null);
  const enYeni = uygulananlar.reduce<YayinKaydi | undefined>(
    (en, kayit) =>
      !en || (kayit.degisiklikToplami ?? 0) > (en.degisiklikToplami ?? 0) ? kayit : en,
    undefined,
  );
  const sonraGelenler = (enYeni?.degisiklikNotlari ?? []).slice(
    hedef.degisiklikToplami,
    enYeni?.degisiklikToplami ?? 0,
  );
  if (sonraGelenler.some((not) => not !== "geri alınabilir")) {
    return {
      engel: `${hedefNo} numaralı yayından sonra veritabanına geri alınamayan değişiklik uygulanmış ("yedekten"). Geri dönüş yedekten yapılmalı (kart 0024); hiçbir şeye dokunulmadı.`,
    };
  }
  return { hedef, etkin };
};

// Saklanacak yayınlar: etkin yığının son üçü. Geri kalanların klasörü ve görüntüsü silinir.
export const saklanacaklar = (kayitlar: YayinKaydi[]): number[] => [
  ...new Set(etkinYigini(kayitlar).slice(-saklananYayinSayisi)),
];

// --- Sunucuda çalışan betikler ---

const tekSatir = (metin: string): string => metin.replace(/\s+/g, " ").trim().slice(0, 400);

export const kayitlariOku = (ipv4: string, ortam: Ortam, kodAdi: string): YayinKaydi[] => {
  const dosya = `${yayinKlasoru(ortam, kodAdi)}/kayit.jsonl`;
  const sonuc = sshKomutu(ipv4, `sudo sh -c 'if [ -f ${dosya} ]; then cat ${dosya}; fi'`);
  if (sonuc.status !== 0) throw new Error(`Yayın kaydı okunamadı: ${sonuc.stderr.trim()}`);
  return kayitlariCoz(sonuc.stdout);
};

const kayitEkle = (ipv4: string, ortam: Ortam, kodAdi: string, kayit: YayinKaydi): void => {
  const k = yayinKlasoru(ortam, kodAdi);
  const satir = JSON.stringify(kayit);
  const sonuc = sshKomutu(
    ipv4,
    `sudo sh -c 'install -d -m 0755 -o root -g root ${yayinKoku} ${yayinKoku}/${ortam} ${k} && cat >> ${k}/kayit.jsonl'`,
    { girdi: `${satir}\n` },
  );
  if (sonuc.status !== 0) throw new Error(`Yayın kaydı yazılamadı: ${sonuc.stderr.trim()}`);
};

// Site klasörü bilgisayardan sunucudaki yayın klasörüne aktarılır; kök kullanıcıya aittir,
// kutu yalnız okuyabilir.
const klasoruYukle = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  no: number,
  yerel: string,
): void => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  const uzak = `sudo sh -c 'set -e; rm -rf ${d}; install -d -m 0755 -o root -g root ${yayinKoku} ${yayinKoku}/${ortam} ${yayinKlasoru(ortam, kodAdi)} ${d} ${d}/site; tar -x --no-same-owner --no-same-permissions -C ${d}/site; chown -R root:root ${d}/site; chmod -R u=rwX,go=rX ${d}/site'`;
  const ssh = [
    "ssh",
    ...sshSecenekleri,
    "-i",
    girisAnahtari,
    "-o",
    "IdentitiesOnly=yes",
    `${sunucuTanimi.kullanici}@${ipv4}`,
    uzak,
  ];
  const sonuc = spawnSync("sh", ["-c", 'tar -C "$0" -cf - . | "$@"', yerel, ...ssh], {
    encoding: "utf8",
    timeout: 300_000,
  });
  if (sonuc.status !== 0) throw new Error(`Site klasörü aktarılamadı: ${sonuc.stderr.trim()}`);
};

// Yayının kutusunu açar ve sağlık ucunu kutunun içinden okur. Çıktının son satırı: saglik=<yanıt>.
export const kutuyuAcmaBetigi = (
  ortam: Ortam,
  kodAdi: string,
  no: number,
  tanim?: ReturnType<typeof yayinKutusuTanimi>,
  goruntuKimligi?: string,
): string => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  const kutu = siteKutusuAdi(ortam, kodAdi, no);
  const icerik = tanim ? `${JSON.stringify(tanim, null, 2)}\n` : "";
  if (icerik.includes("YAYIN_DOSYA_SONU")) throw new Error("Kutu tanımı ayrılmış satır içeriyor.");
  return `set -eu
d=${d}
${tanim ? `sudo tee "$d/compose.json" >/dev/null <<'YAYIN_DOSYA_SONU'\n${icerik}YAYIN_DOSYA_SONU\nsudo chmod 0644 "$d/compose.json"` : '[ -f "$d/compose.json" ] || { echo "HATA yayının kutu tanımı yok: $d" >&2; exit 1; }'}
${goruntuKimligi ? `docker tag ${goruntuKimligi} ${yayinGoruntusu(ortam, kodAdi, no)}` : `docker image inspect ${yayinGoruntusu(ortam, kodAdi, no)} >/dev/null 2>&1 || { echo "HATA yayının görüntüsü yok" >&2; exit 1; }`}
h=$(mktemp)
trap 'rm -f "$h"' EXIT
if ! docker compose -f "$d/compose.json" up -d --wait --wait-timeout 150 --quiet-pull </dev/null >/dev/null 2>"$h"; then
  echo "HATA yeni kutu sağlıklı açılmadı:" >&2
  tail -3 "$h" >&2
  docker logs --tail 5 ${kutu} >&2 2>&1 || true
  exit 1
fi
printf 'saglik=%s\\n' "$(docker exec ${kutu} node -e "fetch('http://127.0.0.1:3000/kapi/herkese-acik/saglik').then((y)=>y.text()).then((t)=>process.stdout.write(t),()=>process.stdout.write('{}'))")"
`;
};

// Yayının kutusunu durdurur; klasörü ve görüntüsü kalır (geri dönüş için).
export const kutuyuDurdurmaBetigi = (ortam: Ortam, kodAdi: string, no: number): string => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  return `set -u
if [ -f ${d}/compose.json ]; then docker compose -f ${d}/compose.json down --timeout 10 </dev/null >/dev/null 2>&1 || true; fi
docker rm -f ${siteKutusuAdi(ortam, kodAdi, no)} >/dev/null 2>&1 || true
`;
};

// Yayını bütünüyle siler: kutu, görüntü etiketi, klasör.
export const yayiniSilmeBetigi = (ortam: Ortam, kodAdi: string, no: number): string =>
  `${kutuyuDurdurmaBetigi(ortam, kodAdi, no)}docker image rm ${yayinGoruntusu(ortam, kodAdi, no)} >/dev/null 2>&1 || true
sudo rm -rf ${yayinKlasoru(ortam, kodAdi)}/${no}
`;

// Saklanmayacak yayınların listesi sunucudaki klasörlerden okunur.
const eskiYayinlariTemizle = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  saklanan: number[],
): void => {
  const k = yayinKlasoru(ortam, kodAdi);
  const liste = sshKomutu(
    ipv4,
    `sudo sh -c 'for d in ${k}/*/; do [ -d "$d" ] && basename "$d"; done; true'`,
  );
  for (const ad of liste.stdout.split("\n").map((s) => s.trim())) {
    if (!/^[1-9]\d*$/.test(ad) || saklanan.includes(Number(ad))) continue;
    sshKomutu(ipv4, "bash -s", { girdi: yayiniSilmeBetigi(ortam, kodAdi, Number(ad)) });
  }
};

const etkinYaz = (ipv4: string, ortam: Ortam, kodAdi: string, no: number): void => {
  const sonuc = sshKomutu(
    ipv4,
    `sudo sh -c 'printf "%s\\n" ${no} > ${yayinKlasoru(ortam, kodAdi)}/.etkin.yeni && mv -f ${yayinKlasoru(ortam, kodAdi)}/.etkin.yeni ${yayinKlasoru(ortam, kodAdi)}/etkin'`,
  );
  if (sonuc.status !== 0) throw new Error(`etkin yazılamadı: ${sonuc.stderr.trim()}`);
};

// --- Sağlık ---

type Saglik = { cekirdekSurumu?: string; veritabani?: string };

export const saglikCoz = (metin: string): Saglik => {
  try {
    const yanit = JSON.parse(metin) as { veri?: Saglik };
    return yanit.veri ?? {};
  } catch {
    return {};
  }
};

export const saglikHatasi = (saglik: Saglik, surum: string): string | undefined => {
  if (saglik.cekirdekSurumu !== surum) {
    return `sağlık ucu sürümü ${saglik.cekirdekSurumu ?? "söylemiyor"}, beklenen ${surum}`;
  }
  if (saglik.veritabani !== "ayakta") {
    return `sağlık ucu veritabanını ${saglik.veritabani ?? "bilmiyor"} gösteriyor`;
  }
  return undefined;
};

// Deneme adresini dışarıdan, ön kapı üzerinden ve şifreli bağlantıyla ister. Ad çözümlemesine
// bağlı kalmamak için doğrudan sunucunun adresine bağlanılır, sertifika adla denetlenir.
export const disaridanIste = async (
  ipv4: string,
  kodAdi: string,
  yol: string,
): Promise<{ durum: number; govde: string }> => {
  const { request } = await import("node:https");
  const adres = denemeAdresi(kodAdi);
  return new Promise((coz) => {
    const istek = request(
      { host: ipv4, servername: adres, port: 443, path: yol, headers: { host: adres } },
      (yanit) => {
        let govde = "";
        yanit.setEncoding("utf8");
        yanit.on("data", (parca) => {
          govde += parca;
        });
        yanit.on("end", () => coz({ durum: yanit.statusCode ?? 0, govde }));
      },
    );
    istek.on("error", () => coz({ durum: 0, govde: "" }));
    istek.setTimeout(10_000, () => istek.destroy());
    istek.end();
  });
};

// Sağlık ucu dışarıdan beklenen sürümü söyleyene kadar bekler (ilk yayında sertifika alınır).
const disaridanSaglik = async (
  ipv4: string,
  kodAdi: string,
  surum: string,
): Promise<string | undefined> => {
  let hata: string | undefined = "yanıt yok";
  for (let deneme = 0; deneme < 45 && hata; deneme++) {
    const yanit = await disaridanIste(ipv4, kodAdi, "/kapi/herkese-acik/saglik");
    hata =
      yanit.durum === 200
        ? saglikHatasi(saglikCoz(yanit.govde), surum)
        : `deneme adresi ${yanit.durum || "yanıt vermedi"}`;
    if (hata) await new Promise((bekle) => setTimeout(bekle, 2000));
  }
  return hata;
};

// --- Yayın ---

export type YayinGirdisi = {
  ipv4: string;
  ortam: Ortam;
  kimlik: Kimlik;
  siteNumarasi: number;
  // Bilgisayardaki site klasörü (yayınlanacak kayıttan çıkarılmış).
  klasor: string;
  // Bilgisayardaki görüntü etiketi ve görüntünün üretildiği kayıt.
  etiket: string;
  kayit: string;
  yaz?: (satir: string) => void;
};

const zaman = (): string => new Date().toISOString();

export const yayinla = async (girdi: YayinGirdisi): Promise<YayinKaydi> => {
  const { ipv4, ortam, kimlik, siteNumarasi } = girdi;
  const { kodAdi, cekirdekSurumu: surum } = kimlik;
  const yaz = girdi.yaz ?? (() => {});
  const kayitlar = kayitlariOku(ipv4, ortam, kodAdi);
  const no = sonrakiNumara(kayitlar);
  const siteler = yayindakiSiteleriOku(ipv4);
  const onceki = siteler[kodAdi];
  const kayit: YayinKaydi = {
    no,
    tur: "yayin",
    etkin: no,
    kayit: girdi.kayit,
    surum,
    goruntu: "",
    zaman: zaman(),
    sonuc: "basarisiz",
    degisiklikToplami: null,
    degisiklikNotlari: geriDonusNotlari(degisiklikKlasoru),
  };
  let kutuAcildi = false;
  let onKapiDegisti = false;
  try {
    yaz(`yayın       ${ortam}/${kodAdi} ${no} (sürüm ${surum}, kayıt ${girdi.kayit.slice(0, 12)})`);
    const hatalar = goruntuyuDenetle(girdi.etiket);
    if (hatalar.length > 0) throw new Error(`Görüntü denetimden geçmedi: ${hatalar.join("; ")}`);
    const { toplam } = siteVeritabaniniHazirla(
      ipv4,
      ortam,
      { kodAdi, numara: siteNumarasi, surum, etiket: girdi.etiket },
      yaz,
    );
    kayit.degisiklikToplami = toplam;
    const { kimlik: goruntu } = goruntuyuGonder(ipv4, girdi.etiket);
    kayit.goruntu = goruntu;
    klasoruYukle(ipv4, ortam, kodAdi, no, girdi.klasor);
    kutuAcildi = true;
    const cikti = sunucudaCalistir(
      ipv4,
      kutuyuAcmaBetigi(
        ortam,
        kodAdi,
        no,
        yayinKutusuTanimi(ortam, kodAdi, siteNumarasi, no),
        goruntu,
      ),
    );
    const icHata = saglikHatasi(saglikCoz(cikti.match(/^saglik=(.*)$/m)?.[1] ?? ""), surum);
    if (icHata) throw new Error(`yeni kutu: ${icHata}`);
    yaz(`sağlıklı    ${siteKutusuAdi(ortam, kodAdi, no)}`);
    onKapiDegisti = true;
    onKapiyiKur(ipv4, { ...siteler, [kodAdi]: no });
    const disHata = await disaridanSaglik(ipv4, kodAdi, surum);
    if (disHata) throw new Error(`deneme adresi: ${disHata}`);
    yaz(`trafik      ${denemeAdresi(kodAdi)} → ${no}`);
    etkinYaz(ipv4, ortam, kodAdi, no);
    onKapiDegisti = false;
    if (onceki !== undefined) sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(ortam, kodAdi, onceki));
    kayit.sonuc = "basarili";
    eskiYayinlariTemizle(ipv4, ortam, kodAdi, saklanacaklar([...kayitlar, kayit]));
  } catch (hata) {
    kayit.neden = tekSatir((hata as Error).message);
    // Trafik eskisine geri verilir, yeni kutu ve yayın silinir; eski kutuya dokunulmaz.
    if (onKapiDegisti) {
      try {
        onKapiyiKur(ipv4, siteler);
      } catch (geri) {
        kayit.neden += ` | ön kapı eski hâline döndürülemedi: ${tekSatir((geri as Error).message)}`;
      }
    }
    if (kutuAcildi) sshKomutu(ipv4, "bash -s", { girdi: yayiniSilmeBetigi(ortam, kodAdi, no) });
  }
  kayit.zaman = zaman();
  kayitEkle(ipv4, ortam, kodAdi, kayit);
  return kayit;
};

// --- Geri dönüş ---

export const geriDon = async (girdi: {
  ipv4: string;
  ortam: Ortam;
  kodAdi: string;
  yaz?: (satir: string) => void;
}): Promise<YayinKaydi> => {
  const { ipv4, ortam, kodAdi } = girdi;
  const yaz = girdi.yaz ?? (() => {});
  const kayitlar = kayitlariOku(ipv4, ortam, kodAdi);
  const no = sonrakiNumara(kayitlar);
  const siteler = yayindakiSiteleriOku(ipv4);
  const sonuc = geriDonusHedefi(kayitlar);
  const kayit: YayinKaydi = {
    no,
    tur: "geri-donus",
    etkin: "hedef" in sonuc ? sonuc.hedef.etkin : 0,
    kayit: "hedef" in sonuc ? sonuc.hedef.kayit : "",
    surum: "hedef" in sonuc ? sonuc.hedef.surum : "",
    goruntu: "hedef" in sonuc ? sonuc.hedef.goruntu : "",
    zaman: zaman(),
    sonuc: "basarisiz",
    degisiklikToplami: null,
    degisiklikNotlari: [],
  };
  let onKapiDegisti = false;
  let kutuAcildi = false;
  try {
    if ("engel" in sonuc) throw new Error(sonuc.engel);
    const { hedef, etkin } = sonuc;
    if (siteler[kodAdi] !== etkin) {
      throw new Error(
        `Sunucudaki etkin yayın (${siteler[kodAdi] ?? "yok"}) kayıttakiyle (${etkin}) aynı değil; hiçbir şeye dokunulmadı.`,
      );
    }
    yaz(`geri dönüş ${ortam}/${kodAdi} ${etkin} → ${hedef.etkin} (sürüm ${hedef.surum})`);
    kutuAcildi = true;
    const cikti = sunucudaCalistir(ipv4, kutuyuAcmaBetigi(ortam, kodAdi, hedef.etkin));
    const icHata = saglikHatasi(saglikCoz(cikti.match(/^saglik=(.*)$/m)?.[1] ?? ""), hedef.surum);
    if (icHata) throw new Error(`dönülen kutu: ${icHata}`);
    onKapiDegisti = true;
    onKapiyiKur(ipv4, { ...siteler, [kodAdi]: hedef.etkin });
    const disHata = await disaridanSaglik(ipv4, kodAdi, hedef.surum);
    if (disHata) throw new Error(`deneme adresi: ${disHata}`);
    etkinYaz(ipv4, ortam, kodAdi, hedef.etkin);
    onKapiDegisti = false;
    kutuAcildi = false;
    sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(ortam, kodAdi, etkin));
    kayit.sonuc = "basarili";
    yaz(`trafik      ${denemeAdresi(kodAdi)} → ${hedef.etkin}`);
  } catch (hata) {
    kayit.neden = tekSatir((hata as Error).message);
    if (onKapiDegisti) {
      try {
        onKapiyiKur(ipv4, siteler);
      } catch (geri) {
        kayit.neden += ` | ön kapı eski hâline döndürülemedi: ${tekSatir((geri as Error).message)}`;
      }
    }
    // Dönülen yayının kutusu durdurulur; klasörü ve görüntüsü kalır.
    if (kutuAcildi && "hedef" in sonuc) {
      sshKomutu(ipv4, "bash -s", {
        girdi: kutuyuDurdurmaBetigi(ortam, kodAdi, sonuc.hedef.etkin),
      });
    }
  }
  kayit.zaman = zaman();
  kayitEkle(ipv4, ortam, kodAdi, kayit);
  return kayit;
};

// Yayındaki kutuyu yeniden başlatır (gizli bilgi yenilenince, sunucu-gizli.mts). Kutu yoksa false.
export const etkinKutuyuYenidenBaslat = (ipv4: string, ortam: Ortam, kodAdi: string): boolean => {
  const no = yayindakiSiteleriOku(ipv4)[kodAdi];
  if (no === undefined) return false;
  sunucudaCalistir(
    ipv4,
    `set -eu\ndocker restart --timeout 10 ${siteKutusuAdi(ortam, kodAdi, no)} >/dev/null\n`,
  );
  return true;
};
