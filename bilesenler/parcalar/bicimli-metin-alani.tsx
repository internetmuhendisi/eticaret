"use client";
// Biçimli metin alanı (kart 0263): ürün açıklaması gibi biçimli metni yazmak. Tiptap (ProseMirror) üstündedir. Araç
// çubuğu kalın, eğik, ara başlık, madde ve sıralı liste ve bağlantı verir; başka biçim (kod, yatay çizgi, görsel)
// yazılamaz. Değer HTML'dir; vitrin yine kendi izinli etiket listesiyle temizler (kullanan sayfanın işi).
//
// Erişilebilirlik: araç çubuğu WAI-ARIA araç çubuğu kalıbıdır (tek sekme durağı, ok tuşlarıyla gezilir, Home ve End);
// her düğmenin adı ve basılı durumu (aria-pressed) vardır. Yazı alanı çok satırlı metin kutusudur, adı etiketten,
// açıklaması ve hatası alanın bağlantısından gelir. Bağlantı düğmesi alanın altında adres satırını açar: Enter uygular,
// Escape kapatır ve odağı yazıya döndürür. Klavye kısayolları (Ctrl+B, Ctrl+I) Tiptap'ındır.
// Metinler kullanan sayfadan gelir.
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { panelIkonlari } from "../ikonlar/panel-sozlugu.ts";
import { type IkonBileseni, ikonlar } from "../ikonlar/sozluk.ts";
import { Dugme, IkonDugmesi } from "./dugme.tsx";
import { GirisAlani } from "./giris-alani.tsx";
import { sinif } from "./sinif.ts";
import { uzunMetinAlaniSiniflari } from "./uzun-metin-alani.tsx";

export type BicimliMetinMetinleri = {
  aracCubugu: string;
  kalin: string;
  egik: string;
  araBaslik: string;
  maddeListesi: string;
  siraliListe: string;
  baglanti: string;
  baglantiAdresi: string;
  baglantiUygula: string;
  baglantiKaldir: string;
  baglantiGecersiz: string;
};

type Arac = "kalin" | "egik" | "araBaslik" | "maddeListesi" | "siraliListe" | "baglanti";
// İkonlar panelin sözlüğündendir: parça yalnız panelde kullanılır (kart 0295).
const araclar: readonly { kod: Arac; ikon: IkonBileseni }[] = [
  { kod: "kalin", ikon: panelIkonlari.kalin },
  { kod: "egik", ikon: panelIkonlari.egik },
  { kod: "araBaslik", ikon: panelIkonlari["ara-baslik"] },
  { kod: "maddeListesi", ikon: panelIkonlari["madde-listesi"] },
  { kod: "siraliListe", ikon: panelIkonlari["sirali-liste"] },
  { kod: "baglanti", ikon: ikonlar["dis-baglanti"] },
];

// Boş belge Tiptap'ta "<p></p>"dir: alanın değeri boş metindir.
const bosMu = (html: string) => html === "" || html === "<p></p>";

