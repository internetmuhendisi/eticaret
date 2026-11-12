"use client";
// Sıralanabilir küçük liste (kart 0141, karar 0111): panelde vitrin bölümleri, menü öğeleri gibi elle sıralanan
// kısa listeler. Satır tutamaktan fareyle ya da parmakla sürüklenir; klavyede tutamağa odaklanıp boşlukla alınır,
// ok tuşlarıyla taşınır, boşlukla bırakılır, Escape ile vazgeçilir (@dnd-kit). Her genişlikte her satırda "yukarı al"
// ve "aşağı al" düğmeleri de vardır: sürükleyemeyen kullanıcının da tek dokunuşla taşıyabileceği bir yol olmalı
// (WCAG 2.2, 2.5.7). Satırın kendi menüsü aynı işi `islemler` ile de yapabilir. Her taşıma ekran okuyucuya
// duyurulur. Liste kontrollüdür: yeni sıra `siralaninca` ile kullanana verilir, kullanan listeyi hemen yeni sırayla
// verir (kaydı arkadan yapar, olmazsa eski sıraya döner); düğmeyle taşınan satırın odağı yeni sıra gelince yerine
// konur. Metinleri kullanan sayfa verir. Liste motoru gelince ona bağlanır.
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

function Satir({
  anahtar,
  ad,
  sira,
  toplam,
  metinler,
  tasi,
  children,
}: {
  anahtar: string;
  ad: string;
  sira: number;
  toplam: number;
  metinler: SiralamaMetinleri;
  tasi: (anahtar: string, yon: Yon) => void;
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
  return (
    <li
      ref={setNodeRef}
      data-slot="siralanabilir-satir"
      data-anahtar={anahtar}
      // Sürüklenirken satırın yeri tarayıcıda hesaplanır; ölçü değil, hareket değeridir.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={sinif(
        "relative flex min-h-16 items-center gap-2 border-b border-kenar bg-zemin py-2 pr-3 pl-1 last:border-b-0",
        isDragging && "z-acilir shadow-acilir",
      )}
    >
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
            "h-11 w-8 cursor-grab touch-none px-0 text-soluk-yazi active:cursor-grabbing",
          )}
        >
          <Ikon ad="tutamak" />
        </button>
      </Ipucu>
      <div className="flex shrink-0 flex-col">
        <IkonDugmesi
          ikon="yukari-al"
          etiket={metinler.yukari(ad)}
          data-yon="yukari"
          disabled={sira === 1}
          onClick={() => tasi(anahtar, "yukari")}
          className="size-8 min-h-8"
        />
        <IkonDugmesi
          ikon="asagi-al"
          etiket={metinler.asagi(ad)}
          data-yon="asagi"
          disabled={sira === toplam}
          onClick={() => tasi(anahtar, "asagi")}
          className="size-8 min-h-8"
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
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
      <SortableContext items={anahtarlar} strategy={verticalListSortingStrategy}>
        <ol
          ref={listeRef}
          aria-label={etiket}
          data-slot="siralanabilir-liste"
          className={sinif(
            "m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0",
            className,
          )}
        >
          {ogeler.map((oge, sira) => {
            const anahtari = anahtar(oge);
            return (
              <Satir
                key={anahtari}
                anahtar={anahtari}
                ad={ad(oge)}
                sira={sira + 1}
                toplam={toplam}
                metinler={metinler}
                tasi={tasi}
              >
                {satir(oge, {
                  yukariAl: () => tasi(anahtari, "yukari"),
                  asagiAl: () => tasi(anahtari, "asagi"),
                  ilk: sira === 0,
                  son: sira === toplam - 1,
                })}
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
