// Her kişinin her uçtaki erişimini gerçek veritabanıyla dener (kart 0030, karar 0047). Uç listesi adres
// dosyalarından okunur: yeni uç kendiliğinden kapsama girer. Beklenen sonuç uç belgesindeki izinden ve izin
// kaydından çıkar: uçtaki izin yanlış yazılırsa belgeyle uyuşmaz, ucun kendi beyanından hesaplansaydı
// fark edilmezdi. Boş gövdeli istek gönderilir: kapı izni doğrulamadan önce sorar. Boş girdiyi kabul eden
// uçta izinli kişi işe girer (çıkış gibi); deneme geçici veritabanındadır, oturum her seferinde yenidir.
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { eq } from "drizzle-orm";
import { type HerkeseAcik, herkeseAcik, type IzinAdi, izinler } from "../../kayitlar/izinler.ts";
import { baslangicRolleri } from "../../moduller/ekip/baslangic-rolleri.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { hesapAc, oturumAc } from "../../moduller/oturum/servis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { oturumCerezleri } from "../oturum-cerezi.ts";
import type { Uc } from "../uc.ts";
import { zarfOnbellegi } from "../zarf.ts";

export const uygulamaAdresleri = join(import.meta.dirname, "..", "..", "uygulama", "app", "kapi");
const yontemler = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const adresDosyalari = (klasor: string): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
        const yol = join(klasor, girdi.name);
        if (girdi.isDirectory()) return adresDosyalari(yol);
        return girdi.name === "route.ts" ? [yol] : [];
      })
    : [];

// Next.js'in adres saydığı bütün dosyalar (route.ts, route.tsx, route.js...), kökteki yoluyla. Kapının
// dışındaki ya da adı route.ts olmayan adres bu listede görünür: uç deneme listesine giremez, sessizce
// kapısız yayına çıkmasın diye test bunları kırmızı sayar.
export const kapiDisiAdresler = (appKlasoru: string): string[] => {
  const tara = (klasor: string): string[] =>
    existsSync(klasor)
      ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
          const yol = join(klasor, girdi.name);
          if (girdi.isDirectory()) return tara(yol);
          return /^route\.[cm]?[jt]sx?$/.test(girdi.name) ? [yol] : [];
        })
      : [];
  return tara(appKlasoru)
    .map((yol) => relative(appKlasoru, yol).split(sep).join("/"))
    .filter((yol) => !/^kapi\/.*\/route\.ts$/.test(yol))
    .toSorted();
};

export type KayitliUc = {
  baslik: string;
  yontem: (typeof yontemler)[number];
  yol: string;
  giris: string | undefined;
  uc: Partial<Uc> & ((istek: Request) => Promise<Response>);
};

// Adres dosyalarındaki bütün uçlar. Klasör: içinde <giriş>/.../route.ts duran kök.
export const uclariOku = async (klasor: string): Promise<KayitliUc[]> => {
  const listeler = await Promise.all(
    adresDosyalari(klasor).map(async (dosya) => {
      const parcalar = relative(klasor, join(dosya, "..")).split(sep);
      const modul: Record<string, unknown> = await import(dosya);
      const yol = `/kapi/${parcalar.join("/")}`;
      return yontemler
        .filter((yontem) => yontem in modul)
        .map((yontem) => ({
          baslik: `${yontem} ${yol}`,
          yontem,
          yol,
          giris: parcalar[0],
          uc: modul[yontem] as KayitliUc["uc"],
        }));
    }),
  );
  return listeler.flat().toSorted((a, b) => a.baslik.localeCompare(b.baslik));
};

