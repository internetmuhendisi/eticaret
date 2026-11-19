// Sahte ödeme kuruluşu (kart 0215): iyzico'nun belgelenen uçlarını yerelde taklit eden HTTP sunucusu. Birim testleri
// süreç içinde açar; tarayıcı testleri ayrı süreç olarak açar (sahte-kurulus-sunucusu.ts). Gerçek kuruluşa istek gitmez.
//
// - Her isteğin IYZWSv2 imzası doğrulanır (yanlış imzalı istek reddedilir): eklentinin imzası da böylece denenir.
// - Yanıtların imzası belgelerdeki sırayla gizli anahtarla üretilir.
// - Ödeme sayfası (/odeme-sayfasi/<belirteç>) müşterinin ödemesini taklit eder: Öde, taksitle öde, reddet; her düğme
//   belirteci dönüş adresine form olarak gönderir (gerçek kuruluşun tarayıcı dönüşü gibi).
// - Testler sonucu ve arızaları denetim uçlarından ya da süreç içinde nesneden ayarlar.
// - İade (kart 0235): sepet kalemi başına (/payment/refund, kalemin ödenen kalanı aşılamaz) ve ödemenin kimliğiyle
//   (/v2/payment/refund); iadeler raporda REFUND satırı olarak conversationId ile görünür. Arızalar: iade reddi ve
//   yanıtsız iade (kuruluş iadeyi yapar ama bağlantı kesilir: sonuç belirsiz).
import { createHmac, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { takvimGunu } from "../../../metinler/bicimleyici.ts";

// Kuruluşun takvimi (iyzico Türkiye saatiyle çalışır); testlerin sitesi de aynı saat dilimindedir.
const kurulusSaatDilimi = "Europe/Istanbul";

export type SahteOdemeSonucu =
  | "basarili"
  | "basarisiz"
  | "bekliyor"
  | "sahtecilik"
  | "sahtecilik-red";

export type SahteOdeme = {
  belirtec: string;
  oturum: string;
  tutar: string;
  paraBirimi: string;
  donusAdresi: string;
  taksitler: number[];
  istek: Record<string, unknown>;
  sonuc: SahteOdemeSonucu;
  taksit: number;
  odemeKimligi: string;
  iptal: boolean;
  // Ödemenin kuruluşun takvimindeki günü (YYYY-AA-GG): rapor yalnız istenen günün ödemelerini verir (gerçek kuruluş gibi).
  gun: string;
  // Sepet kalemleri: kuruluşun kalem işlem kimliği ve tutarı (kuruş).
  kalemler: { id: string; islem: string; tutar: number }[];
  // Yapılan iadeler: conversationId, kalem işlemi (v2'de yok), tutar (kuruş), gün.
  iadeler: { parca: string; islem: string | null; tutar: number; gun: string }[];
};

export type SahteKurulus = {
  adres: string;
  odemeler: Map<string, SahteOdeme>;
  // Arızalar: kuruluş yanıt vermez (bağlantı kesilir), sonuç imzası bozuk, iptal reddedilir.
  // geciciHata: sonuç sorgusu kuruluşun sistem hatasını döner (status failure).
  ariza: {
    ulasilamaz: boolean;
    bozukImza: boolean;
    iptalReddi: boolean;
    taksitReddi: boolean;
    geciciHata: boolean;
    iadeReddi: boolean;
    iadeYanitsiz: boolean;
    // Yalnız bu sepet kaleminin (itemId) iadesi reddedilir.
    reddedilenKalem: string | null;
  };
  // Rapora sitede olmayan ya da farklı tutarlı ödeme eklemek için.
  ekRapor: Record<string, unknown>[];
  istekSayisi: Map<string, number>;
  kapat: () => Promise<void>;
};

const hmac = (gizli: string, veri: string) =>
  createHmac("sha256", gizli).update(veri).digest("hex");
const imzaTutari = (deger: unknown) => String(Number(deger));

const govdeOku = (istek: IncomingMessage): Promise<string> =>
  new Promise((coz, reddet) => {
    let govde = "";
    istek.setEncoding("utf8");
    istek.on("data", (parca: string) => {
      govde += parca;
    });
    istek.on("end", () => coz(govde));
    istek.on("error", reddet);
  });

// IYZWSv2 başlığı: base64("apiKey:…&randomKey:…&signature:…"), imza HMAC(randomKey + sorgusuz yol + gövde) (gerçek
// deneme ortamında ölçüldü).
const yetkiliMi = (
  istek: IncomingMessage,
  govde: string,
  anahtar: string,
  gizli: string,
): boolean => {
  const baslik = istek.headers.authorization ?? "";
  if (!baslik.startsWith("IYZWSv2 ")) return false;
  const cozulen = Buffer.from(baslik.slice(8), "base64").toString("utf8");
  const parcalar = Object.fromEntries(
    cozulen.split("&").map((parca) => {
      const ayrac = parca.indexOf(":");
      return [parca.slice(0, ayrac), parca.slice(ayrac + 1)];
    }),
  );
  const rastgele = String(parcalar["randomKey"] ?? "");
  return (
    parcalar["apiKey"] === anahtar &&
    rastgele === istek.headers["x-iyzi-rnd"] &&
    parcalar["signature"] === hmac(gizli, rastgele + (istek.url ?? "").split("?")[0] + govde)
  );
};

const odemeSayfasi = (odeme: SahteOdeme) => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Sahte ödeme sayfası</title></head>
<body>
<h1>Sahte ödeme sayfası</h1>
<p>Tutar: ${odeme.tutar} ${odeme.paraBirimi}</p>
<form method="post" action="/odeme-sayfasi/${odeme.belirtec}/sonuc">
<label>Taksit <select name="taksit">${odeme.taksitler.map((sayi) => `<option value="${sayi}">${sayi}</option>`).join("")}</select></label>
<button name="sonuc" value="basarili">Öde</button>
<button name="sonuc" value="basarisiz">Reddet</button>
</form>
<a href="${odeme.donusAdresi}">Vazgeç</a>
</body></html>`;

// Sonuç sayfası: kuruluş müşteriyi belirteçle dönüş adresine gönderir (form, kendiliğinden).
const donusSayfasi = (odeme: SahteOdeme) => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Yönlendiriliyor</title></head>
<body onload="document.forms[0].submit()">
<form method="post" action="${odeme.donusAdresi}"><input type="hidden" name="token" value="${odeme.belirtec}"></form>
</body></html>`;

export const sahteKurulusAc = async ({
  anahtar,
  gizli,
  port = 0,
}: {
  anahtar: string;
  gizli: string;
  port?: number;
}): Promise<SahteKurulus> => {
  const odemeler = new Map<string, SahteOdeme>();
  const ariza = {
    ulasilamaz: false,
    bozukImza: false,
    iptalReddi: false,
    taksitReddi: false,
    geciciHata: false,
    iadeReddi: false,
    iadeYanitsiz: false,
    reddedilenKalem: null as string | null,
  };
  const ekRapor: Record<string, unknown>[] = [];
  const istekSayisi = new Map<string, number>();
  let adres = "";

  const kalemOdenenleri = (odeme: SahteOdeme, odenen: number) => {
    const toplam = odeme.kalemler.reduce((t, k) => t + k.tutar, 0);
    let dagitilan = 0;
    return odeme.kalemler.map((kalem, sira) => {
      const pay =
        sira === odeme.kalemler.length - 1
          ? odenen - dagitilan
          : Math.floor((odenen * kalem.tutar) / toplam);
      dagitilan += pay;
      return { ...kalem, odenen: pay };
    });
  };
  const odemeninOdenen = (odeme: SahteOdeme) =>
    Math.round(
      Number(
        odeme.taksit > 1
          ? (Number(odeme.tutar) * (1 + (odeme.taksit - 1) / 100)).toFixed(2)
          : odeme.tutar,
      ) * 100,
    );

  const sonucYaniti = (odeme: SahteOdeme) => {
    const durum =
      odeme.sonuc === "basarili" || odeme.sonuc.startsWith("sahtecilik")
        ? "SUCCESS"
        : odeme.sonuc === "basarisiz"
          ? "FAILURE"
          : "INIT_THREEDS";
    // Taksitli ödemede müşteri farkı öder (deneme: her taksit için yüzde bir).
    const odenen = (Number(odeme.tutar) * (1 + (odeme.taksit - 1) / 100)).toFixed(2);
    // Gerçek kuruluş conversationId'yi yalnız istekte gönderilirse yazar (ölçüldü): sonuç sorgusu göndermez.
    const yanit: Record<string, unknown> = {
      status: "success",
      locale: "tr",
      systemTime: Date.now(),
      price: Number(odeme.tutar),
      paidPrice: Number(odeme.taksit > 1 ? odenen : odeme.tutar),
      installment: odeme.taksit,
      paymentId: odeme.odemeKimligi,
      fraudStatus: odeme.sonuc === "sahtecilik" ? 0 : odeme.sonuc === "sahtecilik-red" ? -1 : 1,
      currency: odeme.paraBirimi,
      basketId: odeme.oturum,
      token: odeme.belirtec,
      paymentStatus: durum,
      // Kalemlerin ödenen tutarı taksit farkıyla: fark kalemlere tutarlarıyla, artan kuruş sonuncuya.
      itemTransactions: kalemOdenenleri(
        odeme,
        Math.round(Number(odeme.taksit > 1 ? odenen : odeme.tutar) * 100),
      ).map((kalem) => ({
        itemId: kalem.id,
        paymentTransactionId: kalem.islem,
        price: (kalem.tutar / 100).toFixed(2),
        paidPrice: (kalem.odenen / 100).toFixed(2),
      })),
    };
    const imza = hmac(
      gizli,
      [
        yanit["paymentStatus"],
        yanit["paymentId"],
        yanit["currency"],
        yanit["basketId"],
        yanit["conversationId"] ?? "",
        imzaTutari(yanit["paidPrice"]),
        imzaTutari(yanit["price"]),
        yanit["token"],
      ].join(":"),
    );
    return {
      ...yanit, // Bozuk imza ilk haneyi her zaman değiştirir ("0" ile başlayan imzada "0" yazmak imzayı bozmazdı).
      signature: ariza.bozukImza ? `${imza.startsWith("0") ? "1" : "0"}${imza.slice(1)}` : imza,
    };
  };

  const sunucu: Server = createServer(async (istek, yanit) => {
    const yol = new URL(istek.url ?? "/", "http://sahte").pathname;
    istekSayisi.set(yol, (istekSayisi.get(yol) ?? 0) + 1);
    const govde = await govdeOku(istek);
    const json = (veri: unknown, durum = 200) => {
      yanit.writeHead(durum, { "Content-Type": "application/json" });
      yanit.end(JSON.stringify(veri));
    };
    const html = (icerik: string) => {
      yanit.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      yanit.end(icerik);
    };

    if (yol === "/saglik") return json({ status: "success" });

    // Tarayıcının sayfaları (yetki istemez).
    const sayfa = /^\/odeme-sayfasi\/([A-Za-z0-9-]+)(\/sonuc)?$/.exec(yol);
    if (sayfa !== null) {
      const odeme = odemeler.get(sayfa[1] ?? "");
      if (odeme === undefined) return json({ status: "failure" }, 404);
      if (sayfa[2] === undefined) return html(odemeSayfasi(odeme));
      const form = new URLSearchParams(govde);
      odeme.sonuc = form.get("sonuc") === "basarili" ? "basarili" : "basarisiz";
      odeme.taksit = Number(form.get("taksit") ?? 1) || 1;
      return html(donusSayfasi(odeme));
    }

    // Testlerin denetim ucu: bir ödemenin sonucunu ayarlar, arızaları açar.
    if (yol === "/deneme/ayarla" && istek.method === "POST") {
      const girdi = JSON.parse(govde || "{}") as {
        belirtec?: string;
        sonuc?: SahteOdemeSonucu;
        taksit?: number;
        ariza?: Partial<typeof ariza>;
      };
      Object.assign(ariza, girdi.ariza ?? {});
      const odeme = girdi.belirtec === undefined ? undefined : odemeler.get(girdi.belirtec);
      if (odeme !== undefined && girdi.sonuc !== undefined) odeme.sonuc = girdi.sonuc;
      if (odeme !== undefined && girdi.taksit !== undefined) odeme.taksit = girdi.taksit;
      return json({ status: "success" });
    }
    if (yol === "/deneme/odemeler") return json([...odemeler.values()]);

    if (ariza.ulasilamaz) {
      istek.socket.destroy();
      return;
    }
    if (!yetkiliMi(istek, govde, anahtar, gizli)) {
      return json({ status: "failure", errorCode: "1000", errorMessage: "Geçersiz imza" }, 401);
    }
    const girdi = (govde === "" ? {} : JSON.parse(govde)) as Record<string, unknown>;

    if (yol === "/payment/iyzipos/checkoutform/initialize/auth/ecom") {
      const kalemToplami = (girdi["basketItems"] as { price: string }[]).reduce(
        (toplam, kalem) => toplam + Math.round(Number(kalem.price) * 100),
        0,
      );
      // Gerçek kuruluşun kuralı: kalemlerin toplamı tutara eşit, tutarlar sıfırdan büyük.
      if (kalemToplami !== Math.round(Number(girdi["price"]) * 100)) {
        return json({ status: "failure", errorCode: "5092", errorMessage: "Sepet tutarı" });
      }
      const belirtec = randomUUID();
      const odeme: SahteOdeme = {
        belirtec,
        oturum: String(girdi["conversationId"]),
        tutar: String(girdi["price"]),
        paraBirimi: String(girdi["currency"]),
        donusAdresi: String(girdi["callbackUrl"]),
        taksitler: (girdi["enabledInstallments"] as number[] | undefined) ?? [1],
        istek: girdi,
        sonuc: "bekliyor",
        taksit: 1,
        odemeKimligi: String(Math.floor(Math.random() * 1e9) + 1e9),
        iptal: false,
        gun: takvimGunu(new Date(), kurulusSaatDilimi),
        kalemler: (girdi["basketItems"] as { id: string; price: string }[]).map((kalem) => ({
          id: kalem.id,
          islem: String(Math.floor(Math.random() * 1e9) + 1e9),
          tutar: Math.round(Number(kalem.price) * 100),
        })),
        iadeler: [],
      };
      odemeler.set(belirtec, odeme);
      return json({
        status: "success",
        conversationId: odeme.oturum,
        token: belirtec,
        paymentPageUrl: `${adres}/odeme-sayfasi/${belirtec}`,
        tokenExpireTime: 1800,
        signature: hmac(gizli, `${odeme.oturum}:${belirtec}`),
      });
    }
    if (yol === "/payment/iyzipos/checkoutform/auth/ecom/detail") {
      const odeme = odemeler.get(String(girdi["token"]));
      if (ariza.geciciHata) {
        return json({ status: "failure", errorCode: "1", errorMessage: "Sistem hatası" });
      }
      // Müşteri henüz ödemediyse gerçek kuruluş ödeme bilgisi yok der (5122, ölçüldü).
      if (odeme === undefined || odeme.sonuc === "bekliyor") {
        return json({
          status: "failure",
          errorCode: "5122",
          errorMessage: "Gönderilen tokena ait ödeme bilgisi bulunamadı",
        });
      }
      return json(sonucYaniti(odeme));
    }
    if (yol === "/payment/cancel") {
      const odeme = [...odemeler.values()].find(
        (aday) => aday.odemeKimligi === String(girdi["paymentId"]),
      );
      if (odeme === undefined || ariza.iptalReddi || odeme.iptal) {
        return json({ status: "failure", errorCode: "5093", errorMessage: "İptal edilemedi" });
      }
      odeme.iptal = true;
      return json({ status: "success", paymentId: odeme.odemeKimligi });
    }
    if (yol === "/payment/refund" || yol === "/v2/payment/refund") {
      const tutar = Math.round(Number(girdi["price"]) * 100);
      const v2 = yol === "/v2/payment/refund";
      const odeme = [...odemeler.values()].find((aday) =>
        v2
          ? aday.odemeKimligi === String(girdi["paymentId"])
          : aday.kalemler.some((kalem) => kalem.islem === String(girdi["paymentTransactionId"])),
      );
      const islem = v2 ? null : String(girdi["paymentTransactionId"]);
      // İade edilebilir kalan: kalemin (v2'de ödemenin) ödenen tutarı eksi önceki iadeleri.
      const odenen =
        odeme === undefined
          ? 0
          : v2
            ? odemeninOdenen(odeme)
            : (kalemOdenenleri(odeme, odemeninOdenen(odeme)).find((kalem) => kalem.islem === islem)
                ?.odenen ?? 0);
      const onceki =
        odeme?.iadeler
          .filter((iade) => v2 || iade.islem === islem)
          .reduce((t, iade) => t + iade.tutar, 0) ?? 0;
      const reddedilen =
        ariza.reddedilenKalem !== null &&
        odeme?.kalemler.find((kalem) => kalem.islem === islem)?.id === ariza.reddedilenKalem;
      if (
        odeme === undefined ||
        odeme.sonuc !== "basarili" ||
        ariza.iadeReddi ||
        reddedilen ||
        tutar <= 0 ||
        tutar > odenen - onceki
      ) {
        return json(
          {
            status: "failure",
            errorCode: "5094",
            errorMessage: "İade edilemedi",
            retryable: false,
          },
          400,
        );
      }
      odeme.iadeler.push({
        parca: String(girdi["conversationId"]),
        islem,
        tutar,
        gun: takvimGunu(new Date(), kurulusSaatDilimi),
      });
      if (ariza.iadeYanitsiz) {
        istek.socket.destroy();
        return;
      }
      return json({
        status: "success",
        conversationId: girdi["conversationId"],
        paymentId: odeme.odemeKimligi,
        ...(islem === null ? {} : { paymentTransactionId: islem }),
        price: Number(girdi["price"]),
        currency: girdi["currency"],
      });
    }
    if (yol === "/payment/iyzipos/installment") {
      if (ariza.taksitReddi) return json({ status: "failure", errorCode: "1", errorMessage: "x" });
      const tutar = Number(girdi["price"]);
      return json({
        status: "success",
        installmentDetails: [
          {
            bankName: "Deneme Bankası",
            cardFamilyName: "Deneme Kart",
            installmentPrices: [1, 2, 3, 6, 9, 12].map((sayi) => {
              const toplam = tutar * (1 + (sayi - 1) / 100);
              return {
                installmentNumber: sayi,
                installmentPrice: (toplam / sayi).toFixed(2),
                totalPrice: toplam.toFixed(2),
              };
            }),
          },
        ],
      });
    }
    if (yol === "/v2/reporting/payment/transactions") {
      const gun = new URL(istek.url ?? "/", "http://sahte").searchParams.get("transactionDate");
      const islemler = [...odemeler.values()]
        .filter((odeme) => odeme.sonuc === "basarili" && odeme.gun === gun)
        .flatMap((odeme) => {
          const odeme_ = sonucYaniti(odeme);
          const satir = {
            transactionType: "PAYMENT",
            paymentId: Number(odeme.odemeKimligi),
            conversationId: odeme.oturum,
            paidPrice: odeme_["paidPrice"],
            transactionStatus: 1,
          };
          return odeme.iptal ? [satir, { ...satir, transactionType: "CANCEL" }] : [satir];
        });
      const iadeler = [...odemeler.values()].flatMap((odeme) =>
        odeme.iadeler
          .filter((iade) => iade.gun === gun)
          .map((iade) => ({
            transactionType: "REFUND",
            paymentId: Number(odeme.odemeKimligi),
            conversationId: iade.parca,
            paidPrice: Number((iade.tutar / 100).toFixed(2)),
            transactionStatus: 1,
          })),
      );
      return json({
        status: "success",
        transactions: [...islemler, ...iadeler, ...ekRapor],
        currentPage: 1,
        totalPageCount: 1,
      });
    }
    return json({ status: "failure", errorCode: "404" }, 404);
  });

  await new Promise<void>((coz) => sunucu.listen(port, "127.0.0.1", coz));
  adres = `http://127.0.0.1:${(sunucu.address() as AddressInfo).port}`;
  return {
    adres,
    odemeler,
    ariza,
    ekRapor,
    istekSayisi,
    kapat: () =>
      new Promise((coz) => {
        sunucu.closeAllConnections();
        sunucu.close(() => coz());
      }),
  };
};
