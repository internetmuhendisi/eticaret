// Sunucu denetiminin karar kuralları (kart 0018). Her kuralın bozuk bir örneği yakaladığı gösterilir.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  duvarKurallari,
  fazlaKurallar,
  girisYontemleri,
  ilkAcilisAyari,
  ilkAcilisDosyasi,
  ipv6Adresi,
  type KapiDurumu,
  kapiHatalari,
  yalnizAnahtarla,
} from "../sunucu.mts";

const ornekAnahtar =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOrnekOrnekOrnekOrnekOrnekOrnekOrnekOrnek altyapi-giris";

describe("giriş yöntemleri", () => {
  it("ssh çıktısından önerilen yöntemleri okur", () => {
    const cikti = "debug1: Authentications that can continue: publickey,password\n";
    expect(girisYontemleri(cikti)).toEqual(["publickey", "password"]);
  });

  it("yalnız anahtar önerilirse geçer", () => {
    expect(yalnizAnahtarla(["publickey"])).toBe(true);
  });

  it.each([
    [["publickey", "password"]],
    [["publickey", "keyboard-interactive"]],
    [["password"]],
    [[]],
    [undefined],
  ])("şifre önerilirse ya da yanıt okunamazsa kırmızıdır: %j", (yontemler) => {
    expect(yalnizAnahtarla(yontemler)).toBe(false);
  });
});

describe("kapılar", () => {
  const tara = (ek: [number, KapiDurumu][] = []) =>
    new Map<number, KapiDurumu>([
      [22, "acik"],
      [80, "reddetti"],
      [443, "reddetti"],
      [5432, "yanitsiz"],
      ...ek,
    ]);

  it("yalnız gereken kapılar görünüyorsa geçer", () => {
    expect(kapiHatalari(tara())).toEqual([]);
  });

  it("gereken dışında açık kapıyı yakalar", () => {
    expect(kapiHatalari(tara([[5432, "acik"]]))).toEqual(["5432 dışarıya açık (acik)"]);
  });

  it("duvarı geçip reddeden kapıyı da yakalar", () => {
    expect(kapiHatalari(tara([[8080, "reddetti"]]))).toEqual(["8080 dışarıya açık (reddetti)"]);
  });

  it("yönetim kapısı kapalıysa yakalar", () => {
    expect(kapiHatalari(tara([[22, "yanitsiz"]]))).toContain(
      "22 (yönetim girişi) açık değil (yanitsiz)",
    );
  });

  it("ağ hatası varsa sonucu güvenilmez sayar", () => {
    const hatalar = kapiHatalari(tara([[5432, "hata"]]));
    expect(hatalar).toEqual(["1 kapıda ağ hatası, sonuç güvenilmez (ilki 5432)"]);
  });

  it("web kapısı duvarda kapalıysa yakalar", () => {
    expect(kapiHatalari(tara([[443, "yanitsiz"]]))).toEqual(["443 duvarda kapalı, açık olmalı"]);
  });
});

describe("dıştaki duvarın kuralları", () => {
  it("yalnız gereken kurallar varsa geçer", () => {
    expect(fazlaKurallar(duvarKurallari)).toEqual([]);
  });

  it("fazla kapıyı, bütün kapıları açan kuralı ve UDP'yi yakalar", () => {
    expect(
      fazlaKurallar([
        ...duvarKurallari,
        { direction: "in", protocol: "tcp", port: "5432" },
        { direction: "in", protocol: "tcp", port: "1-65535" },
        { direction: "in", protocol: "icmp", port: null },
        { direction: "in", protocol: "udp", port: "443" },
      ]),
    ).toEqual(["in tcp 5432", "in tcp 1-65535", "in icmp hepsi", "in udp 443"]);
  });
});

describe("IPv6 adresi", () => {
  it("Hetzner'in verdiği ağdan sunucunun adresini çıkarır", () => {
    expect(ipv6Adresi("2a01:4f8:c01e:14ad::/64")).toBe("2a01:4f8:c01e:14ad::1");
  });

  it("beklenmeyen biçimde durur", () => {
    expect(() => ipv6Adresi("2a01:4f8:c01e:14ad::1")).toThrow();
  });
});

describe("ilk açılış ayarı", () => {
  it("anahtarı yerine koyar, şifreyi ve kökü kapatır", () => {
    const ayar = ilkAcilisAyari(ornekAnahtar);
    expect(ayar).toContain(ornekAnahtar);
    expect(ayar).not.toContain("__GIRIS_ANAHTARI__");
    for (const satir of [
      "PasswordAuthentication no",
      "PermitRootLogin no",
      "ssh_pwauth: false",
      "disable_root: true",
      "X11Forwarding no",
      'Unattended-Upgrade::Automatic-Reboot "true";',
    ]) {
      expect(ayar).toContain(satir);
    }
  });

  it("anahtardaki özel kalıpları olduğu gibi koyar", () => {
    const tuhaf = `${ornekAnahtar.split(" ").slice(0, 2).join(" ")} a$&b$'c`;
    expect(ilkAcilisAyari(tuhaf)).toContain(tuhaf);
  });

  it("açık anahtar değilse durur", () => {
    expect(() => ilkAcilisAyari("-----BEGIN OPENSSH PRIVATE KEY-----")).toThrow();
    expect(() => ilkAcilisAyari(`${ornekAnahtar}\nruncmd: [kotu]`)).toThrow();
  });

  it("içerideki duvar yalnız gereken kapılara izin verir", () => {
    const izinler = [
      ...readFileSync(ilkAcilisDosyasi, "utf8").matchAll(/ufw allow (\d+)\/tcp/g),
    ].map((m) => Number(m[1]));
    expect(izinler).toEqual([22, 80, 443]);
  });
});
