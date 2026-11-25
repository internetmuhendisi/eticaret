// @vitest-environment jsdom
// Çizimden sonra odak (kart 0307): odak, isteyen güncellemenin çizimi bitince verilir (öğe o çizimde ortaya çıksa
// da); `hazir` verilince koşul sağlanana kadar bekler, sonraki çizimde verilir; yeni istek eskisinin yerini alır;
// istek yokken çizim odağa dokunmaz. Kodda olay işleyicisinde `requestAnimationFrame` ile odak verilmez (tarama).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useCizimdenSonraOdak } from "../cizimden-sonra-odak.ts";

afterEach(cleanup);

// Deneme parçasının düğme ve başlık yazıları.
const yazi = { goster: "goster", bekle: "bekle", hazir: "hazir", baslik: "baslik" };

function Deneme() {
  const [goster, setGoster] = useState(false);
  const [hazir, setHazir] = useState(false);
  const hazirRef = useRef(false);
  hazirRef.current = hazir;
  const hedef = useRef<HTMLHeadingElement>(null);
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

// Olay işleyicisinde bir sonraki karede odak verilmez: kare çizimden önce gelebilir. Efektin içinde (çizimden sonra)
// verilen tek yer muaftır. Tarama `requestAnimationFrame(` çağrısının gövdesinde `.focus(` arar.
const kok = join(import.meta.dirname, "..", "..", "..");
const muaflar = new Set(["bilesenler/parcalar/bicimli-metin-alani.tsx"]);

const kareIleOdakVarMi = (kaynak: string): boolean => {
  const cagri = "requestAnimationFrame(";
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
    expect(kareIleOdakVarMi("requestAnimationFrame(f);\nb.focus();")).toBe(false);
  });

  it("çekirdekte ve kütüphanede yok", () => {
    const bulunan = [...kaynakDosyalari("cekirdek"), ...kaynakDosyalari("bilesenler")]
      .filter((dosya) => !muaflar.has(dosya))
      .filter((dosya) => kareIleOdakVarMi(readFileSync(join(kok, dosya), "utf8")));
    expect(bulunan).toEqual([]);
  });
});
