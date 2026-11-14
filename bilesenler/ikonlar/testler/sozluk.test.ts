// İkon sözlüğü (kart 0103): bir kavramın ikonu her yerde aynıdır. Önceki ve sonraki köşeli oktur (Canlı Çarşı
// taslağı, karar 0128): kayan afiş, kaydırmalı şerit, sayfalama ve galeri aynı ikonu kullanır.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ikonlar } from "../sozluk.ts";

describe("ikon sözlüğü", () => {
  it("önceki ve sonraki köşeli oktur", () => {
    expect(renderToStaticMarkup(createElement(ikonlar.onceki))).toContain("lucide-chevron-left");
    expect(renderToStaticMarkup(createElement(ikonlar.sonraki))).toContain("lucide-chevron-right");
  });
});
