// Ön kapının dışarıdan ölçümleri (kart 0020, karar 0032). pnpm sunucu-denetle çalıştırır.
// Karar kuralları on-kapi.mts'dedir ve komutlar/testler/on-kapi.test.ts ile denetlenir.
//
// Ölçülenler (IPv4 ve IPv6 ayrı ayrı):
// - Deneme adresleri herkese açık ad sunucularında sunucunun kendi adresine çözülüyor (vekil yok).
// - Yoklama adresi şifreli bağlantıyla açılıyor; sertifika geçerli, en az 14 günü var.
// - http:// isteği aynı adresin https:// hâline kalıcı olarak yönleniyor.
// - Deneme adresi ve robots.txt arama motorlarına kapalı.
// - Kutuya ulaşan istemci adresi ziyaretçinin gerçek adresi (karar 0024).
// - Tanınmayan adres şifresiz 404 alıyor, şifreli bağlantıda sertifika almıyor; bir sitenin
//   sertifikasıyla bağlanıp tanınmayan ad isteyen de 404 alıyor.
// - Ön kapının kutuları sunucuda tanımdaki gibi çalışıyor: kök olmayan kullanıcı, salt okunur,
//   yalnız düşük kapı yetkisi, yetki yükseltme kapalı.
// - Yayındaki her sitenin deneme adresi şifreli açılıyor, arama motorlarına kapalı ve sağlık
//   ucu yayın kaydındaki sürümü söylüyor (yayindakiSiteleriOlc, kart 0023).

import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { request as httpIstegi, type IncomingHttpHeaders } from "node:http";
import { request as httpsIstegi } from "node:https";
import type { TLSSocket } from "node:tls";
import {
  type AsilAdres,
  asilAdresAdlari,
  asilAdreseYonleniyor,
  asilAdresOlcumOneki,
  ayniAdres,
  bakimBilgisiOku,
  bakimDamgasi,
  bakimdakiSiteleriOku,
  bakimSuresiHatasi,
  bakimUnutulduMetni,
  cozulmeHatasi,
  denemeAdresi,
  denemeAlani,
  dizineKapali,
  hataIzlemeAdresi,
  kalanGun,
  kutuKisitHatalari,
  kutuOlcumBicimi,
  onKapiKlasoru,
  onKapiSatirDosyasi,
  onKapiTanimi,
  robotlaraKapali,
  sertifikaReddedildi,
  sertifikaSiniri,
  sonIstemciAdresi,
  yayindakiSiteleriOku,
  yayinOrtami,
  yoklamaAdresi,
  yonlendirmeDogru,
} from "./on-kapi.mts";
import { type SunucuKaydi, sshKomutu } from "./sunucu.mts";
import { etkinYayinSurumu, kayitlariOku, saglikCoz, saglikHatasi } from "./yayin.mts";

type Olcum = (tamam: boolean, metin: string, ayrinti?: string) => void;

type Yanit = {
  durum: number;
  basliklar: IncomingHttpHeaders;
  govde: string;
  sertifikaBitisi?: string;
};

// Ad çözümlemesine bağlı kalmadan doğrudan sunucunun adresine bağlanır; SNI verilen addır.
// İstekte yazılan ad (Host) verilmezse aynıdır.
const iste = (
  sifreli: boolean,
  ip: string,
  ad: string,
  yol: string,
  istenenAd = ad,
  yontem = "GET",
): Promise<Yanit> =>
  new Promise((coz, reddet) => {
    const secenekler = {
      method: yontem,
      host: ip,
      port: sifreli ? 443 : 80,
      path: yol,
      headers: { host: istenenAd },
      servername: ad,
      timeout: 10_000,
    };
    const istek = (sifreli ? httpsIstegi : httpIstegi)(secenekler, (yanit) => {
      const sertifika = sifreli
        ? (yanit.socket as TLSSocket).getPeerCertificate().valid_to
        : undefined;
      let govde = "";
      yanit.setEncoding("utf8");
      yanit.on("data", (parca) => {
        govde += parca;
      });
      yanit.on("end", () =>
        coz({
          durum: yanit.statusCode ?? 0,
          basliklar: yanit.headers,
          govde,
          ...(sertifika ? { sertifikaBitisi: sertifika } : {}),
        }),
      );
    });
    istek.on("timeout", () => istek.destroy(new Error("zaman aşımı")));
    istek.on("error", reddet);
    istek.end();
  });

