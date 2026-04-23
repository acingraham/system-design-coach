const ANIMALS = [
  "Panda", "Fox", "Owl", "Bear", "Wolf", "Hawk", "Otter", "Lynx",
  "Crane", "Falcon", "Badger", "Raven", "Bison", "Eagle", "Heron", "Moose",
  "Dolphin", "Tiger", "Jaguar", "Parrot", "Koala", "Penguin", "Rabbit", "Turtle",
  "Salmon", "Gecko", "Hare", "Finch", "Stork", "Robin", "Seal", "Warbler",
  "Puma", "Ibis", "Wren", "Lark", "Swan", "Dove", "Mink", "Yak",
  "Coyote", "Macaw", "Lemur", "Sloth", "Zebra", "Alpaca", "Hippo", "Rhino",
  "Elk", "Loon", "Newt", "Shrike", "Oriole", "Osprey", "Egret", "Starling",
  "Marten", "Ferret", "Bobcat", "Condor", "Pelican", "Toucan", "Puffin", "Sparrow",
  "Mantis", "Beetle", "Cricket", "Cicada", "Marlin", "Trout", "Bass", "Pike",
  "Bunny", "Squid", "Coral", "Murex", "Clam", "Darter", "Moth", "Wombat",
  "Quail", "Grouse", "Plover", "Curlew", "Tern", "Skua", "Kiwi", "Dingo",
  "Tapir", "Okapi", "Serval", "Ocelot", "Ermine", "Sable", "Marmot", "Frog",
  "Chipmunk", "Magpie", "Ibex", "Gopher",
];

const ADJECTIVES = [
  "Brave", "Calm", "Bold", "Swift", "Keen", "Wise", "Bright", "Steady",
  "Quick", "Sharp", "Warm", "Cool", "Fair", "True", "Clear", "Kind",
  "Grand", "Proud", "Noble", "Vivid", "Lively", "Gentle", "Witty", "Daring",
  "Clever", "Nimble", "Eager", "Loyal", "Hardy", "Merry", "Jolly", "Zesty",
  "Spry", "Plucky", "Breezy", "Cosmic", "Stellar", "Radiant", "Golden", "Silver",
  "Amber", "Azure", "Coral", "Coastal", "Polar", "Solar", "Lunar", "Arctic",
  "Mighty", "Humble", "Serene", "Placid", "Jovial", "Candid", "Lucid", "Fervent",
  "Avid", "Adept", "Astute", "Ardent", "Savvy", "Deft", "Brisk", "Crisp",
  "Snappy", "Peppy", "Bright-eyed", "Chipper", "Hearty", "Robust", "Rugged", "Sturdy",
  "Sleek", "Smooth", "Polished", "Refined", "Poised", "Gallant", "Valiant", "Cheerful",
  "Agile", "Focused", "Snowy", "Fluid", "Buoyant", "Frosty", "Sunny", "Misty",
  "Sandy", "Mossy", "Rocky", "Stormy", "Blithe", "Sage", "Tidal", "Sprightly",
  "Russet", "Copper", "Marble", "Pebble",
];

export function anonymousName(sessionId: string): string {
  let hash = 0;
  for (const ch of sessionId) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const animal = ANIMALS[Math.abs(hash >> 8) % ANIMALS.length];
  return `${adj} ${animal}`;
}
