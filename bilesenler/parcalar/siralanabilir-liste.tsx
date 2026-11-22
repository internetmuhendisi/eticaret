"use client";
// Sıralanabilir küçük liste (kart 0141, karar 0111): panelde vitrin bölümleri, menü öğeleri gibi elle sıralanan
// kısa listeler. Satır tutamaktan fareyle ya da parmakla sürüklenir; klavyede tutamağa odaklanıp boşlukla alınır,
// ok tuşlarıyla taşınır, boşlukla bırakılır, Escape ile vazgeçilir (@dnd-kit). Her genişlikte her satırda "yukarı al"
// ve "aşağı al" düğmeleri de vardır: sürükleyemeyen kullanıcının da tek dokunuşla taşıyabileceği bir yol olmalı
// (WCAG 2.2, 2.5.7). Satırın kendi menüsü aynı işi `islemler` ile de yapabilir. Her taşıma ekran okuyucuya
// duyurulur. Liste kontrollüdür: yeni sıra `siralaninca` ile kullanana verilir, kullanan listeyi hemen yeni sırayla
// verir (kaydı arkadan yapar, olmazsa eski sıraya döner); düğmeyle taşınan satırın odağı yeni sıra gelince yerine
// konur. Metinleri kullanan sayfa verir. Liste motoru gelince ona bağlanır.
//
// Izgara düzeni (`duzen="izgara"`, kart 0266: ürün galerisi): öğeler telefonda iki, tablet ve üstünde dört sütunlu
// kartlardır; önceki ve sonraki düğmeleri kartın altında iki uçta, altlarındaki satırda tutamak ve `eylemler` durur.
// Klavyede ok tuşları dört yöne taşır; "yukarı al" ve "aşağı al" sıradaki önceki ve sonraki yerdir.
import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { dugmeSiniflari, IkonDugmesi } from "./dugme.tsx";
import { Ipucu } from "./ipucu.tsx";
import { sinif } from "./sinif.ts";

// Sıra 1'den başlar.
export type SiralamaMetinleri = {
  // Tutamağın, yukarı ve aşağı düğmelerinin adı: "Taşı: Slider".
  tasi: (ad: string) => string;
  yukari: (ad: string) => string;
  asagi: (ad: string) => string;
  // Tutamağa odaklanınca ekran okuyucunun okuduğu kullanım bilgisi.
  talimat: string;
  alindi: (ad: string, sira: number, toplam: number) => string;
  tasindi: (ad: string, sira: number, toplam: number) => string;
  birakildi: (ad: string, sira: number, toplam: number) => string;
  vazgecildi: (ad: string, sira: number, toplam: number) => string;
};

export type SatirIslemleri = {
  yukariAl: () => void;
  asagiAl: () => void;
  ilk: boolean;
  son: boolean;
};

type Yon = "yukari" | "asagi";
// Satırın içi ile tutamağın dikey hizası. Satırın içinde alt liste duran listede (menü öğeleri) üst: tutamak
// satırın başlığıyla aynı hizada kalır, bütün bloğun ortasına düşmez (kart 0143).
type Hizalama = "orta" | "ust";
type Duzen = "liste" | "izgara";
type SatirVerisi = Record<`data-${string}`, string>;