const dene = async (is: () => Promise<Yanit>): Promise<Yanit | Error> => {
  try {
    return await is();
  } catch (hata) {
    return hata as Error;
  }
};

export const onKapiyiOlc = async (kayit: SunucuKaydi, olcum: Olcum): Promise<void> => {
  // Ad çözümlemesi: herkese açık iki ad sunucusundan. Vekil açık olsaydı Cloudflare'in adresleri dönerdi.
  const cozucu = new Resolver({ timeout: 5000, tries: 2 });
  cozucu.setServers(["1.1.1.1", "8.8.8.8"]);
  const rastgele = `denetim-${randomBytes(3).toString("hex")}.${denemeAlani}`;
  for (const ad of [yoklamaAdresi, rastgele]) {
    const v4 = await cozucu.resolve4(ad).catch((h: Error) => h);
    const v6 = await cozucu.resolve6(ad).catch((h: Error) => h);
    olcum(
      Array.isArray(v4) && v4.length === 1 && v4[0] === kayit.ipv4,
      `${ad} IPv4'te sunucuya çözülüyor`,
      Array.isArray(v4) ? v4.join(", ") : v4.message,
    );
    olcum(
      Array.isArray(v6) && v6.length === 1 && ayniAdres(v6[0], kayit.ipv6),
      `${ad} IPv6'da sunucuya çözülüyor`,
      Array.isArray(v6) ? v6.join(", ") : v6.message,
    );
  }

  for (const [tur, ip] of [
    ["IPv4", kayit.ipv4],
    ["IPv6", kayit.ipv6],
  ] as const) {
    const ana = await dene(() => iste(true, ip, yoklamaAdresi, "/"));
    if (ana instanceof Error) {
      olcum(false, `${tur}: deneme adresi şifreli bağlantıyla açılıyor`, ana.message);
      continue;
    }
    olcum(
      ana.durum === 200,
      `${tur}: deneme adresi şifreli bağlantıyla açılıyor`,
      String(ana.durum),
    );
    const gun = ana.sertifikaBitisi ? kalanGun(ana.sertifikaBitisi) : Number.NaN;
    olcum(
      gun >= sertifikaSiniri,
      `${tur}: sertifika geçerli ve en az ${sertifikaSiniri} günü var`,
      Number.isFinite(gun) ? `${gun} gün` : "sertifika okunamadı",
    );
    olcum(
      dizineKapali(ana.basliklar["x-robots-tag"]),
      `${tur}: deneme adresi arama motorlarına "dizine alma" diyor`,
      String(ana.basliklar["x-robots-tag"] ?? "başlık yok"),
    );

    const robots = await dene(() => iste(true, ip, yoklamaAdresi, "/robots.txt"));
    olcum(
      !(robots instanceof Error) && robots.durum === 200 && robotlaraKapali(robots.govde),
      `${tur}: robots.txt bütün siteyi kapatıyor`,
      robots instanceof Error ? robots.message : String(robots.durum),
    );

    const yol = "/denetim?yonlendirme=1";
    const yonlenme = await dene(() => iste(false, ip, yoklamaAdresi, yol));
    olcum(
      !(yonlenme instanceof Error) &&
        yonlendirmeDogru(yonlenme.durum, yonlenme.basliklar.location, yoklamaAdresi, yol),
      `${tur}: http:// isteği https:// adresine yönleniyor`,
      yonlenme instanceof Error
        ? yonlenme.message
        : `${yonlenme.durum} ${yonlenme.basliklar.location ?? ""}`,
    );

    // Ziyaretçinin adresi: sunucunun bu bağlantıda gördüğü adres (ssh) ile kutunun gördüğü.
    const ssh = sshKomutu(ip, 'printf %s "$SSH_CLIENT"');
    const benim = ssh.status === 0 ? ssh.stdout.trim().split(" ")[0] : undefined;
    const istemci = await dene(() => iste(true, ip, yoklamaAdresi, "/istemci"));
    const gorulen = istemci instanceof Error ? undefined : sonIstemciAdresi(istemci.govde);
    olcum(
      ayniAdres(benim, gorulen),
      `${tur}: kutu ziyaretçinin gerçek adresini görüyor`,
      `ssh ${benim ?? "okunamadı"}, kutu ${gorulen ?? "okunamadı"}`,
    );

    const tanimsiz = `tanimsiz-${randomBytes(3).toString("hex")}.${denemeAlani}`;
    const bos = await dene(() => iste(false, ip, tanimsiz, "/"));
    olcum(
      !(bos instanceof Error) && bos.durum === 404,
      `${tur}: tanınmayan adres 404 alıyor`,
      bos instanceof Error ? bos.message : String(bos.durum),
    );
    const bosSifreli = await dene(() => iste(true, ip, tanimsiz, "/"));
    olcum(
      sertifikaReddedildi(bosSifreli),
      `${tur}: tanınmayan adrese sertifika verilmiyor`,
      bosSifreli instanceof Error
        ? sertifikaReddedildi(bosSifreli)
          ? ""
          : bosSifreli.message
        : `${bosSifreli.durum} döndü`,
    );
    // Yoklamanın sertifikasıyla bağlanıp istekte tanınmayan ad yazılırsa da hiçbir siteye gidilmez.
    const baskaAd = await dene(() => iste(true, ip, yoklamaAdresi, "/", tanimsiz));
    olcum(
      !(baskaAd instanceof Error) && baskaAd.durum === 404,
      `${tur}: bir sitenin sertifikasıyla tanınmayan ad istenince 404 dönüyor`,
      baskaAd instanceof Error ? baskaAd.message : String(baskaAd.durum),
    );

    // Hata izleme adresi (kart 0022): yönetim ekranı ve okuma ucu dışarıya kapalı, gönderim
    // yolu araca ulaşıyor (anahtarsız istek aracın kendisinden ret alır, ön kapıdan 404 değil).
    for (const [yontem, kapaliYol] of [
      ["GET", "/"],
      ["GET", "/accounts/login/"],
      ["POST", "/accounts/login/"],
      ["GET", "/api/canonical/0/projects/"],
      ["POST", "/api/canonical/0/projects/"],
    ] as const) {
      const kapali = await dene(() =>
        iste(true, ip, hataIzlemeAdresi, kapaliYol, hataIzlemeAdresi, yontem),
      );
      olcum(
        !(kapali instanceof Error) && kapali.durum === 404,
        `${tur}: hata izleme adresinde ${yontem} ${kapaliYol} dışarıya kapalı (404)`,
        kapali instanceof Error ? kapali.message : String(kapali.durum),
      );
    }
    const gonderim = await dene(() =>
      iste(true, ip, hataIzlemeAdresi, "/api/1/store/", hataIzlemeAdresi, "POST"),
    );
    olcum(
      !(gonderim instanceof Error) &&
        gonderim.durum >= 400 &&
        gonderim.durum < 500 &&
        gonderim.durum !== 404,
      `${tur}: hata izleme gönderim yolu araca ulaşıyor (anahtarsız istek ret alıyor)`,
      gonderim instanceof Error ? gonderim.message : String(gonderim.durum),
    );
  }

  // Kutuların sunucudaki gerçek ayarı, kutu tanımıyla karşılaştırılır.
  const tanim = onKapiTanimi();
  for (const [ad, servis] of Object.entries(tanim.services)) {
    const kutu = sshKomutu(
      kayit.ipv4,
      `docker inspect ${servis.container_name} --format '${kutuOlcumBicimi}'`,
    );
    const hatalar = kutu.status === 0 ? kutuKisitHatalari(kutu.stdout.trim(), servis) : [];
    olcum(
      kutu.status === 0 && hatalar.length === 0,
      `ön kapının ${ad} kutusu çalışıyor: kök olmayan kullanıcı, salt okunur, tek yetki, yetki yükseltme kapalı, yeniden başlayınca açılır`,
      kutu.status === 0 ? hatalar.join("; ") : kutu.stderr.trim(),
    );
  }
};

