
ALTER TABLE public.gamification_stats
  ADD COLUMN IF NOT EXISTS chest_cycle_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_chest_claim_date date;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_avatar text,
  ADD COLUMN IF NOT EXISTS equipped_frame text,
  ADD COLUMN IF NOT EXISTS equipped_title text;

CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('avatar','frame','title')),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  value text NOT NULL,
  price_coins integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_items_read_auth" ON public.shop_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_items_admin_write" ON public.shop_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.user_inventory (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
GRANT SELECT ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_self_read" ON public.user_inventory FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Seed shop items
INSERT INTO public.shop_items (type, code, name, value, price_coins, rarity, sort_order) VALUES
  ('avatar','av_default','Rookie Hero','🧑‍🎓',0,'common',1),
  ('avatar','av_knight','Knight','🛡️',150,'common',2),
  ('avatar','av_wizard','Wizard','🧙',200,'rare',3),
  ('avatar','av_ninja','Ninja','🥷',250,'rare',4),
  ('avatar','av_dragon','Dragon Rider','🐉',600,'epic',5),
  ('avatar','av_robot','Battle Bot','🤖',400,'rare',6),
  ('avatar','av_alien','Star Voyager','👽',500,'epic',7),
  ('avatar','av_crown','High King','👑',1500,'legendary',8),
  ('frame','fr_default','Plain','#475569',0,'common',1),
  ('frame','fr_blue','Sapphire','#2563EB',120,'common',2),
  ('frame','fr_purple','Amethyst','#7C3AED',180,'rare',3),
  ('frame','fr_gold','Golden','#FBBF24',500,'epic',4),
  ('frame','fr_emerald','Emerald','#10B981',250,'rare',5),
  ('frame','fr_fire','Inferno','linear-gradient(135deg,#EF4444,#FBBF24)',800,'epic',6),
  ('frame','fr_rainbow','Mythic','linear-gradient(135deg,#7C3AED,#EC4899,#FBBF24,#10B981)',2000,'legendary',7),
  ('title','ti_default','Hero','Hero',0,'common',1),
  ('title','ti_explorer','Explorer','Explorer',100,'common',2),
  ('title','ti_scholar','Scholar','Scholar',150,'common',3),
  ('title','ti_warrior','Warrior','Warrior',250,'rare',4),
  ('title','ti_champion','Champion','Champion',500,'epic',5),
  ('title','ti_legend','Legend','Legend',1500,'legendary',6),
  ('title','ti_grandmaster','Grandmaster','Grandmaster',3000,'legendary',7)
ON CONFLICT (code) DO NOTHING;
