// Bilerek bozulmuş örnek: kapıya pencerenin isteğiyle, ortak işlev olmadan istek. Denetim bu dosyayı
// yakalamalıdır.
export const sepet = async () => (await window.fetch("/kapi/herkese-acik/sepet")).ok;
