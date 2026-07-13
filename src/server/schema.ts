import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

export const incomingPunchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve essere YYYY-MM-DD"),
  punches: z.array(
    z.object({
      time: z.string().regex(timeRegex, "Orario deve essere HH:MM"),
      direction: z.enum(["IN", "OUT"]),
    })
  ).min(1, "Almeno una timbratura richiesta"),
});

export type IncomingPunch = z.infer<typeof incomingPunchSchema>;
