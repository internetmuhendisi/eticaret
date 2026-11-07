// Robot koruması (kart 0033, karar 0051, .claude/rules/guvenlik.md). Kendi sunucumuzda çalışır, dış
// hizmete veri gitmez: sunucu imzalı bir soru verir, tarayıcı küçük bir hesap işi yapıp cevabı formla
// gönderir. Kod yalnız bu dosyadaki iki işlevi bilir; yöntem değişirse değişiklik bu modüldedir.
//
// Anahtarlar süreç açılırken üretilir, kalıcı bir gizli bilgi gerekmez: sızacak ya da devirde taşınacak
// bir şey yoktur. Süreç yeniden başlayınca eski sorular geçersiz olur, form sessizce yeni soru alır.
// Her site tek süreçtedir (karar 0042). Next.js her adres dosyasını ayrı paketleyebildiği için durum
// sürecin ortak alanındadır: soruyu üreten uç ile cevabı alan uç aynı anahtarı görmeli.
import { randomBytes } from "node:crypto";
import { createChallenge, randomInt, verifySolution } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import { robotKorumasiAyari } from "../../kayitlar/robot-korumasi.ts";

type Durum = { soruAnahtari: string; cozumAnahtari: string; kullanilanlar: Map<string, number> };

const durumYeri = Symbol.for("cekirdek.robot-korumasi");
const durum = (): Durum => {
  const kok = globalThis as unknown as Record<symbol, Durum | undefined>;
  kok[durumYeri] ??= {
    soruAnahtari: randomBytes(32).toString("hex"),
    cozumAnahtari: randomBytes(32).toString("hex"),
    kullanilanlar: new Map(),
  };
  return kok[durumYeri];
};

export const robotSorusuUret = () => {
  const { soruAnahtari, cozumAnahtari } = durum();
  const { algoritma, maliyet, enAzDeneme, enCokDeneme, sureSaniye } = robotKorumasiAyari;
  return createChallenge({
    algorithm: algoritma,
    cost: maliyet,
    counter: randomInt(enAzDeneme, enCokDeneme),
    deriveKey,
    expiresAt: new Date(Date.now() + sureSaniye * 1000),
    hmacSignatureSecret: soruAnahtari,
    hmacKeySignatureSecret: cozumAnahtari,
  });
};

// Soru imzalıdır: içeriği doğrulamada imzayla denetlenir, burada yalnız biçimi aranır.
const cevapBicimi = z.object({
  soru: z.object({
    parameters: z.looseObject({
      algorithm: z.string(),
      nonce: z.string(),
      salt: z.string(),
      cost: z.number(),
      keyLength: z.number(),
      keyPrefix: z.string(),
      expiresAt: z.number(),
    }),
    signature: z.string(),
  }),
  cozum: z.object({ counter: z.number(), derivedKey: z.string() }),
});

const cevabiOku = (cevap: string) => {
  try {
    return cevapBicimi.parse(JSON.parse(cevap));
  } catch {
    return null;
  }
};

const temizle = (kullanilanlar: Map<string, number>, simdi: number): void => {
  for (const [soru, bitis] of kullanilanlar) {
    if (bitis <= simdi) kullanilanlar.delete(soru);
  }
};

// Cevap doğruysa soruyu harcar: aynı cevap ikinci kez geçmez. Değilse hata fırlatır.
export const robotCevabiniDogrula = async (cevap: string): Promise<void> => {
  const okunan = cevabiOku(cevap);
  if (okunan === null) throw new BilinenHata("robot-dogrulamasi");
  const { soruAnahtari, cozumAnahtari, kullanilanlar } = durum();
  const { verified } = await verifySolution({
    challenge: okunan.soru,
    solution: okunan.cozum,
    deriveKey,
    hmacSignatureSecret: soruAnahtari,
    hmacKeySignatureSecret: cozumAnahtari,
  });
  if (!verified) throw new BilinenHata("robot-dogrulamasi");

  // Bekleme yok: denetim ile işaretleme arasına başka istek giremez, aynı anda giden iki cevabın biri geçer.
  const simdi = Date.now();
  temizle(kullanilanlar, simdi);
  const { nonce, expiresAt } = okunan.soru.parameters;
  if (kullanilanlar.has(nonce)) throw new BilinenHata("robot-dogrulamasi");
  kullanilanlar.set(nonce, expiresAt * 1000);
};
