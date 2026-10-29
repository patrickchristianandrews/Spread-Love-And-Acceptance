#!/usr/bin/env python3
"""designs.py: the 40 designs of "Color and Breathe" in book order (adultcolor29), mixed so no two neighbors share a family.
Each entry: (function name, module, title, family, alt text, has_pups)."""
import ac_mandala as M
import ac_zen as Z
import ac_botan as B
import ac_scenes1 as S1
import ac_scenes2 as S2
import ac_words as W
import ac_pups as P

D = [
    (M.m_lotus, 'Lotus Bloom', 'mandala', 'A mandala of layered lotus petals inside a ring of arches', False),
    (Z.z_tiles, 'Twelve Little Fields', 'pattern', 'Twelve rounded tiles, each filled with a different pattern to color', False),
    (B.b_wreath, 'Leaf Wreath', 'botanical', 'A laurel wreath of leaves, berries and flowers around a butterfly', False),
    (S1.s_nook, 'Rainy Window Nook', 'scene', 'A reading nook at a rainy arched window, with a pup on the window seat, a stack of books and a mug of tea', True),
    (W.w_breathe, 'Breathe', 'word', 'The word Breathe in patterned letters on an arch above a small lotus mandala', False),
    (M.m_sun, 'Scalloped Sun', 'mandala', 'A sunburst mandala with rays, round petals and scalloped rings', False),
    (B.b_fern, 'Fern Fronds', 'botanical', 'Three tall fern fronds with an unfurling fiddlehead', False),
    (S1.s_lighthouse, 'Lighthouse at Dusk', 'scene', 'A striped lighthouse on a rocky point at dusk with a cottage, beams of light and a sailboat', False),
    (Z.z_orbit, 'Rings and Bubbles', 'pattern', 'A disk cut into six patterned rings, floating in a field of bubbles', False),
    (M.m_paisley_ring, 'Paisley Ring', 'mandala', 'Twelve paisleys swirling around a flower, ringed with drops and arches', False),
    (B.b_meadow, 'Wildflower Meadow', 'botanical', 'Tall wildflowers in a meadow with a butterfly and a bee', False),
    (S1.s_tea, 'Tea Table', 'scene', 'A table with a lace cloth, a teapot, cups and a stand of cakes in front of a window', False),
    (W.w_enough, 'Enough', 'word', 'The word Enough in patterned letters inside a ring of petals', False),
    (P.m_hammock, 'Hammock Mandala', 'mandala', 'Two pups asleep in a hammock between two trees, in the middle of a mandala', True),
    (B.b_gate, 'Garden Gate', 'botanical', 'A garden gate in an arch of roses between two stone pillars', False),
    (S1.s_lake, 'Mountain Lake', 'scene', 'Snow-capped mountains over a lake with a rowboat, pines and reeds', False),
    (Z.z_ribbon, 'Flowing Ribbons', 'pattern', 'Wavy bands across the page, each filled with its own pattern', False),
    (M.m_compass, 'Compass Star', 'mandala', 'An eight-point star mandala ringed with diamonds and scallops', False),
    (B.b_herbs, 'Herbs on the Shelf', 'botanical', 'Basil, rosemary, mint and thyme in terracotta pots on a shelf', False),
    (S1.s_balloon, 'Hot Air Balloon', 'scene', 'A big hot air balloon with two small ones over a patchwork of fields', False),
    (W.w_soft, 'Soft', 'word', 'The word Soft in big patterned letters among clouds and leaves', False),
    (M.m_wheel, 'Tile Wheel', 'mandala', 'A wheel of tiles, each ring cut into more cells than the one inside it', False),
    (B.b_bouquet, 'Bouquet', 'botanical', 'A vase of roses, daisies, tulips and cosmos tied with a bow', False),
    (S2.s_night, 'Night Sky', 'scene', 'A night sky with a big moon, constellations, a ringed planet, a shooting star and a cabin', False),
    (Z.z_rainbow, 'Rainbow of Patterns', 'pattern', 'A rainbow of seven patterned arches over a field of small stars', False),
    (P.b_peek, 'Peeking Out', 'botanical', 'Two pups peeking out from a field of tall flowers', True),
    (S2.s_porch, 'Porch at Dusk', 'scene', 'A porch at dusk with two pups on the step, a rocking chair, a lantern and string lights', True),
    (M.m_sunflower, 'Sunflower', 'mandala', 'A sunflower mandala with a spiral of seeds, petals and leaves', False),
    (W.w_again, 'Begin again', 'word', 'The words Begin again in patterned letters above a rising sun', False),
    (S2.s_kitchen, 'Kitchen Shelf', 'scene', 'Kitchen shelves of jars, mugs, lemons, plates and baskets', False),
    (B.b_butterflies, 'Butterfly Garden', 'botanical', 'Three butterflies and a bee visiting poppies and bellflowers', False),
    (Z.z_quilt, 'Diamond Quilt', 'pattern', 'A quilt of diamonds, each with its own pattern', False),
    (S2.s_bridge, 'Stone Bridge', 'scene', 'A stone arch bridge over a stream with lamp posts, trees and water lilies', False),
    (M.m_frost, 'Frost Star', 'mandala', 'A six-fold snowflake mandala with branching arms', False),
    (S2.s_greenhouse, 'Greenhouse', 'scene', 'A glass greenhouse full of big leaves, pots and hanging baskets', False),
    (W.w_room, 'Room for everyone', 'word', 'The words Room for everyone in patterned letters above a row of different flowers', False),
    (M.m_garland, 'Flower Garland', 'mandala', 'A mandala of eight flowers on a ring with leaves between them', False),
    (Z.z_leaf, 'Leaf of Fields', 'pattern', 'One big leaf cut by its veins into patterned fields', False),
    (B.b_lavender, 'Lavender Bundle', 'botanical', 'A bundle of lavender tied with a bow, with a bee and a butterfly', False),
    (M.m_moon, 'Moon and Stars', 'mandala', 'A mandala with a crescent moon, a ring of stars, rays and arches', False),
]
assert len(D) == 40
