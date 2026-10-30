/**
 * The resource pages built here rather than extracted (client's October 2026
 * review). One record per page, read by the page itself and by the search
 * index, so a title or description is written once.
 *
 * Authored copy: npm run compare does not cover it.
 */
export interface ResourcePage {
  path: string;
  title: string;
  /** Meta description and hero lead. Keep under 160 characters. */
  description: string;
  hero: string;
  /** Not built and not listed: the page is on hold. */
  onHold?: boolean;
}

export const RECURSOS = {
  calculadora: {
    path: "/calculadora-de-cobertura/",
    title: "Calculadora de Cobertura",
    description:
      "Calcule los kilogramos de polvo que necesita a partir del área, el espesor de película y la eficiencia de transferencia.",
    hero: "/uploads/library/calculadora-de-cobertura-hero.jpg",
  },
  videos: {
    path: "/videos-de-demostracion/",
    title: "Videos de Demostración",
    description:
      "Consejos de aplicación de los técnicos de IFS: acabados lisos, texturizados, metálicos y efecto vena, y cómo sacar el mejor resultado de su horno.",
    hero: "/uploads/library/videos-de-demostracion-hero.jpg",
  },
  ebook: {
    path: "/guia-de-recubrimiento-en-polvo/",
    title: "E-Book: Guía de Recubrimiento en Polvo",
    description:
      "Una referencia completa para aplicadores de todos los niveles. Déjenos su correo electrónico y descargue la guía sin costo.",
    hero: "/uploads/library/guia-de-recubrimiento-en-polvo-hero.jpg",
    onHold: true,
  },
} satisfies Record<string, ResourcePage>;
