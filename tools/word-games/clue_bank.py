"""Hand-written crossword clues, in plain, warm American English. These always win over dictionary
clues (good_clues.py). Several clues per answer let the same word read differently from puzzle to
puzzle. Every clue here still goes through clue_check.py, so a clue that repeats its answer or
disagrees with it in number or tense is caught.
Add freely, here or in clue-bank/*.txt, one answer per line:  word: clue | another clue | a third
"""
import glob
import os

HAND = {}


def add(block):
    for line in block.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        word, clues = line.split(':', 1)
        HAND.setdefault(word.strip().lower(), []).extend(c.strip() for c in clues.split('|') if c.strip())


# ---------------------------------------------------------------- three letters
add('''
see: Notice with your eyes | Spot | Take a look at | "I ___ what you mean"
yes: Opposite of no | Happy answer to "Want some pie?" | Word of agreement | Nod's meaning
any: Even one | Whichever you like | "Is there ___ more cake?"
too: Also | As well | More than enough, as in "___ hot to touch"
eat: Have a meal | Dig in at dinner | Enjoy some food
two: Number of shoes in a pair | One plus one | Tea for ___ | Couple count
new: Just out of the box | Fresh | Never used before | Opposite of old
say: Put into words | Speak | Tell | "Just ___ the word"
era: Long stretch of history | Period of time | Age of the dinosaurs, for one
all: Every bit | The whole thing | Each and every | "___ together now"
now: Right this minute | At present | "Here and ___"
own: Have | Possess | Call your ___
tea: Drink steeped in a pot | Chamomile or Earl Grey | Hot drink with a bag
but: However | Yet | Except
ear: What you hear with | Corn unit | Something to lend a friend
sea: Big salty body of water | Ocean | Where waves roll
car: Sedan or hatchback | Vehicle in a driveway | Auto
yet: So far | Still | "Not ___, but soon"
top: Highest point | Peak | Summit | Spinning toy
ski: Glide down a snowy slope | Winter sport board, one of a pair | Hit the slopes
ago: In the past | Back then | "Long, long ___"
put: Set down | Place | Rest, as a cup on a table
run: Jog | Go faster than a walk | Dash | Sprint
not: Opposite of "is," perhaps | "___ now, thanks"
age: How old you are | Candles on a cake count it | Era
inn: Cozy country lodge | Bed-and-breakfast | Roadside place to stay
was: "Once upon a time there ___ ..." | Existed, back then
net: Mesh for catching butterflies | Tennis court divider | Goal's back
ego: Sense of self | Self-image | It can get bruised
act: Play a part | Perform on stage | Part of a play
due: Expected | Owed | Library book's deadline status
spa: Place for a massage and a soak | Relaxing retreat | Hot springs resort
few: Not many | A small number | "Just a ___ minutes"
are: "We ___ the world" | Exist, for us | "Here you ___"
ten: Number of fingers | Perfect score | Toes count
art: Painting and sculpture | Museum collection | Gallery offering
saw: Toothed woodworking tool | Carpenter's cutter | Noticed
oil: Olive or coconut, for cooking | What a squeaky hinge needs | Painter's medium
tie: Draw in a game | Knot, as laces | Neckwear with a knot
bus: School ride | Big yellow vehicle | Ride with many stops
sit: Take a seat | Rest in a chair | "___ down and stay a while"
win: Come in first | Be victorious | Take the prize
lit: Aglow | Turned on, as a lamp | Brightened, as a room
arc: Rainbow shape | Curve | Path of a tossed ball
pie: Apple dessert | Pumpkin treat | Slice of heaven at Thanksgiving
toe: One of ten on your feet | Tip of a sock | Piggy of nursery-rhyme fame
add: Sum up | Put in more | Toss in, as salt
pay: Settle the bill | Wages | Pick up the check
owl: Night bird that hoots | Wise-looking bird | Big-eyed bird of the woods
odd: Not even | Unusual | Like three or five
cue: Signal for an actor | Hint | Pool stick
ash: Tree with winged seeds | Fireplace leftover | Kind of tree
tee: Golf ball's perch | Casual shirt | Golfer's peg
guy: Fellow | Regular fellow | Chap
icy: Frosty | Slippery in winter | Very cold
cap: Baseball hat | Bottle top | Pen's lid
dad: Father | Pop | Pa
par: Golf score standard | Average | Normal level
roe: Fish eggs | Caviar, essentially
awe: Wonder | Amazement | What a starry sky can fill you with
ore: Rock with metal in it | Miner's find | Raw metal source
dry: Not wet | Like a desert | Towel off
log: Fireplace piece | Diary | Chunk of firewood
sky: Blue overhead | Where clouds drift | Heavens
ray: Beam of sunlight | Gleam | Sting ___
tag: Playground chase game | Price label | "You're it!" game
map: Guide for a road trip | Atlas page | Treasure hunter's aid
tar: Road paving goo | Sticky black stuff | Blacktop material
owe: Be in debt | Have an IOU | Need to pay back
ask: Pose a question | Inquire | Request
ink: Pen filler | Printer's need | Octopus's cloud
ivy: Climbing vine | Wall-covering plant | Poison ___
rim: Edge of a cup | Border | Basketball hoop's edge
ape: Gorilla or chimp | Imitate | Big primate
web: Spider's home | Internet | Silky trap
gap: Space between | Opening | Break in a fence
pen: Ballpoint | Writing tool | Pig's home
pal: Buddy | Friend | Chum
aid: Help | Assist | First-___ kit
cab: Taxi | Yellow ride | Hailed car
pop: Soda | Balloon's sound | Dad
yam: Sweet potato cousin | Orange root vegetable | Thanksgiving side
row: Line of seats | Use oars | Line
bee: Honey maker | Buzzing garden visitor | Spelling contest
gem: Jewel | Treasure | Precious stone
opt: Choose | Decide | Pick
oar: Rowboat paddle | Canoe helper | It pulls through water
toy: Plaything | Teddy bear, for one | Kid's treasure
hat: Cap or beret | Head covering | Something to tip
err: Make a mistake | Slip up | Goof
tip: Helpful hint | Gratuity | Pointy end
nap: Short sleep | Afternoon snooze | Catnap
sir: Polite address | Title for a knight | "Yes, ___"
aim: Goal | Point at a target | Intend
lid: Pot's cover | Top of a jar | Eyelid
mat: Welcome ___ | Yoga pad | Doormat
dig: Use a shovel | Excavate | Garden task
den: Lion's home | Cozy room | Fox's burrow
orb: Sphere | Globe | Round glowing thing
nod: Yes, silently | Head bob | Agree without words
oak: Tree that grows from an acorn | Sturdy hardwood | Mighty tree
lap: One trip around the track | Where a cat curls up | Sip like a kitten
buy: Purchase | Pick up at the store | Shop for
pod: Home of peas | Whale group | Seed holder
lip: Edge of a cup | Part of a smile | Rim
bye: So long | See you | Farewell
tan: Sun-kissed color | Light brown | Beige
ant: Tiny picnic visitor | Hill builder | Busy insect
rid: Clear away | Free | Get ___ of
dye: Color, as fabric | Tint | Easter egg coloring
dam: Beaver's building | River barrier | Water holder
fun: Good time | Enjoyment | Play
fan: Admirer | Cooling device | Supporter
kit: Set of supplies | Young fox | First-aid ___
pin: Sewing tack | Bowling target | Brooch
six: Half a dozen | Number of sides on a cube | Legs on an insect
tin: Metal for cans | Muffin ___ | Pie ___
apt: Fitting | Suitable | Likely
duo: Pair | Twosome | Couple
dew: Morning droplets on grass | Morning moisture | Wet sparkle at dawn
bid: Offer at an auction | Attempt | Offer
sip: Tiny taste | Small drink | Drink slowly
wed: Get married | Marry | Tie the knot
pit: Peach center | Cherry stone | Hole in the ground
hen: Mother chicken | Egg layer | Barnyard bird
rub: Massage | Polish | Knead
tad: A little bit | Smidgen | Touch
ode: Poem of praise | Tribute in verse | Keats wrote one to a nightingale
yak: Shaggy ox of the mountains | Chat on and on | Long-haired mountain animal
hay: Dried grass for horses | Barn bale | Roll in the ___
rib: Part of the rib cage | Barbecue favorite | Tease lightly
sly: Crafty | Clever and sneaky | Like a fox
pat: Gentle tap | Light touch | Pet softly
bay: Body of water by the shore | Cove | Window seat spot
bin: Storage box | Recycling container | Bread ___
sum: Total | Addition result | Amount
sow: Plant seeds | Scatter, as seeds | Mother pig
hop: Bunny's move | Jump on one foot | Skip
sew: Stitch | Use a needle | Mend
fur: Coat of a cat | Soft animal hair | Fluff
rag: Dust cloth | Cleaning cloth | Scrap of fabric
rug: Floor covering | Carpet | Mat
cub: Young bear | Baby lion | Den youngster
beg: Plead | Ask very nicely | Sit up for a treat, like a dog
dug: Used a shovel | Excavated | Turned the soil
gig: Musician's job | Show | Booking
tub: Bath | Container | Place for a soak
tap: Faucet | Light knock | Gentle touch
gym: Workout place | School sports hall | Place to exercise
pep: Energy | Zip | Spirit
vie: Compete | Contend | Strive
pad: Notepad | Cushion | Lily ___
cog: Gear tooth | Small part of a machine | Wheel tooth
nay: Vote against | No | Not a yea
fog: Thick mist | Haze | Harbor cloud
woo: Court | Win over | Charm
fee: Charge | Price | Payment
dab: Small bit | Pat lightly | Touch of paint
goo: Sticky stuff | Gunk | Slime
vat: Big tub | Large container | Tank
tow: Pull | Drag | Haul
bun: Burger bread | Hair knot | Sweet roll
mud: Wet dirt | Puddle stuff | Where pigs roll
hut: Small cabin | Shack | Simple shelter
bug: Insect | Beetle | Pester
jar: Pickle holder | Container for jam | Glass with a lid
why: For what reason | Toddler's question | "___ not?"
bib: Baby's napkin | Lobster-eating need | Eating cover
axe: Chopping tool | Hatchet's big cousin | Lumberjack's tool
jaw: Chin part | Lower part of the face | Chomper
zoo: Place with lions and zebras | Animal park | Menagerie
pun: Play on words | Joke with a twist | Wordplay
lab: Science room | Friendly retriever | Test place
din: Racket | Noise | Loud clatter
fin: Fish part | Shark's tell | Swimmer's part
did: Performed | Carried out | Accomplished
ahh: Sigh of relief
''')

