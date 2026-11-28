// Çekirdeğin parmak izi ve "bir sürüm numarası yalnız bir çekirdeği gösterir" kuralı (kart 0040, karar 0205).
//
// Parmak izi bir kayıttaki şu dosyaların git içerik özetidir: görüntünün tarifi (Dockerfile ve dockerignore), görüntünün
// derleme içeriği (dockerignore'un o kayıttaki izin listesi; belgeler hariç) ve demo paketleri (karar 0203: paketler
// çekirdekle sürümlenir, yayın onları kayıttan taşır). Site klasörü, belge (.md, shadcn kaynağı), test ve komut
// değişikliği izi değiştirmez; görüntüyü ya da paketi değiştirebilen her dosya değiştirir. Yayın komutu bir sürüm numarasını sunucudaki bütün sitelerin kayıtlarında arar: aynı sürüm
// başka bir izle yayınlanmışsa durur.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { kutudakiDemoKlasoru } from "../cekirdek/kayitlar/demo-paketi.ts";

export const dockerfileYolu = "sunucu/cekirdek/Dockerfile";
export const dockerignoreYolu = "sunucu/cekirdek/Dockerfile.dockerignore";
// İzin biçimi: tanım değişirse artar, kayıtta başka biçimde saklanan iz git kaydından yeniden hesaplanır.
export const izBicimi = "v1";
// Paketlerin projedeki yolu kutudaki yoluyla aynıdır (karar 0203; kutuya /cekirdek/demolar olarak bağlanır).
const paketKlasoru = kutudakiDemoKlasoru.replace(/^\/+/, "");

type Kural = { haric: boolean; kalip: RegExp };