// Asıl adresin adlarının herkese açık ad sunucularındaki (1.1.1.1, 8.8.8.8) cevabı; her ad için hata ya da
// undefined. Yayın komutu da kullanır: kimlikteki asıl adres çözülmeden yayın yapılmaz (karar 0202).
export const herkeseAcikCozulme = async (
  asil: AsilAdres,
  kayit: { ipv4: string; ipv6: string },
): Promise<[string, string | undefined][]> => {
  const cozucu = new Resolver({ timeout: 5000, tries: 2 });
  cozucu.setServers(["1.1.1.1", "8.8.8.8"]);
  const sonuc: [string, string | undefined][] = [];
  for (const ad of asilAdresAdlari(asil)) {
    const v4 = await cozucu.resolve4(ad).catch(() => [] as string[]);
    const v6 = await cozucu.resolve6(ad).catch(() => [] as string[]);
    sonuc.push([ad, cozulmeHatasi(v4, v6, kayit.ipv4, kayit.ipv6)]);
  }
  return sonuc;
};

// Bir asıl adresin dışarıdan ölçümü (kart 0344, karar 0202). Ölçümlerin adı verilen önekle başlar. IPv4 ve
// IPv6 ayrı ayrı: herkese açık ad sunucularında sunucuya çözülme, şifreli açılma ve sertifika, http://
// yönlenmesi, arama motoru kuralının ayarla aynılığı, kendi alan adında www. yönlenmesi; deneme adresi
// verilmişse onun asıl adrese 308 ile yönlenmesi, sağlık ucunun ve robots.txt'nin deneme adresinde kalması.
export const asilAdresiOlc = async (
  kayit: SunucuKaydi,
  olcum: Olcum,
  {
    onek,
    asil,
    deneme,
    aramaAcik,
    bakimda = false,
  }: { onek: string; asil: AsilAdres; deneme?: string; aramaAcik: boolean; bakimda?: boolean },
): Promise<void> => {
  for (const [ad, hata] of await herkeseAcikCozulme(asil, kayit)) {
    olcum(
      hata === undefined,
      `${onek}: ${ad} herkese açık ad sunucularında sunucuya çözülüyor`,
      hata ?? "",
    );
  }
  for (const [tur, ip] of [
    ["IPv4", kayit.ipv4],
    ["IPv6", kayit.ipv6],
  ] as const) {
    const ana = await dene(() => iste(true, ip, asil.ad, "/"));
    olcum(
      !(ana instanceof Error) &&
        (bakimda ? ana.durum === 503 && ana.govde.includes(bakimDamgasi) : ana.durum === 200),
      `${onek}: ${tur} ile ${asil.ad} şifreli bağlantıyla ${bakimda ? "bakım sayfasını gösteriyor (elle açık)" : "açılıyor"}`,
      ana instanceof Error ? ana.message : String(ana.durum),
    );
    const gun =
      !(ana instanceof Error) && ana.sertifikaBitisi ? kalanGun(ana.sertifikaBitisi) : Number.NaN;
    olcum(
      gun >= sertifikaSiniri,
      `${onek}: ${tur} ile ${asil.ad} sertifikası geçerli ve en az ${sertifikaSiniri} günü var`,
      Number.isFinite(gun)
        ? `${gun} gün`
        : ana instanceof Error
          ? ana.message
          : "sertifika okunamadı",
    );
    const kapali = !(ana instanceof Error) && dizineKapali(ana.basliklar["x-robots-tag"]);
    olcum(
      !(ana instanceof Error) && kapali === !aramaAcik,
      `${onek}: ${tur} ile ${asil.ad} arama motorlarına ${aramaAcik ? "açık (ayar açık)" : 'kapalı: "dizine alma" diyor (ayar kapalı)'}`,
      ana instanceof Error ? ana.message : String(ana.basliklar["x-robots-tag"] ?? "başlık yok"),
    );
    if (!aramaAcik) {
      const robots = await dene(() => iste(true, ip, asil.ad, "/robots.txt"));
      olcum(
        !(robots instanceof Error) && robots.durum === 200 && robotlaraKapali(robots.govde),
        `${onek}: ${tur} ile ${asil.ad} robots.txt bütün siteyi kapatıyor (ayar kapalı)`,
        robots instanceof Error ? robots.message : String(robots.durum),
      );
    }
    const yol = "/denetim?yonlendirme=1";
    const sifresiz = await dene(() => iste(false, ip, asil.ad, yol));
    olcum(
      !(sifresiz instanceof Error) &&
        yonlendirmeDogru(sifresiz.durum, sifresiz.basliklar.location, asil.ad, yol),
      `${onek}: ${tur} ile http://${asil.ad} https:// adresine yönleniyor`,
      sifresiz instanceof Error
        ? sifresiz.message
        : `${sifresiz.durum} ${sifresiz.basliklar.location ?? ""}`,
    );
    if (asil.tur === "kendi") {
      const www = await dene(() => iste(true, ip, `www.${asil.ad}`, yol));
      olcum(
        !(www instanceof Error) &&
          asilAdreseYonleniyor(www.durum, www.basliklar.location, asil.ad, yol),
        `${onek}: ${tur} ile www.${asil.ad} www'suz adrese yönleniyor`,
        www instanceof Error ? www.message : `${www.durum} ${www.basliklar.location ?? ""}`,
      );
    }
    if (deneme !== undefined) {
      const yonlenme = await dene(() => iste(true, ip, deneme, yol));
      olcum(
        !(yonlenme instanceof Error) &&
          asilAdreseYonleniyor(yonlenme.durum, yonlenme.basliklar.location, asil.ad, yol),
        `${onek}: ${tur} ile deneme adresi ${asil.ad} adresine 308 ile yönleniyor`,
        yonlenme instanceof Error
          ? yonlenme.message
          : `${yonlenme.durum} ${yonlenme.basliklar.location ?? ""}`,
      );
      const saglik = await dene(() => iste(true, ip, deneme, "/kapi/herkese-acik/saglik"));
      olcum(
        !(saglik instanceof Error) && ![301, 302, 307, 308].includes(saglik.durum),
        `${onek}: ${tur} ile sağlık ucu deneme adresinde kalıyor (yönlenmiyor)`,
        saglik instanceof Error ? saglik.message : String(saglik.durum),
      );
    }
  }
};

