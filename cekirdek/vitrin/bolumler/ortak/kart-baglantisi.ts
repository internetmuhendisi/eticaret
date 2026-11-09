// Kartın tamamına yayılan bağlantı (kart 0110; ürün kartındaki yol, kart 0109): bağlantının ::after öğesi kartın
// üstüne yayılır, kart relative olmalıdır. Odak çerçevesi kartın kenarının içinde görünür, yazının rengindedir
// (renkli zeminde de okunur).
export const kartBaglantisi =
  "text-inherit no-underline after:absolute after:inset-0 after:rounded-orta hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-current focus-visible:after:outline-solid";
