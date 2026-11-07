// Sunucuda sitenin yöneticisini açar ya da kapatır (kart 0048, karar 0054). Çekirdeğin görüntüsünde tek dosya
// olarak durur (/uygulama/yonetici/yonetici.mjs). Komut sitenin kutu kullanıcısıyla, sitenin ağında ve gizli
// bilgi dosyasıyla, günlüğü kapalı geçici kutuda çalıştırır (komutlar/sunucu-yonetici.mts):
//   node yonetici/yonetici.mjs <kod adı> ac <e-posta>
//   node yonetici/yonetici.mjs <kod adı> kapat <e-posta>
//   node yonetici/yonetici.mjs <kod adı> sahip-sayisi
// Şifreyi burada üretir, yalnız standart çıktıya bir kez yazar. Adres verilen siteye ait değilse hiçbir şey yapmaz.
import { randomBytes } from "node:crypto";
import { and, countDistinct, eq, isNull } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { baglan, siteninAdresi } from "../../veritabani/baglanti.ts";
import { epostaSemasi } from "../oturum/semalar.ts";
import { roller, yoneticiler, yoneticiRolleri } from "./model.ts";
import { tamYetkiliYoneticiAc, yoneticiHesabiKapat } from "./servis.ts";

const yaz = (satir: string): void => {
  process.stdout.write(`${satir}\n`);
};
const hata = (satir: string): void => {
  process.stderr.write(`${satir}\n`);
  process.exitCode = 1;
};

const hataMesajlari: Record<string, string> = {
  dogrulama: "E-posta geçersiz.",
  cakisma: "Bu e-postayla bir yönetici zaten var.",
  bulunamadi: "Tam yetkili rol yok, önce veritabanı güncellenmeli.",
  "is-kurali": "Son tam yetkili yönetici kapatılamaz.",
};

const [kodAdi, islem, epostaGirdisi] = process.argv.slice(2);
const eposta = epostaSemasi.safeParse(epostaGirdisi);
const adres = kodAdi ? siteninAdresi(kodAdi) : null;

if (!kodAdi || (islem !== "ac" && islem !== "kapat" && islem !== "sahip-sayisi")) {
  hata("Kullanım: yonetici.mjs <kod adı> ac|kapat <e-posta> ya da sahip-sayisi");
} else if (islem !== "sahip-sayisi" && !eposta.success) {
  hata("E-posta geçersiz.");
} else if (adres === null) {
  hata(`Veritabanı adresi ${kodAdi} sitesinin değil, hiçbir şey yapılmadı.`);
} else {
  const veritabani = baglan(adres);
  const kim = sistemIslemi("sunucu-yonetici");
  try {
    if (islem === "sahip-sayisi") {
      const [sonuc] = await veritabani
        .select({ sayi: countDistinct(yoneticiler.kimlik) })
        .from(yoneticiler)
        .innerJoin(yoneticiRolleri, eq(yoneticiRolleri.yonetici_kimligi, yoneticiler.kimlik))
        .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
        .where(and(eq(roller.tam_yetki, true), isNull(yoneticiler.silinme_zamani)));
      yaz(`sahip ${sonuc?.sayi ?? 0}`);
    } else if (!eposta.success) {
      hata("E-posta geçersiz.");
    } else if (islem === "ac") {
      const sifre = randomBytes(24).toString("base64url");
      await tamYetkiliYoneticiAc(veritabani, { eposta: eposta.data, sifre }, kim);
      yaz(`sifre ${sifre}`);
    } else {
      const [bulunan] = await veritabani
        .select({ kimlik: yoneticiler.kimlik })
        .from(yoneticiler)
        .where(and(eq(yoneticiler.eposta, eposta.data), isNull(yoneticiler.silinme_zamani)));
      if (bulunan === undefined) {
        hata("Bu e-postayla açık bir yönetici yok.");
      } else {
        await yoneticiHesabiKapat(veritabani, { yoneticiKimligi: bulunan.kimlik }, kim);
        yaz("kapatildi");
      }
    }
  } catch (yakalanan) {
    // Beklenmeyen hatanın iletisi yazılmaz: veritabanı hatası sorgu değerini, yani şifre özetini taşıyabilir.
    hata(
      yakalanan instanceof BilinenHata
        ? (hataMesajlari[yakalanan.kod] ?? yakalanan.kod)
        : "Beklenmeyen hata, işlem geri alındı.",
    );
  } finally {
    await veritabani.$client.end();
  }
}
