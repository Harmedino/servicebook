/** A stock photo from /public/photos. Sources and photographers are listed in public/photos/CREDITS.md. */
export interface StockPhoto {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

/** Every photo is a 3:2 shot exported from the full-size original to webp at these widths. */
const WIDTHS = [800, 1400, 2000];

function photo(file: string, alt: string): StockPhoto {
  return {
    src: `/photos/${file}-1400.webp`,
    srcSet: WIDTHS.map((width) => `/photos/${file}-${width}.webp ${width}w`).join(", "),
    width: 2000,
    height: 1333,
    alt,
  };
}

export const PHOTOS = {
  bookingOnPhone: photo("booking-on-phone", "A woman in a head wrap smiling at her phone while she books, sitting cross-legged on a sofa"),
  busyBarbershop: photo("busy-barbershop", "A busy barbershop: the barber is mid-cut while two more customers wait their turn"),
  braiding: photo("braiding", "Close-up of hands braiding a client's hair"),
  lashArtist: photo("lash-artist", "A lash artist placing lash extensions with tweezers"),
  barberMidCut: photo("barber-mid-cut", "A barber cutting a client's hair with clippers"),
  nailTech: photo("nail-tech", "A smiling client at the nail bar while her nails are done"),
  barberFade: photo("barber-fade", "A barber giving a young boy a fade with clippers"),
} satisfies Record<string, StockPhoto>;