function Satir({
  anahtar,
  ad,
  sira,
  toplam,
  metinler,
  tasi,
  hizalama,
  duzen,
  eylemler,
  veri,
  children,
}: {
  anahtar: string;
  ad: string;
  sira: number;
  toplam: number;
  metinler: SiralamaMetinleri;
  tasi: (anahtar: string, yon: Yon) => void;
  hizalama: Hizalama;
  duzen: Duzen;
  eylemler: ReactNode;
  veri: SatirVerisi | undefined;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: anahtar });
  const tutamak = (
    <Ipucu metin={metinler.tasi(ad)}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        data-slot="siralama-tutamagi"
        {...attributes}
        {...listeners}
        aria-label={metinler.tasi(ad)}
        className={sinif(
          dugmeSiniflari({ tur: "sade" }),
          duzen === "izgara" ? "size-11" : "h-11 w-8",
          "cursor-grab touch-none px-0 text-soluk-yazi active:cursor-grabbing",
        )}
      >
        <Ikon ad="tutamak" />
      </button>
    </Ipucu>
  );
  const sirala = (
    <>
      <IkonDugmesi
        ikon={duzen === "izgara" ? "onceki" : "yukari-al"}
        etiket={metinler.yukari(ad)}
        data-yon="yukari"
        disabled={sira === 1}
        onClick={() => tasi(anahtar, "yukari")}
        className={duzen === "izgara" ? "size-11" : "size-8 min-h-8"}
      />
      <IkonDugmesi
        ikon={duzen === "izgara" ? "sonraki" : "asagi-al"}
        etiket={metinler.asagi(ad)}
        data-yon="asagi"
        disabled={sira === toplam}
        onClick={() => tasi(anahtar, "asagi")}
        className={duzen === "izgara" ? "size-11" : "size-8 min-h-8"}
      />
    </>
  );
  // Sürüklenirken öğenin yeri tarayıcıda hesaplanır; ölçü değil, hareket değeridir.
  const tasima = { transform: CSS.Translate.toString(transform), transition };
  if (duzen === "izgara") {
    return (
      <li
        ref={setNodeRef}
        data-slot="siralanabilir-satir"
        data-anahtar={anahtar}
        {...veri}
        style={tasima}
        className={sinif(
          "relative flex min-w-0 flex-col gap-2 rounded-orta border border-kenar bg-zemin p-2",
          isDragging && "z-acilir shadow-acilir",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
        {/* Önceki ve sonraki iki uçta, altında tutamak ve eylemler (dört sütunda tek satıra sığmaz). */}
        <div className="flex items-center justify-between">{sirala}</div>
        <div className="flex items-center justify-between gap-1">
          {tutamak}
          <div className="flex items-center gap-1">{eylemler}</div>
        </div>
      </li>
    );
  }
  return (
    <li
      ref={setNodeRef}
      data-slot="siralanabilir-satir"
      data-anahtar={anahtar}
      {...veri}
      style={tasima}
      className={sinif(
        "relative flex min-h-16 gap-2 border-b border-kenar bg-zemin py-2 pr-3 pl-1 last:border-b-0",
        hizalama === "ust" ? "items-start" : "items-center",
        isDragging && "z-acilir shadow-acilir",
      )}
    >
      {tutamak}
      <div className="flex shrink-0 flex-col">{sirala}</div>
      <div
        className={sinif(
          "flex min-w-0 flex-1 gap-2",
          hizalama === "ust" ? "items-start" : "items-center",
        )}
      >
        {children}
        {eylemler}
      </div>
    </li>
  );
}

export function SiralanabilirListe<T>({
  ogeler,
  anahtar,
  ad,
  siralaninca,
  etiket,
  metinler,
  satir,
  eylemler,
  satirVerisi,
  hizalama = "orta",
  duzen = "liste",
  className,
}: {
  ogeler: readonly T[];
  // Öğenin değişmeyen kimliği.
  anahtar: (oge: T) => string;
  // Duyurularda ve düğme adlarında geçen ad.
  ad: (oge: T) => string;
  siralaninca: (yeniSira: T[]) => void;
  // Listenin ekran okuyucudaki adı.
  etiket: string;
  metinler: SiralamaMetinleri;
  // Satırın içi: tutamak ve sıra düğmelerinden sonra gelir.
  satir: (oge: T, islemler: SatirIslemleri) => ReactNode;
  // Satırın sonundaki eylemler (ızgarada kartın alt satırının sonu): düzenle, sil.
  eylemler?: (oge: T, islemler: SatirIslemleri) => ReactNode;
  // Satırın kendisine yazılan veri öznitelikleri (ör. formun alanı: hatada odak satırın düğmesini bulur).
  satirVerisi?: (oge: T) => SatirVerisi;
  hizalama?: Hizalama;
  duzen?: Duzen;
  className?: string;
}) {
  const kimlik = useId();
  const listeRef = useRef<HTMLOListElement>(null);
  const [duyuru, setDuyuru] = useState("");
  // Düğmeyle taşınan satırda odak aynı yöndeki düğmede kalır; o düğme kapandıysa (ilk ya da son sıra) öteki. Odak,
  // satır listede yeni yerine gelince konur: kullanan yeni sırayı geç verirse eski sıradaki düğmeye odaklanılmaz.
  const [odak, setOdak] = useState<{ anahtar: string; yon: Yon; sira: number } | null>(null);
  const sensorler = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const anahtarlar = ogeler.map(anahtar);
  const toplam = ogeler.length;
  const adi = (id: string | number): string => {
    const oge = ogeler.find((o) => anahtar(o) === String(id));
    return oge === undefined ? "" : ad(oge);
  };
  const sirasi = (id: string | number): number => anahtarlar.indexOf(String(id)) + 1;

  useEffect(() => {
    if (odak === null || anahtarlar.indexOf(odak.anahtar) !== odak.sira) return;
    const satirOgesi = Array.from(
      listeRef.current?.querySelectorAll<HTMLElement>('[data-slot="siralanabilir-satir"]') ?? [],
    ).find((oge) => oge.getAttribute("data-anahtar") === odak.anahtar);
    const ayni = satirOgesi?.querySelector<HTMLButtonElement>(`[data-yon="${odak.yon}"]`);
    const oteki = satirOgesi?.querySelector<HTMLButtonElement>(
      `[data-yon="${odak.yon === "yukari" ? "asagi" : "yukari"}"]`,
    );
    (ayni?.disabled === false ? ayni : oteki)?.focus();
    setOdak(null);
  }, [odak, anahtarlar]);

  const tasi = (oge: string, yon: Yon) => {
    const eski = anahtarlar.indexOf(oge);
    const yeni = yon === "yukari" ? eski - 1 : eski + 1;
    if (eski < 0 || yeni < 0 || yeni >= toplam) return;
    siralaninca(arrayMove([...ogeler], eski, yeni));
    setDuyuru(metinler.tasindi(adi(oge), yeni + 1, toplam));
    setOdak({ anahtar: oge, yon, sira: yeni });
  };

  const birakinca = ({ active, over }: DragEndEvent) => {
    if (over === null || active.id === over.id) return;
    const eski = anahtarlar.indexOf(String(active.id));
    const yeni = anahtarlar.indexOf(String(over.id));
    if (eski < 0 || yeni < 0) return;
    siralaninca(arrayMove([...ogeler], eski, yeni));
  };

  // Sürükleme başlarken satır kendi yerinin üstündedir; bu "taşındı" diye duyurulsa "alındı" duyurusunu ezerdi
  // (ölçüldü). Yalnız yer değişince duyurulur.
  const sonYer = useRef<string | number | null>(null);
  const duyurular: Announcements = {
    onDragStart: ({ active }) => {
      sonYer.current = active.id;
      return metinler.alindi(adi(active.id), sirasi(active.id), toplam);
    },
    onDragOver: ({ active, over }) => {
      if (over === null || over.id === sonYer.current) return undefined;
      sonYer.current = over.id;
      return metinler.tasindi(adi(active.id), sirasi(over.id), toplam);
    },
    onDragEnd: ({ active, over }) =>
      metinler.birakildi(adi(active.id), sirasi(over?.id ?? active.id), toplam),
    onDragCancel: ({ active }) => metinler.vazgecildi(adi(active.id), sirasi(active.id), toplam),
  };

  return (
    <DndContext
      id={kimlik}
      sensors={sensorler}
      collisionDetection={closestCenter}
      onDragEnd={birakinca}
      accessibility={{
        announcements: duyurular,
        screenReaderInstructions: { draggable: metinler.talimat },
      }}
    >
      <SortableContext
        items={anahtarlar}
        strategy={duzen === "izgara" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <ol
          ref={listeRef}
          aria-label={etiket}
          data-slot="siralanabilir-liste"
          className={sinif(
            duzen === "izgara"
              ? "m-0 grid list-none grid-cols-2 gap-3 p-0 tablet:grid-cols-4"
              : "m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0",
            className,
          )}
        >
          {ogeler.map((oge, sira) => {
            const anahtari = anahtar(oge);
            const islemler = {
              yukariAl: () => tasi(anahtari, "yukari"),
              asagiAl: () => tasi(anahtari, "asagi"),
              ilk: sira === 0,
              son: sira === toplam - 1,
            };
            return (
              <Satir
                key={anahtari}
                anahtar={anahtari}
                ad={ad(oge)}
                sira={sira + 1}
                toplam={toplam}
                metinler={metinler}
                tasi={tasi}
                hizalama={hizalama}
                duzen={duzen}
                eylemler={eylemler?.(oge, islemler)}
                veri={satirVerisi?.(oge)}
              >
                {satir(oge, islemler)}
              </Satir>
            );
          })}
        </ol>
      </SortableContext>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {duyuru}
      </div>
    </DndContext>
  );
}
