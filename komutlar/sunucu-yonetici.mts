// Sunucudaki sitenin yöneticisini açan ve kapatan geçici kutu (kart 0048, karar 0054). Yayındaki görüntünün
// parçasını sitenin kutu kullanıcısıyla, sitenin ağında, salt okunur ve yetkisiz çalıştırır. Günlük kapalıdır:
// şifre Docker'ın kutu günlüğüne de yazılmaz, yalnız çağıranın ekranına gelir.
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { epostaSemasi } from "../cekirdek/moduller/oturum/semalar.ts";
import { gizliKlasor, kutuKullanicisi, type Ortam } from "./gizli-bilgi.mts";
import { kodAdiGecerli } from "./on-kapi.mts";
import { siteAgi } from "./sunucu-veritabani.mts";

// E-posta kabuğa gider: bu karakterler dışındaki adres reddedilir, tırnak ve komut karakteri geçemez.
const kabukEpostasi = (eposta: string): string => {
  const temiz = epostaSemasi.parse(eposta);
  if (!/^[a-z0-9._+@-]+$/.test(temiz)) throw new Error("E-postada desteklenmeyen karakter var.");
  return temiz;
};

// Girdi kabuğa gitmeden denetlenir. eposta verilmezse işlem e-posta istemez (sahip-sayisi).
export const yoneticiBetigi = (
  islem: "ac" | "kapat" | "sahip-sayisi",
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  etiket: string,
  eposta?: string,
): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  const adres = eposta === undefined ? "" : ` ${kabukEpostasi(eposta)}`;
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const dosya = `${gizliKlasor(ortam, kodAdi)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const ic = `/run/secrets/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  return `set -eu
docker run --rm --log-driver none --network ${siteAgi(ortam, kodAdi)} --user ${kullanici}:${kullanici} --read-only --cap-drop ALL --security-opt no-new-privileges:true -v ${dosya}:${ic}:ro -e VERITABANI_ADRESI_DOSYASI=${ic} ${etiket} node yonetici/yonetici.mjs ${kodAdi} ${islem}${adres}
`;
};

// Kutunun çıktısından şifreyi alır. Başka bir şey bulunursa çıktı kimseye gösterilmez.
export const sifreyiOku = (cikti: string): string | null =>
  /^sifre (\S+)$/m.exec(cikti)?.[1] ?? null;

export const sahipSayisiniOku = (cikti: string): number | null => {
  const sayi = /^sahip (\d+)$/m.exec(cikti)?.[1];
  return sayi === undefined ? null : Number(sayi);
};
