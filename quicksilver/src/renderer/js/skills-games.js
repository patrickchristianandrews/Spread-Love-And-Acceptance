// Game development skills: working code for Godot 4 (GDScript), Unreal Engine 5 (C++ and
// Blueprints) and Unity 6 (C#), and game art made by your picture model (sprites, seamless
// textures, icons, concept sheets). Every code skill asks which engine when you haven't said.
'use strict';

SKILL_CATEGORIES.games = { label: 'Game development', icon: '🎮', pitch: 'Godot, Unreal and Unity code, game design, sprites and textures.' };

const ENGINE_NOTE = 'Use the engine the user names: Godot 4 (typed GDScript 2.0, never Godot 3 syntax), Unreal Engine 5 (C++ with UCLASS/UPROPERTY macros, or Blueprints described node by node) or Unity 6 (C# MonoBehaviours, new Input System). If none is named, ask which in one short line before writing code. Give complete code, where it goes (node, actor or GameObject), and the editor setup steps.';
const gsk = (id, name, icon, desc, hint, what, triggers, output = 'text') => sk(id, name, icon, 'games', output, desc, hint, `${what} ${ENGINE_NOTE}`, triggers);

BUILTIN_SKILLS.push(
  gsk('game-player', 'Player controller', '🏃', 'Movement, jumping, camera and input that feel good.',
    'Engine, 2D or 3D, and how it should move (e.g. "Godot 2D platformer with double jump")…',
    'Write a player controller that feels good: acceleration and friction, jump with coyote time and jump buffering for platformers, a following camera, and input actions instead of raw keys. List every tunable value at the top with a sensible default.',
    ['(player|character) (controller|movement)', '(make|write|code) .{0,20}(double jump|wall jump|dash)', 'platformer (movement|controls)']),
  gsk('game-enemy', 'Enemy AI', '👾', 'Enemies that patrol, chase, attack and give up.',
    'Engine and what the enemy should do…',
    'Write enemy AI as a small state machine (idle, patrol, chase, attack, return), with line-of-sight checks, a detection range, attack cooldowns and pathfinding using the engine\'s navigation system. Keep states in clear separate functions.',
    ['enemy (ai|behavior|behaviour)', '(make|write) .{0,20}enemy .{0,20}(chase|patrol|attack)']),
  gsk('game-inventory', 'Inventory & items', '🎒', 'Items, stacking, equipping and an inventory screen.',
    'Engine and the kind of game…',
    'Build an inventory system: item data as resources or data assets (id, name, icon, max stack, type), an inventory that adds, stacks, removes and swaps, equipping, and a simple grid UI bound to it with signals or events. Include saving the inventory.',
    ['inventory system', '(item|loot) system']),
  gsk('game-save', 'Save & load', '💾', 'Save slots, autosave and loading that survives updates.',
    'Engine and what needs saving…',
    'Write a save system: a versioned save file (JSON or the engine\'s resource format) in the user data folder, several slots, autosave, saving the player, world state and settings, and loading that copes with older save versions. Never store secrets in plain text.',
    ['save (system|game|and load|\\/load)', 'save slots', 'load (game|progress)']),
  gsk('game-ui', 'Menus & HUD', '🧭', 'Main menu, pause menu, settings and a health bar.',
    'Engine and the screens you need…',
    'Build the game\'s menus and HUD: main menu, pause menu (pausing the game properly), settings (volume, resolution, key rebinding), and a HUD with health, score and a message area. Use the engine\'s UI system (Godot Control nodes, Unreal UMG, Unity UI Toolkit or uGUI) with controller navigation.',
    ['(main|pause|start) menu', '\\bhud\\b', 'health bar']),
  gsk('game-shader', 'Game shader', '✨', 'Outlines, water, dissolve, toon shading and more.',
    'Engine and the effect (e.g. "Godot 2D water ripple")…',
    'Write the shader for the effect: Godot shading language, an Unreal material described node by node (or HLSL in a custom node), or Unity Shader Graph steps or URP HLSL. Expose the parameters an artist would tweak and say how to apply it.',
    ['shader (for|that)', '(write|make) .{0,15}shader', 'toon shading', 'dissolve effect']),
  gsk('game-fix', 'Fix a game error', '🧯', 'Paste an engine error or crash; get the cause and the fix.',
    'Paste the error, crash log or describe the bug (a screenshot works too)…',
    'Read the error or crash log, name the cause in one line, then give the fixed code and how to avoid it. For Unreal crash logs, read the call stack from the top; for Godot, the script and line in the debugger message; for Unity, the first line of the stack trace.',
    ['(godot|unreal|unity) (error|crash|bug)', '(error|crash) in (godot|unreal|unity)', 'null instance|accessed none|nullreferenceexception']),
  gsk('game-level', 'Level design', '🗺️', 'A level layout with pacing, secrets and difficulty.',
    'The game, the level\'s place in it, and its theme…',
    'Design the level: the goal, a layout described area by area (or as an ASCII map for 2D), the pacing curve (teach, test, twist, finale), enemy and pickup placement, secrets, checkpoints and how it teaches one new idea. Add a short list of what to build first.',
    ['level design', 'design (a|the|my) level']),
  gsk('game-dialogue', 'Branching dialogue', '💬', 'Conversations with choices, as data your game can read.',
    'The characters, the scene and what choices matter…',
    'Write a branching conversation with real choices and consequences, then give it as JSON (nodes with id, speaker, text, choices with next and optional conditions/flags) and a short script that plays it in the engine. Keep each line short enough for a dialogue box.',
    ['(branching|npc) dialogue', 'dialogue tree', 'conversation system']),
  gsk('game-design-doc', 'Game design document', '📘', 'The whole game on paper: pitch, loop, systems, scope.',
    'Your game idea, genre, platform and team size…',
    'Write a game design document: one-line pitch, target players, the core loop, mechanics and controls, progression, levels, art and sound direction, the engine and why, a scope cut into a playable first version and later features, and the main risks. Plain words; no padding.',
    ['game design doc(ument)?', '\\bgdd\\b', 'plan (my|a) game'], 'docx'),

  // ---------- Game art (made by your picture model) ----------
  sk('make-sprite', 'Game sprite or sprite sheet', '🧍', 'games', 'image', 'Characters, items and enemies for 2D games, on a plain background.',
    'What it is, the style (pixel art, hand drawn…) and the pose or frames…',
    'Create a game sprite: one character, item or enemy, centered, full body, clean outline, flat plain white background with nothing else (so it is easy to cut out), consistent lighting from the top left. For a sprite sheet, show the same character in a row of evenly spaced poses for the animation asked for. Pixel art when asked, with crisp pixels and a small palette.',
    ['(make|draw|create|generate) (me )?(a |an )?(\\w+ ){0,3}sprite', 'sprite ?sheet', 'pixel art (character|enemy|item|sprite)'], { media: { shape: 'square', count: 2 } }),
  sk('make-texture', 'Seamless texture', '🧱', 'games', 'image', 'Tiling textures for floors, walls and terrain.',
    'The material (e.g. "mossy cobblestone", "sci-fi metal panel")…',
    'Create a seamless, tileable texture seen straight from above, evenly lit with no shadows or perspective, no objects or text, filling the whole square edge to edge so it repeats without visible seams.',
    ['(seamless|tileable|tiling) texture', '(make|create|generate) .{0,10}texture (for|of)'], { media: { shape: 'square' } }),
  sk('make-game-icon', 'Game icon', '💠', 'games', 'image', 'Item, skill and app icons that read at small sizes.',
    'What the icon shows and the game\'s style…',
    'Create a game icon: one bold, simple object or symbol, centered, strong silhouette, high contrast, readable at 64 pixels, on a plain background, in the game\'s style. No text.',
    ['(item|skill|ability|inventory|game) icons?'], { media: { shape: 'square', count: 2 } }),
);