# ---------------------------------------------------------------- common four and five letters
add('''
event: Occasion | Happening | Gathering to remember
image: Picture | Likeness | Reflection
sleep: Rest at night | Snooze | Slumber
taste: Flavor | Sample | Try a bite
extra: Bonus | More than enough | Spare
every: Each | All | "___ little bit helps"
order: Tidiness | Request at a restaurant | Arrangement
often: Frequently | Many times | Again and again
paper: Writing sheet | Newspaper | Origami need
star: Twinkler in the night sky | Lead actor | Celebrity
early: Before the usual time | At dawn | Not late
even: Level | Flat | Like two or four
still: Motionless | Calm | Nevertheless
three: Number of little pigs | Trio count | Wishes a genie grants
ocean: Atlantic or Pacific | Deep blue sea | Home of whales
after: Following | Later than | Behind
years: Birthdays count them | Decades are made of them | Long stretches
isle: Small island | Key | Speck of land at sea
inner: Inside | Interior | Innermost, almost
table: Dining furniture | Chart | Where you eat dinner
eight: Number of legs on a spider | Octet count | Figure ___
ideas: Brainstorm results | Thoughts | Notions
start: Begin | Kick off | Get going
notes: Musical symbols | Reminders | Jottings
under: Beneath | Below | Lower than
pasta: Spaghetti or penne | Italian favorite | Noodles
again: Once more | One more time | Anew
dream: Night-time story in your mind | Hope | Fantasy
over: Finished | Above | Done
names: Labels | Titles | What name tags show
yacht: Fancy boat | Sailing ship | Big sailboat
today: This day | Now | Not tomorrow
time: What a clock tells | Hours and minutes | Moment
apple: Fall fruit | Orchard fruit | A teacher's gift
first: Number one | Earliest | Top place
ease: Comfort | Rest | Simplicity
about: Concerning | Around | Approximately
total: Sum | Whole | Complete
need: Require | Want badly | Must-have
large: Big | Huge | Spacious
along: Beside | Forward | "Come ___!"
noise: Racket | Sound | Clatter
idea: Thought | Plan | Notion
rest: Relax | Nap | Remainder
year: Twelve months | Calendar span | Annual period
yards: Lawns | Football field units | Backyards
enter: Go in | Come inside | Key on a keyboard
bud: Unopened flower | Buddy | Sprout
edge: Border | Rim | Brink
royal: Kingly | Regal | Of a queen
photo: Picture | Snapshot | Pic
drama: Play | Theater | Soap opera stuff
sisters: Female siblings | Siblings who share a closet, maybe | Sibs
ideal: Perfect | Model | Dream
house: Home | Dwelling | Place to live
issue: Topic | Edition of a magazine | Matter
radio: FM device | Broadcast receiver | Car music source
stem: Flower stalk | Stalk | Stalk of a cherry
sugar: Sweetener | Cane crystals | Sweet stuff in coffee
shelf: Bookcase level | Ledge | Place for books
yesterday: The day before today | Just recently
eagle: Bald bird of prey | Golf score of two under | Soaring bird
will: Determination | Desire | Resolve
place: Spot | Location | Site
human: Person | People-y | Earthling
open: Not shut | Ajar | Unlock
near: Close by | Nearby | Not far
artists: Painters | Creators | Sculptors and painters
thing: Object | Item | Whatchamacallit
island: Land surrounded by water | Isle | Hawaii, for one
cocoa: Hot chocolate | Chocolate powder | Warm winter drink
seed: Tiny plant starter | Kernel | Pit
trade: Swap | Exchange | Occupation
satin: Shiny smooth fabric | Glossy cloth | Silky material
therefore: Thus | Hence | So
last: Final | End | Latest
needles: Knitting tools | Pine tree leaves | Sewing tools
river: Mississippi, for one | Flowing water | Stream
treat: Reward | Snack | Dessert
each: Every | Apiece | Individually
learn: Study | Find out | Discover
note: Short letter | Musical tone | Memo
nest: Bird's home | Cozy home | Robin's cup of twigs
cases: Boxes | Suitcases | Containers
magic: Wizardry | Enchantment | Card tricks
classic: Timeless | Well-loved | Standard
iron: Press clothes | Metal | Golf club
rain: Showers | Drizzle | Wet weather
costs: Prices | Charges | Expenses
heart: Love symbol | Center | Valentine shape
arena: Stadium | Sports hall | Venue
home: Where the heart is | House | Place you live
only: Just | Sole | Merely
story: Tale | Narrative | Floor of a building
guess: Estimate | Hunch | Figure
imagine: Picture in your mind | Pretend | Dream up
owner: Keeper | Holder | Possessor
cream: Coffee addition | Lotion | Top of the milk
free: No charge | Loose | At liberty
needs: Requires | Wants | Must haves
panda: Black-and-white bear | Bamboo lover | Giant ___
ready: Prepared | Set | Good to go
drive: Steer a car | Motivation | Road trip
attic: Space under the roof | Garret | Storage room up top
lists: Checklists | Rosters | To-do sheets
smile: Grin | Beam | Happy face
blanket: Cozy cover | Throw | Picnic spread
leaf: Tree part that turns gold in fall | Page | Foliage bit
room: Space | Chamber | Den
mere: Just | Only | Simple
name: Moniker | Title | Label
train: Railroad ride | Coach | Practice
stop: Halt | End | Pause
logic: Reason | Sense | Thinking
team: Squad | Group | Crew
breeze: Light wind | Easy task | Zephyr
used: Secondhand | Worn | Employed
tide: Ocean's rise and fall | High or low water | Flow
range: Scope | Stove | Mountain chain
true: Real | Accurate | Correct
efforts: Attempts | Tries | Endeavors
offices: Workplaces | Bureaus | Rooms with desks
friend: Pal | Buddy | Companion
layer: Stratum | Coating | Cake tier
orchestra: Symphony | Musicians | Band of strings and horns
same: Identical | Equal | Alike
asset: Resource | Strength | Advantage
share: Portion | Split | Give some
noodles: Pasta strands | Ramen | Spaghetti and such
letters: Mail | Alphabet parts | Notes
network: System | Web | Links
chair: Seat | Armchair | Place to sit
transport: Carry | Move | Travel
oven: Place to bake cookies | Baker's box | Stove part
there: In that place | Yonder | Over ___
paint: Color | Brush on | Coat
calm: Peaceful | Serene | Tranquil
friends: Pals | Buddies | Companions
element: Part | Component | Factor
tower: Tall structure | Spire | Steeple
newspaper: Daily news | Paper | Gazette
cake: Birthday dessert | Layered treat | Frosted dessert
point: Tip | Purpose | Score
agree: Concur | Say yes | See eye to eye
thank: Show gratitude | Say "much obliged" | Credit
life: Existence | Being | Living
party: Celebration | Bash | Get-together
tickets: Passes | Admission slips | Stubs
crystal: Clear glass | Quartz | Gem
outside: Outdoors | Exterior | Out
help: Assist | Aid | Support
scarf: Muffler | Wrap | Neck warmer
pattern: Design | Template | Motif
whole: Entire | Complete | Total
clear: See-through | Transparent | Clean
sofa: Couch | Settee | Futon
exact: Precise | Correct | Accurate
seven: Days in a week | Number of dwarfs | Lucky number
season: Spring or fall | Time of year | Flavor with salt
style: Fashion | Flair | Manner
station: Train stop | Depot | Post
answers: Replies | Solutions | Responses
songs: Tunes | Melodies | Ballads
address: Street number | Speech | Location
other: Different | Else | Alternate
moss: Soft green carpet on a stone | Soft green growth | Fern's neighbor
garden: Place to grow flowers | Backyard patch | Where tomatoes grow
care: Look after | Concern | Tender attention
real: Genuine | True | Actual
onion: Layered vegetable | Salsa ingredient | Bulb with a bite
article: Story in a newspaper | Item | Piece
nearest: Closest | Next door | Handiest
video: Film clip | Recording | Footage
shelter: Refuge | Cover | Haven
listening: Paying attention to sound | Hearing | Tuning in
ahead: In front | Forward | Before
space: Room | Gap | Outer ___
sheep: Wooly farm animal | Flock animal | Lamb's parent
power: Strength | Energy | Might
hello: Greeting | Hi | Hey
wonderful: Amazing | Marvelous | Terrific
lamp: Light | Lantern | Reading light
earn: Get paid | Make | Deserve
entry: Doorway | Entrance | Item in a diary
toast: Bread browned | Salute | Cheer to a friend
close: Near | Shut | Tight
olive: Pizza topping | Green or black fruit on a branch | Oil source
idol: Hero | Star | Role model
aroma: Scent | Smell | Fragrance
youth: Young person | Adolescence | Early years
pine: Tree with needles | Evergreen | Tall conifer
show: Display | Program | Exhibit
vow: Promise | Pledge | Oath
joy: Delight | Happiness | Glee
towel: Bath linen | Drying cloth | Beach towel
thought: Idea | Notion | Considered
special: Unique | Out of the ordinary | Particular
next: Following | Upcoming | Coming up
loyal: Faithful | True | Devoted
shrub: Bush | Hedge plant | Low green plant
deer: Doe or buck | Forest animal | Fawn's parent
novel: Book | New | Original
aside: Apart | To one side | Whisper on stage
nail: Hammer's target | Fingertip part | Hit
orbit: Moon's circuit | Path around the Earth | Circle
wax: Candle material | Polish | Grow like the moon
work: Job | Labor | Career
plant: Flower or fern | Sow | Factory
want: Wish | Desire | Crave
money: Cash | Dough | Bucks
trio: Threesome | Three | Group of three
ridge: Crest | Edge | Mountain ___
raise: Lift | Elevate | Increase
equal: Even | Same | Match
sight: Vision | View | Scene
keep: Hold | Retain | Save
strip: Narrow piece | Band | Stripe
elk: Big deer | Moose's cousin | Forest animal
oasis: Desert spring | Refuge | Haven in the sand
noble: Honorable | Grand | Lordly
paste: Glue | Dough | Spread
none: Not one | Zero | Nil
stew: Hearty dish | Simmer | Soup
stage: Platform | Phase | Theater floor
urge: Impulse | Encourage | Desire
sort: Organize | Kind | Classify
dress: Frock | Gown | Put on clothes
dance: Waltz | Boogie | Move to the beat
spin: Twirl | Whirl | Rotate
match: Game | Pair | Lighter's cousin
happy: Glad | Joyful | Cheerful
theme: Topic | Motif | Idea
spot: Place | Dot | Notice
cheer: Hurrah | Applaud | Encourage
landscape: Scenery | View | Countryside
alone: By yourself | Solo | On your own
side: Edge | Flank | Team
pier: Dock | Wharf | Jetty
jot: Note down | Scribble | Write quickly
date: Calendar day | Palm fruit | Romantic outing
tape: Adhesive strip | Ribbon | Record
donut: Glazed treat | Sweet ring | Bakery treat with a hole
piano: Instrument with 88 keys | Grand ___ | Keyboard instrument
islands: Isles | Keys | Archipelago parts
easel: Painter's stand | Art stand | Canvas holder
opinion: View | Belief | Take
news: Headlines | Updates | Current events
respect: Esteem | Honor | Regard
beach: Sandy shore | Seaside | Coast
window: Glass pane | Pane | Opening
picnic: Meal in the park | Outdoor lunch | Blanket feast
elite: Top | Best | Choice
pilot: Aviator | Flier | Captain of a plane
alert: Watchful | Awake | Warning
wow: Amazing | Whoa | Cool
delta: River mouth | Greek letter | Triangle
press: Push | Squeeze | Media
read: Browse a book | Peruse | Study
tulip: Spring flower | Dutch bloom | Bulb flower
phone: Call | Cell | Telephone
robin: Red-breasted bird | Songbird | Spring bird
pear: Fruit | Juicy fruit | Bartlett, for one
average: Normal | Mean | Ordinary
final: Last | End | Ultimate
view: Scene | Outlook | Opinion
cheese: Cheddar | Swiss | Pizza topping
hub: Center | Core | Wheel center
rent: Lease | Charge | Hire
lava: Volcano's flow | Molten rock | Magma
arts: Crafts | Humanities | Painting and music
soda: Pop | Fizzy drink | Soft drink
root: Base | Origin | Plant's anchor
trail: Path | Track | Hiking path
line: Row | Queue | Stripe
shop: Store | Boutique | Buy
case: Box | Example | Crate
allow: Let | Permit | Grant
plea: Appeal | Request | Entreaty
found: Discovered | Located | Came across
plan: Scheme | Blueprint | Arrangement
bread: Loaf | Baked goods | Sourdough
steam: Vapor | Mist | Cook with vapor
topic: Subject | Theme | Matter
elder: Older | Senior | Tree with berries
tempo: Beat | Pace | Speed of music
smell: Scent | Aroma | Whiff
ship: Boat | Vessel | Liner
boat: Vessel | Ship | Canoe
partner: Mate | Buddy | Teammate
sister: Sibling | Sis | Family member
emerald: Green gem | Precious stone | Bright green
overnight: All night | Suddenly | Next day
jog: Run slowly | Trot | Nudge
saga: Epic | Long story | Chronicle
route: Path | Road | Course
peace: Calm | Harmony | Stillness
inch: Small measure | Creep | Tiny step
path: Trail | Way | Lane
never: Not ever | At no time | Nevermore
meet: Greet | Encounter | Get together
grow: Get bigger | Sprout | Expand
reach: Stretch | Arrive at | Extend
rainbow: Arc of colors after rain | Spectrum in the sky | Colorful arc
model: Pattern | Example | Replica
lantern: Lamp | Light | Paper light
earlier: Before | Previously | Sooner
explain: Clarify | Describe | Spell out
coffee: Morning drink | Java | Latte base
glad: Happy | Pleased | Joyful
shed: Garden storage hut | Lose, as fur | Cast off
seal: Stamp | Close | Barking sea animal
uncle: Aunt's husband | Parent's brother | Family member
desk: Writing table | Workstation | Office table
hedge: Row of bushes | Shrub fence | Bushy border
safe: Secure | Protected | Vault
swan: Graceful bird | Elegant water bird | Lake glider
stories: Tales | Legends | Floors
blossom: Flower | Bloom | Bud
nowhere: No place | Not anywhere | Middle of ___
focus: Concentrate | Center | Attention
kiwi: Fuzzy fruit | Green fruit | Small fruit
science: Study of nature | Biology or chemistry | Knowledge
long: Extended | Lengthy | Far
initial: First | Starting | Letter of a name
heat: Warmth | Temperature | Warm up
socks: Footwear | Hose | Warm feet
epic: Grand | Heroic | Long poem
sound: Noise | Tone | Strait, like Puget ___
gear: Equipment | Tools | Cog
wish: Hope | Desire | Dream
lead: Guide | Direct | Head
llama: Wooly animal | Alpaca cousin | Andes animal
fair: Just | Carnival | County ___
cycle: Circle | Pedal | Loop
glow: Radiance | Shine | Light
mist: Fog | Haze | Spray
school: Classroom | Academy | College
gift: Present | Talent | Surprise
shore: Coast | Beach | Seaside
song: Tune | Melody | Ballad
laughter: Giggles | Chuckles | Joy
aria: Opera song | Solo | Melody
nose: Smeller | Snout | Sniffer
glee: Joy | Delight | Mirth
lend: Loan | Give | Offer
bog: Marsh | Swamp | Wetland
tiger: Striped cat | Big cat | Jungle cat
lucky: Fortunate | Blessed | Charmed
freedom: Liberty | Independence | Release
coast: Shore | Seaside | Glide
evening: Night | Dusk | Twilight
chest: Trunk | Box | Torso
essay: Composition | Paper | Article
steady: Stable | Firm | Constant
sing: Carol | Chant | Hum
beautiful: Lovely | Pretty | Gorgeous
tradition: Custom | Habit | Ritual
loaf: Bread | Relax | Laze
depot: Station | Terminal | Warehouse
door: Entrance | Gate | Portal
maple: Syrup tree | Canada tree | Red leaf
flag: Banner | Standard | Pennant
coral: Reef | Pinkish orange | Ocean rock
cove: Bay | Inlet | Harbor
cargo: Freight | Load | Shipment
spoon: Utensil | Scoop | Ladle
basic: Simple | Fundamental | Elementary
gate: Door | Entrance | Portal
kind: Nice | Sort | Friendly
lily: Easter flower | Pond flower | Lotus
apron: Kitchen cover | Bib | Smock
alpha: First letter | Leader | Beta's predecessor
label: Tag | Brand | Sticker
child: Kid | Youngster | Tot
energy: Power | Vigor | Pep
hear: Listen | Catch | Perceive
able: Capable | Competent | Fit
grateful: Thankful | Appreciative | Obliged
kettle: Tea maker | Pot | Boiler
memo: Note | Reminder | Message
linen: Fabric | Sheets | Flax cloth
dale: Valley | Glen | Dell
wear: Put on | Don | Clothing
koala: Aussie animal | Tree bear | Marsupial
shoe: Sneaker | Boot | Footwear
cart: Wagon | Trolley | Buggy
scent: Fragrance | Aroma | Smell
peak: Summit | Top | Crest
part: Piece | Section | Role
hue: Color | Shade | Tint
whale: Big sea mammal | Humpback | Orca
aware: Conscious | Alert | Informed
field: Meadow | Pasture | Area
odor: Smell | Scent | Aroma
title: Name | Heading | Label
guide: Lead | Direct | Handbook
metal: Iron or tin | Steel | Ore
hundred: Century | Ten tens | Number
usual: Normal | Typical | Ordinary
group: Crowd | Band | Set
sunny: Bright | Cheerful | Clear
award: Prize | Trophy | Honor
niece: Sibling's daughter | Relative | Family member
yarn: Wool for knitting | Tall tale | Thread
banana: Yellow fruit | Monkey snack | Peel
afternoon: Midday | Siesta time | PM
avocado: Guacamole base | Green fruit | Toast topping
gentle: Soft | Kind | Mild
tent: Camping shelter | Canopy | Big top
roast: Oven-cooked meat | Bake | Toast
solid: Firm | Hard | Sturdy
mile: Distance | Length | Measure
main: Chief | Principal | Primary
cave: Cavern | Den | Grotto
edit: Revise | Polish | Change
lane: Path | Road | Alley
acorn: Oak seed | Squirrel snack | Nut
color: Hue | Shade | Paint
glue: Adhesive | Paste | Stick
tray: Platter | Salver | Serving board
aisle: Walkway | Passage | Path
beta: Greek letter | Test version | Second letter
stir: Mix | Blend | Whisk
library: Book place | Archive | Reading room
lines: Rows | Queues | Cues
tonight: This evening | Tonite | Night
cost: Price | Expense | Fee
popular: Well-liked | Trendy | Loved
bean: Legume | Seed | Coffee bean
needle: Pin | Sewing tool | Knitting tool
sign: Symbol | Signal | Placard
bloom: Flower | Blossom | Flourish
bowl: Cereal holder | Dish | Basin
face: Visage | Front | Mug
herb: Basil | Oregano | Mint
jug: Pitcher | Carafe | Water holder
knit: Crochet | Stitch | Weave
fern: Green plant | Frond | Shady plant
harbor: Port | Haven | Dock
week: Seven days | Weekday | Period
dare: Challenge | Brave | Venture
melon: Juicy fruit | Cantaloupe | Watermelon
halo: Glow | Ring | Aura
crew: Team | Staff | Band
role: Part | Character | Function
sled: Snow toboggan | Toboggan | Slide
email: Message | Electronic note | Inbox item
dome: Rounded roof | Cupola | Arch
movie: Film | Picture | Show
meal: Dinner | Lunch | Feast
teddy: Stuffed bear | Plush toy | Bear
otter: River mammal | Playful swimmer | Sea animal
peach: Georgia fruit | Pastel color | Fuzzy fruit
cape: Cloak | Headland | Hero's garment
scone: Tea pastry | Biscuit | Baked good
fresh: New | Crisp | Clean
damp: Moist | Wet | Humid
feather: Plume | Quill | Down
program: Show | Plan | Software
bench: Seat | Pew | Park seat
list: Roster | Catalog | Enumerate
tomato: Salad fruit | Red vegetable | Ketchup base
grain: Wheat | Rice | Kernel
cloud: Fluffy sky shape | Puff | Mist
duck: Quacker | Waddler | Dodge
mint: Fresh herb | Peppermint | Coin factory
quiet: Silent | Hushed | Calm
lake: Pond | Pool | Lagoon
portrait: Picture | Painting | Likeness
tale: Story | Yarn | Fable
teal: Blue-green | Duck | Color
lens: Glass | Optic | Eyepiece
yoga: Poses on a mat | Stretching class | Mat exercise
sense: Feeling | Intuition | Meaning
shine: Glow | Gleam | Polish
college: University | School | Academy
track: Path | Trail | Rail
letter: Note | Mail | Character
grandma: Nana | Granny | Grandparent
wheel: Tire | Circle | Steering part
whisper: Murmur | Hush | Mutter
pizza: Italian pie | Cheesy pie | Slice
ring: Band | Circle | Call
balloon: Party bubble | Blow up | Air bag
water: Aqua | Drink | Liquid
mountain: Peak | Summit | Hill
tune: Melody | Song | Air
goal: Aim | Target | Point
knee: Leg's bend | Where a kid's patch goes | Lap-maker
save: Rescue | Keep | Store
pond: Pool | Lake | Duck home
gale: Strong wind | Storm | Blast
solve: Figure out | Crack | Answer
lore: Legend | Myth | Knowledge
realm: Kingdom | Domain | Land
alive: Living | Animated | Awake
straw: Sipper | Hay | Dry stalk
clue: Hint | Lead | Tip
depth: Deepness | Profundity | Extent
badge: Emblem | Pin | Insignia
comet: Icy visitor with a tail | Shooting star | Space traveler
sail: Voyage | Cruise | Ship's canvas
spray: Mist | Spritz | Squirt
volcano: Lava mountain | Mount | Crater
glasses: Spectacles | Specs | Eyewear
frame: Border | Edge | Picture holder
lunch: Midday meal | Brunch | Snack
strong: Mighty | Powerful | Firm
above: Over | Higher | Aloft
sport: Game | Athletics | Activity
explore: Discover | Investigate | Travel
welcome: Greet | Hello | Accept
comfort: Ease | Solace | Coziness
meadow: Field | Pasture | Grassland
noon: Midday | Twelve o'clock | Lunchtime
hair: Locks | Mane | Tresses
neighbor: Person next door | Nearby resident | One who lives next door
swim: Paddle | Float | Dive
calendar: Planner | Schedule | Datebook
candle: Wax light | Taper | Birthday light
kite: Toy on a string | Flying toy | Soaring toy
taxi: Cab | Ride | Car service
petal: Flower part | Bloom piece | Leaf of a flower
pace: Speed | Step | Tempo
sauce: Dressing | Gravy | Topping
believe: Trust | Have faith | Accept
between: Amid | In the middle | Among
march: Walk | Parade | Spring month
hotel: Inn | Lodge | Resort
craft: Art | Skill | Handwork
shape: Form | Figure | Outline
bear: Grizzly | Carry | Teddy
bright: Shiny | Sunny | Smart
forest: Woods | Grove | Jungle
pencil: Writing stick | Lead | Sketch
flower: Bloom | Blossom | Rose
ripe: Mature | Ready | Mellow
cushion: Pillow | Pad | Buffer
rabbit: Bunny | Hare | Hopper
twig: Stick | Branch | Sprig
below: Under | Beneath | Lower
sage: Wise | Herb | Guru
grin: Smile | Beam | Smirk
study: Learn | Read up on | Review
''')


for _path in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clue-bank', '*.txt'))):
    add(open(_path, encoding='utf-8').read())
