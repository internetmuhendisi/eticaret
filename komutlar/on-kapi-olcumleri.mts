// Ön kapının dışarıdan ölçümleri (kart 0020, karar 0032). pnpm sunucu-denetle çalıştırır.
// Karar kuralları on-kapi.mts'dedir ve komutlar/testler/on-kapi.test.ts ile denetlenir.
//
// Ölçülenler (IPv4 ve IPv6 ayrı ayrı):
// - Deneme adresleri herkese açık ad sunucularında sunucunun kendi adresine çözülüyor (vekil yok).
// - Yoklama adresi şifreli bağlantıyla açılıyor; sertifika geçerli, en az 14 günü var.
// - http:// isteği aynı adresin https:// hâline kalıcı olarak yönleniyor.
// - Deneme adresi ve robots.txt arama motorlarına kapalı.
// - Kutuya ulaşan istemci adresi ziyaretçinin gerçek adresi (karar 0024).
// - Tanınmayan adres şifresiz 404 alıyor, şifreli bağlantıda sertifika almıyor.
// - Caddy kutusu kök olmayan kullanıcıyla, salt okunur ve yalnız düşük kapı yetkisiyle çalışıyor.

import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { request as httpIstegi, type IncomingHttpHeaders } from "node:http";
import { request as httpsIstegi } from "node:https";
import type { TLSSocket } from "node:tls";
import {
  ayniAdres,
  caddyKullanicisi,
  denemeAlani,
  dizineKapali,
  kalanGun,
  robotlaraKapali,
  sertifikaSiniri,
  sonIstemciAdresi,
  yoklamaAdresi,
  yonlendirmeDogru,
} from "./on-kapi.mts";
import { type SunucuKaydi, sshKomutu } from "./sunucu.mts";

type Olcum = (tamam: boolean, metin: string, ayrinti?: string) => void;

type Yanit = {
  durum: number;
  basliklar: IncomingHttpHeaders;
  govde: string;
  sertifikaBitisi?: string;
};

// Ad çözümlemesine bağlı kalmadan doğrudan sunucunun adresine bağlanır; Host ve SNI verilen addır.
const iste = (sifreli: boolean, ip: string, ad: string, yol: string): Promise<Yanit> =>
  new Promise((coz, reddet) => {
    const secenekler = {
      host: ip,
      port: sifreli ? 443 : 80,
      path: yol,
      headers: { host: ad },
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
      bosSifreli instanceof Error,
      `${tur}: tanınmayan adrese sertifika verilmiyor`,
      bosSifreli instanceof Error ? "" : `${bosSifreli.durum} döndü`,
    );
  }

  const kutu = sshKomutu(
    kayit.ipv4,
    "docker inspect on-kapi on-kapi-yoklama --format '{{.State.Running}} {{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{json .HostConfig.CapAdd}} {{json .HostConfig.CapDrop}}'",
  );
  const satirlar = kutu.stdout.trim().split("\n");
  const beklenen = (kullanici: number) =>
    `true ${kullanici}:${kullanici} true ["NET_BIND_SERVICE"] ["ALL"]`;
  olcum(
    kutu.status === 0 && satirlar[0] === beklenen(caddyKullanicisi) && satirlar.length === 2,
    "ön kapı kök olmayan kullanıcıyla, salt okunur ve tek yetkiyle çalışıyor",
    kutu.status === 0 ? satirlar.join(" | ") : kutu.stderr.trim(),
  );
  olcum(
    kutu.status === 0 &&
      /^true \d+:\d+ true \["NET_BIND_SERVICE"\] \["ALL"\]$/.test(satirlar[1] ?? ""),
    "yoklama kutusu açık ve aynı kısıtlarla çalışıyor",
    satirlar[1] ?? "",
  );
};
