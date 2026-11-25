// @vitest-environment jsdom
// Çizimden sonra odak (kart 0307): odak, isteyen güncellemenin çizimi bitince verilir (öğe o çizimde ortaya çıksa
// da); `hazir` verilince koşul sağlanana kadar bekler, sonraki çizimde verilir; yeni istek eskisinin yerini alır;
// beklerken kullanıcı odağı başka öğeye taşıdıysa istek bırakılır; başka güncelleme olmadan da odak verilir; istek
// yokken çizim odağa dokunmaz. Kodda olay işleyicisinde kare, zamanlayıcı ya da mikro görevle odak verilmez (tarama).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useCizimdenSonraOdak } from "../cizimden-sonra-odak.ts";

afterEach(cleanup);

// Deneme parçasının düğme ve başlık yazıları.
const yazi = {
  goster: "goster",
  bekle: "bekle",
  hazir: "hazir",
  yalniz: "yalniz",
  baslik: "baslik",
  sabit: "sabit",
};

function Deneme() {
  const [goster, setGoster] = useState(false);
  const [hazir, setHazir] = useState(false);
  const hazirRef = useRef(false);
  hazirRef.current = hazir;
  const hedef = useRef<HTMLHeadingElement>(null);
  const sabit = useRef<HTMLParagraphElement>(null);
  const odakla = useCizimdenSonraOdak();
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setGoster(true);
          odakla(() => hedef.current);
        }}
      >
        {yazi.goster}
      </button>
      <button
        type="button"
        onClick={() => {
          setGoster(true);
          odakla(
            () => hedef.current,
            () => hazirRef.current,
          );
        }}
      >
        {yazi.bekle}
      </button>
      <button type="button" onClick={() => setHazir(true)}>
        {yazi.hazir}
      </button>
      {/* Yalnız odak isteği: başka durum güncellemesi yok, istek kendi çizimini doğurur. */}
      <button type="button" onClick={() => odakla(() => sabit.current)}>
        {yazi.yalniz}
      </button>
      <p ref={sabit} tabIndex={-1}>
        {yazi.sabit}
      </p>
      {goster ? (
        <h2 ref={hedef} tabIndex={-1}>
          {yazi.baslik}
        </h2>
      ) : null}
    </div>
  );
}

describe("çizimden sonra odak", () => {
  it("aynı çizimde ortaya çıkan öğeye odak verir", async () => {
    render(<Deneme />);
    await act(async () => {
      fireEvent.click(screen.getByText(yazi.goster));
    });
    expect(document.activeElement).toBe(screen.getByRole("heading"));
  });

  it("koşul sağlanana kadar bekler, sağlanınca verir", async () => {
    render(<Deneme />);
    const bekle = screen.getByText(yazi.bekle);
    bekle.focus();
    await act(async () => {
      fireEvent.click(bekle);
    });
    expect(document.activeElement).toBe(bekle);
    await act(async () => {
      fireEvent.click(screen.getByText(yazi.hazir));
    });
    expect(document.activeElement).toBe(screen.getByRole("heading"));
  });

  it("beklerken odak başka öğeye taşındıysa istek bırakılır", async () => {
    render(<Deneme />);
    const bekle = screen.getByText(yazi.bekle);
    bekle.focus();
    await act(async () => {
      fireEvent.click(bekle);
    });
    const hazir = screen.getByText(yazi.hazir);
    hazir.focus();
    await act(async () => {
      fireEvent.click(hazir);
    });
    expect(document.activeElement).toBe(hazir);
  });

  it("başka durum güncellemesi olmadan da odak verilir", async () => {
    render(<Deneme />);
    await act(async () => {
      fireEvent.click(screen.getByText(yazi.yalniz));
    });
    expect(document.activeElement).toBe(screen.getByText(yazi.sabit));
  });

  it("istek yokken çizim odağa dokunmaz", async () => {
    render(<Deneme />);
    const hazir = screen.getByText(yazi.hazir);
    hazir.focus();
    await act(async () => {
      fireEvent.click(hazir);
    });
    expect(document.activeElement).toBe(hazir);
  });
});

// Olay işleyicisinde bir sonraki karede, zamanlayıcıyla ya da mikro görevle odak verilmez: çizimden önce çalışabilir.
// Tarama bu çağrıların gövdesinde `.focus(` arar. Muaflar, gerekçeleriyle:
// - biçimli metin alanı: kare efektin içinden, çizimden sonra istenir (ipucu odağı düğmede tutmasın);
// - ekibe davet: odak Radix'in pencere kapanınca kendi zamanlayıcısıyla verdiği dönüşten sonra gelmeli; pencereyi
//   kapatan her yol tıklamanın içinde çağrılır, React durumu zamanlayıcıdan önce çizer.
const kok = join(import.meta.dirname, "..", "..", "..");
const muaflar = new Set([
  "bilesenler/parcalar/bicimli-metin-alani.tsx",
  "cekirdek/yonetim-paneli/ekip/davet.tsx",
]);
const ertelenenCagrilar = ["requestAnimationFrame(", "setTimeout(", "queueMicrotask("];

const kareIleOdakVarMi = (kaynak: string): boolean => {
  for (const cagri of ertelenenCagrilar) {
    for (let i = kaynak.indexOf(cagri); i !== -1; i = kaynak.indexOf(cagri, i + 1)) {
      let derinlik = 0;
      for (let j = i + cagri.length - 1; j < kaynak.length; j++) {
        if (kaynak[j] === "(") derinlik++;
        else if (kaynak[j] === ")" && --derinlik === 0) {
          if (kaynak.slice(i, j).includes(".focus(")) return true;
          break;
        }
      }
    }
  }
  return false;
};

const atlananlar = new Set(["testler", ".next", "node_modules"]);
const kaynakDosyalari = (klasor: string): string[] =>
  readdirSync(join(kok, klasor), { withFileTypes: true }).flatMap((oge) => {
    if (atlananlar.has(oge.name)) return [];
    const yol = join(klasor, oge.name);
    if (oge.isDirectory()) return kaynakDosyalari(yol);
    return /\.tsx?$/.test(oge.name) ? [yol] : [];
  });

describe("kodda bir sonraki karede odak", () => {
  it("bozuk örnekleri yakalar", () => {
    expect(kareIleOdakVarMi("requestAnimationFrame(() => a.current?.focus());")).toBe(true);
    expect(
      kareIleOdakVarMi("requestAnimationFrame(() => {\n  const b = x(y());\n  b?.focus();\n});"),
    ).toBe(true);
    expect(kareIleOdakVarMi("window.setTimeout(() => d.querySelector(s)?.focus(), 0);")).toBe(true);
    expect(kareIleOdakVarMi("queueMicrotask(() => b.focus());")).toBe(true);
    expect(kareIleOdakVarMi("requestAnimationFrame(f);\nb.focus();")).toBe(false);
  });

  it("çekirdekte ve kütüphanede yok", () => {
    const bulunan = [...kaynakDosyalari("cekirdek"), ...kaynakDosyalari("bilesenler")]
      .filter((dosya) => !muaflar.has(dosya))
      .filter((dosya) => kareIleOdakVarMi(readFileSync(join(kok, dosya), "utf8")));
    expect(bulunan).toEqual([]);
  });
});