// Yayındaki her sitenin dışarıdan görünüşü. Ölçümün adı "<ortam>/<kod adı> yayındaki kutusu" ile
// başlar: yayın komutu, yalnız o sitenin kendi kutusuyla ilgili kırmızı ölçümde düzeltme
// yayınına izin verir (yayinla.mts). Beklenen sürüm sunucudaki yayın kaydından okunur: etkin
// yayının kaydındaki sürüm. Bilgisayardaki kimliğe bakılmaz; kimlik sonraki bir sürüme geçmişken
// eski yayın çalışıyorsa (yayın düştü ya da geri dönüldü) öteki sitelerin yayını durmamalı.
// Sağlık ucu anlık bir ağ takılmasında yanlış kırmızı vermesin diye üç kez denenir.
export const yayindakiSiteleriOlc = async (kayit: SunucuKaydi, olcum: Olcum): Promise<void> => {
  const siteler = yayindakiSiteleriOku(kayit.ipv4);
  const bakimdakiler = bakimdakiSiteleriOku(kayit.ipv4);
  for (const [kodAdi, no] of Object.entries(siteler).sort(([a], [b]) => a.localeCompare(b))) {
    const ad = `${yayinOrtami}/${kodAdi} yayındaki kutusu`;
    const adres = denemeAdresi(kodAdi);
    // Asıl adresi olan sitenin deneme adresi asıl adrese yönlenir (karar 0202): ana sayfası ve başlığı
    // asıl adreste ölçülür, deneme adresinde robots.txt ve sağlık ucu kalır.
    const bilgi = bakimBilgisiOku(kayit.ipv4, kodAdi, no);
    // Asıl adres ön kapıya ancak sunucuya çözülünce girer; girmemişse site deneme adresinde olağan açılır.
    const asilOnKapida =
      bilgi.asil !== undefined &&
      sshKomutu(
        kayit.ipv4,
        `sudo grep -qs '^${bilgi.asil.ad.replaceAll(".", "\\.")} {' ${onKapiKlasoru}/${onKapiSatirDosyasi(kodAdi)} && echo var || echo yok`,
      ).stdout.trim() === "var";
    for (const [tur, ip] of [
      ["IPv4", kayit.ipv4],
      ["IPv6", kayit.ipv6],
    ] as const) {
      const ana = await dene(() => iste(true, ip, adres, "/"));
      // Elle açık bakımda adres bakım sayfasını göstermeli; bu kırmızı değildir, unutulması kırmızıdır.
      const bakimda = bakimdakiler.has(kodAdi);
      if (!asilOnKapida)
        olcum(
          !(ana instanceof Error) &&
            (bakimda ? ana.durum === 503 && ana.govde.includes(bakimDamgasi) : ana.durum === 200),
          `${ad}: ${tur} ile deneme adresi şifreli bağlantıyla ${bakimda ? "bakım sayfasını gösteriyor (elle açık)" : "açılıyor"}`,
          ana instanceof Error ? ana.message : String(ana.durum),
        );
      if (!asilOnKapida)
        olcum(
          !(ana instanceof Error) && dizineKapali(ana.basliklar["x-robots-tag"]),
          `${ad}: ${tur} ile deneme adresi arama motorlarına "dizine alma" diyor`,
          ana instanceof Error
            ? ana.message
            : String(ana.basliklar["x-robots-tag"] ?? "başlık yok"),
        );
      const robots = await dene(() => iste(true, ip, adres, "/robots.txt"));
      olcum(
        !(robots instanceof Error) && robots.durum === 200 && robotlaraKapali(robots.govde),
        `${ad}: ${tur} ile robots.txt bütün siteyi kapatıyor`,
        robots instanceof Error ? robots.message : String(robots.durum),
      );
    }
    if (bilgi.asil !== undefined && !asilOnKapida) {
      olcum(
        false,
        `${ad}: ${asilAdresOlcumOneki} ${bilgi.asil.ad} ön kapıda değil (sunucuya çözülmüyor); e-postalar bu adrese gidiyor`,
        "kayıtları açın; ön kapı sonraki kuruluşta ekler (pnpm sunucu-kur --onayli)",
      );
    }
    if (bilgi.asil !== undefined && asilOnKapida) {
      await asilAdresiOlc(kayit, olcum, {
        onek: `${ad}: ${asilAdresOlcumOneki}`,
        asil: bilgi.asil,
        deneme: adres,
        aramaAcik: bilgi.aramaAcik === true,
        bakimda: bakimdakiler.has(kodAdi),
      });
    }
    const bakimZamani = bakimdakiler.get(kodAdi);
    if (bakimZamani !== undefined) {
      const sure = bakimSuresiHatasi(bakimZamani, Date.now());
      olcum(sure === undefined, `${ad}: ${bakimUnutulduMetni}`, sure ?? `${bakimZamani}'den beri`);
    }
    let surum: string | undefined;
    let kayitHatasi = "";
    try {
      surum = etkinYayinSurumu(kayitlariOku(kayit.ipv4, yayinOrtami, kodAdi), no);
    } catch (hata) {
      kayitHatasi = (hata as Error).message;
    }
    let hata: string | undefined =
      kayitHatasi || (surum ? "yanıt yok" : `${no} numaralı yayının başarılı kaydı yok`);
    for (let deneme = 0; deneme < 3 && surum && hata; deneme++) {
      if (deneme > 0) await new Promise((bekle) => setTimeout(bekle, 2000));
      const saglik = await dene(() => iste(true, kayit.ipv4, adres, "/kapi/herkese-acik/saglik"));
      hata =
        saglik instanceof Error
          ? saglik.message
          : saglik.durum === 200
            ? saglikHatasi(saglikCoz(saglik.govde), surum)
            : `sağlık ucu ${saglik.durum}`;
    }
    olcum(
      hata === undefined,
      `${ad}: sağlık ucu yayın kaydındaki sürümü (${surum ?? "?"}) ve ayakta veritabanını söylüyor`,
      hata ?? "",
    );
  }
};
