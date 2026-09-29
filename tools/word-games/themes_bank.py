"""Word-search themes for Quiet Words, written by hand: gentle, everyday and positive.

Each line below is "Theme name: word word word ...". make_themes.py keeps only words that are in the
safe lexicon (lexicon.py) or gentle-words.txt, gives each a short line (the hand-written clue from
clues.py, or a plain definition from Open English WordNet, CC BY 4.0), and keeps a theme only if it
still has at least 12 words. all_themes() returns the finished themes (the old ones first).
"""
import os

TEXT = '''
# ---- nature and places
Meadow morning: meadow grass daisy clover buttercup bee dew breeze lark hedge pasture wildflower sunshine field butterfly poppy
Woodland path: woodland oak beech fern moss acorn squirrel owl badger path bluebell mushroom bark twig canopy thicket glade
Riverbank: river bank reed willow otter heron kingfisher pebble current ripple bridge boat duck swan minnow stream mill
Mountain air: mountain summit peak ridge valley glacier snow slope pine eagle goat trail cairn meadow rock boulder view
Desert glow: desert dune sand cactus oasis camel lizard sunset mirage canyon mesa breeze palm star heat caravan
Island life: island lagoon coral palm coconut shell reef tide shore hammock sand turtle breeze boat harbor wave sunset
Rolling hills: hill slope valley sheep lamb hedge fence gate lane farm barn pasture meadow cottage orchard windmill
The lake: lake shore pier canoe paddle loon ripple reflection dock cabin pine mist fish swim island calm
Waterfalls: waterfall cascade spray mist rainbow pool rock fern moss stream roar splash cliff gorge ledge boulder
Cliffs and coves: cliff cove gull puffin cave arch rock tide pool crab shell spray wave headland lighthouse path
Caves: cave cavern stalactite crystal echo tunnel lantern rock chamber passage drip bat flashlight explorer shadow underground
Wetlands: marsh swamp reed heron frog dragonfly lily bog rush cattail duck egret otter mud pond crane
Prairie: prairie grass bison sky horizon wind wildflower hawk sunflower fence ranch horse wagon plain meadowlark
Rainforest: rainforest canopy vine orchid parrot toucan sloth frog fern waterfall mist leaf monkey jaguar moss butterfly
Tundra: tundra snow ice caribou reindeer fox owl moss lichen hare aurora wind frost sled husky igloo
Seashore finds: shell pebble driftwood seaweed starfish crab feather sand glass rope bottle cockle mussel whelk limpet
Rock pools: rock pool crab shrimp anemone starfish limpet mussel seaweed barnacle periwinkle tide net bucket splash
Under the canopy: canopy branch leaf vine nest bird squirrel sunlight shade twig trunk bark bough moss lichen
Country roads: road barn farm fence gate cottage tractor sheep cow orchard field meadow creek bridge mailbox silo
Town square: town square fountain bench pigeon bakery cafe library park market flag shop school oak gazebo clock
Boardwalk: pier boardwalk arcade beach ice_cream harbor gull shell bucket shovel taffy carousel kite sand wave

# ---- weather and sky
Sunny day: sunshine sunhat sunglasses shade breeze picnic lemonade swim blue sky warm golden bright light daisy
Clouds: cloud cumulus nimbus fluffy sky drift puff shade gray white shape wisp mist fog rain weather
Rain showers: rain shower drizzle puddle umbrella raincoat boots splash drop gutter window cloud gray rainbow worm
Snowfall: snow flake sled snowman scarf mittens hat frost ice cocoa fire blanket boots drift crisp white
Windy weather: wind breeze gust kite blow flutter sail windmill leaves hat scarf cloud storm whistle sway flag
Fog and mist: fog mist haze dew damp gray drift morning valley lamp harbor horn soft blur cool
Rainbow: rainbow red orange yellow green blue indigo violet arc prism light rain sun color bright band
The night sky: moon star planet comet meteor galaxy telescope orbit constellation twinkle dark night sky space cosmos
Sunrise: sunrise dawn morning light golden horizon lark bird glow pink orange sky wake day fresh early
Sunset: sunset dusk evening glow orange pink purple horizon sky silhouette calm golden sea shadow twilight
Weather words: weather forecast sunny cloudy rainy windy snowy foggy frost hail thunder breeze storm drizzle chill heat
The moon: moon crescent full phase tide glow silver night crater orbit lunar beam halo lantern owl dream
Stars: star twinkle shine sparkle bright light night wish comet constellation galaxy telescope glow cosmos heaven
Storm watching: storm thunder lightning rain wind cloud flash rumble window cozy blanket candle tea shelter calm

# ---- seasons and times
First signs of spring: spring bud blossom lamb daffodil crocus snowdrop nest robin rain shoot green fresh bloom tulip
Summer vacation: summer vacation beach sandcastle swim sun ice_cream picnic camp hike lemonade shorts sandals hat fan
Fall walk: autumn leaves acorn chestnut squirrel mushroom crunch gold red orange harvest pumpkin apple mist scarf
Winter warmth: winter fire blanket cocoa scarf mittens hat boots snow frost candle soup quilt slippers wool
Harvest time: harvest wheat barley corn apple pumpkin squash basket farmer tractor barn hay field festival bread orchard
Early morning: morning dawn coffee toast alarm yawn stretch sunrise birdsong dew shower breakfast newspaper kettle fresh
Lazy afternoon: afternoon nap hammock tea book shade garden breeze cookie cushion sofa quiet daydream sun rest
Evening calm: evening dusk candle lamp supper bath book pajamas slippers tea quiet moon star rest calm
Bedtime: bedtime pillow blanket teddy story lullaby dream moon star nightlight yawn pajamas quilt cuddle sleep
Weekend: weekend lie brunch walk market friends picnic garden film park sleep relax bake visit cycle
A new year: new_year fresh start hope plan goal calendar diary wish resolution change grow dream begin journey
Holiday lights: lights lantern candle twinkle glow star garland wreath ribbon tinsel bells snow cocoa gift card
Birthday party: birthday party cake candle balloon present card wish song friends games hat ribbon candy streamer surprise
Spring cleaning: clean dust sweep mop polish tidy window curtain cupboard drawer basket bucket sponge soap fresh
Summer evening: evening barbecue lantern firefly cricket garden patio lemonade breeze sunset laughter music guitar dusk
Snow day fun: snow snowball snowman sled slide mittens scarf hat boots carrot button igloo cocoa angel fort

# ---- flowers, trees and gardens
Cottage garden: rose lavender hollyhock foxglove daisy lupin peony sweet_pea poppy aster delphinium phlox pinks catmint stocks
Wildflowers: poppy cornflower daisy clover buttercup cowslip primrose bluebell violet thistle yarrow campion foxglove vetch
Spring bulbs: tulip daffodil crocus hyacinth snowdrop bluebell iris allium narcissus bulb bloom spring shoot soil bed
Roses: rose petal thorn bud bloom stem scent climber rambler hip garden bouquet pink red white trellis
Trees of the forest: oak ash beech birch elm maple pine spruce fir cedar willow yew holly hazel alder larch
Fruit trees: apple pear plum cherry peach apricot fig orchard blossom branch harvest ladder basket fruit prune tree
Houseplants: fern cactus succulent ivy palm orchid pot saucer water soil leaf window light mist repot bloom
The vegetable patch: carrot potato onion lettuce bean pea tomato cabbage leek beet radish squash spinach kale zucchini
Herb garden: basil mint parsley thyme sage rosemary chives dill oregano fennel coriander lavender tarragon lemon_balm
Garden tools: spade fork rake hoe trowel shears hose watering_can wheelbarrow gloves pot twine bucket sieve seed
In the greenhouse: greenhouse seedling tray pot compost glass tomato pepper cucumber vine water warm light cutting sprout
Pond garden: pond lily frog newt fish reed iris dragonfly pump fountain stone moss water ripple heron
Blossom: blossom cherry apple petal pink white bloom bud spring branch bee breeze orchard pollen scent
Autumn leaves: leaf maple oak red gold orange brown crunch pile rake fall twirl drift bonfire acorn season
Seeds and sowing: seed sow soil water sprout shoot root leaf grow sunlight patience label tray row packet
Flower shop: florist bouquet vase ribbon rose tulip lily carnation daisy wreath stem wrap card scent bloom

# ---- animals
Pets at home: dog cat rabbit hamster goldfish parrot budgie tortoise guinea_pig kitten puppy lead bowl basket collar
Puppy love: puppy wag bark fetch ball bone walk lead collar treat paw nose sniff cuddle bed play
Cat naps: cat kitten purr whiskers paw nap sunbeam basket yarn mouse toy cushion stretch meow tail curl
Farmyard: cow pig sheep goat hen rooster duck horse donkey barn tractor hay farmer field fence gate
Horses and ponies: horse pony foal mare stallion saddle bridle mane tail hoof trot canter gallop stable hay carrot
Woodland animals: fox badger deer hedgehog squirrel rabbit owl mole vole mouse stoat wren woodpecker hare dormouse
Ocean friends: dolphin whale seal turtle octopus starfish jellyfish crab lobster shark seahorse coral fish ray squid
Birds in flight: eagle hawk swallow swift gull goose crane heron kite falcon pigeon dove owl lark wing feather
Garden birds: robin sparrow blackbird thrush wren finch tit starling pigeon dove magpie jay feeder nest egg
Water birds: duck swan goose heron coot moorhen grebe kingfisher pelican flamingo stork puffin gull tern cormorant
Busy bees: bee hive honey comb pollen nectar flower queen worker drone buzz wax garden meadow swarm keeper
Butterflies and moths: butterfly moth caterpillar cocoon wing flutter meadow flower nectar monarch swallowtail chrysalis pattern color
Little bugs: ladybug beetle ant spider snail slug worm pill_bug centipede grasshopper cricket bee firefly caterpillar dragonfly
Pond life: frog toad tadpole newt snail dragonfly damselfly duck fish reed lily minnow beetle heron ripple
On safari: lion tiger elephant giraffe zebra hippo rhino cheetah leopard antelope buffalo ostrich monkey jeep savanna
Polar animals: polar_bear penguin seal walrus whale fox hare owl reindeer caribou puffin orca narwhal husky ice
Baby animals: puppy kitten lamb calf foal chick duckling cub kid piglet bunny fawn joey gosling owlet
Animal homes: nest burrow den hive web shell stable kennel hutch sty barn pond lodge cave warren
Australian animals: kangaroo koala wombat emu platypus wallaby cockatoo kookaburra echidna dingo possum parrot gum eucalyptus reef
Jungle animals: monkey gorilla parrot toucan tiger jaguar sloth snake frog chameleon elephant orangutan leopard lemur macaw
Reptiles: lizard gecko iguana tortoise turtle crocodile alligator chameleon snake skink scale shell sun rock egg
Mountain animals: goat eagle marmot llama alpaca yak ibex bear wolf lynx sheep pika condor puma deer
Dogs at the park: dog ball frisbee stick lead walk bark sniff run fetch tail wag bench path pond
Owls: owl hoot barn tawny snowy feather wing beak talon night moon tree nest owlet silent

# ---- food and drink
Fruit bowl: apple banana orange pear grape plum peach cherry kiwi mango lemon lime melon berry apricot
Berries: strawberry raspberry blueberry blackberry gooseberry cranberry currant elderberry mulberry bramble jam pie punnet summer pick
Vegetable soup: soup carrot potato onion leek celery lentil barley pea bean stock pepper herbs bread bowl spoon
Breakfast table: toast butter jam honey egg bacon cereal porridge milk juice coffee tea muffin pancake yogurt
Pancake day: pancake batter flour egg milk pan flip lemon sugar syrup butter berry cream stack griddle
At the bakery: bread loaf roll bun croissant bagel biscuit muffin cake pie tart baguette pastry baker oven
Baking a cake: cake flour sugar butter egg milk bowl whisk oven tin icing sponge cream candle slice
The cookie jar: cookie crumb chocolate ginger oat butter shortbread jar dunk milk sugar oven tray recipe sprinkles
Pizza night: pizza dough cheese tomato basil olive mushroom pepper crust oven slice onion ham pineapple oregano
Pasta: pasta spaghetti noodle penne ravioli lasagne macaroni sauce tomato cheese basil garlic pesto fork bowl
Rice dishes: rice risotto paella pilaf sushi curry biryani congee pudding grain bowl chopsticks steam saffron pea
Soup kitchen: soup broth stew chowder bisque stock ladle pot bowl spoon bread noodle bean lentil tomato
Salad bowl: salad lettuce cucumber tomato radish pepper celery spinach rocket olive feta dressing crouton carrot bowl
Sandwich shop: sandwich bread roll wrap cheese ham tomato lettuce pickle mustard butter tuna egg club toast
Picnic basket: picnic basket blanket sandwich apple lemonade flask cake napkin cup plate grass sun ants park
Tea party for two: tea muffin jam cream cake sandwich teapot cup saucer milk sugar lemon cookie tray doily
Coffee shop: coffee latte mocha espresso cappuccino mug milk foam bean barista cookie muffin cake sofa chat
Warm drinks: tea coffee cocoa chocolate cider milk honey lemon ginger mug steam cozy spoon saucer cinnamon
Cold drinks: lemonade juice smoothie milkshake water soda ice straw glass jug orange apple lime mint cool
Sweet shop: candy toffee fudge lollipop chocolate caramel gum jelly mint marshmallow nougat licorice sherbet jar bag
Ice cream parlor: ice_cream cone scoop vanilla chocolate strawberry sundae sprinkles wafer cherry sauce cup spoon float
Cheese board: cheese cracker grape apple fig chutney brie cheddar board knife walnut honey olive bread pear
Nuts and seeds: almond walnut hazelnut peanut cashew pecan pistachio chestnut acorn seed sunflower pumpkin sesame flax pine
Herbs and spices: pepper salt cinnamon nutmeg ginger clove cumin paprika turmeric saffron vanilla mint basil thyme sage
Market stall: market stall fruit vegetable bread cheese flowers basket bag coin price fresh farmer honey egg jam
Sunday dinner: roast potato carrot gravy peas stuffing chicken corn biscuit oven dish table family plate
Barbecue: barbecue grill sausage burger corn kebab salad bun sauce charcoal tongs apron garden summer friends
Tea party: teapot cup saucer cake sandwich muffin jam cream sugar spoon doily table friends chat party
Chocolate: chocolate cocoa bar truffle fudge brownie cake milk dark white bean melt treat box square
Kitchen garden: tomato lettuce bean pea carrot onion potato herb strawberry rhubarb squash zucchini kale chard leek
Around the world food: pizza sushi taco curry noodle pasta paella dumpling bagel croissant falafel kebab pretzel waffle crepe
Dumplings: dumpling wonton gyoza bun steam bamboo basket dough filling soy sauce ginger pork chopsticks noodle
Bread and butter: bread butter toast loaf crust crumb slice knife board yeast flour oven wholemeal sourdough rye
Porridge: porridge oats milk honey banana berry cinnamon sugar bowl spoon warm breakfast raisin apple cream
Jam making: jam jar sugar fruit strawberry raspberry plum apricot pan boil spoon label lid shelf toast
Lunchbox: lunchbox sandwich apple chips yogurt juice carrot cheese cracker grapes napkin thermos cookie banana wrap
Snack time: snack crackers apple banana popcorn pretzel nuts raisin yogurt cheese carrot hummus muffin cookie fruit
Smoothies: smoothie banana berry mango yogurt milk honey spinach blender straw glass ice oat juice kiwi
Tacos: taco tortilla bean cheese salsa lettuce tomato onion lime avocado pepper corn rice spice sauce
Noodle bar: noodle broth ramen udon chopsticks bowl egg scallion ginger soy sesame mushroom tofu pork steam

# ---- home life
Cozy living room: sofa armchair cushion blanket lamp rug fireplace bookcase shelf clock plant curtain window table television
The kitchen: kitchen oven stove sink kettle toaster fridge cupboard drawer pan pot spoon ladle whisk tray
Bedroom: bed pillow duvet quilt wardrobe drawer lamp mirror rug curtain slipper alarm_clock shelf dresser
Bath time: bath bubbles soap towel sponge duck tap water shampoo robe mat mirror steam warm relax
Laundry day: laundry washing basket peg line sheet towel shirt sock soap fold iron dry fresh breeze
Tidying up: tidy sort box shelf drawer basket label dust sweep wipe fold stack neat space calm
Around the house: door window roof chimney wall floor stairs porch hall garden gate fence path attic cellar
The toolbox: hammer nail screw screwdriver wrench spanner pliers drill saw level tape ruler bolt nut glue
Moving house: box tape label van key door address room unpack shelf curtain paint neighbor welcome home
Decorating: paint brush roller ladder wallpaper color tape sheet shelf picture frame cushion lamp rug plant
Cozy corners: blanket cushion candle lamp book tea slippers socks quilt window rain chair nook purr rest
Doorstep: door step mat bell knock letter parcel porch plant lamp key lock boots bench welcome
Windowsill: window sill plant pot cactus herb sun light glass curtain blind cat view frame breeze
Garden shed: shed spade fork rake hose pot seed tray twine gloves bike ladder shelf bench jar
Sewing basket: needle thread pin button scissors thimble fabric ribbon lace tape pattern stitch hem seam spool
Kitchen drawer: spoon fork knife ladle whisk spatula peeler grater tongs opener scissors string foil napkin
Home office: desk chair laptop lamp pen pencil notebook paper stapler folder calendar mug plant shelf printer
Welcome home: home door key hug hello kettle slippers sofa dog cat meal family warmth light rest

# ---- kindness, calm and wellbeing
Gentle words: gentle kind warm soft calm patient caring tender sweet thoughtful friendly polite generous humble honest
Encouragement: believe try brave progress grow learn keep_going proud effort step courage hope strength steady
Deep breaths: breathe inhale exhale slow calm pause still quiet rest ease relax soft steady gentle release
Thank you: thanks grateful gift kind help share smile card note hug gesture favor praise credit appreciate
Being a good friend: friend listen share laugh visit call trust loyal care help support kind honest fun smile
Teamwork: team together share help plan role goal cheer support trust lead listen join effort unity
Small joys: sunshine coffee music laughter hug puppy flower rainbow bubble cookie nap book letter smile breeze
Self care: rest sleep water walk stretch bath book music journal tea nap sunlight friend laugh breathe
Mindfulness: mindful breath present notice moment pause aware calm focus still gentle sense listen feel accept
Happy thoughts: happy joy smile laugh cheer delight glee sunshine hope grin giggle bliss glad bright content
A calm mind: calm peace quiet still rest ease settle breathe slow soft gentle clear steady balance space
Growing together: grow learn try share help change bloom root seed patience care time water light season
Kind acts: help share smile hold_door wave thank carry listen visit bake gift note compliment cheer
Hope: hope wish dream light dawn spring seed tomorrow believe faith trust promise rainbow future bloom
Courage: brave bold try step speak stand face strong steady heart lion effort risk dare grow
Patience: patience wait slow calm steady time season seed grow gentle breath pause trust ripen rest
Comfort: comfort blanket hug tea cocoa pillow soup friend music candle warmth soft home rest safe
Cheerful: cheerful bright sunny happy merry jolly lively bubbly smile laugh whistle song skip dance grin
Community: neighbor friend share help library park garden market school cafe choir club team town volunteer
Celebrations: party cake candle balloon cheer toast dance music song gift card confetti ribbon banner laughter
Sweet dreams: dream sleep pillow blanket moon star night wish lullaby rest yawn cozy quiet dark cuddle
Good morning: morning sunrise stretch yawn smile coffee tea toast breakfast birdsong light fresh wake hello shower
Resting well: rest nap sleep bed pillow quiet calm dark cozy blanket dream still breathe soft ease

# ---- hobbies and pastimes
Knitting: knit yarn wool needle stitch purl row scarf hat mitten sweater pattern ball cable sock
Painting: paint brush canvas easel palette color watercolor oil acrylic sketch portrait landscape frame gallery studio
Drawing: pencil sketch paper charcoal crayon pastel eraser shade line outline doodle ink pen portrait still
Photography: camera photo lens shutter flash zoom focus light frame album portrait landscape tripod print snap
Pottery: pottery clay wheel kiln glaze bowl mug vase jug potter shape spin fire studio tile
Gardening days: garden dig plant seed water weed prune mow rake compost bloom harvest pot bed shed
Reading nook: book page chapter story novel author poem library shelf bookmark lamp chair blanket tea quiet
Writing: write pen pencil paper notebook journal letter story poem word sentence draft ink diary essay
Music makers: piano guitar violin flute drum trumpet cello harp clarinet banjo ukulele harmonica recorder tambourine xylophone
Singing: sing song choir voice note tune melody harmony chorus verse lyrics hymn duet solo rehearse
Dancing: dance waltz tango ballet jive salsa step twirl spin rhythm music partner floor shoes stage
Board games: chess checkers draughts dice board counter card domino token pawn king queen game turn win
Puzzles: puzzle jigsaw piece edge corner crossword riddle maze sudoku clue answer grid solve logic pattern
Cycling: bike bicycle pedal wheel chain helmet saddle bell lane path hill ride gear brake pump
Hiking: hike trail map compass boots backpack summit path stream view picnic walk hill forest bridge
Camping: tent camp fire marshmallow lantern sleeping_bag stars flashlight map compass stove kettle hike lake canoe
Swimming: swim pool lane dive float splash goggles towel stroke kick lap wave cap lake sea
Fishing trip: fish rod reel line net boat lake river bait float cast catch pier dawn patience
Bird watching: binoculars bird notebook hide robin wren finch owl heron feather nest song flight wing call
Yoga: yoga mat stretch breath pose balance calm bend twist flow tree bridge rest peace focus
Cooking: cook chef recipe pan pot oven stir chop taste spice herb salt sauce kitchen apron
Scrapbooking: scrapbook photo glue scissors paper sticker ribbon memory page album frame card button tape pen
Collecting: stamp coin shell badge card sticker button marble rock postcard album jar box shelf label
Gaming night: game dice card board team laugh snack friend score turn round win play fun night
Kites: kite string tail wind breeze sky fly soar dive loop spool park hill color ribbon
Model making: model kit glue paint brush plane ship train car piece box ruler knife detail shelf
Crafts: craft glue paper card scissors ribbon glitter paint bead felt button string tape clay yarn
Origami: origami paper fold crease crane boat flower frog square corner edge shape pattern gift star
Magic tricks: magic trick card coin hat wand rabbit scarf cape smile applause audience stage show wonder
Theater: theater stage curtain actor play script role scene audience ticket applause costume lights usher intermission
At the cinema: cinema film movie screen seat ticket popcorn trailer star actor scene sequel comedy credits usher
Museum visit: museum gallery exhibit painting statue fossil dinosaur mummy ticket guide map history art sculpture display
Library: library book shelf card loan return librarian quiet reading desk story author page catalog fiction
Circus: circus tent clown juggler acrobat ring trapeze tumble ticket popcorn ringmaster costume balloon laugh show
Fairground: fair carousel ride wheel ticket candy_floss prize balloon music lights hoopla stall swing laughter
Sports day: race sack egg spoon relay medal ribbon cheer team run jump hop finish line trophy
Tennis: tennis racket ball net court serve volley rally match set game point umpire lawn score
Soccer fun: soccer goal ball field team kick pass score goalie cleats whistle match fans cheer net
Baseball: baseball bat ball glove base pitcher catcher inning umpire field team fans cheer peanuts dugout
Golf: golf club ball tee green hole flag course putt swing caddy bunker score fairway par
Ice skating: skate ice rink glide spin twirl blade scarf mittens cold winter music partner jump balance
Skiing: ski slope snow lift pole boots goggles helmet chalet powder mountain lodge cocoa jacket glove

# ---- travel and journeys
Train journey: train station ticket platform carriage seat window track whistle guard conductor timetable journey tunnel bridge
Airport: airport plane pilot ticket passport gate luggage suitcase runway terminal flight lounge departure arrival boarding
Road trip: car road map snack music window view motel fuel journey signpost highway picnic stop drive
Packing a suitcase: suitcase pack shirt socks toothbrush book passport ticket charger hat sunscreen map camera pajamas shoes
By the harbor: harbor boat yacht sail anchor rope pier gull lighthouse fisherman net crab tide dock mast
Sailing: sail boat mast rope anchor deck wind tide compass harbor wave crew knot sea voyage
Beach day: beach sand sea wave shell bucket shovel sun towel ice_cream pier gull swim hat
City break: city museum gallery cafe square bridge tower park map ticket hotel market street tram shop
Maps and compasses: map compass north south east west scale route path legend grid key trail distance guide
Postcards: postcard stamp address message view beach mountain city greetings wish sunshine friend mail mailbox travel
Hotel stay: hotel room key bed pillow towel lobby elevator breakfast view desk bellhop suitcase balcony pool
Bus ride: bus stop ticket driver seat window bell route schedule passenger fare town journey line
Boats and ships: boat ship ferry yacht canoe kayak raft barge tug liner dinghy steamer sail oar anchor
Around town: town street shop cafe bank mail library park square market school station bakery bridge diner
The open road: road lane mile signpost bend hill valley view horizon journey map car bike drive
Adventure: adventure explore journey quest map path discover travel wander trail compass island summit trek voyage

# ---- science and learning
Space: space rocket astronaut planet star moon orbit comet galaxy satellite telescope gravity meteor asteroid universe
The solar system: sun planet moon orbit comet asteroid star gravity ring crater dwarf sky system space light
Weather science: weather cloud rain temperature pressure humidity wind forecast front thermometer barometer season climate snow frost
Rocks and minerals: rock stone crystal quartz granite marble slate chalk flint pebble mineral fossil gem basalt clay
Fossils: fossil dinosaur bone shell amber rock layer dig museum ammonite trilobite imprint ancient history scientist
In the lab: laboratory microscope beaker flask test_tube experiment scientist goggles result data measure sample lens slide
Magnets and electricity: magnet pole attract north south current battery wire bulb circuit switch spark energy charge volt
Light and color: light color prism rainbow spectrum shadow mirror lens reflection beam ray glow shine bright ultraviolet
Sound: sound echo note music pitch loud soft wave hear ear drum bell tune rhythm voice whisper
Plants science: plant root stem leaf flower seed pollen petal sunlight water soil grow chlorophyll photosynthesis sap
Oceans: ocean sea wave tide current reef coral whale fish salt deep shore island bay gulf
Human kindness science: kindness smile laughter hug friendship trust empathy calm sleep exercise nature music gratitude breath rest
Numbers: one two three four five six seven eight nine ten hundred thousand dozen half zero
Shapes: circle square triangle rectangle oval star heart diamond cube sphere cone cylinder pyramid hexagon spiral
Math: add subtract multiply divide number sum total equal fraction half quarter shape angle graph count
Time: time second minute hour day week month year clock watch calendar morning noon evening century
School days: school class teacher pupil desk book pencil lesson bell lunch playground friend homework test reading
Inventions: wheel printing_press telephone light_bulb radio camera computer engine clock compass telescope bicycle rocket
Energy: energy sun wind water wave solar power light heat battery turbine panel spark current fuel
Ecology: nature habitat forest river ocean species tree bee recycle compost garden earth water air soil
Recycling: recycle bin paper glass plastic tin can bottle box compost reuse repair green earth sort clean
Computers: computer screen keyboard mouse file folder email print save click code program website data desk
Clocks and watches: clock watch hand face tick tock alarm hour minute second chime dial pendulum spring gear

# ---- people and places
Helpers in town: doctor nurse teacher baker firefighter postman farmer librarian vet chef driver builder cleaner gardener pilot
Hospital kindness: nurse doctor care help ward bed chart smile visit flowers card rest heal kind hope
At the vet: vet dog cat rabbit bird check scale collar treat nurse table calm kind patient pet
Post office: mail letter package stamp envelope address mailbox box line counter card label carrier sort deliver
Farmers market: market farmer honey cheese bread egg apple jam flowers plant stall basket fresh local bag
Cafe corner: cafe coffee tea cake croissant table chair window menu waiter cup saucer friend chat sofa
Bakery shop: baker bread roll bun cake pie scone oven flour tray loaf crust sugar icing counter
Toy shop: toy doll teddy puzzle kite ball train robot yoyo blocks puppet game marble spinning_top
Bookshop: book shelf novel poem story author cover page shop bookmark gift reading chair cafe quiet
The park: park bench tree path pond duck swing slide grass picnic dog kite fountain gate flower
Playground: swing slide seesaw roundabout climbing_frame sandpit rope ladder bench chalk ball skip hop tag laugh
The garden center: plant pot seed compost bulb tree shrub rose bench tool hose cafe fountain trellis mulch
Music shop: guitar piano violin drum flute string pick sheet music record speaker amp keyboard tuner case
Art gallery: gallery painting portrait landscape sculpture frame artist canvas brush exhibit visitor color light quiet
At the beach: beach sand sea wave shell towel umbrella bucket spade sun swim kite gull boat ice_cream

# ---- clothes and things
In the closet: shirt blouse skirt dress pants jeans sweater cardigan jacket coat scarf hat sock belt tie
Winter clothes: coat scarf hat gloves mittens boots sweater cardigan socks wool fleece hood earmuffs parka
Summer clothes: shorts sandals sunhat dress skirt shirt vest swimsuit sunglasses cap flip_flops linen cotton
Shoes: shoe boot sandal slipper trainer sneaker clog loafer heel lace sole buckle pair size polish
Hats: hat cap beret bonnet beanie sunhat bowler helmet hood crown visor boater straw feather brim
Accessories: scarf belt glove watch ring necklace bracelet brooch earring bag purse wallet umbrella hat sunglasses
Fabrics: cotton wool silk linen velvet denim satin lace tweed fleece flannel felt corduroy knit cashmere
Colors of the world: red orange yellow green blue purple pink brown black white gray gold silver violet teal
Soft things: pillow blanket feather cushion kitten fleece cloud velvet moss marshmallow bunny teddy scarf slippers wool
Shiny things: gold silver glitter crystal mirror star sequin pearl diamond jewel coin glass tinsel moon polish
Round things: ball wheel coin plate button orange moon sun clock ring bubble marble cookie pizza globe
Things that fly: bird kite plane balloon butterfly bee bat rocket helicopter glider feather leaf seed cloud dragonfly
Things with wheels: bike car bus train cart wagon stroller scooter skateboard tractor truck van wheelbarrow tricycle
Things that grow: tree flower seed child puppy kitten plant grass hair moss mushroom vine bean friendship garden
Yellow things: sun lemon banana daffodil buttercup canary butter cheese corn honey sunflower duckling star gold straw
Green things: grass leaf frog lime pea moss fern apple cucumber lettuce clover emerald jade parrot mint
Blue things: sky sea ocean sapphire blueberry denim bluebell whale forget wave river jay ice ink lagoon
Red things: apple cherry strawberry rose tomato poppy ruby robin cardinal fire_engine ladybug heart berry lobster
White things: snow cloud milk swan sugar salt pearl daisy paper rice egg chalk cotton lily dove
In pairs: shoes socks gloves mittens earrings twins boots chopsticks scissors glasses skates wings eyes ears hands
Things in the sky: sun moon star cloud bird kite plane rainbow balloon comet planet lightning rain snow satellite

# ---- sounds, feelings and senses
Sounds of nature: birdsong rustle breeze babble ripple buzz hum chirp hoot croak splash patter rumble whisper howl
Smells we love: bread coffee rain rose lavender cinnamon lemon grass pine vanilla soap baby popcorn cocoa orange
Taste: sweet sour salty bitter savory spicy tangy creamy crunchy juicy fresh zesty mild rich smooth
Touch: soft smooth rough warm cool fluffy silky bumpy sticky velvet fuzzy prickly gentle tickle hug
Listening: listen hear sound music song voice whisper echo bell chime tune birdsong rain laughter quiet
Happy feelings: happy joyful glad cheerful content calm proud hopeful grateful excited loved peaceful playful relaxed cozy
Laughing out loud: laugh giggle chuckle smile grin joke pun tickle silly funny comedy clown fun cheer glee
Love and care: love care hug kiss cuddle heart hold warmth kind tender cherish adore friend family home

# ---- fun word collections
Words that sparkle: sparkle glitter shimmer twinkle gleam glow shine dazzle glint flash sheen luster radiant bright
Words for walking: walk stroll wander amble hike march stride tiptoe skip hop trot ramble saunter step pace
Words for small: small tiny little wee mini petite compact pocket slight baby teeny short dainty miniature bit
Words for big: big large huge giant vast grand massive great enormous tall wide mighty jumbo broad hefty
Words for happy: happy glad merry jolly cheerful joyful content pleased delighted sunny chirpy upbeat bright blissful elated
Words for quiet: quiet hush calm still silent soft peaceful gentle low mute muffled whisper tranquil serene restful
Words for talking: talk chat say speak tell whisper murmur mutter chatter natter gossip call answer ask reply
Double letters: apple balloon coffee kitten puppy yellow butter pepper summer teddy bubble letter little happy cookie
Compound words: sunflower rainbow butterfly snowman bedroom cupcake toothbrush daylight moonlight starfish seashell doorbell pancake teapot
Alphabet animals: ant bear cat dog eel fox goat hare ibis jay koala lion mole newt owl
Five letter fun: apple bread chair daisy eagle flute grape house igloo jelly koala lemon mango night ocean
Words from the sea: sea salt sail seal shell shore surf tide wave spray foam reef kelp cove bay
Onomatopoeia: buzz hiss pop splash crash boom bang whoosh sizzle drip tick tock quack moo meow
Words for light: light glow shine gleam beam ray spark flicker flash twinkle glimmer shimmer blaze radiance dawn

# ---- more nature
Leaves and bark: leaf bark branch twig trunk root sap bud stem vein needle cone acorn seed ring
Mushrooms: mushroom fungus cap stem gill spore toadstool puffball chanterelle forest moss log damp autumn ring
Lichen and moss: moss lichen fern stone wall log damp shade green soft carpet forest bark rock spore
Pebbles and stones: pebble stone rock boulder flint granite marble slate shingle cobble gravel sand beach river smooth
Clouds and sky watching: sky cloud shape drift float puff wisp blue gray white lie grass dream imagine watch
Nests: nest twig straw feather egg chick robin wren swallow eave tree hedge moss mud weave
Spider webs: spider web silk thread dew morning pattern spin weave corner garden hedge sparkle gossamer strand
Frost patterns: frost fern crystal window cold morning ice sparkle white lace pattern glass winter breath delicate
Streams: stream brook creek babble pebble ripple bank reed stone bridge stepping fish minnow clear cool
Honey: honey bee hive comb wax nectar flower jar spoon toast tea sweet gold drizzle keeper

# ---- more food
Apples: apple orchard pie crumble cider juice core seed peel crunch red green tree harvest bramley
Oranges and lemons: orange lemon lime grapefruit tangerine satsuma clementine zest juice peel pip segment citrus marmalade squeeze
Tropical fruit: mango pineapple papaya banana coconut passion_fruit guava lychee kiwi melon lime starfruit plantain date fig
Soups and stews: soup stew casserole broth chowder hotpot goulash chili ladle pot bowl bread dumpling spoon simmer
Pies and tarts: pie tart crust pastry filling apple cherry lemon pumpkin custard meringue crumble dish slice oven
Cozy desserts: pudding custard jelly cobbler crumble cake rice bread sticky toffee sauce cream spoon bowl dessert
Eggs: egg yolk white shell boil poach scramble fry omelette nest chick hen basket cup soldiers
Cheese: cheese cheddar brie stilton feta mozzarella parmesan gouda cracker grater slice board wedge rind melt
Grains: wheat oats barley rice corn rye millet quinoa flour bread porridge cereal grain field harvest
Beans and peas: bean pea lentil chickpea pod sprout runner broad kidney soy green shell harvest soup salad
Root vegetables: carrot potato parsnip turnip beetroot radish swede yam ginger onion garlic celeriac root soil harvest
Sauces: sauce gravy ketchup mustard mayonnaise pesto salsa dressing custard syrup chutney relish dip vinaigrette curry
Spice rack: cinnamon nutmeg ginger clove cumin paprika turmeric saffron pepper chili cardamom vanilla anise coriander mustard
Kitchen scales: scales weigh flour sugar butter gram ounce cup spoon measure recipe bowl jug bake cake
Sleepover snacks: snack flashlight blanket cookie popcorn chocolate milk cake fruit whisper giggle secret pillow fort friends
Summer fruits: strawberry raspberry cherry peach apricot plum melon watermelon nectarine berry currant gooseberry blueberry grape fig
Autumn harvest: pumpkin squash apple pear plum blackberry nut chestnut corn potato onion carrot mushroom cider

# ---- home and family
Family gathering: family grandma grandpa aunt uncle cousin sister brother baby table meal photo hug story laughter
Grandparents: grandma grandpa story knit garden tea cookie photo album visit hug cuddle wisdom advice warmth
Brothers and sisters: brother sister sibling share play laugh game secret tease help twin fort den adventure hug
Babies: baby crib rattle bottle blanket cuddle smile giggle diaper stroller teddy lullaby bath rock sleep
Letters and notes: letter note card envelope stamp pen paper mailbox message address love friend write read reply
Photographs: photo album frame camera memory smile family vacation picture snap portrait wedding birthday print wall
Memories: memory photo album story vacation childhood song smell place friend laughter letter keepsake remember treasure
Weddings: wedding bride groom ring cake flowers veil dress suit dance vow music toast guest celebration
Housewarming: home key door gift plant candle neighbor welcome party friends room box paint garden kettle

# ---- work, study and making
In the classroom: teacher pupil desk chair board chalk pencil ruler book lesson bell register paint scissors glue
Study time: study book notes pen highlighter lamp desk library quiet focus revise learn read test coffee
Office day: office desk computer email meeting coffee printer phone calendar colleague lunch file folder paper stapler
Building site: builder brick crane digger cement ladder hammer helmet plan wall roof scaffold truck sand beam
Carpentry: wood saw plane chisel hammer nail glue clamp sand varnish joint drill bench shavings oak
Bakers dozen: flour yeast knead dough rise loaf oven crust crumb baker tin tray roll bun batch
The newsroom: newspaper story headline reporter editor page print deadline column photo caption interview desk morning news
Mail day: mail post letter parcel stamp envelope postman van address box delivery doorstep card package label

# ---- celebrations and gentle traditions
Fireworks night: firework sparkler rocket bonfire toffee apple scarf hat night sky bang whizz glow crowd cocoa
County fair: fair booth cake prize ribbon ferris_wheel games music band pie lemonade popcorn sunshine hayride pumpkin
Picnic in the park: picnic park blanket basket sandwich strawberry lemonade frisbee ball grass tree sun shade friends
Garden party: garden party lantern bunting table cake lemonade music guest flowers laughter hat sunshine chair lawn
Tea and cake: tea cake scone cream jam cup saucer pot slice sponge icing chat friend plate fork
Lantern festival: lantern light paper candle float river glow night wish sky festival crowd music color dragon
Harvest festival: harvest basket bread apple corn pumpkin wheat thanks share food table song festival loaf sheaf
Winter festival: lights snow candle star gift cocoa carol bell wreath tree ribbon card sleigh fire feast
Kite festival: kite sky wind string tail color festival hill park family spool soar breeze ribbon

# ---- gentle adventures
Treasure hunt: treasure map clue chest gold coin key compass island path spade dig find hunt riddle
Fairy tales: castle princess prince dragon fairy wand spell giant beanstalk frog crown knight tower kingdom story
Knights and castles: castle knight tower moat drawbridge shield banner horse king queen crown hall feast turret flag
Pirate adventure: pirate ship treasure map parrot island sail anchor chest gold flag telescope captain crew compass
Space explorer: rocket astronaut helmet moon star planet orbit launch countdown capsule comet galaxy mission explore gravity
Under the sea: sea fish coral reef whale dolphin octopus seahorse starfish shell bubble wave submarine diver kelp
Dinosaurs: dinosaur fossil bone egg claw tail stegosaurus triceratops museum dig ancient reptile giant footprint roar
Robots: robot gear wheel bolt battery circuit sensor arm beep light metal code program machine friend
Mermaids: mermaid tail scale shell pearl sea wave coral rock song comb fish mirror lagoon splash
Magic garden: fairy toadstool moss wand wish petal dew glow firefly lantern secret path gate spell bloom

# ---- extra everyday life
Morning routine: wake stretch shower brush teeth dress breakfast coffee tea toast pack coat keys door hello
Grocery list: milk bread eggs butter cheese apples bananas rice pasta tea coffee sugar flour jam soap
Rainy day indoors: rain puzzle book blanket tea cocoa game film window drawing baking cushion fort nap music
Sleepover: sleepover pajamas sleeping_bag pillow flashlight story snack film giggle friend midnight feast game quilt breakfast
A good book: book story chapter page hero adventure author ending plot character cover reading bookmark tea chair
Letters home: letter home family love news write read post stamp envelope miss hug soon friend care
The corner store: store milk bread paper candy stamps card counter register change bag shelf fridge open smile
Bike ride: bike ride path park helmet bell wheel pedal breeze hill lane friend picnic map pump
Walk in the rain: rain puddle boots umbrella coat hood splash drip worm gray fresh smell cloud walk dog
Sunday morning: sunday lie pancake coffee newspaper walk park brunch garden quiet slow family roast rest
Afternoon nap: nap sofa blanket cushion quiet dream snooze doze rest cat sun window yawn stretch calm
Winter evening: fire candle blanket soup tea book snow window slippers quilt lamp cozy cat stew warm
# ---- more science and nature study
Orchestra: violin viola cello bass flute oboe clarinet bassoon horn trumpet trombone tuba harp timpani conductor baton
Jazz club: jazz saxophone trumpet piano bass drums swing blues rhythm solo improvise club singer melody chord band
Notes and scales: note scale octave chord melody harmony rhythm tempo beat bar key major minor treble clef rest
Garden birds at the feeder: feeder seed suet nuthatch finch sparrow robin blackbird tit dove perch wing chirp flutter peck
Seabirds: gull tern puffin gannet albatross petrel cormorant shag guillemot razorbill fulmar skua kittiwake cliff wave
Aquarium: aquarium tank fish goldfish guppy tetra angelfish coral shell pebble plant bubble filter light glass snail
Fish in the river: salmon trout perch pike roach minnow carp bream chub dace eel grayling stream river pool
Ants and bees: ant bee colony queen worker nest hive tunnel honey pollen nectar comb swarm busy team
Tide and moon: tide moon ebb flow shore wave pull high low pool beach sand shell current rhythm
Volcanoes and mountains: volcano mountain summit crater lava ash rock peak slope ridge valley glacier range cone magma
The water cycle: water vapor cloud rain snow river ocean evaporate condense flow puddle stream lake mist dew
Atoms and molecules: atom molecule element proton neutron electron nucleus bond compound carbon oxygen hydrogen gas liquid solid
Microscope world: microscope lens slide cell sample focus magnify tiny bacteria pollen crystal fiber leaf hair zoom
Stargazing: stargazing telescope star planet moon comet meteor constellation galaxy night dark sky blanket flask chart
Seasons science: season orbit tilt axis equinox solstice spring summer autumn winter daylight warmth sun earth year
Trees and wood: timber plank log bark grain knot ring branch trunk sap resin oak pine beech maple
Ocean depths: ocean deep trench whale squid octopus anglerfish current dark pressure submarine coral reef diver sonar
Clouds up close: cumulus stratus cirrus nimbus fog haze mist drizzle droplet vapor sky layer wisp puff anvil
Leaf shapes: leaf oval heart needle palm lobe vein stem edge tip serrated smooth waxy broad narrow
Birdsong: song trill chirp tweet warble whistle call dawn chorus robin blackbird thrush wren lark nightingale
Nocturnal animals: owl bat fox badger hedgehog moth firefly mouse raccoon possum cricket frog night moon dark

# ---- more food and drink
Tea cupboard: tea green black herbal mint chamomile ginger lemon earl jasmine teapot kettle cup leaf bag
Coffee beans: coffee bean roast grind brew espresso latte filter press mug cream sugar aroma cafe barista
Italian kitchen: pasta pizza risotto olive basil tomato garlic parmesan mozzarella pesto gelato espresso bread lemon oregano
French bakery: croissant baguette brioche eclair macaron tart crepe pastry butter cream jam cafe bread flour oven
Japanese kitchen: sushi rice noodle miso tofu tempura ramen udon seaweed soy ginger wasabi tea chopsticks bowl
Indian kitchen: curry rice naan lentil chutney spice cumin turmeric ginger garlic mango yogurt chai samosa coriander
Mexican kitchen: taco tortilla bean rice salsa avocado lime chili corn cheese pepper tomato onion cilantro fiesta
Greek kitchen: olive feta yogurt honey lemon oregano bread salad tomato cucumber pita hummus grape fig oil
Bakes from the oven: loaf bun roll pie tart cake muffin scone cookie biscuit crumble pastry bread quiche flan
Kitchen spices: salt pepper chili cumin ginger garlic onion paprika cinnamon clove nutmeg mustard fennel anise saffron
Picnic treats: sandwich chips apple grapes cheese cake cookie lemonade juice berry pie sausage roll egg quiche
Farm shop: eggs milk cheese butter honey jam bread apples potatoes carrots meat flowers plants cream yogurt
Frozen treats: ice_lolly sorbet sundae cone scoop freezer cold popsicle gelato frost chill cube slush sprinkles
Hot dinners: stew soup pie roast curry chili casserole pasta risotto gravy potato dumpling rice noodle broth
Street food: pretzel waffle taco noodle falafel crepe hotdog kebab pancake corn churro dumpling burger fries stall
Fruit salad: apple banana orange grape melon kiwi mango berry peach pear pineapple cherry plum lime bowl

# ---- more home and everyday
Bathroom shelf: soap shampoo towel toothbrush toothpaste sponge flannel mirror comb brush lotion cotton bath shelf basket
Linen cupboard: sheet towel pillowcase duvet blanket quilt tablecloth napkin flannel shelf fold lavender fresh cotton linen
Utility room: washer dryer iron board basket peg line mop bucket broom brush sponge soap shelf boots
Front garden: gate path hedge lawn flower bed pot bench tree fence bird_bath gnome step porch door
Balcony garden: balcony pot plant herb tomato flower chair table rail view sky breeze sun trough bird
The attic: attic box trunk photo album suitcase lamp chair rocking_toy blanket dust beam window ladder
Rainy window: window rain drop glass cloud gray tea blanket book cat cushion lamp quiet cozy view
Kitchen table: table chair plate cup bowl spoon fork napkin vase candle bread salt pepper cloth jug
Fridge door: fridge magnet note drawing photo list calendar postcard milk juice cheese butter egg yogurt apple
Bookshelf: book shelf novel poem atlas dictionary diary album cookbook story spine cover page dust bookend
Toy box: toy teddy doll ball block puzzle car train kite yoyo robot puppet game drum boat
Craft cupboard: glue scissors paper card paint brush glitter ribbon button felt yarn bead tape pen stamp
Desk drawer: pen pencil eraser ruler stapler clip tape notebook sticky_note scissors glue envelope stamp calculator
Hallway: hall coat hook shoes boots umbrella mirror mat stairs door key lamp table post rug
Garage: garage car bike tool box shelf ladder hose paint workbench drill hammer saw spanner light

# ---- more feelings and kindness
Warm hearts: warm heart kind gentle caring tender loving sweet generous thoughtful giving friendly loyal hug smile
Calm waters: calm still pond lake ripple reflection quiet breeze reed swan lily float drift peace soft
Brave hearts: brave bold daring hero courage try step leap strong steady spirit fearless heart gallant spark
Good company: friend companion pal buddy mate neighbor partner family team crew circle club group guest host
Helping hands: help hand share give lend carry lift support care assist serve offer guide teach mend
Quiet strength: strength patience calm steady gentle resolve root anchor oak mountain rock tide heart spine
Blooming: bloom blossom flower petal bud grow open unfold sun light spring garden seed root color
Everyday gratitude: thanks home food water friends family health sunshine music books laughter rest warmth kindness sleep
Uplifting words: uplift hope cheer joy bright shine smile grow rise soar lift dream believe spark glow
Gentle mornings: morning slow tea toast sunlight window bird stretch yawn blanket quiet coffee garden dew calm
Little treasures: shell feather pebble acorn button marble coin ribbon stamp badge key locket bead star leaf
Peace and quiet: peace quiet calm hush still rest silence soft gentle slow breath ease pause stillness serene

# ---- more hobbies and play
Quilting: quilt patch fabric cotton needle thread pin stitch block pattern border batting pieces square seam
Embroidery: embroidery thread needle hoop stitch floss pattern linen flower cross chain satin knot color design
Calligraphy: calligraphy pen ink nib brush letter stroke script paper line curve flourish practice card name
Woodworking: wood plank saw plane chisel sand drill glue clamp joint shelf box stool bench varnish
Jigsaw puzzles: jigsaw piece edge corner picture box table sky sort fit shape pattern tray border click
Card games: card deck shuffle deal hand trick suit heart diamond club ace king queen jack snap
Chess: chess board king queen rook bishop knight pawn check move square castle opening game player
Marbles and games: marble ring shooter hopscotch skipping rope tag hide_seek chalk ball jacks conkers yoyo spinning
Music lessons: lesson piano scale practice teacher note book chord metronome tune song finger pedal key recital
Choir practice: choir sing song voice alto soprano tenor bass harmony hymn carol rehearse conductor music note
Ballet class: ballet dancer tutu slipper pointe barre plie pirouette leap spin stage music mirror studio twirl
Swimming lessons: swim pool float kick arm stroke lane goggles towel splash dive lesson badge breath wave
Skateboard park: skateboard ramp wheel deck trick jump roll helmet pad board park kick flip ride grind
Rock climbing: climb rock wall rope harness chalk hold grip ledge summit helmet boulder route partner belay
Sailing club: sail dinghy mast boom rope knot tide wind life_jacket harbor race crew rudder tiller buoy
Dog show: dog show ribbon rosette groom brush collar lead trick agility jump tunnel judge handler parade
Pony club: pony horse saddle bridle stable hay groom brush hoof ride trot canter jump rosette paddock
Bird feeder: feeder seed nut robin finch sparrow tit wren dove perch peck flutter garden winter window
Stamp collecting: stamp album collect envelope postmark tweezers magnifier hinge perforation page country rare series swap post
Lego building: brick block build tower house car base plate set piece color stack click model figure

# ---- more travel and places
Canal boat: canal boat barge lock towpath rope bridge duck swan heron tiller cabin kettle stove water slow
Ferry crossing: ferry deck wave gull harbor ramp cabin ticket car truck horizon wind salt spray port
Mountain railway: train track tunnel bridge viaduct station mountain valley snow view window carriage whistle steam summit
Cable car: cable car cabin mountain view summit valley glide slope snow lake peak ride wire station
Lighthouse: lighthouse lamp beam light tower keeper rock sea wave ship night fog horn spiral stair
Old town: cobble street square fountain clock bell tower market cafe shop lane bridge gate wall
Countryside inn: inn fire tea soup pie table room key lamp garden sign village walk dog map
The harbor wall: harbor wall boat rope net lobster pot crab gull tide steps bench chip ice_cream flag
Airport lounge: lounge gate flight window plane coffee snack book seat board pass bag passport clock announcement
Beach huts: hut beach colors row door deck chair kettle towel sand sea shell flag bench window
Island hopping: island ferry boat harbor beach cove bay lagoon palm sand sail sea wave village map
Mountain hut: hut cabin summit trail boots rope stove soup bunk blanket view star lantern map snow
Night train: train sleeper bunk berth carriage window moon star station tea blanket pillow journey dawn whistle

# ---- more fun words
Words for glow: glow gleam shine shimmer sparkle twinkle glimmer flicker beam radiance halo luster sheen glint blaze
Words for kind: kind gentle caring warm thoughtful generous tender considerate friendly helpful patient sweet loving giving good
Words for bright: bright vivid sunny radiant shining brilliant luminous clear light gleaming glowing dazzling cheerful golden lively
Words for soft: soft fluffy fuzzy silky velvety downy plush smooth cushy tender gentle light feathery woolly spongy
Words for calm: calm peaceful serene tranquil still quiet placid gentle mellow restful relaxed composed easy soothing settled
Words for moving water: flow trickle ripple babble splash gush pour drip stream ebb surge swirl lap wash cascade
Animal sounds: moo baa oink quack neigh cluck bark meow purr hoot chirp buzz croak hiss tweet
Words with oo: moon spoon book cook wood boot food cool pool room broom hoop loop moose goose
Words with ee: tree bee sheep feet seed green queen sleep week wheel cheese sweet beet deer steep
Things that open: door window book box gift eye flower bud gate lid jar tin curtain umbrella shell
Things with keys: piano keyboard lock door car map computer typewriter chest diary clock organ accordion flute padlock
Things that bounce: ball trampoline spring kangaroo rabbit frog balloon jelly bubble castle bean yoyo rubber pogo tennis
Things that ring: bell phone chime alarm doorbell clock bicycle sleigh tambourine triangle glass gong jingle timer
# ---- American seasons and gatherings
Thanksgiving table: turkey stuffing gravy pie pumpkin cranberry corn rolls family thanks table potato yam feast napkin candle
Road trip: car map snacks music window highway motel diner sunglasses mile sign scenery friend playlist cooler
National parks: canyon geyser ranger trail bison elk forest waterfall campsite lake mountain vista map hike lodge
Farmers market: market stall tomato peach honey jam flowers basket bread corn berry apple cheese herbs pie
Backyard: yard lawn fence swing grill hammock garden birdhouse feeder sprinkler patio porch tree shade flowers
Lemonade stand: lemon sugar water ice pitcher cup table sign price coins sunny neighbor smile sip straw
Ice cream shop: cone scoop sprinkles vanilla chocolate strawberry sundae cherry waffle cup spoon swirl topping mint fudge
Diner breakfast: pancake waffle syrup bacon egg toast coffee booth menu juice butter biscuit grits jam omelet
Snow day: snow sled snowman mittens cocoa fort boots scarf hat flakes shovel blanket window cozy nap
Fall leaves: maple oak red orange gold rake pile crunch sweater cider pumpkin apple hayride acorn breeze
Spring cleaning: broom mop dust window fresh open sunshine tidy sort donate box shelf polish sponge bucket
Garden birds: robin cardinal sparrow finch bluebird chickadee wren jay hummingbird dove feeder nest seed song branch
Ocean friends: whale dolphin turtle seal otter octopus starfish crab jellyfish coral fish reef wave shell kelp
Tide pools: tide pool rock crab anemone starfish mussel barnacle snail urchin shell kelp wave splash bucket
Train ride: train track station ticket whistle window seat conductor platform tunnel bridge view journey caboose engine
Art class: paint brush canvas easel crayon marker clay glue paper color sketch palette glitter scissors frame
Science fair: magnet volcano poster plant experiment microscope ribbon project question idea model light battery robot
Board games: dice board card token spinner turn player checkers chess puzzle team laugh friend score
Movie night: movie popcorn couch blanket screen snacks friends family remote story laugh cozy candy pillow
A day with the pups: walk sniff nap ball fetch treat bowl water bed leash park wag belly snooze puppy
Good neighbors: wave smile share borrow help mail porch garden cookie hello friend street block party
Starry night: star moon comet planet galaxy telescope orbit sky night glow twinkle wish meteor nebula constellation
Morning routine: wake stretch shower brush teeth coffee breakfast dress shoes bag keys door sunshine smile walk
Bedtime: pajamas teeth story book lamp pillow blanket hug kiss dream moon star lullaby yawn sleep
Deep breaths: breathe slow inhale exhale pause calm steady soft gentle ease rest settle quiet still peace
Words of thanks: thanks grateful kind help share gift smile note card hug friend neighbor teacher family warm
Mountain cabin: cabin fire log porch rocking chair blanket view pine trail creek lantern cocoa quiet stars deer
Sewing basket: needle thread button pin fabric pattern stitch hem scissors thimble spool quilt patch sew yarn
Houseplants: fern ivy cactus succulent pot soil water sunlight leaf orchid mister window shelf grow sprout
Summer garden: tomato zucchini sunflower bean pepper cucumber basil hose bee butterfly shade hat watering_can harvest
Porch swing: porch swing rocker lemonade breeze evening fireflies neighbor wave chat creak cushion sunset crickets glow
Pancake morning: pancake batter flip griddle spatula syrup butter blueberry stack plate fork fluffy golden warm breakfast
Rainy afternoon: rain window puddle umbrella boots cocoa book blanket nap drizzle cloud drops tea quilt candle
Picnic in the park: picnic blanket basket sandwich apple grapes lemonade cookie shade tree grass kite frisbee ants sunshine
Beach cleanup: beach bag glove shell sand wave gull bottle recycle friends help tide shore clean sunshine
Knitting circle: knit yarn needle scarf mitten sweater stitch purl wool loop row pattern friends tea chat
Library visit: library book shelf card story author chapter page quiet desk lamp reader atlas poem fable
Community garden: garden plot seed soil water trowel sprout tomato bean neighbor share harvest compost fence sunflower
Kite day: kite string wind tail sky soar dive loop spool breeze hill field color ribbon run
Hot cocoa: cocoa mug marshmallow whipped cream chocolate milk warm steam spoon blanket fire winter cozy sip
Gentle walk: walk path step breathe look listen breeze bird tree flower shade bench rest slow smile
Little wins: step progress try begin finish smile rest learn grow notice enough small proud steady kind
'''


HERE = os.path.dirname(os.path.abspath(__file__))


def parse(text=TEXT):
    """[(name, [word, ...]), ...] from the text above (duplicates within a theme dropped)."""
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or ':' not in line:
            continue
        name, rest = line.split(':', 1)
        seen, ws = set(), []
        for w in rest.split():
            w = w.strip().lower()
            if w.replace('_', '').isalpha() and w not in seen:
                seen.add(w)
                ws.append(w)
        out.append((name.strip(), ws))
    return out


def all_themes():
    """The finished themes, as written by make_themes.py (the old ones first)."""
    import json
    path = os.path.join(HERE, 'build', 'themes.json')
    if not os.path.exists(path):
        from make_themes import build
        return build(write=False)
    return json.load(open(path))
