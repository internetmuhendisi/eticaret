// Bilerek bozulmuş örnek: kapıya ortak işlev olmadan istek. Denetim bu dosyayı yakalamalıdır.
export const hesapDurumu = async () => (await fetch("/kapi/musteri/hesabim")).status;
