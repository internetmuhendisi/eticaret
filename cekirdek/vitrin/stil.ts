// Vitrinin hesap sayfalarının sade düzeni (kart 0033). Vitrin tasarımı tema kartlarında yapılır; burada
// yalnız tasarım değerlerinin adlarıyla yazılmış Tailwind sınıfları vardır (karar 0076). Sayfa önce
// telefonda düzgün durur.
export const stil = {
  icerik: "mx-auto flex w-full max-w-form flex-col gap-4 p-4",
  form: "flex flex-col gap-4",
  hesapAlani: "flex flex-wrap items-center justify-end gap-x-4 gap-y-2 p-4",
  eposta: "wrap-anywhere",
} as const;
