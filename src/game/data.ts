import {
  BackblingDef,
  EmoteDef,
  FriendEntry,
  GliderDef,
  PickaxeDef,
  PlayerProfile,
  PoiInfo,
  RankDivision,
  RarityId,
  SkinDef,
  TournamentDef,
  VehicleModelDef,
  VehicleSkinDef,
} from './types';

export const WORLD_RADIUS = 360;
export const STARTER_ISLAND_CENTER = { x: -460, z: -460, radius: 52 };
export const GRID_SIZE = 4.8;
export const WALL_HEIGHT = 4.2;

export const RARITY_COLORS: Record<RarityId, { hex: number; css: string; gradient: string; mult: number }> = {
  common: { hex: 0x94a3b8, css: '#94a3b8', gradient: 'linear-gradient(155deg,#475569,#1e293b)', mult: 1.0 },
  uncommon: { hex: 0x4ade80, css: '#4ade80', gradient: 'linear-gradient(155deg,#15803d,#052e16)', mult: 1.1 },
  rare: { hex: 0x38bdf8, css: '#38bdf8', gradient: 'linear-gradient(155deg,#0284c7,#0c4a6e)', mult: 1.22 },
  epic: { hex: 0xc084fc, css: '#c084fc', gradient: 'linear-gradient(155deg,#7e22ce,#2e1065)', mult: 1.35 },
  legendary: { hex: 0xfacc15, css: '#facc15', gradient: 'linear-gradient(155deg,#ca8a04,#451a03)', mult: 1.5 },
};