// Uç belgesindeki başlık → "İzin:" satırı.
export const belgedekiIzinler = (belge: string): Map<string, string> => {
  const izinListesi = new Map<string, string>();
  const bolumler = belge.split(/^(?=### )/m);
  for (const bolum of bolumler) {
    const baslik = bolum.match(/^### (\S+ \/kapi\/\S+)$/m)?.[1];
    const izin = bolum.match(/^- İzin: `([^`]+)`/m)?.[1];
    if (baslik !== undefined && izin !== undefined) izinListesi.set(baslik, izin);
  }
  return izinListesi;
};

export type Kisi =
  | { ad: string; tur: "girissiz" }
  | { ad: string; tur: "musteri" }
  | { ad: string; tur: "yonetici"; rolKodu: keyof typeof baslangicRolleri | null };

// Rol listesi kayıttan okunur: yeni rol kendiliğinden girer.
export const kisiler: readonly Kisi[] = [
  { ad: "girişsiz ziyaretçi", tur: "girissiz" },
  { ad: "müşteri", tur: "musteri" },
  { ad: "rolsüz yönetici", tur: "yonetici", rolKodu: null },
  ...(Object.keys(baslangicRolleri) as (keyof typeof baslangicRolleri)[]).map((rolKodu) => ({
    ad: `${rolKodu} rolü`,
    tur: "yonetici" as const,
    rolKodu,
  })),
];

// İzin kaydından beklenen: bu kişi bu izinle geçer mi.
export const erisebilirMi = (kisi: Kisi, izin: HerkeseAcik | IzinAdi): boolean => {
  if (izin === herkeseAcik) return true;
  const { giris } = izinler[izin];
  if (kisi.tur !== giris) return false;
  if (kisi.tur !== "yonetici") return true;
  if (kisi.rolKodu === null) return false;
  const rol: { tamYetki: boolean; izinler: readonly string[] } = baslangicRolleri[kisi.rolKodu];
  return rol.tamYetki || rol.izinler.includes(izin);
};

const reddedilen = new Set(["oturum-yok", "yetki"]);
const yeniAdres = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;

let sayac = 0;
const hesapAcVeRolVer = async (vt: Veritabani, kisi: Kisi): Promise<string | null> => {
  if (kisi.tur === "girissiz") return null;
  sayac += 1;
  const { hesapKimligi } = await hesapAc(vt, kisi.tur, {
    eposta: `erisim${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (kisi.tur === "yonetici" && kisi.rolKodu !== null) {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi.rolKodu));
    if (rol === undefined) throw new Error(`${kisi.rolKodu} rolü veritabanında yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return hesapKimligi;
};

// Oturum her denemede yenidir: çıkış gibi uçlar bir sonraki denemeyi etkilemesin.
export const oturumCerezi = async (
  vt: Veritabani,
  tur: "yonetici" | "musteri",
  hesapKimligi: string,
): Promise<string> =>
  oturumCerezleri(tur, await oturumAc(vt, tur, hesapKimligi, 3600), 3600)
    .map((satir) => satir.split(";")[0])
    .join("; ");

// Bir kişiyi bir uçta dener; dönen: tutmayan her şey.
const kisiyiDene = async (
  vt: Veritabani,
  { baslik, yontem, yol, uc }: KayitliUc,
  izin: HerkeseAcik | IzinAdi,
  kisi: Kisi,
  hesap: string | null,
): Promise<string[]> => {
  const hatalar: string[] = [];
  const cerez =
    kisi.tur === "girissiz" || hesap === null ? null : await oturumCerezi(vt, kisi.tur, hesap);
  const yanit = await uc(
    new Request(`http://yerel${yol}`, {
      method: yontem,
      headers: {
        "x-forwarded-for": yeniAdres(),
        ...(cerez === null ? {} : { cookie: cerez }),
      },
    }),
  );
  const govde = await yanit.text();
  // Önbellek (kart 0065, karar 0139): dosya yanıtı dışındaki her yanıt, başarılı ve hatalı, önbelleğe alınmaz.
  // Dosya yanıtı başarılıdır, türü tahmin ettirmez ve etiket taşır (zarf.ts, dosyaYanitla).
  const dosyaYaniti =
    yanit.status < 400 &&
    yanit.headers.get("x-content-type-options") === "nosniff" &&
    yanit.headers.has("etag");
  if (!dosyaYaniti && yanit.headers.get("cache-control") !== zarfOnbellegi) {
    hatalar.push(
      `${baslik}: ${kisi.ad} yanıtı önbelleğe alınabilir (${yanit.status}, Cache-Control: ${String(yanit.headers.get("cache-control"))})`,
    );
  }
  let kod: string | undefined;
  try {
    kod = (JSON.parse(govde) as { hata?: { kod?: string } }).hata?.kod;
  } catch {
    kod = undefined;
  }
  if (yanit.status >= 500 || yanit.status === 429) {
    hatalar.push(`${baslik}: ${kisi.ad} denenemedi (${yanit.status})`);
    return hatalar;
  }
  // Kodsuz 403 de red sayılır: izinli kişi reddedilmişse yeşil kalmasın.
  const reddedildi = (kod !== undefined && reddedilen.has(kod)) || yanit.status === 403;
  const beklenen = erisebilirMi(kisi, izin);
  if (reddedildi === beklenen) {
    hatalar.push(
      `${baslik}: ${kisi.ad} ${beklenen ? "erişmeliydi" : "erişmemeliydi"} (${yanit.status} ${String(kod)})`,
    );
  }
  return hatalar;
};

// Her uçta her kişiyi dener. Dönen: tutmayan her şey, boşsa temiz.
export const erisimleriDene = async (
  vt: Veritabani,
  uclar: readonly KayitliUc[],
  belge: string,
): Promise<string[]> => {
  const hatalar: string[] = [];
  const beklenenler = belgedekiIzinler(belge);
  const hesaplar = new Map<Kisi, string | null>();
  for (const kisi of kisiler) hesaplar.set(kisi, await hesapAcVeRolVer(vt, kisi));

  for (const { baslik, yontem, yol, uc } of uclar) {
    const belgede = beklenenler.get(baslik);
    if (belgede === undefined) {
      hatalar.push(`${baslik}: belgede izni yok`);
      continue;
    }
    if (uc.tanim?.izin !== belgede) {
      hatalar.push(`${baslik}: uçta "${String(uc.tanim?.izin)}", belgede "${belgede}"`);
    }
    const izin = belgede as HerkeseAcik | IzinAdi;
    if (izin !== herkeseAcik && !(izin in izinler)) {
      hatalar.push(`${baslik}: "${belgede}" izin kaydında yok`);
      continue;
    }
    // Bir uçta kişiler aynı anda denenir (kart 0325): her kişinin hesabı, oturumu ve istemci adresi ayrıdır, biri
    // ötekinin denemesini etkilemez. Süre çoğunlukla veritabanı beklemesidir; sırayla denemek hattın yükünde
    // adımı 5 saniyelik sınıra taşıyordu. Hatalar kişilerin sırasıyla yazılır.
    const kisiHatalari = await Promise.all(
      kisiler.map((kisi) =>
        kisiyiDene(vt, { baslik, yontem, yol, uc }, izin, kisi, hesaplar.get(kisi) ?? null),
      ),
    );
    hatalar.push(...kisiHatalari.flat());
  }
  return hatalar;
};
