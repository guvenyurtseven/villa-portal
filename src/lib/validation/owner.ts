import { z } from "zod";

const E164 = /^\+[1-9]\d{1,14}$/;

export const OwnerCreateSchema = z.object({
  full_name: z.string().trim().min(3),
  phone: z.string().regex(E164, "Telefon E.164 formatında olmalı (örn: +905551112233)"),
  email: z.string().email().min(6),
});

export const OwnerUpdateSchema = OwnerCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "En az bir alan güncellenmelidir" },
);

export type OwnerCreateInput = z.infer<typeof OwnerCreateSchema>;
export type OwnerUpdateInput = z.infer<typeof OwnerUpdateSchema>;
