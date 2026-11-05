// Sunucuyu Hetzner'de açar ve kurar (kart 0018, karar 0030).
//
//   pnpm sunucu-kur            Hiçbir şey açmaz. Sunucunun boyutunu, yerini ve güncel aylık
//                              fiyatını Hetzner'den okuyup söyler.
//   pnpm sunucu-kur --onayli   Giriş anahtarını, dıştaki duvarı ve sunucuyu açar, kurulumun
//                              bitmesini bekler, gizli olmayan bilgileri sunucu/sunucular.json'a yazar.
//
// Sunucu aylık ücretlidir; --onayli yalnız kullanıcı fiyatı onayladıktan sonra yazılır.
// Komut tekrar çalıştırılabilir: aynı adla açılmış anahtar, duvar ve sunucu yeniden açılmaz.

import {
  acikKapilar,
  girisAnahtariniHazirla,
  hetzner,
  ilkAcilisAyari,
  kaydiYaz,
  kayitDosyasi,
  sshKomutu,
  sunucuTanimi as t,
} from "./sunucu.mts";

type Fiyat = { location: string; price_monthly: { net: string; gross: string } };
type SunucuTipi = {
  name: string;
  cores: number;
  memory: number;
  disk: number;
  architecture: string;
  prices: Fiyat[];
};
type Sunucu = {
  id: number;
  name: string;
  status: string;
  server_type: { name: string };
  image: { name: string } | null;
  location: { name: string; description: string; city: string; country: string };
  public_net: { ipv4: { ip: string } | null; ipv6: { ip: string } | null };
  created: string;
};

const euro = (deger: string): string => `${Number(deger).toFixed(2)} €`;

const fiyatiSoyle = async (): Promise<void> => {
  const { server_types: tipler } = await hetzner<{ server_types: SunucuTipi[] }>(
    `/server_types?name=${t.tip}`,
  );
  const tip = tipler[0];
  if (!tip) throw new Error(`Hetzner'de ${t.tip} adlı sunucu tipi yok.`);
  const fiyat = tip.prices.find((f) => f.location === t.konum);
  if (!fiyat) throw new Error(`${t.tip} tipi ${t.konum} veri merkezinde satılmıyor.`);

  const { pricing } = await hetzner<{
    pricing: { primary_ips?: { type: string; prices: Fiyat[] }[] };
  }>("/pricing");
  const ipv4 = pricing.primary_ips
    ?.find((p) => p.type === "ipv4")
    ?.prices.find((f) => f.location === t.konum);

  console.log(
    `Sunucu      ${t.ad}: ${tip.name}, ${tip.cores} işlemci, ${tip.memory} GB bellek, ${tip.disk} GB disk (${tip.architecture})`,
  );
  console.log(`Yer         ${t.konum} (Almanya), işletim sistemi ${t.imaj}`);
  console.log(
    `Aylık       ${euro(fiyat.price_monthly.gross)} (KDV dahil), ${euro(fiyat.price_monthly.net)} (KDV hariç)`,
  );
  if (ipv4) console.log(`IPv4 adresi ${euro(ipv4.price_monthly.gross)} / ay ek (KDV dahil)`);
  console.log("Hiçbir şey açılmadı. Onaydan sonra: pnpm sunucu-kur --onayli");
};

const tekAdla = async <T,>(liste: string, ad: string): Promise<T | undefined> => {
  const veri = await hetzner<Record<string, T[]>>(`/${liste}?name=${encodeURIComponent(ad)}`);
  return veri[liste]?.[0];
};

