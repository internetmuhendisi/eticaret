// Sunucudaki sitenin yöneticisini açan ve kapatan geçici kutu (kart 0048, karar 0054). Yayındaki görüntünün
// parçasını sitenin kutu kullanıcısıyla, sitenin ağında, salt okunur ve yetkisiz çalıştırır. Günlük kapalıdır:
// şifre Docker'ın kutu günlüğüne de yazılmaz, yalnız çağıranın ekranına gelir.
import { z } from "zod";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { epostaSemasi } from "../cekirdek/moduller/oturum/semalar.ts";
import type { Ortam } from "./sunucu.mts";
import { gizliKlasor, kutuKullanicisi, siteAgi } from "./sunucu-veritabani.mts";

const kodAdiSemasi = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

// E-posta kabuğa gider: bu karakterler dışındaki adres reddedilir, tırnak ve komut karakteri geçemez.
const kabukEpostasi = (eposta: string): string => {
  const temiz = epostaSemasi.parse(eposta);
  if (!/^[a-z0-9._+@-]+$/.test(temiz)) throw new Error("E-postada desteklenmeyen karakter var.");
  return temiz;
};

export const yoneticiBetigi = (
  islem: "ac" | "kapat",
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  etiket: string,
  eposta: string,
): string => {
  const kod = kodAdiSemasi.parse(kodAdi);
  const adres = kabukEpostasi(eposta);
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const dosya = `${gizliKlasor(ortam, kod)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const ic = `/run/secrets/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  return `set -eu
docker run --rm --log-driver none --network ${siteAgi(ortam, kod)} --user ${kullanici}:${kullanici} --read-only --cap-drop ALL --security-opt no-new-privileges:true -v ${dosya}:${ic}:ro -e VERITABANI_ADRESI_DOSYASI=${ic} ${etiket} node yonetici/yonetici.mjs ${kod} ${islem} ${adres}
`;
};

// Kutunun çıktısından şifreyi alır. Başka bir şey bulunursa çıktı kimseye gösterilmez.
export const sifreyiOku = (cikti: string): string | null =>
  /^sifre (\S+)$/m.exec(cikti)?.[1] ?? null;