// .dockerignore satırının kalıbı: "**/" her derinlikte, "*" ve "?" tek yol parçası içinde. Kalıp bir yola ya da onun
// üst klasörlerinden birine uyarsa o yolu kapsar (Docker'ın kuralı). Docker'la anlamı ayrışabilecek yazılışlar (köşeli
// parantez, ters eğik çizgi, sonu "/" olmayan "**") hata verir: iz sessizce yanlış hesaplanmaz.
const kalipRegExp = (kalip: string): RegExp => {
  const temiz = kalip.replace(/^(\.?\/)+/, "").replace(/\/+$/, "");
  if (/[[\]\\]/.test(temiz) || /\*\*(?!\/|$)/.test(temiz)) {
    throw new Error(`${dockerignoreYolu}: desteklenmeyen kalıp: ${kalip}`);
  }
  let ifade = "";
  for (let i = 0; i < temiz.length; i++) {
    const h = temiz[i] as string;
    if (temiz.startsWith("**/", i)) {
      ifade += "(?:.*/)?";
      i += 2;
    } else if (temiz.startsWith("**", i)) {
      ifade += ".*";
      i += 1;
    } else if (h === "*") ifade += "[^/]*";
    else if (h === "?") ifade += "[^/]";
    else ifade += h.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${ifade}$`);
};

export const dockerignoreKurallari = (metin: string): Kural[] =>
  metin
    .split("\n")
    .map((satir) => satir.trim())
    .filter((satir) => satir !== "" && !satir.startsWith("#"))
    .map((satir) =>
      satir.startsWith("!")
        ? { haric: false, kalip: kalipRegExp(satir.slice(1)) }
        : { haric: true, kalip: kalipRegExp(satir) },
    );

// Dosya görüntünün derleme içeriğine girer mi: son uyan kural kazanır, hiçbiri uymazsa girer.
export const goruntuyeGirerMi = (kurallar: Kural[], yol: string): boolean => {
  const parcalar = yol.split("/");
  const adaylar = parcalar.map((_, i) => parcalar.slice(0, i + 1).join("/"));
  let girer = true;
  for (const kural of kurallar) {
    if (adaylar.some((aday) => kural.kalip.test(aday))) girer = !kural.haric;
  }
  return girer;
};

export const pakettenMi = (yol: string): boolean => yol.startsWith(`${paketKlasoru}/`);

// Derleme içeriğinde olup görüntüyü değiştirmeyen belgeler: hiçbir .md dosyası çalışırken okunmaz (sürüm notları
// yayından sonra da düzeltilebilir), shadcn kaynağı kod değildir (karar 0077).
export const belgeMi = (yol: string): boolean =>
  yol.endsWith(".md") || yol.startsWith("bilesenler/shadcn-kaynagi/");

export const izeGirerMi = (kurallar: Kural[], yol: string): boolean =>
  yol === dockerfileYolu ||
  yol === dockerignoreYolu ||
  pakettenMi(yol) ||
  (goruntuyeGirerMi(kurallar, yol) && !belgeMi(yol));

// "git ls-tree -r -z" çıktısı (NUL ayrımlı "<kip> <tür> <özet>\t<yol>") ve dockerignore metninden iz. Sıra izi değiştirmez.
export const izHesapla = (lsTree: string, dockerignore: string): string => {
  const kurallar = dockerignoreKurallari(dockerignore);
  const satirlar = lsTree
    .split("\0")
    .filter((satir) => satir.trim())
    .map((satir) => {
      const [bilgi, yol] = satir.split("\t") as [string, string];
      const [kip, , ozet] = bilgi.split(" ");
      return { kip, ozet, yol };
    })
    .filter(({ yol }) => izeGirerMi(kurallar, yol))
    .map(({ kip, ozet, yol }) => `${kip} ${ozet} ${yol}`)
    .sort();
  if (satirlar.length === 0) throw new Error("Parmak izine giren dosya yok.");
  return `${izBicimi}:${createHash("sha256").update(satirlar.join("\n")).digest("hex")}`;
};

const git = (kok: string, argumanlar: string[]) => {
  const sonuc = spawnSync("git", argumanlar, {
    cwd: kok,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (sonuc.status !== 0) {
    throw new Error(`git ${argumanlar[0]} çalışmadı: ${(sonuc.stderr ?? "").trim()}`);
  }
  return sonuc.stdout ?? "";
};

// Bir git kaydının çekirdek izi. Kayıt bilgisayarda yoksa ya da dockerignore taşımıyorsa hata verir.
export const cekirdekIzi = (kok: string, kayit: string): string => {
  if (!/^[0-9a-f]{7,40}$/.test(kayit)) throw new Error(`Kayıt numarası geçersiz: ${kayit}`);
  return izHesapla(
    git(kok, ["ls-tree", "-r", "-z", "--full-tree", kayit]),
    git(kok, ["show", `${kayit}:${dockerignoreYolu}`]),
  );
};

export type SiteninKayitlari = {
  ortam: string;
  kodAdi: string;
  kayitlar: { tur: string; sonuc: string; surum: string; kayit: string; cekirdekIzi?: string }[];
};

// Sürüm çakışması: bu sürüm sunucudaki herhangi bir sitenin başarılı bir yayınında başka bir izle yayınlanmışsa
// sebebi döner, yoksa undefined. Kayıtta bu biçimde iz yoksa (eski yayın ya da eski biçim) iz git kaydından
// hesaplanır; hesaplanamazsa (kayıt bilgisayarda yok) çakışma sayılır. Geri dönüş yeni kod yayınlamaz, sayılmaz.
export const surumCakismasi = (
  surum: string,
  iz: string,
  siteler: SiteninKayitlari[],
  kayittanIz: (kayit: string) => string,
): string | undefined => {
  const onbellek = new Map<string, string | undefined>();
  const izi = (kayit: string): string | undefined => {
    if (!onbellek.has(kayit)) {
      try {
        onbellek.set(kayit, kayittanIz(kayit));
      } catch {
        onbellek.set(kayit, undefined);
      }
    }
    return onbellek.get(kayit);
  };
  for (const site of siteler) {
    for (const k of site.kayitlar) {
      if (k.tur !== "yayin" || k.sonuc !== "basarili" || k.surum !== surum) continue;
      const onunki = k.cekirdekIzi?.startsWith(`${izBicimi}:`) ? k.cekirdekIzi : izi(k.kayit);
      if (onunki === iz) continue;
      const neden = onunki === undefined ? "izi hesaplanamadı" : "başka bir çekirdek";
      return `Sürüm ${surum} ${site.ortam}/${site.kodAdi} sitesinde ${k.kayit.slice(0, 12)} kaydıyla yayınlanmış (${neden}). Aynı numara başka bir çekirdeği gösteremez: cekirdek/surum.ts'deki sürümü artırın, sürüm notunu yazın, kimliği yeni sürüme geçirin.`;
    }
  }
  return undefined;
};

// Sunucudaki bütün sitelerin yayın kayıtları ("### <ortam>/<kod adı>" başlıklı birleşik çıktı).
export const birlesikKayitlariCoz = (
  metin: string,
  coz: (metin: string) => SiteninKayitlari["kayitlar"],
): SiteninKayitlari[] => {
  const siteler: SiteninKayitlari[] = [];
  let simdiki: { ortam: string; kodAdi: string; satirlar: string[] } | undefined;
  const bitir = () => {
    if (simdiki) {
      const { ortam, kodAdi } = simdiki;
      try {
        siteler.push({ ortam, kodAdi, kayitlar: coz(simdiki.satirlar.join("\n")) });
      } catch (hata) {
        // Okunamayan kayıt bütün yayınları durdurur (o sitenin sürümleri bilinmez); hangi sitenin olduğu söylenir.
        throw new Error(`${ortam}/${kodAdi} yayın kaydı: ${(hata as Error).message}`);
      }
    }
  };
  for (const satir of metin.split("\n")) {
    const baslik = satir.match(/^### ([a-z0-9-]+)\/([a-z0-9-]+)$/);
    if (baslik) {
      bitir();
      simdiki = { ortam: baslik[1] as string, kodAdi: baslik[2] as string, satirlar: [] };
    } else if (satir.trim()) {
      if (!simdiki) throw new Error("Birleşik yayın kaydı başlıksız satırla başlıyor.");
      simdiki.satirlar.push(satir);
    }
  }
  bitir();
  return siteler;
};
