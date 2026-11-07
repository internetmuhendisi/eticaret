// İşleri sırayla çalıştıran döngü (kart 0031, karar 0049). Sürecin kendisi surec.ts'tedir.
import { gunluk } from "../izleme/gunluk.ts";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";
import { type KuyrukAyari, kuyrukAyari } from "../kayitlar/arka-plan.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";
import {
  type AlinanIs,
  type IsTanimi,
  isAl,
  isEkle,
  isiBasarisizYap,
  isiBitir,
  sahipUret,
} from "./kuyruk.ts";

export type ZamanliIs = {
  is: IsTanimi;
  girdi: unknown;
  herDakika: number;
};

// Zamanlı iş tanımlamanın yolu. Her zaman dilimi için tek kayıt açılır: birden çok süreç aynı anda
// çalışsa da iş bir kez girer. Süreç kapalıyken geçen dilimler sonradan çalıştırılmaz.
export const zamanliIs = <Girdi>(
  is: IsTanimi<Girdi>,
  girdi: Girdi,
  { herDakika }: { herDakika: number },
): ZamanliIs => ({ is, girdi, herDakika });

export const zamanliIsleriGir = async (
  vt: Veritabani,
  isler: readonly ZamanliIs[],
  simdi: number = Date.now(),
): Promise<void> => {
  for (const { is, girdi, herDakika } of isler) {
    const dilim = Math.floor(simdi / (herDakika * 60_000));
    await isEkle(vt, is, girdi, { tekillikAnahtari: `${is.tur}@${dilim}` });
  }
};

type Secenekler = {
  vt: Veritabani;
  isler: readonly IsTanimi[];
  zamanliIsler?: readonly ZamanliIs[];
  sahip?: string;
  ayar?: KuyrukAyari;
};

const sureIle = async (
  calisan: (sinyal: AbortSignal) => Promise<void>,
  sureMs: number,
  ustSinyal: AbortSignal,
): Promise<void> => {
  const denetim = new AbortController();
  const kapat = () => denetim.abort();
  ustSinyal.addEventListener("abort", kapat, { once: true });
  let zamanlayici: NodeJS.Timeout | undefined;
  const sure = new Promise<never>((_, reddet) => {
    zamanlayici = setTimeout(() => {
      denetim.abort();
      reddet(new Error(`İş ${sureMs} ms içinde bitmedi.`));
    }, sureMs);
  });
  try {
    await Promise.race([calisan(denetim.signal), sure]);
  } finally {
    clearTimeout(zamanlayici);
    ustSinyal.removeEventListener("abort", kapat);
  }
};

export const calistiriciKur = ({
  vt,
  isler,
  zamanliIsler = [],
  sahip = sahipUret(),
  ayar = kuyrukAyari,
}: Secenekler) => {
  const tanimlar = new Map(isler.map((tanim) => [tanim.tur, tanim]));
  const turler = [...tanimlar.keys()];

  const hataIleBitir = (is: AlinanIs, hata: unknown) => {
    hatayiKaydet(hata, {
      kaynak: "arka-plan",
      tur: is.tur,
      isKimligi: is.kimlik,
      deneme: is.deneme_sayisi,
    });
  };

  // Veritabanına yazılamayan sonuç döngüye hata olarak çıkar; kilit süresi dolunca iş yeniden alınır.
  const birIsCalistir = async (ustSinyal: AbortSignal = new AbortController().signal) => {
    const is = await isAl(vt, turler, sahip, ayar.kilitSaniye);
    if (is === undefined) return false;
    const tanim = tanimlar.get(is.tur) as IsTanimi;
    // Süreç önceki denemelerde iş bitmeden öldüyse hakkı dolmuş olabilir: iş artık çalıştırılmaz.
    if (is.deneme_sayisi > is.en_cok_deneme) {
      const hata = new Error(
        "İş deneme hakkı bitene kadar tamamlanamadı, süreç iş sırasında durdu.",
      );
      const sonuc = await isiBasarisizYap(vt, is, sahip, hata, tanim.ilkGecikmeSaniye, ayar);
      if (sonuc === "hata") hataIleBitir(is, hata);
      return true;
    }
    try {
      await sureIle(
        (sinyal) =>
          tanim.calistir(is.girdi, {
            vt,
            isKimligi: is.kimlik,
            deneme: is.deneme_sayisi,
            sinyal,
          }),
        ayar.isSuresiSaniye * 1000,
        ustSinyal,
      );
    } catch (hata) {
      const sonuc = await isiBasarisizYap(vt, is, sahip, hata, tanim.ilkGecikmeSaniye, ayar);
      if (sonuc === "hata") hataIleBitir(is, hata);
      else {
        gunluk.uyari("arka plan işi başarısız", {
          sonuc,
          tur: is.tur,
          isKimligi: is.kimlik,
          deneme: is.deneme_sayisi,
          hata,
        });
      }
      return true;
    }
    await isiBitir(vt, is, sahip);
    return true;
  };

  // Sinyal gelene kadar çalışır. Veritabanına ulaşılamazsa bekleme uzar ve kesinti başına tek hata
  // kaydedilir: hata izleme aracı her turda dolmaz.
  const dongu = async (sinyal: AbortSignal): Promise<void> => {
    const bekle = (ms: number) =>
      new Promise<void>((coz) => {
        if (sinyal.aborted) return coz();
        const zamanlayici = setTimeout(coz, ms);
        sinyal.addEventListener(
          "abort",
          () => {
            clearTimeout(zamanlayici);
            coz();
          },
          { once: true },
        );
      });
    let sonZamanli = Number.NEGATIVE_INFINITY;
    let kesinti = 0;
    while (!sinyal.aborted) {
      try {
        if (Date.now() - sonZamanli >= ayar.zamanliKontrolMs) {
          await zamanliIsleriGir(vt, zamanliIsler);
          sonZamanli = Date.now();
        }
        const calisti = await birIsCalistir(sinyal);
        if (kesinti > 0) gunluk.bilgi("arka plan kuyruğuna yeniden ulaşıldı");
        kesinti = 0;
        if (!calisti) await bekle(ayar.bosBeklemeMs);
      } catch (hata) {
        if (kesinti === 0) hatayiKaydet(hata, { kaynak: "arka-plan-dongusu" });
        kesinti += 1;
        await bekle(Math.min(ayar.bosBeklemeMs * 2 ** kesinti, ayar.enUzunKesintiBeklemeMs));
      }
    }
  };

  return { birIsCalistir, dongu };
};
