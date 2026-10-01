/** A stock photo from /public/photos, with the photographer it came from. */
export interface StockPhoto {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  credit: { name: string; url: string };
}

/** Every photo is a 3:2 Pexels shot exported to webp at a small and a large width. */
function pexels(file: string, [small, large]: [number, number], alt: string, photographer: string, id: number): StockPhoto {
  return {
    src: `/photos/${file}-${large}.webp`,
    srcSet: `/photos/${file}-${small}.webp ${small}w, /photos/${file}-${large}.webp ${large}w`,
    width: large,
    height: Math.round((large * 2) / 3),
    alt,
    credit: { name: photographer, url: `https://www.pexels.com/photo/${id}/` },
  };
}

export const PHOTOS = {
  bookingOnPhone: pexels(
    "booking-on-phone",
    [800, 1600],
    "A woman in a head wrap smiling at her phone while she books, sitting cross-legged on a sofa",
    "Diva Plavalaguna",
    5711715,
  ),
  busyBarbershop: pexels(
    "busy-barbershop",
    [1000, 2000],
    "A busy barbershop: the barber is mid-cut while two more customers wait their turn",
    "RDNE Stock project",
    7697655,
  ),
  braiding: pexels("braiding", [700, 1200], "Close-up of hands braiding a client's hair", "Gabriel Frank", 11482128),
  lashArtist: pexels("lash-artist", [700, 1200], "A lash artist placing lash extensions with tweezers", "RDNE Stock project", 7755525),
  barberMidCut: pexels("barber-mid-cut", [700, 1200], "A barber cutting a client's hair with clippers", "RDNE Stock project", 7697644),
  nailTech: pexels("nail-tech", [700, 1200], "A smiling client at the nail bar while her nails are done", "RDNE Stock project", 7755248),
  barberFade: pexels("barber-fade", [700, 1200], "A barber giving a young boy a fade with clippers", "RDNE Stock project", 7697673),
} satisfies Record<string, StockPhoto>;
