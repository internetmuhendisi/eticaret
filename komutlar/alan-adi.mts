// Altyapının alan adında deneme adreslerini sunucuya bağlar (kart 0020, karar 0032).
//
//   pnpm alan-adi            Hiçbir şeyi değiştirmez. Cloudflare'deki kayıtları okur, eklenecek ya
//                            da değişecek kaydı söyler.
//   pnpm alan-adi --onayli   Yalnız söylenen kayıtları ekler ya da düzeltir.
//
// Alan adı değişikliği geri alınamaz sayılır; --onayli yalnız kullanıcı değişikliği onayladıktan
// sonra yazılır. Komut yalnız deneme adreslerinin kayıtlarına dokunur (on-kapi.mts), alan adının
// başka hiçbir kaydını değiştirmez ve silmez. Aynı adda başka türde bir kayıt varsa durur.
// Cloudflare anahtarı yalnız .env'deki CLOUDFLARE_ANAHTARI'ndan okunur, ekrana yazılmaz.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { alanAdiKayitlari, altyapiAlanAdi } from "./on-kapi.mts";
import { kayitlariOku, kok } from "./sunucu.mts";

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

const cloudflare = async <T,>(
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

type Kayit = { id: string; type: string; name: string; content: string; proxied: boolean };

const aciklama = "altyapi: deneme adresleri (karar 0032)";

const calis = async (onayli: boolean): Promise<void> => {
  const [sunucu] = kayitlariOku();
  if (!sunucu?.ipv4 || !sunucu.ipv6) {
    throw new Error("sunucu/sunucular.json'da adresleri olan sunucu yok. Önce: pnpm sunucu-kur");
  }
  const bolgeler = await cloudflare<{ id: string; name: string; status: string }[]>(
    `/zones?name=${encodeURIComponent(altyapiAlanAdi)}`,
  );
  const bolge = bolgeler[0];
  if (!bolge) throw new Error(`Bu anahtar ${altyapiAlanAdi} alan adını göremiyor.`);
  console.log(`alan adı    ${bolge.name} (${bolge.status})`);

  const istenenler = alanAdiKayitlari(sunucu.ipv4, sunucu.ipv6);
  const adlar = [...new Set(istenenler.map((k) => k.name))];
  const mevcut: Kayit[] = [];
  for (const ad of adlar) {
    mevcut.push(
      ...(await cloudflare<Kayit[]>(
        `/zones/${bolge.id}/dns_records?name.exact=${encodeURIComponent(ad)}&per_page=100`,
      )),
    );
  }

  // Aynı adda başka türde kayıt (CNAME gibi) varsa elle bakılır; komut ona dokunmaz.
  const yabanci = mevcut.filter((k) => !istenenler.some((i) => i.type === k.type));
  if (yabanci.length > 0) {
    throw new Error(
      `Aynı adda başka kayıt var, elle bakılmalı: ${yabanci.map((k) => `${k.type} ${k.name} ${k.content}`).join(", ")}`,
    );
  }

  const isler: { metin: string; yap: () => Promise<unknown> }[] = [];
  for (const istenen of istenenler) {
    const ayniTur = mevcut.filter((k) => k.type === istenen.type && k.name === istenen.name);
    if (ayniTur.length > 1) {
      throw new Error(
        `${istenen.type} ${istenen.name} için ${ayniTur.length} kayıt var, elle bakılmalı.`,
      );
    }
    const var_ = ayniTur[0];
    const govde = { ...istenen, ttl: 1, comment: aciklama };
    if (!var_) {
      isler.push({
        metin: `eklenecek   ${istenen.type} ${istenen.name} → ${istenen.content} (vekil kapalı)`,
        yap: () => cloudflare(`/zones/${bolge.id}/dns_records`, { yontem: "POST", govde }),
      });
    } else if (var_.content !== istenen.content || var_.proxied !== istenen.proxied) {
      isler.push({
        metin: `değişecek   ${istenen.type} ${istenen.name}: ${var_.content}${var_.proxied ? " (vekil açık)" : ""} → ${istenen.content} (vekil kapalı)`,
        yap: () =>
          cloudflare(`/zones/${bolge.id}/dns_records/${var_.id}`, { yontem: "PATCH", govde }),
      });
    } else {
      console.log(`aynı        ${istenen.type} ${istenen.name} → ${istenen.content}`);
    }
  }

  if (isler.length === 0) {
    console.log("Alan adı kayıtları zaten doğru, değişiklik yok.");
    return;
  }
  for (const is of isler) console.log(is.metin);
  if (!onayli) {
    console.log("Hiçbir şey değiştirilmedi. Onaydan sonra: pnpm alan-adi --onayli");
    return;
  }
  for (const is of isler) {
    await is.yap();
    console.log(`yapıldı     ${is.metin.slice(12)}`);
  }
};

try {
  await calis(process.argv.includes("--onayli"));
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