const kur = async (): Promise<void> => {
  const acikAnahtar = girisAnahtariniHazirla();

  // 1. Giriş anahtarı Hetzner'de: sunucu kök şifresi üretilmeden ve e-postayla gönderilmeden açılır.
  let anahtar = await tekAdla<{ id: number; public_key: string }>("ssh_keys", t.anahtarAdi);
  if (!anahtar) {
    ({ ssh_key: anahtar } = await hetzner<{ ssh_key: { id: number; public_key: string } }>(
      "/ssh_keys",
      { yontem: "POST", govde: { name: t.anahtarAdi, public_key: acikAnahtar } },
    ));
    console.log(`açıldı      giriş anahtarı ${t.anahtarAdi}`);
  } else if (anahtar.public_key.trim() !== acikAnahtar) {
    throw new Error(`Hetzner'deki ${t.anahtarAdi} anahtarı bu bilgisayardakiyle aynı değil.`);
  }

  // 2. Dıştaki duvar: yalnız gereken kapılar, her yerden.
  const kurallar = acikKapilar.map((kapi) => ({
    direction: "in",
    protocol: "tcp",
    port: String(kapi),
    source_ips: ["0.0.0.0/0", "::/0"],
  }));
  let duvar = await tekAdla<{ id: number }>("firewalls", t.duvarAdi);
  if (!duvar) {
    ({ firewall: duvar } = await hetzner<{ firewall: { id: number } }>("/firewalls", {
      yontem: "POST",
      govde: { name: t.duvarAdi, rules: kurallar },
    }));
    console.log(`açıldı      duvar ${t.duvarAdi} (${acikKapilar.join(", ")})`);
  } else {
    await hetzner(`/firewalls/${duvar.id}/actions/set_rules`, {
      yontem: "POST",
      govde: { rules: kurallar },
    });
    console.log(`güncellendi duvar ${t.duvarAdi} (${acikKapilar.join(", ")})`);
  }

  // 3. Sunucu.
  let sunucu = await tekAdla<Sunucu>("servers", t.ad);
  if (!sunucu) {
    ({ server: sunucu } = await hetzner<{ server: Sunucu }>("/servers", {
      yontem: "POST",
      govde: {
        name: t.ad,
        server_type: t.tip,
        location: t.konum,
        image: t.imaj,
        ssh_keys: [anahtar.id],
        firewalls: [{ firewall: duvar.id }],
        user_data: ilkAcilisAyari(acikAnahtar),
        public_net: { enable_ipv4: true, enable_ipv6: true },
        labels: { altyapi: "evet" },
      },
    }));
    console.log(`açıldı      sunucu ${t.ad}`);
  } else {
    console.log(`zaten var   sunucu ${t.ad}`);
  }

  // 4. Sunucunun açılmasını bekle.
  for (let deneme = 0; sunucu.status !== "running"; deneme++) {
    if (deneme > 60) throw new Error("Sunucu 5 dakikada açılmadı.");
    await new Promise((bitti) => setTimeout(bitti, 5000));
    ({ server: sunucu } = await hetzner<{ server: Sunucu }>(`/servers/${sunucu.id}`));
  }
  const ipv4 = sunucu.public_net.ipv4?.ip;
  if (!ipv4) throw new Error("Sunucunun IPv4 adresi yok.");

  // 5. İlk açılış kurulumunun bitmesini bekle (ssh açılana kadar birkaç kez dener).
  process.stdout.write("bekleniyor  ilk açılış kurulumu");
  for (let deneme = 0; ; deneme++) {
    const sonuc = sshKomutu(
      ipv4,
      "cloud-init status --wait >/dev/null; cat /var/lib/altyapi/kurulum-tamam",
    );
    if (sonuc.status === 0) break;
    if (deneme > 40) throw new Error(`\nKurulum bitmedi: ${sonuc.stderr.trim()}`);
    process.stdout.write(".");
    await new Promise((bitti) => setTimeout(bitti, 10_000));
  }
  console.log(" bitti");

  kaydiYaz({
    ad: sunucu.name,
    hetzner_numarasi: sunucu.id,
    tip: sunucu.server_type.name,
    veri_merkezi: `${sunucu.location.name} (${sunucu.location.description})`,
    sehir: sunucu.location.city,
    ulke: sunucu.location.country,
    imaj: sunucu.image?.name ?? t.imaj,
    ipv4,
    ipv6: sunucu.public_net.ipv6?.ip ?? "",
    kullanici: t.kullanici,
    acilis: sunucu.created,
  });
  console.log(`yazıldı     ${kayitDosyasi}`);
  console.log("Sunucu hazır. Denetim: pnpm sunucu-denetle");
};

try {
  if (process.argv.includes("--onayli")) await kur();
  else await fiyatiSoyle();
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
