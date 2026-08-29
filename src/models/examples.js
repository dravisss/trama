import publicExample from "../../seeds/sobrecarga-filas.public.json" with { type: "json" };

// The public catalog deliberately contains one anonymous, self-contained map
// and its canonical Presentation V2. User databases remain local and ignored.
export const examples = [publicExample];
