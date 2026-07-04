import { z } from 'zod';

export const collectPageSchema = z.object({
  uid: z.string().regex(/^[1-9]\d{0,19}$/),
  pageNum: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  keyword: z.string().trim().optional(),
  start_dt: z.string().regex(/^\d{8}$/).optional(),
  end_dt: z.string().regex(/^\d{8}$/).optional(),
  projectId: z.string().optional(),
});

export type CollectPageInput = z.infer<typeof collectPageSchema>;

