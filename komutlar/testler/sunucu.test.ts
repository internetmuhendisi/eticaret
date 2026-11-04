// Sunucu denetiminin karar kuralları (kart 0018). Her kuralın bozuk bir örneği yakaladığı gösterilir.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  girisYontemleri,
  ilkAcilisAyari,
  ilkAcilisDosyasi,
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

  it("web kapısı duvarda kapalıysa yakalar", () => {
    expect(kapiHatalari(tara([[443, "yanitsiz"]]))).toEqual(["443 duvarda kapalı, açık olmalı"]);
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
    ]) {
      expect(ayar).toContain(satir);
    }
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
