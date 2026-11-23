// Kartın türü rolsüz ada izin vermez (kart 0292): ad verilen kart adını alabilen bir rol de alır. Bozuk
// örnekler tür kontrolünde hata verir (`pnpm tur-kontrolu`); hata vermezse `@ts-expect-error` kullanılmamış sayılır
// ve tür kontrolü kırmızıya düşer.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Kart, KartAlti } from "../kart.tsx";

// Ad metin dosyasından gelir; test yalnız türü ve rolü dener.
const ad = String(Math.random());

describe("kartın adı", () => {
  it("ad verilen kart bölge ya da grup rolüyle çizilir", () => {
    const bolge = renderToStaticMarkup(
      <Kart role="region" aria-labelledby="baslik">
        <h2 id="baslik">{ad}</h2>
      </Kart>,
    );
    expect(bolge).toContain('role="region"');
    expect(bolge).toContain('aria-labelledby="baslik"');
    expect(renderToStaticMarkup(<Kart role="group" aria-label={ad} />)).toContain('role="group"');
    expect(renderToStaticMarkup(<Kart />)).not.toContain("role=");
  });

  it("rolsüz kart ad alamaz (tür kontrolü)", () => {
    const ornekler = [
      // @ts-expect-error rolsüz kutuya başlıkla ad
      <Kart key="a" aria-labelledby="baslik" />,
      // @ts-expect-error rolsüz kutuya ad
      <Kart key="b" aria-label={ad} />,
      // @ts-expect-error ad alamayan rol
      <Kart key="c" role="presentation" aria-label={ad} />,
      // @ts-expect-error kartın alt parçası da rolsüz kutudur
      <KartAlti key="d" aria-label={ad} />,
    ];
    expect(ornekler).toHaveLength(4);
  });
});