export function BicimliMetinAlani({
  id,
  etiket,
  deger,
  onDegerDegisti,
  metinler,
  baglantiGecerliMi,
  disabled = false,
  className,
  ...aria
}: {
  id?: string;
  // Yazı alanının ekran okuyucu adı: alanın etiketi.
  etiket: string;
  deger: string;
  onDegerDegisti: (html: string) => void;
  metinler: BicimliMetinMetinleri;
  // Bağlantı adresinin kuralı: kullanan sayfanın (temizlik kuralıyla aynı olmalı).
  baglantiGecerliMi: (adres: string) => boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-required"?: true;
}) {
  const kimlik = useId();
  const [etkinArac, setEtkinArac] = useState(0);
  const cubuk = useRef<HTMLDivElement>(null);
  const [baglantiAcik, setBaglantiAcik] = useState(false);
  const [adres, setAdres] = useState("");
  const [adresHatasi, setAdresHatasi] = useState(false);
  const sonDeger = useRef(deger);

  // Bağlantı satırı açılınca odak adres alanına geçer (araç çubuğunun ipucu odağı düğmede tutmasın).
  useEffect(() => {
    if (!baglantiAcik) return;
    const kare = requestAnimationFrame(() => document.getElementById(`${kimlik}-adres`)?.focus());
    return () => cancelAnimationFrame(kare);
  }, [baglantiAcik, kimlik]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Vitrinin izinli etiketlerinin hepsi korunur (h4, u, s): araç çubuğunda olmasalar da açılan açıklamada
        // kaybolmasınlar (bağımsız kontrolün bulgusu).
        heading: { levels: [3, 4] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          isAllowedUri: (url) => baglantiGecerliMi(url),
          HTMLAttributes: { rel: "nofollow noopener noreferrer", target: null },
        },
      }),
    ],
    content: deger,
    editorProps: {
      attributes: {
        ...(id === undefined ? {} : { id }),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": etiket,
        ...(aria["aria-invalid"] === undefined ? {} : { "aria-invalid": "true" }),
        ...(aria["aria-describedby"] === undefined
          ? {}
          : { "aria-describedby": aria["aria-describedby"] }),
        ...(aria["aria-required"] === undefined ? {} : { "aria-required": "true" }),
        class: sinif(
          uzunMetinAlaniSiniflari,
          "bicimli-metin rounded-t-none focus-visible:outline-none",
        ),
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = bosMu(e.getHTML()) ? "" : e.getHTML();
      sonDeger.current = html;
      onDegerDegisti(html);
    },
  });

  // Değer dışarıdan değişince (Vazgeç, sunucunun yenilemesi) belge yeniden kurulur; kendi yazdığı değer kurulmaz.
  useEffect(() => {
    if (editor === null || deger === sonDeger.current) return;
    sonDeger.current = deger;
    editor.commands.setContent(deger, { emitUpdate: false });
  }, [editor, deger]);

  // Alanın açıklaması, hatası ve adı değişince yazı alanının öznitelikleri de değişir.
  useEffect(() => {
    if (editor === null) return;
    editor.setOptions({
      editable: !disabled,
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(id === undefined ? {} : { id }),
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": etiket,
          ...(aria["aria-invalid"] === undefined ? {} : { "aria-invalid": "true" }),
          ...(aria["aria-describedby"] === undefined
            ? {}
            : { "aria-describedby": aria["aria-describedby"] }),
          ...(aria["aria-required"] === undefined ? {} : { "aria-required": "true" }),
          class: sinif(
            uzunMetinAlaniSiniflari,
            "bicimli-metin rounded-t-none focus-visible:outline-none",
          ),
        },
      },
    });
  }, [
    editor,
    disabled,
    id,
    etiket,
    aria["aria-invalid"],
    aria["aria-describedby"],
    aria["aria-required"],
  ]);

  const durum = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      kalin: e?.isActive("bold") ?? false,
      egik: e?.isActive("italic") ?? false,
      araBaslik: e?.isActive("heading", { level: 3 }) ?? false,
      maddeListesi: e?.isActive("bulletList") ?? false,
      siraliListe: e?.isActive("orderedList") ?? false,
      baglanti: e?.isActive("link") ?? false,
    }),
  });

  const uygula = (arac: Arac) => {
    if (editor === null) return;
    const zincir = editor.chain().focus();
    if (arac === "kalin") zincir.toggleBold().run();
    else if (arac === "egik") zincir.toggleItalic().run();
    else if (arac === "araBaslik") zincir.toggleHeading({ level: 3 }).run();
    else if (arac === "maddeListesi") zincir.toggleBulletList().run();
    else if (arac === "siraliListe") zincir.toggleOrderedList().run();
    else {
      setAdres((editor.getAttributes("link")["href"] as string | undefined) ?? "");
      setAdresHatasi(false);
      setBaglantiAcik(true);
    }
  };

  const baglantiyiUygula = () => {
    if (editor === null) return;
    const temiz = adres.trim();
    if (temiz === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setBaglantiAcik(false);
      return;
    }
    if (!baglantiGecerliMi(temiz)) {
      setAdresHatasi(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: temiz }).run();
    setBaglantiAcik(false);
  };

  const baglantiyiKaldir = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setBaglantiAcik(false);
  };

  // Araç çubuğu: ok tuşları düğmeler arasında gezer, Home ve End uçlara gider (tek sekme durağı).
  const cubukTusu = (olay: KeyboardEvent<HTMLDivElement>) => {
    const son = araclar.length - 1;
    const yeni =
      olay.key === "ArrowRight"
        ? etkinArac === son
          ? 0
          : etkinArac + 1
        : olay.key === "ArrowLeft"
          ? etkinArac === 0
            ? son
            : etkinArac - 1
          : olay.key === "Home"
            ? 0
            : olay.key === "End"
              ? son
              : undefined;
    if (yeni === undefined) return;
    olay.preventDefault();
    setEtkinArac(yeni);
    cubuk.current?.querySelectorAll("button")[yeni]?.focus();
  };

  return (
    <div className={sinif("flex flex-col", className)} data-slot="bicimli-metin-alani">
      <div
        ref={cubuk}
        role="toolbar"
        aria-label={metinler.aracCubugu}
        aria-controls={id}
        onKeyDown={cubukTusu}
        className="flex flex-wrap items-center gap-1 rounded-t-orta border border-b-0 border-alan-kenari bg-yuzey p-1"
      >
        {araclar.map(({ kod, ikon }, sira) => (
          <IkonDugmesi
            key={kod}
            ikon={ikon}
            etiket={metinler[kod]}
            tabIndex={sira === etkinArac ? 0 : -1}
            aria-pressed={durum?.[kod] ?? false}
            disabled={disabled || editor === null}
            onFocus={() => setEtkinArac(sira)}
            onClick={() => uygula(kod)}
            className={durum?.[kod] === true ? "bg-zemin" : undefined}
          />
        ))}
      </div>
      <EditorContent editor={editor} />
      {baglantiAcik ? (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <GirisAlani
              id={`${kimlik}-adres`}
              aria-label={metinler.baglantiAdresi}
              aria-invalid={adresHatasi ? true : undefined}
              aria-describedby={adresHatasi ? `${kimlik}-adres-hata` : undefined}
              inputMode="url"
              autoComplete="off"
              value={adres}
              onChange={(olay) => {
                setAdres(olay.target.value);
                setAdresHatasi(false);
              }}
              onKeyDown={(olay) => {
                if (olay.key === "Enter") {
                  olay.preventDefault();
                  baglantiyiUygula();
                } else if (olay.key === "Escape") {
                  olay.preventDefault();
                  olay.stopPropagation();
                  setBaglantiAcik(false);
                  editor?.commands.focus();
                }
              }}
              className="min-w-0 flex-1"
            />
            <Dugme tur="ikincil" onClick={baglantiyiUygula}>
              {metinler.baglantiUygula}
            </Dugme>
            {durum?.baglanti === true ? (
              <Dugme tur="sade" onClick={baglantiyiKaldir}>
                {metinler.baglantiKaldir}
              </Dugme>
            ) : null}
          </div>
          {adresHatasi ? (
            <span id={`${kimlik}-adres-hata`} className="font-kalin text-tehlike-yazi">
              {metinler.baglantiGecersiz}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
