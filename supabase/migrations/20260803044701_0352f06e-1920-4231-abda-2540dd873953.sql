
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_type_check;
ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS shop_code text NOT NULL DEFAULT 'avatar_studio',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS release_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS shop_items_updated_at ON public.shop_items;
CREATE TRIGGER shop_items_updated_at BEFORE UPDATE ON public.shop_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_outfit text,
  ADD COLUMN IF NOT EXISTS equipped_nameplate text,
  ADD COLUMN IF NOT EXISTS equipped_theme text,
  ADD COLUMN IF NOT EXISTS equipped_celebration text,
  ADD COLUMN IF NOT EXISTS equipped_badge text;

GRANT SELECT ON public.shop_items TO authenticated;
GRANT ALL ON public.shop_items TO service_role;
GRANT SELECT ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;

INSERT INTO public.shop_items (shop_code, type, code, name, value, description, icon, price_coins, rarity, sort_order, enabled)
VALUES
  ('avatar_studio','avatar','mk_av_scholar','Scholar','🧑‍🎓','The classic Academy cadet look.','🧑‍🎓',0,'common',1,true),
  ('avatar_studio','avatar','mk_av_mage','Apprentice Mage','🧙','For cadets who study the arcane.','🧙',250,'rare',2,true),
  ('avatar_studio','avatar','mk_av_knight','Trial Knight','🤺','Earned by Master Trial hunters.','🤺',400,'epic',3,true),
  ('avatar_studio','avatar','mk_av_astronaut','Star Cadet','🧑‍🚀','Observatory expedition uniform.','🧑‍🚀',600,'epic',4,true),
  ('avatar_studio','avatar','mk_av_dragon','Dragon Heir','🐲','Legendary Academy bloodline.','🐲',1200,'legendary',5,true),
  ('avatar_studio','hair','mk_hair_wave','Wave Cut','💇','A neat Academy wave cut.','💇',120,'common',6,true),
  ('avatar_studio','hair','mk_hair_curls','Storm Curls','🧑‍🦱','Curls that never lose a duel.','🧑‍🦱',180,'rare',7,true),
  ('avatar_studio','glasses','mk_glass_round','Round Spectacles','👓','Sharpen your scholarly aura.','👓',150,'common',8,true),
  ('avatar_studio','glasses','mk_glass_shades','Rune Shades','🕶️','Cool under any Master Trial.','🕶️',320,'rare',9,true),

  ('outfit_boutique','uniform','mk_uni_classic','Classic Uniform','👔','Standard Ingenious Academy uniform.','👔',0,'common',1,true),
  ('outfit_boutique','uniform','mk_uni_royal','Royal Uniform','🥋','Reserved for high-rank cadets.','🥋',500,'epic',2,true),
  ('outfit_boutique','jacket','mk_jac_varsity','Varsity Jacket','🧥','Warm, bold and Academy-proud.','🧥',300,'rare',3,true),
  ('outfit_boutique','jacket','mk_jac_cloak','Rune Cloak','🧣','Woven with faint rune threads.','🧣',700,'epic',4,true),
  ('outfit_boutique','shoes','mk_sho_runner','Quest Runners','👟','Built for long learning journeys.','👟',200,'common',5,true),
  ('outfit_boutique','shoes','mk_sho_boots','Dungeon Boots','🥾','Trusted on every Dungeon floor.','🥾',350,'rare',6,true),
  ('outfit_boutique','hat','mk_hat_cap','Academy Cap','🧢','Everyday campus headwear.','🧢',150,'common',7,true),
  ('outfit_boutique','hat','mk_hat_wizard','Scholar Hat','🎓','Worn at graduation ceremonies.','🎓',450,'rare',8,true),
  ('outfit_boutique','backpack','mk_bag_satchel','Study Satchel','🎒','Holds all your quest notes.','🎒',220,'common',9,true),
  ('outfit_boutique','backpack','mk_bag_relic','Relic Pack','🧳','Carries relics from cleared Dungeons.','🧳',520,'epic',10,true),

  ('frame_studio','frame','mk_fr_bronze','Bronze Frame','linear-gradient(135deg,#b45309,#f59e0b)','A warm bronze profile frame.','🖼',150,'common',1,true),
  ('frame_studio','frame','mk_fr_silver','Silver Frame','linear-gradient(135deg,#94a3b8,#e2e8f0)','Polished silver for steady cadets.','🖼',300,'rare',2,true),
  ('frame_studio','frame','mk_fr_gold','Gold Frame','linear-gradient(135deg,#f59e0b,#fde68a)','Shine like a Hall of Fame hero.','🏵',650,'epic',3,true),
  ('frame_studio','frame','mk_fr_monarch','Monarch Frame','linear-gradient(135deg,#7c3aed,#22d3ee)','The rarest frame in the Academy.','👑',1400,'legendary',4,true),
  ('frame_studio','nameplate','mk_np_rune','Rune Nameplate','#22d3ee','Glowing rune-blue nameplate.','🔷',200,'common',5,true),
  ('frame_studio','nameplate','mk_np_ember','Ember Nameplate','#f97316','Burning ember nameplate.','🔶',380,'rare',6,true),
  ('frame_studio','theme','mk_th_dawn','Dawn Theme','radial-gradient(circle at 20% 0%, #f59e0b33, transparent 60%)','Soft dawn light behind your profile.','🌅',300,'rare',7,true),
  ('frame_studio','theme','mk_th_void','Void Theme','radial-gradient(circle at 80% 100%, #7c3aed44, transparent 60%)','Deep monarch void backdrop.','🌌',600,'epic',8,true),

  ('badge_gallery','badge','mk_bd_quill','Quill Badge','🪶','For dedicated note keepers.','🪶',180,'common',1,true),
  ('badge_gallery','badge','mk_bd_flame','Flame Badge','🔥','Streak keepers only.','🔥',360,'rare',2,true),
  ('badge_gallery','badge','mk_bd_crown','Crown Badge','👑','A badge worthy of legends.','👑',900,'legendary',3,true),
  ('badge_gallery','title','mk_ti_seeker','Knowledge Seeker','Knowledge Seeker','A title for the endlessly curious.','🎗️',250,'common',4,true),
  ('badge_gallery','title','mk_ti_trailblazer','Trailblazer','Trailblazer','First through every new Dungeon.','🎗️',500,'rare',5,true),
  ('badge_gallery','title','mk_ti_monarch','Academy Monarch','Academy Monarch','The Academy bows to you.','🎗️',1500,'legendary',6,true),

  ('celebration_workshop','effect','mk_ef_confetti','Confetti','confetti','Colourful confetti on every win.','🎊',200,'common',1,true),
  ('celebration_workshop','effect','mk_ef_stars','Golden Stars','stars','Golden stars rain on victory.','🌟',350,'rare',2,true),
  ('celebration_workshop','effect','mk_ef_sparkles','Sparkles','sparkles','Gentle sparkles follow rewards.','✨',300,'rare',3,true),
  ('celebration_workshop','effect','mk_ef_fireworks','Fireworks','fireworks','Full fireworks for Master Trials.','🎆',800,'epic',4,true)
ON CONFLICT (code) DO NOTHING;