export const RARITY_LIST: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const SKINS: SkinDef[] = [
  {
    id: 'vanguard',
    nameRu: 'Штурмовик Дельта',
    nameEn: 'Delta Vanguard',
    rarity: 'common',
    price: 0,
    headgear: 'cap',
    backbling: 'pack',
    styles: [
      { id: 'cobalt', nameRu: 'Кобальт', nameEn: 'Cobalt', primary: 0x2563eb, secondary: 0x1e293b, accent: 0xfacc15, visor: 0x38bdf8, hair: 0xf59e0b, pack: 0x475569, swatch: 'linear-gradient(135deg,#2563eb,#1e293b)' },
      { id: 'crimson', nameRu: 'Алый отряд', nameEn: 'Crimson Squad', primary: 0xdc2626, secondary: 0x18181b, accent: 0xfef08a, visor: 0xf97316, hair: 0x27272a, pack: 0x7f1d1d, swatch: 'linear-gradient(135deg,#dc2626,#18181b)' },
    ],
  },
  {
    id: 'ranger',
    nameRu: 'Лесной Следопыт',
    nameEn: 'Forest Pathfinder',
    rarity: 'uncommon',
    price: 0,
    headgear: 'goggles',
    backbling: 'pack',
    styles: [
      { id: 'moss', nameRu: 'Хвоя', nameEn: 'Pine Moss', primary: 0x16a34a, secondary: 0x3f3f46, accent: 0x84cc16, visor: 0xfacc15, hair: 0x78350f, pack: 0x14532d, swatch: 'linear-gradient(135deg,#16a34a,#3f3f46)' },
      { id: 'arctic', nameRu: 'Арктика', nameEn: 'Arctic Camo', primary: 0xe2e8f0, secondary: 0x475569, accent: 0x38bdf8, visor: 0x0284c7, hair: 0x334155, pack: 0x94a3b8, swatch: 'linear-gradient(135deg,#e2e8f0,#0284c7)' },
    ],
  },
  {
    id: 'drift_kitsune',
    nameRu: 'Неон Кицунэ',
    nameEn: 'Neon Kitsune',
    rarity: 'rare',
    price: 80,
    headgear: 'mask',
    backbling: 'katana',
    styles: [
      { id: 'pink', nameRu: 'Кибер-розовый', nameEn: 'Cyber Pink', primary: 0xec4899, secondary: 0x18181b, accent: 0x38bdf8, visor: 0x67e8f9, hair: 0xfef08a, pack: 0xf472b6, swatch: 'linear-gradient(135deg,#ec4899,#38bdf8)' },
      { id: 'violet', nameRu: 'Полуночный неон', nameEn: 'Midnight Neon', primary: 0x7c3aed, secondary: 0x0f172a, accent: 0xf43f5e, visor: 0xa855f7, hair: 0xe2e8f0, pack: 0x4c1d95, swatch: 'linear-gradient(135deg,#7c3aed,#f43f5e)' },
    ],
  },
  {
    id: 'frost_raven',
    nameRu: 'Ледяной Ворон',
    nameEn: 'Frost Raven',
    rarity: 'epic',
    price: 120,
    headgear: 'hood',
    backbling: 'wings',
    styles: [
      { id: 'glacier', nameRu: 'Ледник', nameEn: 'Glacier', primary: 0x0284c7, secondary: 0x0f172a, accent: 0x67e8f9, visor: 0x38bdf8, hair: 0x0f172a, pack: 0x0ea5e9, swatch: 'linear-gradient(135deg,#0284c7,#67e8f9)' },
      { id: 'shadow', nameRu: 'Сумрак', nameEn: 'Shadow Plum', primary: 0x4c1d95, secondary: 0x090d16, accent: 0xc084fc, visor: 0xe879f9, hair: 0x1e1b4b, pack: 0x6d28d9, swatch: 'linear-gradient(135deg,#4c1d95,#c084fc)' },
    ],
  },
  {
    id: 'cyber_omega',
    nameRu: 'Титан Омега',
    nameEn: 'Titan Omega',
    rarity: 'epic',
    price: 150,
    headgear: 'cyber_helm',
    backbling: 'jetpack',
    styles: [
      { id: 'ember', nameRu: 'Уголь и пламя', nameEn: 'Ember Core', primary: 0x111827, secondary: 0x090d16, accent: 0xef4444, visor: 0xf97316, hair: 0x111827, pack: 0xdc2626, swatch: 'linear-gradient(135deg,#111827,#ef4444)' },
      { id: 'emerald', nameRu: 'Матрица', nameEn: 'Matrix Green', primary: 0x0f172a, secondary: 0x020617, accent: 0x22c55e, visor: 0x4ade80, hair: 0x0f172a, pack: 0x16a34a, swatch: 'linear-gradient(135deg,#0f172a,#22c55e)' },
    ],
  },
  {
    id: 'oni_samurai',
    nameRu: 'Демон Самурай',
    nameEn: 'Oni Ronin',
    rarity: 'rare',
    price: 100,
    headgear: 'horns',
    backbling: 'shield',
    styles: [
      { id: 'scarlet', nameRu: 'Алый ронин', nameEn: 'Scarlet Oni', primary: 0xb91c1c, secondary: 0x1c1917, accent: 0xfacc15, visor: 0xfef08a, hair: 0x18181b, pack: 0x991b1b, swatch: 'linear-gradient(135deg,#b91c1c,#facc15)' },
      { id: 'jade', nameRu: 'Нефрит', nameEn: 'Jade Spirit', primary: 0x0f766e, secondary: 0x1e293b, accent: 0x2dd4bf, visor: 0x5eead4, hair: 0x0f172a, pack: 0x115e59, swatch: 'linear-gradient(135deg,#0f766e,#2dd4bf)' },
    ],
  },
  {
    id: 'golden_midas',
    nameRu: 'Король Мидас',
    nameEn: 'Sovereign Midas',
    rarity: 'legendary',
    price: 220,
    headgear: 'crown',
    backbling: 'cape',
    styles: [
      { id: 'gold', nameRu: 'Чистое золото', nameEn: 'Pure Gold', primary: 0xfacc15, secondary: 0x1e293b, accent: 0xfef08a, visor: 0xf59e0b, hair: 0xfef9c3, pack: 0xb45309, swatch: 'linear-gradient(135deg,#fde047,#b45309)' },
      { id: 'obsidian', nameRu: 'Обсидиан', nameEn: 'Obsidian Crown', primary: 0x1e293b, secondary: 0x090d16, accent: 0xfacc15, visor: 0xfde047, hair: 0xe2e8f0, pack: 0xfacc15, swatch: 'linear-gradient(135deg,#1e293b,#facc15)' },
    ],
  },
  {
    id: 'astral_nova',
    nameRu: 'Звёздный Странник',
    nameEn: 'Astral Voyager',
    rarity: 'legendary',
    price: 280,
    headgear: 'visor',
    backbling: 'wings',
    styles: [
      { id: 'nebula', nameRu: 'Туманность', nameEn: 'Cosmic Nebula', primary: 0x6d28d9, secondary: 0x1e1b4b, accent: 0x38bdf8, visor: 0x67e8f9, hair: 0x38bdf8, pack: 0xc084fc, swatch: 'linear-gradient(135deg,#6d28d9,#38bdf8)' },
      { id: 'supernova', nameRu: 'Сверхновая', nameEn: 'Solar Flare', primary: 0xea580c, secondary: 0x31102f, accent: 0xfde047, visor: 0xfef08a, hair: 0xf97316, pack: 0xfacc15, swatch: 'linear-gradient(135deg,#ea580c,#fde047)' },
    ],
  },
  // Added 6 More Fortnite-Style Shop Skins
  {
    id: 'crimson_phoenix',
    nameRu: 'Алый Феникс',
    nameEn: 'Crimson Phoenix',
    rarity: 'epic',
    price: 160,
    headgear: 'hood',
    backbling: 'wings',
    styles: [
      { id: 'flame', nameRu: 'Жар-Птица', nameEn: 'Solar Flame', primary: 0xdc2626, secondary: 0x292524, accent: 0xfb923c, visor: 0xfef08a, hair: 0xf97316, pack: 0xea580c, swatch: 'linear-gradient(135deg,#dc2626,#fb923c)' },
      { id: 'bluefire', nameRu: 'Синий Пламень', nameEn: 'Blue Ember', primary: 0x0369a1, secondary: 0x0f172a, accent: 0x38bdf8, visor: 0xe0f2fe, hair: 0x7dd3fc, pack: 0x0284c7, swatch: 'linear-gradient(135deg,#0369a1,#38bdf8)' },
    ],
  },
  {
    id: 'mecha_strike',
    nameRu: 'Меха-Командир',
    nameEn: 'Mecha Strike',
    rarity: 'legendary',
    price: 250,
    headgear: 'cyber_helm',
    backbling: 'jetpack',
    styles: [
      { id: 'titan', nameRu: 'Белый Мех', nameEn: 'Titan White', primary: 0xf1f5f9, secondary: 0x1e293b, accent: 0xef4444, visor: 0x38bdf8, hair: 0x64748b, pack: 0x3b82f6, swatch: 'linear-gradient(135deg,#f1f5f9,#ef4444)' },
      { id: 'stealth', nameRu: 'Ночной Стелс', nameEn: 'Night Stealth', primary: 0x18181b, secondary: 0x09090b, accent: 0x22d3ee, visor: 0x67e8f9, hair: 0x27272a, pack: 0x0e7490, swatch: 'linear-gradient(135deg,#18181b,#22d3ee)' },
    ],
  },
  {
    id: 'neon_skater',
    nameRu: 'Неон-Райдер',
    nameEn: 'Neon Skater',
    rarity: 'uncommon',
    price: 65,
    headgear: 'cap',
    backbling: 'pack',
    styles: [
      { id: 'lime', nameRu: 'Кислотный', nameEn: 'Acid Lime', primary: 0x84cc16, secondary: 0x18181b, accent: 0xec4899, visor: 0x22d3ee, hair: 0xfef08a, pack: 0x4d7c0f, swatch: 'linear-gradient(135deg,#84cc16,#ec4899)' },
      { id: 'berry', nameRu: 'Ягодный Драйв', nameEn: 'Berry Pop', primary: 0xe11d48, secondary: 0x1e1b4b, accent: 0x38bdf8, visor: 0xfde047, hair: 0xfda4af, pack: 0x9f1239, swatch: 'linear-gradient(135deg,#e11d48,#38bdf8)' },
    ],
  },
  {
    id: 'shadow_assassin',
    nameRu: 'Теневой Клинок',
    nameEn: 'Shadow Blade',
    rarity: 'rare',
    price: 110,
    headgear: 'mask',
    backbling: 'katana',
    styles: [
      { id: 'midnight', nameRu: 'Полуночный', nameEn: 'Midnight', primary: 0x1e1b4b, secondary: 0x020617, accent: 0x8b5cf6, visor: 0xc084fc, hair: 0x312e81, pack: 0x4c1d95, swatch: 'linear-gradient(135deg,#1e1b4b,#8b5cf6)' },
      { id: 'bloodmoon', nameRu: 'Кровавая Луна', nameEn: 'Blood Moon', primary: 0x27272a, secondary: 0x09090b, accent: 0xf43f5e, visor: 0xfb7185, hair: 0x18181b, pack: 0x881337, swatch: 'linear-gradient(135deg,#27272a,#f43f5e)' },
    ],
  },
  {
    id: 'lava_titan',
    nameRu: 'Вулканический Лорд',
    nameEn: 'Molten Lord',
    rarity: 'epic',
    price: 175,
    headgear: 'horns',
    backbling: 'shield',
    styles: [
      { id: 'magma', nameRu: 'Магма', nameEn: 'Magma Core', primary: 0x292524, secondary: 0x1c1917, accent: 0xf97316, visor: 0xfacc15, hair: 0x44403c, pack: 0xea580c, swatch: 'linear-gradient(135deg,#292524,#f97316)' },
      { id: 'frozen', nameRu: 'Вечная Мерзлота', nameEn: 'Permafrost', primary: 0x0f172a, secondary: 0x082f49, accent: 0x38bdf8, visor: 0xa5f3fc, hair: 0x334155, pack: 0x0284c7, swatch: 'linear-gradient(135deg,#0f172a,#38bdf8)' },
    ],
  },
  {
    id: 'storm_wizard',
    nameRu: 'Маг Бури',
    nameEn: 'Storm Arcanist',
    rarity: 'rare',
    price: 115,
    headgear: 'goggles',
    backbling: 'prism',
    styles: [
      { id: 'storm', nameRu: 'Грозовой', nameEn: 'Tempest', primary: 0x7e22ce, secondary: 0x1e1b4b, accent: 0xfde047, visor: 0xe879f9, hair: 0xe2e8f0, pack: 0xa855f7, swatch: 'linear-gradient(135deg,#7e22ce,#fde047)' },
      { id: 'emerald_mage', nameRu: 'Изумрудный', nameEn: 'Emerald Arcane', primary: 0x047857, secondary: 0x064e3b, accent: 0x34d399, visor: 0xa7f3d0, hair: 0xd1fae5, pack: 0x059669, swatch: 'linear-gradient(135deg,#047857,#34d399)' },
    ],
  },
  // 3 Exclusive Tournament Reward Skins (Unlocked ONLY by winning tournaments!)
  {
    id: 'cup_valkyrie',
    nameRu: 'Валькирия Кубка',
    nameEn: 'Cup Valkyrie',
    rarity: 'legendary',
    price: 0,
    tournamentRewardId: 'island_cup',
    headgear: 'visor',
    backbling: 'wings',
    styles: [
      { id: 'tribute', nameRu: 'Трофей Острова', nameEn: 'Island Trophy', primary: 0x0ea5e9, secondary: 0x0f172a, accent: 0xfacc15, visor: 0xfef08a, hair: 0xf8fafc, pack: 0xf59e0b, swatch: 'linear-gradient(135deg,#0ea5e9,#facc15)' },
      { id: 'dark_valk', nameRu: 'Тёмное Золото', nameEn: 'Dark Gold', primary: 0x1e293b, secondary: 0x090d16, accent: 0xfde047, visor: 0x38bdf8, hair: 0xe2e8f0, pack: 0xfacc15, swatch: 'linear-gradient(135deg,#1e293b,#fde047)' },
    ],
  },
  {
    id: 'cup_blitz_phantom',
    nameRu: 'Блиц-Фантом',
    nameEn: 'Blitz Phantom',
    rarity: 'legendary',
    price: 0,
    tournamentRewardId: 'blitz_royale',
    headgear: 'cyber_helm',
    backbling: 'katana',
    styles: [
      { id: 'hyper', nameRu: 'Гипер-Импульс', nameEn: 'Hyper Surge', primary: 0xf97316, secondary: 0x18181b, accent: 0xfef08a, visor: 0x38bdf8, hair: 0xfdba74, pack: 0xea580c, swatch: 'linear-gradient(135deg,#f97316,#38bdf8)' },
      { id: 'void', nameRu: 'Пустота', nameEn: 'Void Pulse', primary: 0x312e81, secondary: 0x09090b, accent: 0xf43f5e, visor: 0x22d3ee, hair: 0xa5b4fc, pack: 0xe11d48, swatch: 'linear-gradient(135deg,#312e81,#f43f5e)' },
    ],
  },
  {
    id: 'cup_crown_emperor',
    nameRu: 'Император Короны',
    nameEn: 'Crown Sovereign',
    rarity: 'legendary',
    price: 0,
    tournamentRewardId: 'crown_series',
    headgear: 'crown',
    backbling: 'cape',
    styles: [
      { id: 'imperial', nameRu: 'Имперский', nameEn: 'Imperial Aura', primary: 0x7c3aed, secondary: 0x0f172a, accent: 0xfacc15, visor: 0x67e8f9, hair: 0xfef08a, pack: 0xc084fc, swatch: 'linear-gradient(135deg,#7c3aed,#facc15)' },
      { id: 'platinum', nameRu: 'Платина', nameEn: 'Platinum King', primary: 0xe2e8f0, secondary: 0x1e293b, accent: 0x38bdf8, visor: 0x7dd3fc, hair: 0xf8fafc, pack: 0x0ea5e9, swatch: 'linear-gradient(135deg,#e2e8f0,#38bdf8)' },
    ],
  },
];

