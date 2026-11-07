// E-posta gönderim hizmetinin bağlandığı TEK yer (kart 0032, karar 0050). Hizmet değişince yalnız bu
// dosya değişir; gerisi EpostaGondericisi türünü bilir.
//
// Bugün gerçek hizmet yoktur. Gönderici yalnız yerel posta kutusuna (Mailpit) bağlanır, başka adres
// verilirse bağlanmaz: geliştirmede e-posta gerçek kişilere gitmez. Gerçek hizmet açılışta bağlanır
// (kart 0060). Adres yoksa (sunucuda bugün böyle) gönderici yoktur, e-posta "gönderilmedi" kalır.
import { epostaAyari } from "../../kayitlar/eposta.ts";

export type EpostaIletisi = {
  kimden: { ad: string; adres: string };
  yanitAdresi?: string;
  kime: string;
  konu: string;
  metin: string;
  html: string;
  // Her denemede aynıdır: hizmet tekrarı bununla tanır.
  mesajKimligi: string;
};

export type EpostaGondericisi = (ileti: EpostaIletisi) => Promise<void>;

const yerelSunucular = new Set(["posta-kutusu", "localhost", "127.0.0.1"]);

export const epostaGondericisi = (
  adres: string | undefined = process.env["EPOSTA_SUNUCUSU"],
): EpostaGondericisi | undefined => {
  if (!adres) return undefined;
  let sunucu: URL;
  try {
    sunucu = new URL(adres);
  } catch {
    return undefined;
  }
  if (sunucu.protocol !== "smtp:" || !yerelSunucular.has(sunucu.hostname)) return undefined;
  return async (ileti) => {
    const { createTransport } = await import("nodemailer");
    const tasiyici = createTransport({
      host: sunucu.hostname,
      port: Number(sunucu.port),
      secure: false,
      ignoreTLS: true,
      connectionTimeout: epostaAyari.baglantiZamanAsimiMs,
      // E-postaya sunucudaki dosya ya da uzak adres içeriği eklenemez.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await tasiyici.sendMail({
      from: { name: ileti.kimden.ad, address: ileti.kimden.adres },
      ...(ileti.yanitAdresi === undefined ? {} : { replyTo: ileti.yanitAdresi }),
      to: ileti.kime,
      subject: ileti.konu,
      text: ileti.metin,
      html: ileti.html,
      messageId: ileti.mesajKimligi,
    });
  };
};
