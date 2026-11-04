// Hat sonucunun yorumu (kart 0017, karar 0029): yayın yalnız bu kaydın son çalışması bitmiş ve
// başarılıysa yeşil ışık alır. Belirsiz her durum "yeşil değil"dir.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { githubDeposu, type HatCalismasi, hatDosyasi, hatSonucunuYorumla } from "../hat-sonucu.mts";

const kayit = "a".repeat(40);
const baskaKayit = "b".repeat(40);

const calisma = (ek: Partial<HatCalismasi>): HatCalismasi => ({
  head_sha: kayit,
  run_number: 1,
  status: "completed",
  conclusion: "success",
  html_url: "https://github.com/ornek/ornek/actions/runs/1",
  ...ek,
});

describe("hat sonucunun yorumu", () => {
  it("bu kaydın bitmiş ve başarılı çalışması yeşildir", () => {
    expect(hatSonucunuYorumla([calisma({})], kayit).yesil).toBe(true);
  });

  it("hiç çalışma yoksa yeşil değildir", () => {
    expect(hatSonucunuYorumla([], kayit)).toMatchObject({ yesil: false, neden: /hiç çalışmamış/ });
  });

  it("başka kaydın yeşili bu kaydı yeşil yapmaz", () => {
    expect(hatSonucunuYorumla([calisma({ head_sha: baskaKayit })], kayit).yesil).toBe(false);
  });

  it("süren çalışma yeşil değildir", () => {
    const sonuc = hatSonucunuYorumla([calisma({ status: "in_progress", conclusion: null })], kayit);
    expect(sonuc).toMatchObject({ yesil: false, neden: /sürüyor/ });
  });

  it.each(["failure", "cancelled", "skipped", "timed_out", "action_required", "neutral"])(
    "%s sonucu yeşil değildir",
    (conclusion) => {
      expect(hatSonucunuYorumla([calisma({ conclusion })], kayit).yesil).toBe(false);
    },
  );

  it("eski yeşil, sonraki kırmızıyı örtmez", () => {
    const calismalar = [
      calisma({ run_number: 1 }),
      calisma({ run_number: 2, conclusion: "failure" }),
    ];
    expect(hatSonucunuYorumla(calismalar, kayit).yesil).toBe(false);
  });

  it("aynı çalışmanın son denemesi geçerlidir", () => {
    const kirmizidanYesile = [
      calisma({ run_attempt: 1, conclusion: "failure" }),
      calisma({ run_attempt: 2, conclusion: "success" }),
    ];
    expect(hatSonucunuYorumla(kirmizidanYesile, kayit).yesil).toBe(true);
    const yesildenKirmiziya = [
      calisma({ run_attempt: 2, conclusion: "failure" }),
      calisma({ run_attempt: 1, conclusion: "success" }),
    ];
    expect(hatSonucunuYorumla(yesildenKirmiziya, kayit).yesil).toBe(false);
  });

  it("depo adı kaydın GitHub adresinden çıkar", () => {
    expect(githubDeposu("https://github.com/sahip/depo.git")).toBe("sahip/depo");
    expect(githubDeposu("https://github.com/sahip/depo")).toBe("sahip/depo");
    expect(githubDeposu("git@github.com:sahip/depo.git")).toBe("sahip/depo");
    expect(githubDeposu("https://gitlab.com/sahip/depo.git")).toBeUndefined();
    expect(githubDeposu("https://github.com/sahip")).toBeUndefined();
  });

  it("hattın dosyası yerinde", () => {
    expect(existsSync(join(import.meta.dirname, "..", "..", hatDosyasi))).toBe(true);
  });
});