export const PICKAXES: PickaxeDef[] = [
  { id: 'default_axe', nameRu: 'Стандартная кирка', nameEn: 'Standard Pick', rarity: 'common', price: 0, style: 'classic', primary: 0x94a3b8, accent: 0x475569, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#94a3b8,#334155)' },
  { id: 'neon_scythe', nameRu: 'Неоновая Коса', nameEn: 'Neon Scythe', rarity: 'rare', price: 75, style: 'scythe', primary: 0xec4899, accent: 0x18181b, glow: 0x22d3ee, swatch: 'linear-gradient(135deg,#ec4899,#22d3ee)' },
  { id: 'frost_halberd', nameRu: 'Ледяная Алебарда', nameEn: 'Frost Halberd', rarity: 'epic', price: 110, style: 'halberd', primary: 0x38bdf8, accent: 0x0f172a, glow: 0x67e8f9, swatch: 'linear-gradient(135deg,#0284c7,#a5f3fc)' },
  { id: 'midas_scepter', nameRu: 'Золотой Скипетр', nameEn: 'Midas Scepter', rarity: 'legendary', price: 165, style: 'scepter', primary: 0xfacc15, accent: 0x1e293b, glow: 0xfef08a, swatch: 'linear-gradient(135deg,#fde047,#b45309)' },
  { id: 'plasma_hammer', nameRu: 'Плазмо-Молот', nameEn: 'Plasma Crusher', rarity: 'epic', price: 130, style: 'hammer', primary: 0x7c3aed, accent: 0x18181b, glow: 0xc084fc, swatch: 'linear-gradient(135deg,#7c3aed,#f43f5e)' },
  { id: 'katana_edge', nameRu: 'Энерго-Катана', nameEn: 'Cyber Blade', rarity: 'rare', price: 90, style: 'katana', primary: 0xef4444, accent: 0x0f172a, glow: 0xf97316, swatch: 'linear-gradient(135deg,#ef4444,#facc15)' },
];

export const GLIDERS: GliderDef[] = [
  { id: 'default_chute', nameRu: 'Десантный Купол', nameEn: 'Drop Canopy', rarity: 'common', price: 0, style: 'classic', primary: 0x2563eb, accent: 0xfacc15, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#2563eb,#facc15)' },
  { id: 'cyber_wing', nameRu: 'Кибер-Крыло', nameEn: 'Cyber Wing', rarity: 'rare', price: 85, style: 'wings', primary: 0xec4899, accent: 0x18181b, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#ec4899,#38bdf8)' },
  { id: 'stealth_jet', nameRu: 'Стелс-Истребитель', nameEn: 'Stealth Jet', rarity: 'epic', price: 140, style: 'jet', primary: 0x1e293b, accent: 0x0284c7, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#0f172a,#38bdf8)' },
  { id: 'solar_sail', nameRu: 'Солнечный Парус', nameEn: 'Solar Sail', rarity: 'legendary', price: 190, style: 'sail', primary: 0xfacc15, accent: 0x78350f, glow: 0xfef08a, swatch: 'linear-gradient(135deg,#fde047,#ea580c)' },
  { id: 'galactic_manta', nameRu: 'Галактический Скат', nameEn: 'Astral Manta', rarity: 'epic', price: 150, style: 'manta', primary: 0x6d28d9, accent: 0x1e1b4b, glow: 0xc084fc, swatch: 'linear-gradient(135deg,#6d28d9,#67e8f9)' },
  { id: 'dragon_glide', nameRu: 'Крылья Дракона', nameEn: 'Dragon Glider', rarity: 'legendary', price: 210, style: 'dragon', primary: 0xb91c1c, accent: 0x1c1917, glow: 0xf97316, swatch: 'linear-gradient(135deg,#b91c1c,#f97316)' },
];

export const BACKBLINGS: BackblingDef[] = [
  { id: 'skin_default', nameRu: 'По стилю скина', nameEn: 'Match Skin', rarity: 'common', price: 0, style: 'skin_default', primary: 0x475569, accent: 0x94a3b8, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#475569,#94a3b8)' },
  { id: 'neon_wings', nameRu: 'Неоновые Крылья', nameEn: 'Neon Wings', rarity: 'epic', price: 115, style: 'wings', primary: 0xec4899, accent: 0x38bdf8, glow: 0x67e8f9, swatch: 'linear-gradient(135deg,#ec4899,#38bdf8)' },
  { id: 'royal_cape', nameRu: 'Королевский Плащ', nameEn: 'Royal Cape', rarity: 'rare', price: 80, style: 'cape', primary: 0xb91c1c, accent: 0xfacc15, glow: 0xfde047, swatch: 'linear-gradient(135deg,#b91c1c,#facc15)' },
  { id: 'rocket_jetpack', nameRu: 'Турбо-Ранец', nameEn: 'Turbo Jetpack', rarity: 'epic', price: 125, style: 'jetpack', primary: 0x1e293b, accent: 0xf97316, glow: 0x38bdf8, swatch: 'linear-gradient(135deg,#1e293b,#f97316)' },
  { id: 'ronin_katana', nameRu: 'Парные Катаны', nameEn: 'Ronin Katana', rarity: 'rare', price: 90, style: 'katana', primary: 0x18181b, accent: 0xf43f5e, glow: 0xfacc15, swatch: 'linear-gradient(135deg,#18181b,#f43f5e)' },
  { id: 'aegis_shield', nameRu: 'Щит Эгиды', nameEn: 'Aegis Shield', rarity: 'rare', price: 95, style: 'shield', primary: 0x0284c7, accent: 0xfacc15, glow: 0x67e8f9, swatch: 'linear-gradient(135deg,#0284c7,#facc15)' },
  { id: 'crystal_core', nameRu: 'Кристалл Бури', nameEn: 'Storm Prism', rarity: 'legendary', price: 170, style: 'prism', primary: 0x7c3aed, accent: 0x38bdf8, glow: 0xe879f9, swatch: 'linear-gradient(135deg,#7c3aed,#38bdf8)' },
];

export const VEHICLE_MODELS: VehicleModelDef[] = [
  { id: 'sports', nameRu: 'Спорткар «Октайн»', nameEn: 'Octane Coupe', maxSpeed: 38, boostSpeed: 54, accel: 30, turnRate: 2.35, maxHp: 350 },
  { id: 'suv', nameRu: 'Внедорожник «Титан»', nameEn: 'Titan 4x4 SUV', maxSpeed: 31, boostSpeed: 44, accel: 24, turnRate: 1.9, maxHp: 600 },
  { id: 'buggy', nameRu: 'Багги «Дюна»', nameEn: 'Dune Raider Buggy', maxSpeed: 35, boostSpeed: 50, accel: 34, turnRate: 2.75, maxHp: 280 },
];

export const VEHICLE_SKINS: VehicleSkinDef[] = [
  { id: 'rally_blue', nameRu: 'Гоночный Синий', nameEn: 'Rally Blue', rarity: 'common', price: 0, bodyColor: 0x2563eb, stripeColor: 0xfacc15, trimColor: 0x0f172a, rimColor: 0xe2e8f0, neonColor: 0x38bdf8, swatch: 'linear-gradient(135deg,#2563eb,#facc15)' },
  { id: 'inferno', nameRu: 'Пламя Улиц', nameEn: 'Street Inferno', rarity: 'uncommon', price: 60, bodyColor: 0xdc2626, stripeColor: 0xf97316, trimColor: 0x18181b, rimColor: 0xfef08a, neonColor: 0xf97316, swatch: 'linear-gradient(135deg,#dc2626,#f97316)' },
  { id: 'cyber_pink', nameRu: 'Неон Токио', nameEn: 'Tokyo Drift', rarity: 'rare', price: 95, bodyColor: 0x1e1b4b, stripeColor: 0xec4899, trimColor: 0x090d16, rimColor: 0x38bdf8, neonColor: 0xec4899, swatch: 'linear-gradient(135deg,#1e1b4b,#ec4899)' },
  { id: 'toxic_lime', nameRu: 'Кислотный Шторм', nameEn: 'Acid Surge', rarity: 'rare', price: 95, bodyColor: 0x16a34a, stripeColor: 0xa3e635, trimColor: 0x18181b, rimColor: 0x84cc16, neonColor: 0x4ade80, swatch: 'linear-gradient(135deg,#16a34a,#a3e635)' },
  { id: 'arctic_ghost', nameRu: 'Белый Призрак', nameEn: 'Arctic Ghost', rarity: 'epic', price: 140, bodyColor: 0xf8fafc, stripeColor: 0x0284c7, trimColor: 0x334155, rimColor: 0x38bdf8, neonColor: 0x67e8f9, swatch: 'linear-gradient(135deg,#f8fafc,#0284c7)' },
  { id: 'gold_lux', nameRu: 'Золотой Хром', nameEn: 'Midas Chrome', rarity: 'legendary', price: 200, bodyColor: 0xfacc15, stripeColor: 0x18181b, trimColor: 0x090d16, rimColor: 0xfef08a, neonColor: 0xfacc15, swatch: 'linear-gradient(135deg,#fde047,#18181b)' },
];

export const EMOTES: EmoteDef[] = [
  { id: 'floss', nameRu: 'Флосс-Дэнс', nameEn: 'The Floss', rarity: 'uncommon', price: 0, icon: '🕺', tempo: 6.5, descRu: 'Классические махи руками по бокам', descEn: 'Classic rhythmic arm swing dance' },
  { id: 'boogie', nameRu: 'Победный Буги', nameEn: 'Victory Boogie', rarity: 'common', price: 0, icon: '🎉', tempo: 5.2, descRu: 'Энергичный танец с хлопками', descEn: 'Upbeat bounce & clap groove' },
  { id: 'robot', nameRu: 'Робот-Синхрон', nameEn: 'Servo Robot', rarity: 'rare', price: 50, icon: '🤖', tempo: 4.0, descRu: 'Механические резкие движения', descEn: 'Sharp hydraulic robot poses' },
  { id: 'breakdance', nameRu: 'Звёздный Спин', nameEn: 'Star Spin', rarity: 'epic', price: 90, icon: '🌀', tempo: 7.5, descRu: 'Вращение на 360° и прыжок', descEn: '360° spin & high-energy hop' },
  { id: 'salute', nameRu: 'Салют Чемпиона', nameEn: 'Champion Salute', rarity: 'rare', price: 65, icon: '🫡', tempo: 3.0, descRu: 'Торжественная стойка победителя', descEn: 'Heroic victory salute stance' },
  { id: 'hyper_jump', nameRu: 'Гипер-Флекс', nameEn: 'Hyper Bounce', rarity: 'legendary', price: 130, icon: '⚡', tempo: 8.0, descRu: 'Акробатический ритм со вспышкой', descEn: 'Acrobatic power bounce' },
];

export const RANK_DIVISIONS: RankDivision[] = [
  { id: 'bronze_1', nameRu: 'Бронза I', nameEn: 'Bronze I', minRp: 0, color: '#cd7f32', badgeBg: 'linear-gradient(135deg,#78350f,#b45309)' },
  { id: 'bronze_2', nameRu: 'Бронза II', nameEn: 'Bronze II', minRp: 200, color: '#d97706', badgeBg: 'linear-gradient(135deg,#92400e,#d97706)' },
  { id: 'silver_1', nameRu: 'Серебро I', nameEn: 'Silver I', minRp: 450, color: '#cbd5e1', badgeBg: 'linear-gradient(135deg,#475569,#94a3b8)' },
  { id: 'silver_2', nameRu: 'Серебро II', nameEn: 'Silver II', minRp: 750, color: '#e2e8f0', badgeBg: 'linear-gradient(135deg,#64748b,#cbd5e1)' },
  { id: 'gold_1', nameRu: 'Золото I', nameEn: 'Gold I', minRp: 1100, color: '#facc15', badgeBg: 'linear-gradient(135deg,#a16207,#facc15)' },
  { id: 'gold_2', nameRu: 'Золото II', nameEn: 'Gold II', minRp: 1500, color: '#fde047', badgeBg: 'linear-gradient(135deg,#ca8a04,#fde047)' },
  { id: 'platinum', nameRu: 'Платина', nameEn: 'Platinum', minRp: 2000, color: '#38bdf8', badgeBg: 'linear-gradient(135deg,#0369a1,#38bdf8)' },
  { id: 'diamond', nameRu: 'Алмаз', nameEn: 'Diamond', minRp: 2600, color: '#67e8f9', badgeBg: 'linear-gradient(135deg,#0891b2,#67e8f9)' },
  { id: 'elite', nameRu: 'Элита', nameEn: 'Elite', minRp: 3300, color: '#c084fc', badgeBg: 'linear-gradient(135deg,#6b21a8,#c084fc)' },
  { id: 'champion', nameRu: 'Чемпион', nameEn: 'Champion', minRp: 4100, color: '#f43f5e', badgeBg: 'linear-gradient(135deg,#9f1239,#f43f5e)' },
  { id: 'unreal', nameRu: 'Нереальный', nameEn: 'Unreal', minRp: 5000, color: '#fef08a', badgeBg: 'linear-gradient(135deg,#7c3aed,#facc15)' },
];

export const TOURNAMENTS: TournamentDef[] = [
  {
    id: 'island_cup',
    nameRu: 'Кубок Острова Стихий',
    nameEn: 'Elemental Island Cup',
    descRu: 'Победа: +40 оч. | Топ-5: +20 оч. | Убийство: +5 оч.',
    descEn: 'Win: +40 pts | Top 5: +20 pts | Elim: +5 pts',
    winBonus: 40,
    top5Bonus: 20,
    killPoints: 5,
    prizeTokens: 150,
    rewardSkinId: 'cup_valkyrie',
    color: '#facc15',
    entries: [
      { name: 'CyberKitsune_EU', points: 145, wins: 2, kills: 13 },
      { name: 'VortexSniper', points: 118, wins: 1, kills: 14 },
      { name: 'NinjaBuilder_RU', points: 92, wins: 1, kills: 8 },
      { name: 'FrostByte99', points: 68, wins: 0, kills: 10 },
      { name: 'ShadowFox', points: 45, wins: 0, kills: 7 },
    ],
  },
  {
    id: 'blitz_royale',
    nameRu: 'Блиц-Лига Агрессии',
    nameEn: 'Blitz Slayers League',
    descRu: 'Победа: +25 оч. | Топ-5: +10 оч. | Убийство: +8 оч.',
    descEn: 'Win: +25 pts | Top 5: +10 pts | Elim: +8 pts',
    winBonus: 25,
    top5Bonus: 10,
    killPoints: 8,
    prizeTokens: 120,
    rewardSkinId: 'cup_blitz_phantom',
    color: '#f97316',
    entries: [
      { name: 'TitanSlayer', points: 174, wins: 2, kills: 16 },
      { name: 'Alex_2077', points: 132, wins: 1, kills: 13 },
      { name: 'Lera_PRO', points: 98, wins: 1, kills: 9 },
      { name: 'GhostRecon', points: 64, wins: 0, kills: 8 },
    ],
  },
  {
    id: 'crown_series',
    nameRu: 'Чемпионат Короны',
    nameEn: 'Crown Series Finals',
    descRu: 'Победа: +60 оч. | Топ-5: +25 оч. | Убийство: +6 оч.',
    descEn: 'Win: +60 pts | Top 5: +25 pts | Elim: +6 pts',
    winBonus: 60,
    top5Bonus: 25,
    killPoints: 6,
    prizeTokens: 250,
    rewardSkinId: 'cup_crown_emperor',
    color: '#c084fc',
    entries: [
      { name: 'Midas_King', points: 210, wins: 3, kills: 15 },
      { name: 'OmegaPrime', points: 164, wins: 2, kills: 12 },
      { name: 'AstralNova', points: 120, wins: 1, kills: 10 },
      { name: 'Dima_Top1', points: 86, wins: 0, kills: 11 },
    ],
  },
];

export const POIS: PoiInfo[] = [
  { id: 'metro_plaza', nameRu: 'Неоновый Город', nameEn: 'Neon Plaza', x: 0, z: 0, biome: 'city' },
  { id: 'pine_village', nameRu: 'Лесная Деревня', nameEn: 'Timber Village', x: -135, z: 95, biome: 'forest' },
  { id: 'frost_citadel', nameRu: 'Ледяной Пик', nameEn: 'Frost Citadel', x: -115, z: -155, biome: 'snow' },
  { id: 'sun_dunes', nameRu: 'Песчаный Оазис', nameEn: 'Sunstone Oasis', x: 155, z: 120, biome: 'desert' },
  { id: 'river_station', nameRu: 'АЗС у Моста', nameEn: 'Bridge Station', x: 115, z: -90, biome: 'river' },
  { id: 'watchtower', nameRu: 'Башня Обзора', nameEn: 'Lookout Spire', x: 0, z: -52, biome: 'city' },
];

export interface WeaponDef {
  id: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  type: 'melee' | 'gun' | 'launcher' | 'consumable';
  damage: number;
  fireRate: number;
  range: number;
  magSize: number;
  reloadTime: number;
  spread: number;
  pellets: number;
  auto: boolean;
  zoomFov: number;
  scope?: boolean;
  healHp?: number;
  healShield?: number;
  maxStack?: number;
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  pickaxe: { id: 'pickaxe', nameRu: 'Кирка', nameEn: 'Pickaxe', icon: '⛏️', type: 'melee', damage: 28, fireRate: 0.4, range: 4.5, magSize: Infinity, reloadTime: 0, spread: 0, pellets: 1, auto: true, zoomFov: 60 },
  ar: { id: 'ar', nameRu: 'Штурмовая', nameEn: 'Assault Rifle', icon: '🔫', type: 'gun', damage: 28, fireRate: 0.135, range: 260, magSize: 30, reloadTime: 1.65, spread: 0.016, pellets: 1, auto: true, zoomFov: 44 },
  shotgun: { id: 'shotgun', nameRu: 'Дробовик', nameEn: 'Pump Shotgun', icon: '💥', type: 'gun', damage: 15, fireRate: 0.8, range: 50, magSize: 5, reloadTime: 2.0, spread: 0.068, pellets: 8, auto: false, zoomFov: 50 },
  smg: { id: 'smg', nameRu: 'ПП-Шквал', nameEn: 'Rapid SMG', icon: '⚡', type: 'gun', damage: 18, fireRate: 0.082, range: 120, magSize: 28, reloadTime: 1.3, spread: 0.028, pellets: 1, auto: true, zoomFov: 48 },
  sniper: { id: 'sniper', nameRu: 'Снайперка', nameEn: 'Bolt Sniper', icon: '🎯', type: 'gun', damage: 98, fireRate: 1.25, range: 390, magSize: 3, reloadTime: 2.2, spread: 0.0015, pellets: 1, auto: false, zoomFov: 18, scope: true },
  rpg: { id: 'rpg', nameRu: 'Ракетница', nameEn: 'Rocket Launcher', icon: '🚀', type: 'launcher', damage: 115, fireRate: 1.6, range: 230, magSize: 1, reloadTime: 2.1, spread: 0.004, pellets: 1, auto: false, zoomFov: 48 },
  shield_pot: { id: 'shield_pot', nameRu: 'Зелье щита', nameEn: 'Shield Potion', icon: '🧪', type: 'consumable', damage: 0, fireRate: 0.5, range: 0, magSize: 1, reloadTime: 0, spread: 0, pellets: 0, auto: false, zoomFov: 60, healHp: 0, healShield: 50, maxStack: 3 },
  slurp: { id: 'slurp', nameRu: 'Слёрп-Джус', nameEn: 'Slurp Juice', icon: '🥤', type: 'consumable', damage: 0, fireRate: 0.5, range: 0, magSize: 1, reloadTime: 0, spread: 0, pellets: 0, auto: false, zoomFov: 60, healHp: 35, healShield: 35, maxStack: 2 },
  medkit: { id: 'medkit', nameRu: 'Аптечка', nameEn: 'Med Kit', icon: '🩹', type: 'consumable', damage: 0, fireRate: 0.5, range: 0, magSize: 1, reloadTime: 0, spread: 0, pellets: 0, auto: false, zoomFov: 60, healHp: 100, healShield: 0, maxStack: 2 },
};

export const BOT_NAMES = [
  'Viktor_PRO', 'KiberKot', 'ShadowFox', 'SniperWolf', 'NinjaBuild',
  'StormRider', 'Alex_2077', 'Lera_GG', 'TitanSlayer', 'FrostByte',
  'TurboChel', 'MegaBuilder', 'Valkyrie', 'GhostRecon', 'BlazeKing',
  'NovaStar', 'PhantomX', 'Dima_Top1', 'CyberKnight', 'ArcticBear',
  'SolarFlare', 'Vortex99', 'IronClad', 'PixelHunter', 'Rex_Royale',
  'Mirage', 'Zenith', 'Cobalt', 'Onyx', 'FalconEye',
];

export function getBotDisplayName(index: number): string {
  const base = BOT_NAMES[index % BOT_NAMES.length];
  return index < BOT_NAMES.length ? base : `${base}_${Math.floor(index / BOT_NAMES.length) + 1}`;
}

export const DEFAULT_FRIENDS: FriendEntry[] = [
  { id: 'f_kiber', name: 'KiberKot', status: 'in_lobby', rankLabelRu: 'Платина', rankLabelEn: 'Platinum', skinNameRu: 'Неон-Лис', skinNameEn: 'Neon Kitsune' },
  { id: 'f_lera', name: 'Lera_GG', status: 'online', rankLabelRu: 'Золото II', rankLabelEn: 'Gold II', skinNameRu: 'Арктик-Призрак', skinNameEn: 'Arctic Ghost' },
  { id: 'f_fox', name: 'ShadowFox', status: 'in_match', rankLabelRu: 'Алмаз', rankLabelEn: 'Diamond', skinNameRu: 'Омега-Тень', skinNameEn: 'Omega Shade' },
  { id: 'f_wolf', name: 'SniperWolf', status: 'in_lobby', rankLabelRu: 'Серебро II', rankLabelEn: 'Silver II', skinNameRu: 'Рейнджер Бури', skinNameEn: 'Storm Ranger' },
  { id: 'f_valk', name: 'Valkyrie', status: 'online', rankLabelRu: 'Чемпион', rankLabelEn: 'Champion', skinNameRu: 'Валькирия Кубка', skinNameEn: 'Cup Valkyrie' },
];

export const DEFAULT_PROFILE: PlayerProfile = {
  nickname: 'RoyaleHero',
  language: 'ru',
  tokens: 150,
  unlockedSkins: ['vanguard', 'ranger'],
  equippedSkin: 'vanguard',
  equippedSkinStyles: {
    vanguard: 'cobalt',
    ranger: 'moss',
  },
  unlockedPickaxes: ['default_axe'],
  equippedPickaxe: 'default_axe',
  unlockedGliders: ['default_chute'],
  equippedGlider: 'default_chute',
  unlockedBackblings: ['skin_default'],
  equippedBackbling: 'skin_default',
  unlockedCarSkins: ['rally_blue'],
  equippedCarModel: 'sports',
  equippedCarSkin: 'rally_blue',
  unlockedEmotes: ['floss', 'boogie'],
  emoteWheel: ['floss', 'boogie', 'floss', 'boogie'],
  perkStartShield: false,
  perkStartWood: false,
  rankedPoints: 150,
  bestRankedPoints: 150,
  activeTournamentId: 'island_cup',
  tournamentScores: {
    island_cup: { points: 0, wins: 0, kills: 0 },
    blitz_royale: { points: 0, wins: 0, kills: 0 },
    crown_series: { points: 0, wins: 0, kills: 0 },
  },
  friends: DEFAULT_FRIENDS,
  stats: {
    matches: 0,
    wins: 0,
    top5: 0,
    kills: 0,
    damage: 0,
    chestsOpened: 0,
    vehiclesDriven: 0,
    rankedMatches: 0,
    rankedWins: 0,
    rankedKills: 0,
    rankedTop10: 0,
  },
};

const STORAGE_KEY = 'fn_royale_3d_profile_v3';

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_PROFILE),
      ...parsed,
      unlockedPickaxes: Array.isArray(parsed.unlockedPickaxes) ? parsed.unlockedPickaxes : ['default_axe'],
      equippedPickaxe: parsed.equippedPickaxe || 'default_axe',
      unlockedGliders: Array.isArray(parsed.unlockedGliders) ? parsed.unlockedGliders : ['default_chute'],
      equippedGlider: parsed.equippedGlider || 'default_chute',
      unlockedBackblings: Array.isArray(parsed.unlockedBackblings) ? parsed.unlockedBackblings : ['skin_default'],
      equippedBackbling: parsed.equippedBackbling || 'skin_default',
      friends: Array.isArray(parsed.friends) && parsed.friends.length > 0 ? parsed.friends : structuredClone(DEFAULT_FRIENDS),
      stats: { ...DEFAULT_PROFILE.stats, ...(parsed.stats || {}) },
      equippedSkinStyles: { ...DEFAULT_PROFILE.equippedSkinStyles, ...(parsed.equippedSkinStyles || {}) },
      tournamentScores: { ...DEFAULT_PROFILE.tournamentScores, ...(parsed.tournamentScores || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}
