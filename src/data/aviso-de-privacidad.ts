/**
 * The facts the aviso de privacidad rests on, written once and read by the
 * integral notice (/aviso-de-privacidad/) and the simplified notice under each
 * form (LFPDPPP 2025, arts. 15 and 16).
 *
 * AUTHORED, and NOT YET CONFIRMED BY THE CLIENT. The responsible party and the
 * domicile are the ones the old site's privacy policy names; the client must
 * confirm the legal name (razón social) of the entity that receives the form
 * submissions, and that this address is its domicile, before launch.
 */
export const AVISO = {
  path: "/aviso-de-privacidad/",
  title: "Aviso de Privacidad",
  description:
    "Cómo IFS Coatings trata los datos personales que recaba a través de este sitio, con qué finalidades y cómo ejercer sus derechos ARCO.",
  /** Shown on the notice and bumped whenever its substance changes. */
  updated: "30 de octubre de 2026",
  responsable: "IFS Coatings Internacional, Inc.",
  domicilio: "Médanos No. 169, Colonia Las Águilas, Ciudad de México, C.P. 01710",
  /** The address that receives ARCO requests and opt-outs. */
  email: "revestimientosinfo@ifscoatings.com",
  phone: { label: "+52 55 4166 2665", href: "tel:+525541662665" },
} as const;
