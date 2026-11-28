// Cloudflare'in alan adı kayıtları ucu (kart 0020, 0344). Anahtar yalnız .env'deki CLOUDFLARE_ANAHTARI'ndan
// okunur, ekrana yazılmaz; yalnız alan adı komutlarını çalıştıran bilgisayarda kullanılır (karar 0032).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import type { AlanAdiIsi, CloudflareKaydi } from "./alan-adi-plani.mts";
import { altyapiAlanAdi } from "./on-kapi.mts";
import { kok } from "./sunucu.mts";

const anahtarAdi = "CLOUDFLARE_ANAHTARI";

const anahtar = (): string => {
  const envYolu = join(kok, ".env");
  const deger = existsSync(envYolu)
    ? (parseEnv(readFileSync(envYolu, "utf8")) as Record<string, string | undefined>)[anahtarAdi]
    : undefined;
  if (!deger)
    throw new Error(`.env dosyasında ${anahtarAdi} yok. Biçimi .env.example dosyasında yazar.`);
  return deger;
};

export const cloudflare = async <T,>(
  yol: string,
  { yontem = "GET", govde }: { yontem?: string; govde?: unknown } = {},
): Promise<T> => {
  const yanit = await fetch(`https://api.cloudflare.com/client/v4${yol}`, {
    method: yontem,
    headers: {
      Authorization: `Bearer ${anahtar()}`,
      ...(govde === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });
  const veri = (await yanit.json()) as {
    success: boolean;
    errors?: { code: number; message: string }[];
    result: T;
  };
  if (!yanit.ok || !veri.success) {
    const hata = veri.errors?.map((h) => `${h.code} ${h.message}`).join("; ") ?? "";
    throw new Error(`Cloudflare ${yontem} ${yol} reddetti (${yanit.status}): ${hata}`);
  }
  return veri.result;
};

export const bolgeyiBul = async (): Promise<{ id: string; name: string; status: string }> => {
  const bolgeler = await cloudflare<{ id: string; name: string; status: string }[]>(
    `/zones?name=${encodeURIComponent(altyapiAlanAdi)}`,
  );
  const bolge = bolgeler[0];
  if (!bolge) throw new Error(`Bu anahtar ${altyapiAlanAdi} alan adını göremiyor.`);
  return bolge;
};

// Verilen adlardaki bütün kayıtlar ve açıklaması verilen öneklerden biriyle başlayan bütün kayıtlar.
export const kayitlariGetir = async (
  bolge: string,
  adlar: string[],
  onekler: string[],
): Promise<CloudflareKaydi[]> => {
  const sorgular = [
    ...[...new Set(adlar)].map((ad) => `name.exact=${encodeURIComponent(ad)}`),
    ...onekler.map((onek) => `comment.startswith=${encodeURIComponent(onek)}`),
  ];
  const kayitlar: CloudflareKaydi[] = [];
  for (const sorgu of sorgular) {
    kayitlar.push(
      ...(await cloudflare<CloudflareKaydi[]>(`/zones/${bolge}/dns_records?${sorgu}&per_page=100`)),
    );
  }
  return [...new Map(kayitlar.map((k) => [k.id, k])).values()];
};

export const isiUygula = (bolge: string, is: AlanAdiIsi): Promise<unknown> =>
  is.tur === "ekle"
    ? cloudflare(`/zones/${bolge}/dns_records`, { yontem: "POST", govde: { ...is.kayit, ttl: 1 } })
    : is.tur === "degistir"
      ? cloudflare(`/zones/${bolge}/dns_records/${is.id}`, {
          yontem: "PATCH",
          govde: { ...is.kayit, ttl: 1 },
        })
      : cloudflare(`/zones/${bolge}/dns_records/${is.id}`, { yontem: "DELETE" });
