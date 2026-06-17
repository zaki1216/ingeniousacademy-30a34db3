
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_type_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_type_check
  CHECK (type IN ('avatar','frame','title','theme','name_color','badge','seasonal','shadow_skin','pet_skin','effect'));
