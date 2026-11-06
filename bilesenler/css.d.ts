// CSS modüllerinin türü. Uygulamada bunu Next.js'in kendi türleri sağlar.
declare module "*.module.css" {
  const siniflar: Record<string, string>;
  export default siniflar;
}
