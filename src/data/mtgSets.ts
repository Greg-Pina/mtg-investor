/**
 * Complete Magic: The Gathering sets with their corresponding TCGCSV group IDs
 * Source: https://tcgcsv.com/tcgplayer/1/{groupId}/ProductsAndPrices.csv
 */
export interface MTGSet {
  name: string;
  groupId: number;
  endpoint: string;
}

export const MTG_SETS: Record<string, MTGSet> = {
  // Core Sets
  "10th Edition": { name: "10th Edition", groupId: 1, endpoint: "https://tcgcsv.com/tcgplayer/1/1/ProductsAndPrices.csv" },
  "7th Edition": { name: "7th Edition", groupId: 2, endpoint: "https://tcgcsv.com/tcgplayer/1/2/ProductsAndPrices.csv" },
  "8th Edition": { name: "8th Edition", groupId: 3, endpoint: "https://tcgcsv.com/tcgplayer/1/3/ProductsAndPrices.csv" },
  "9th Edition": { name: "9th Edition", groupId: 4, endpoint: "https://tcgcsv.com/tcgplayer/1/4/ProductsAndPrices.csv" },
  "Classic Sixth Edition": { name: "Classic Sixth Edition", groupId: 23, endpoint: "https://tcgcsv.com/tcgplayer/1/23/ProductsAndPrices.csv" },
  "Fifth Edition": { name: "Fifth Edition", groupId: 44, endpoint: "https://tcgcsv.com/tcgplayer/1/44/ProductsAndPrices.csv" },
  "Fourth Edition": { name: "Fourth Edition", groupId: 46, endpoint: "https://tcgcsv.com/tcgplayer/1/46/ProductsAndPrices.csv" },
  "Magic 2010 (M10)": { name: "Magic 2010 (M10)", groupId: 68, endpoint: "https://tcgcsv.com/tcgplayer/1/68/ProductsAndPrices.csv" },
  "Magic 2011 (M11)": { name: "Magic 2011 (M11)", groupId: 69, endpoint: "https://tcgcsv.com/tcgplayer/1/69/ProductsAndPrices.csv" },
  "Magic 2012 (M12)": { name: "Magic 2012 (M12)", groupId: 70, endpoint: "https://tcgcsv.com/tcgplayer/1/70/ProductsAndPrices.csv" },
  "Magic 2013 (M13)": { name: "Magic 2013 (M13)", groupId: 364, endpoint: "https://tcgcsv.com/tcgplayer/1/364/ProductsAndPrices.csv" },
  "Magic 2014 (M14)": { name: "Magic 2014 (M14)", groupId: 1113, endpoint: "https://tcgcsv.com/tcgplayer/1/1113/ProductsAndPrices.csv" },
  "Magic 2015 (M15)": { name: "Magic 2015 (M15)", groupId: 1293, endpoint: "https://tcgcsv.com/tcgplayer/1/1293/ProductsAndPrices.csv" },
  "Magic Origins": { name: "Magic Origins", groupId: 1512, endpoint: "https://tcgcsv.com/tcgplayer/1/1512/ProductsAndPrices.csv" },
  "Core Set 2019": { name: "Core Set 2019", groupId: 2250, endpoint: "https://tcgcsv.com/tcgplayer/1/2250/ProductsAndPrices.csv" },
  "Core Set 2020": { name: "Core Set 2020", groupId: 2441, endpoint: "https://tcgcsv.com/tcgplayer/1/2441/ProductsAndPrices.csv" },
  "Core Set 2021": { name: "Core Set 2021", groupId: 2653, endpoint: "https://tcgcsv.com/tcgplayer/1/2653/ProductsAndPrices.csv" },

  // Classic Sets - Power 9 Era
  "Alpha Edition": { name: "Alpha Edition", groupId: 7, endpoint: "https://tcgcsv.com/tcgplayer/1/7/ProductsAndPrices.csv" },
  "Beta Edition": { name: "Beta Edition", groupId: 17, endpoint: "https://tcgcsv.com/tcgplayer/1/17/ProductsAndPrices.csv" },
  "Unlimited Edition": { name: "Unlimited Edition", groupId: 115, endpoint: "https://tcgcsv.com/tcgplayer/1/115/ProductsAndPrices.csv" },
  "Revised Edition": { name: "Revised Edition", groupId: 97, endpoint: "https://tcgcsv.com/tcgplayer/1/97/ProductsAndPrices.csv" },
  "Antiquities": { name: "Antiquities", groupId: 8, endpoint: "https://tcgcsv.com/tcgplayer/1/8/ProductsAndPrices.csv" },
  "Arabian Nights": { name: "Arabian Nights", groupId: 11, endpoint: "https://tcgcsv.com/tcgplayer/1/11/ProductsAndPrices.csv" },
  "Legends": { name: "Legends", groupId: 65, endpoint: "https://tcgcsv.com/tcgplayer/1/65/ProductsAndPrices.csv" },
  "The Dark": { name: "The Dark", groupId: 109, endpoint: "https://tcgcsv.com/tcgplayer/1/109/ProductsAndPrices.csv" },

  // Expansion Sets
  "Alara Reborn": { name: "Alara Reborn", groupId: 5, endpoint: "https://tcgcsv.com/tcgplayer/1/5/ProductsAndPrices.csv" },
  "Shards of Alara": { name: "Shards of Alara", groupId: 103, endpoint: "https://tcgcsv.com/tcgplayer/1/103/ProductsAndPrices.csv" },
  "Conflux": { name: "Conflux", groupId: 26, endpoint: "https://tcgcsv.com/tcgplayer/1/26/ProductsAndPrices.csv" },
  "Zendikar": { name: "Zendikar", groupId: 124, endpoint: "https://tcgcsv.com/tcgplayer/1/124/ProductsAndPrices.csv" },
  "Worldwake": { name: "Worldwake", groupId: 122, endpoint: "https://tcgcsv.com/tcgplayer/1/122/ProductsAndPrices.csv" },
  "Rise of the Eldrazi": { name: "Rise of the Eldrazi", groupId: 98, endpoint: "https://tcgcsv.com/tcgplayer/1/98/ProductsAndPrices.csv" },
  "Scars of Mirrodin": { name: "Scars of Mirrodin", groupId: 100, endpoint: "https://tcgcsv.com/tcgplayer/1/100/ProductsAndPrices.csv" },
  "Mirrodin Besieged": { name: "Mirrodin Besieged", groupId: 76, endpoint: "https://tcgcsv.com/tcgplayer/1/76/ProductsAndPrices.csv" },
  "New Phyrexia": { name: "New Phyrexia", groupId: 79, endpoint: "https://tcgcsv.com/tcgplayer/1/79/ProductsAndPrices.csv" },
  "Innistrad": { name: "Innistrad", groupId: 59, endpoint: "https://tcgcsv.com/tcgplayer/1/59/ProductsAndPrices.csv" },
  "Dark Ascension": { name: "Dark Ascension", groupId: 125, endpoint: "https://tcgcsv.com/tcgplayer/1/125/ProductsAndPrices.csv" },
  "Avacyn Restored": { name: "Avacyn Restored", groupId: 362, endpoint: "https://tcgcsv.com/tcgplayer/1/362/ProductsAndPrices.csv" },
  "Return to Ravnica": { name: "Return to Ravnica", groupId: 370, endpoint: "https://tcgcsv.com/tcgplayer/1/370/ProductsAndPrices.csv" },
  "Gatecrash": { name: "Gatecrash", groupId: 569, endpoint: "https://tcgcsv.com/tcgplayer/1/569/ProductsAndPrices.csv" },
  "Dragon's Maze": { name: "Dragon's Maze", groupId: 570, endpoint: "https://tcgcsv.com/tcgplayer/1/570/ProductsAndPrices.csv" },
  "Theros": { name: "Theros", groupId: 1144, endpoint: "https://tcgcsv.com/tcgplayer/1/1144/ProductsAndPrices.csv" },
  "Born of the Gods": { name: "Born of the Gods", groupId: 1276, endpoint: "https://tcgcsv.com/tcgplayer/1/1276/ProductsAndPrices.csv" },
  "Journey Into Nyx": { name: "Journey Into Nyx", groupId: 1277, endpoint: "https://tcgcsv.com/tcgplayer/1/1277/ProductsAndPrices.csv" },

  // Tarkir Block
  "Khans of Tarkir": { name: "Khans of Tarkir", groupId: 1356, endpoint: "https://tcgcsv.com/tcgplayer/1/1356/ProductsAndPrices.csv" },
  "Fate Reforged": { name: "Fate Reforged", groupId: 1497, endpoint: "https://tcgcsv.com/tcgplayer/1/1497/ProductsAndPrices.csv" },
  "Dragons of Tarkir": { name: "Dragons of Tarkir", groupId: 1515, endpoint: "https://tcgcsv.com/tcgplayer/1/1515/ProductsAndPrices.csv" },

  // Zendikar Block 2
  "Battle for Zendikar": { name: "Battle for Zendikar", groupId: 1645, endpoint: "https://tcgcsv.com/tcgplayer/1/1645/ProductsAndPrices.csv" },
  "Oath of the Gatewatch": { name: "Oath of the Gatewatch", groupId: 1693, endpoint: "https://tcgcsv.com/tcgplayer/1/1693/ProductsAndPrices.csv" },

  // Innistrad Block 2
  "Shadows over Innistrad": { name: "Shadows over Innistrad", groupId: 1708, endpoint: "https://tcgcsv.com/tcgplayer/1/1708/ProductsAndPrices.csv" },
  "Eldritch Moon": { name: "Eldritch Moon", groupId: 1790, endpoint: "https://tcgcsv.com/tcgplayer/1/1790/ProductsAndPrices.csv" },

  // Kaladesh Block
  "Kaladesh": { name: "Kaladesh", groupId: 1791, endpoint: "https://tcgcsv.com/tcgplayer/1/1791/ProductsAndPrices.csv" },
  "Aether Revolt": { name: "Aether Revolt", groupId: 1857, endpoint: "https://tcgcsv.com/tcgplayer/1/1857/ProductsAndPrices.csv" },

  // Amonkhet Block
  "Amonkhet": { name: "Amonkhet", groupId: 1882, endpoint: "https://tcgcsv.com/tcgplayer/1/1882/ProductsAndPrices.csv" },
  "Hour of Devastation": { name: "Hour of Devastation", groupId: 1934, endpoint: "https://tcgcsv.com/tcgplayer/1/1934/ProductsAndPrices.csv" },

  // Ixalan Block
  "Ixalan": { name: "Ixalan", groupId: 2043, endpoint: "https://tcgcsv.com/tcgplayer/1/2043/ProductsAndPrices.csv" },
  "Rivals of Ixalan": { name: "Rivals of Ixalan", groupId: 2098, endpoint: "https://tcgcsv.com/tcgplayer/1/2098/ProductsAndPrices.csv" },

  // Dominaria Block
  "Dominaria": { name: "Dominaria", groupId: 2199, endpoint: "https://tcgcsv.com/tcgplayer/1/2199/ProductsAndPrices.csv" },

  // Guilds of Ravnica Block
  "Guilds of Ravnica": { name: "Guilds of Ravnica", groupId: 2290, endpoint: "https://tcgcsv.com/tcgplayer/1/2290/ProductsAndPrices.csv" },
  "Ravnica Allegiance": { name: "Ravnica Allegiance", groupId: 2366, endpoint: "https://tcgcsv.com/tcgplayer/1/2366/ProductsAndPrices.csv" },
  "War of the Spark": { name: "War of the Spark", groupId: 2418, endpoint: "https://tcgcsv.com/tcgplayer/1/2418/ProductsAndPrices.csv" },

  // Throne of Eldraine & Beyond
  "Throne of Eldraine": { name: "Throne of Eldraine", groupId: 2494, endpoint: "https://tcgcsv.com/tcgplayer/1/2494/ProductsAndPrices.csv" },
  "Theros Beyond Death": { name: "Theros Beyond Death", groupId: 2568, endpoint: "https://tcgcsv.com/tcgplayer/1/2568/ProductsAndPrices.csv" },
  "Ikoria: Lair of Behemoths": { name: "Ikoria: Lair of Behemoths", groupId: 2603, endpoint: "https://tcgcsv.com/tcgplayer/1/2603/ProductsAndPrices.csv" },
  "Zendikar Rising": { name: "Zendikar Rising", groupId: 2648, endpoint: "https://tcgcsv.com/tcgplayer/1/2648/ProductsAndPrices.csv" },

  // Modern Sets
  "Kaldheim": { name: "Kaldheim", groupId: 2750, endpoint: "https://tcgcsv.com/tcgplayer/1/2750/ProductsAndPrices.csv" },
  "Strixhaven: School of Mages": { name: "Strixhaven: School of Mages", groupId: 2773, endpoint: "https://tcgcsv.com/tcgplayer/1/2773/ProductsAndPrices.csv" },
  "Adventures in the Forgotten Realms": { name: "Adventures in the Forgotten Realms", groupId: 2823, endpoint: "https://tcgcsv.com/tcgplayer/1/2823/ProductsAndPrices.csv" },
  "Innistrad: Midnight Hunt": { name: "Innistrad: Midnight Hunt", groupId: 2864, endpoint: "https://tcgcsv.com/tcgplayer/1/2864/ProductsAndPrices.csv" },
  "Innistrad: Crimson Vow": { name: "Innistrad: Crimson Vow", groupId: 2862, endpoint: "https://tcgcsv.com/tcgplayer/1/2862/ProductsAndPrices.csv" },
  "Kamigawa: Neon Dynasty": { name: "Kamigawa: Neon Dynasty", groupId: 2965, endpoint: "https://tcgcsv.com/tcgplayer/1/2965/ProductsAndPrices.csv" },
  "Streets of New Capenna": { name: "Streets of New Capenna", groupId: 3026, endpoint: "https://tcgcsv.com/tcgplayer/1/3026/ProductsAndPrices.csv" },
  "Dominaria United": { name: "Dominaria United", groupId: 3102, endpoint: "https://tcgcsv.com/tcgplayer/1/3102/ProductsAndPrices.csv" },
  "The Brothers' War": { name: "The Brothers' War", groupId: 3157, endpoint: "https://tcgcsv.com/tcgplayer/1/3157/ProductsAndPrices.csv" },
  "Phyrexia: All Will Be One": { name: "Phyrexia: All Will Be One", groupId: 17684, endpoint: "https://tcgcsv.com/tcgplayer/1/17684/ProductsAndPrices.csv" },
  "March of the Machine": { name: "March of the Machine", groupId: 22875, endpoint: "https://tcgcsv.com/tcgplayer/1/22875/ProductsAndPrices.csv" },
  "March of the Machine: The Aftermath": { name: "March of the Machine: The Aftermath", groupId: 22876, endpoint: "https://tcgcsv.com/tcgplayer/1/22876/ProductsAndPrices.csv" },
  "Wilds of Eldraine": { name: "Wilds of Eldraine", groupId: 23163, endpoint: "https://tcgcsv.com/tcgplayer/1/23163/ProductsAndPrices.csv" },
  "The Lost Caverns of Ixalan": { name: "The Lost Caverns of Ixalan", groupId: 23312, endpoint: "https://tcgcsv.com/tcgplayer/1/23312/ProductsAndPrices.csv" },
  "Murders at Karlov Manor": { name: "Murders at Karlov Manor", groupId: 23361, endpoint: "https://tcgcsv.com/tcgplayer/1/23361/ProductsAndPrices.csv" },
  "Outlaws of Thunder Junction": { name: "Outlaws of Thunder Junction", groupId: 23439, endpoint: "https://tcgcsv.com/tcgplayer/1/23439/ProductsAndPrices.csv" },
  "Bloomburrow": { name: "Bloomburrow", groupId: 23447, endpoint: "https://tcgcsv.com/tcgplayer/1/23447/ProductsAndPrices.csv" },
  "Duskmourn: House of Horror": { name: "Duskmourn: House of Horror", groupId: 23550, endpoint: "https://tcgcsv.com/tcgplayer/1/23550/ProductsAndPrices.csv" },
  "Foundations": { name: "Foundations", groupId: 23556, endpoint: "https://tcgcsv.com/tcgplayer/1/23556/ProductsAndPrices.csv" },

  // Masters Sets
  "Modern Masters": { name: "Modern Masters", groupId: 1111, endpoint: "https://tcgcsv.com/tcgplayer/1/1111/ProductsAndPrices.csv" },
  "Modern Masters 2015": { name: "Modern Masters 2015", groupId: 1503, endpoint: "https://tcgcsv.com/tcgplayer/1/1503/ProductsAndPrices.csv" },
  "Eternal Masters": { name: "Eternal Masters", groupId: 1740, endpoint: "https://tcgcsv.com/tcgplayer/1/1740/ProductsAndPrices.csv" },
  "Modern Masters 2017": { name: "Modern Masters 2017", groupId: 1879, endpoint: "https://tcgcsv.com/tcgplayer/1/1879/ProductsAndPrices.csv" },
  "Iconic Masters": { name: "Iconic Masters", groupId: 2050, endpoint: "https://tcgcsv.com/tcgplayer/1/2050/ProductsAndPrices.csv" },
  "Masters 25": { name: "Masters 25", groupId: 2189, endpoint: "https://tcgcsv.com/tcgplayer/1/2189/ProductsAndPrices.csv" },
  "Battlebond": { name: "Battlebond", groupId: 2245, endpoint: "https://tcgcsv.com/tcgplayer/1/2245/ProductsAndPrices.csv" },
  "Ultimate Masters": { name: "Ultimate Masters", groupId: 2360, endpoint: "https://tcgcsv.com/tcgplayer/1/2360/ProductsAndPrices.csv" },
  "Modern Horizons": { name: "Modern Horizons", groupId: 2422, endpoint: "https://tcgcsv.com/tcgplayer/1/2422/ProductsAndPrices.csv" },
  "Jumpstart": { name: "Jumpstart", groupId: 2654, endpoint: "https://tcgcsv.com/tcgplayer/1/2654/ProductsAndPrices.csv" },
  "Double Masters": { name: "Double Masters", groupId: 2655, endpoint: "https://tcgcsv.com/tcgplayer/1/2655/ProductsAndPrices.csv" },
  "Commander Legends": { name: "Commander Legends", groupId: 2708, endpoint: "https://tcgcsv.com/tcgplayer/1/2708/ProductsAndPrices.csv" },
  "Time Spiral: Remastered": { name: "Time Spiral: Remastered", groupId: 2772, endpoint: "https://tcgcsv.com/tcgplayer/1/2772/ProductsAndPrices.csv" },
  "Modern Horizons 2": { name: "Modern Horizons 2", groupId: 2809, endpoint: "https://tcgcsv.com/tcgplayer/1/2809/ProductsAndPrices.csv" },
  "Commander Legends: Battle for Baldur's Gate": { name: "Commander Legends: Battle for Baldur's Gate", groupId: 3047, endpoint: "https://tcgcsv.com/tcgplayer/1/3047/ProductsAndPrices.csv" },
  "Double Masters 2022": { name: "Double Masters 2022", groupId: 3070, endpoint: "https://tcgcsv.com/tcgplayer/1/3070/ProductsAndPrices.csv" },
  "Jumpstart 2022": { name: "Jumpstart 2022", groupId: 3185, endpoint: "https://tcgcsv.com/tcgplayer/1/3185/ProductsAndPrices.csv" },
  "Dominaria Remastered": { name: "Dominaria Remastered", groupId: 17670, endpoint: "https://tcgcsv.com/tcgplayer/1/17670/ProductsAndPrices.csv" },
  "Commander Masters": { name: "Commander Masters", groupId: 23020, endpoint: "https://tcgcsv.com/tcgplayer/1/23020/ProductsAndPrices.csv" },
  "Ravnica Remastered": { name: "Ravnica Remastered", groupId: 23319, endpoint: "https://tcgcsv.com/tcgplayer/1/23319/ProductsAndPrices.csv" },
  "Modern Horizons 3": { name: "Modern Horizons 3", groupId: 23444, endpoint: "https://tcgcsv.com/tcgplayer/1/23444/ProductsAndPrices.csv" },
  "Mystery Booster 2": { name: "Mystery Booster 2", groupId: 23580, endpoint: "https://tcgcsv.com/tcgplayer/1/23580/ProductsAndPrices.csv" },
  "Innistrad Remastered": { name: "Innistrad Remastered", groupId: 23848, endpoint: "https://tcgcsv.com/tcgplayer/1/23848/ProductsAndPrices.csv" },

  // Universes Beyond
  "Universes Beyond: Warhammer 40,000": { name: "Universes Beyond: Warhammer 40,000", groupId: 3079, endpoint: "https://tcgcsv.com/tcgplayer/1/3079/ProductsAndPrices.csv" },
  "Universes Beyond: Transformers": { name: "Universes Beyond: Transformers", groupId: 17664, endpoint: "https://tcgcsv.com/tcgplayer/1/17664/ProductsAndPrices.csv" },
  "Universes Beyond: The Lord of the Rings: Tales of Middle-earth": { name: "Universes Beyond: The Lord of the Rings: Tales of Middle-earth", groupId: 23019, endpoint: "https://tcgcsv.com/tcgplayer/1/23019/ProductsAndPrices.csv" },
  "Universes Beyond: Doctor Who": { name: "Universes Beyond: Doctor Who", groupId: 23165, endpoint: "https://tcgcsv.com/tcgplayer/1/23165/ProductsAndPrices.csv" },
  "Universes Beyond: Jurassic World Collection": { name: "Universes Beyond: Jurassic World Collection", groupId: 23317, endpoint: "https://tcgcsv.com/tcgplayer/1/23317/ProductsAndPrices.csv" },
  "Universes Beyond: Fallout": { name: "Universes Beyond: Fallout", groupId: 23337, endpoint: "https://tcgcsv.com/tcgplayer/1/23337/ProductsAndPrices.csv" },
  "Universes Beyond: Assassin's Creed": { name: "Universes Beyond: Assassin's Creed", groupId: 23446, endpoint: "https://tcgcsv.com/tcgplayer/1/23446/ProductsAndPrices.csv" },
  "FINAL FANTASY": { name: "FINAL FANTASY", groupId: 24219, endpoint: "https://tcgcsv.com/tcgplayer/1/24219/ProductsAndPrices.csv" },
  "Marvel's Spider-Man": { name: "Marvel's Spider-Man", groupId: 24245, endpoint: "https://tcgcsv.com/tcgplayer/1/24245/ProductsAndPrices.csv" },
  "Avatar: The Last Airbender": { name: "Avatar: The Last Airbender", groupId: 24421, endpoint: "https://tcgcsv.com/tcgplayer/1/24421/ProductsAndPrices.csv" },

  // Future Sets
  "Aetherdrift": { name: "Aetherdrift", groupId: 23874, endpoint: "https://tcgcsv.com/tcgplayer/1/23874/ProductsAndPrices.csv" },
  "Tarkir: Dragonstorm": { name: "Tarkir: Dragonstorm", groupId: 24232, endpoint: "https://tcgcsv.com/tcgplayer/1/24232/ProductsAndPrices.csv" },
  "Edge of Eternities": { name: "Edge of Eternities", groupId: 24233, endpoint: "https://tcgcsv.com/tcgplayer/1/24233/ProductsAndPrices.csv" },

  // Legacy Sets
  "Alliances": { name: "Alliances", groupId: 6, endpoint: "https://tcgcsv.com/tcgplayer/1/6/ProductsAndPrices.csv" },
  "Apocalypse": { name: "Apocalypse", groupId: 10, endpoint: "https://tcgcsv.com/tcgplayer/1/10/ProductsAndPrices.csv" },
  "Betrayers of Kamigawa": { name: "Betrayers of Kamigawa", groupId: 18, endpoint: "https://tcgcsv.com/tcgplayer/1/18/ProductsAndPrices.csv" },
  "Champions of Kamigawa": { name: "Champions of Kamigawa", groupId: 20, endpoint: "https://tcgcsv.com/tcgplayer/1/20/ProductsAndPrices.csv" },
  "Chronicles": { name: "Chronicles", groupId: 22, endpoint: "https://tcgcsv.com/tcgplayer/1/22/ProductsAndPrices.csv" },
  "Coldsnap": { name: "Coldsnap", groupId: 24, endpoint: "https://tcgcsv.com/tcgplayer/1/24/ProductsAndPrices.csv" },
  "Darksteel": { name: "Darksteel", groupId: 27, endpoint: "https://tcgcsv.com/tcgplayer/1/27/ProductsAndPrices.csv" },
  "Dissension": { name: "Dissension", groupId: 28, endpoint: "https://tcgcsv.com/tcgplayer/1/28/ProductsAndPrices.csv" },
  "Eventide": { name: "Eventide", groupId: 39, endpoint: "https://tcgcsv.com/tcgplayer/1/39/ProductsAndPrices.csv" },
  "Exodus": { name: "Exodus", groupId: 40, endpoint: "https://tcgcsv.com/tcgplayer/1/40/ProductsAndPrices.csv" },
  "Fallen Empires": { name: "Fallen Empires", groupId: 41, endpoint: "https://tcgcsv.com/tcgplayer/1/41/ProductsAndPrices.csv" },
  "Fifth Dawn": { name: "Fifth Dawn", groupId: 43, endpoint: "https://tcgcsv.com/tcgplayer/1/43/ProductsAndPrices.csv" },
  "Future Sight": { name: "Future Sight", groupId: 51, endpoint: "https://tcgcsv.com/tcgplayer/1/51/ProductsAndPrices.csv" },
  "Guildpact": { name: "Guildpact", groupId: 55, endpoint: "https://tcgcsv.com/tcgplayer/1/55/ProductsAndPrices.csv" },
  "Homelands": { name: "Homelands", groupId: 57, endpoint: "https://tcgcsv.com/tcgplayer/1/57/ProductsAndPrices.csv" },
  "Ice Age": { name: "Ice Age", groupId: 58, endpoint: "https://tcgcsv.com/tcgplayer/1/58/ProductsAndPrices.csv" },
  "Invasion": { name: "Invasion", groupId: 60, endpoint: "https://tcgcsv.com/tcgplayer/1/60/ProductsAndPrices.csv" },
  "Judgment": { name: "Judgment", groupId: 63, endpoint: "https://tcgcsv.com/tcgplayer/1/63/ProductsAndPrices.csv" },
  "Legions": { name: "Legions", groupId: 66, endpoint: "https://tcgcsv.com/tcgplayer/1/66/ProductsAndPrices.csv" },
  "Lorwyn": { name: "Lorwyn", groupId: 67, endpoint: "https://tcgcsv.com/tcgplayer/1/67/ProductsAndPrices.csv" },
  "Mercadian Masques": { name: "Mercadian Masques", groupId: 73, endpoint: "https://tcgcsv.com/tcgplayer/1/73/ProductsAndPrices.csv" },
  "Mirage": { name: "Mirage", groupId: 74, endpoint: "https://tcgcsv.com/tcgplayer/1/74/ProductsAndPrices.csv" },
  "Mirrodin": { name: "Mirrodin", groupId: 75, endpoint: "https://tcgcsv.com/tcgplayer/1/75/ProductsAndPrices.csv" },
  "Morningtide": { name: "Morningtide", groupId: 77, endpoint: "https://tcgcsv.com/tcgplayer/1/77/ProductsAndPrices.csv" },
  "Nemesis": { name: "Nemesis", groupId: 78, endpoint: "https://tcgcsv.com/tcgplayer/1/78/ProductsAndPrices.csv" },
  "Odyssey": { name: "Odyssey", groupId: 80, endpoint: "https://tcgcsv.com/tcgplayer/1/80/ProductsAndPrices.csv" },
  "Onslaught": { name: "Onslaught", groupId: 81, endpoint: "https://tcgcsv.com/tcgplayer/1/81/ProductsAndPrices.csv" },
  "Planar Chaos": { name: "Planar Chaos", groupId: 83, endpoint: "https://tcgcsv.com/tcgplayer/1/83/ProductsAndPrices.csv" },
  "Planeshift": { name: "Planeshift", groupId: 85, endpoint: "https://tcgcsv.com/tcgplayer/1/85/ProductsAndPrices.csv" },
  "Prophecy": { name: "Prophecy", groupId: 94, endpoint: "https://tcgcsv.com/tcgplayer/1/94/ProductsAndPrices.csv" },
  "Ravnica: City of Guilds": { name: "Ravnica: City of Guilds", groupId: 95, endpoint: "https://tcgcsv.com/tcgplayer/1/95/ProductsAndPrices.csv" },
  "Saviors of Kamigawa": { name: "Saviors of Kamigawa", groupId: 99, endpoint: "https://tcgcsv.com/tcgplayer/1/99/ProductsAndPrices.csv" },
  "Scourge": { name: "Scourge", groupId: 101, endpoint: "https://tcgcsv.com/tcgplayer/1/101/ProductsAndPrices.csv" },
  "Shadowmoor": { name: "Shadowmoor", groupId: 102, endpoint: "https://tcgcsv.com/tcgplayer/1/102/ProductsAndPrices.csv" },
  "Stronghold": { name: "Stronghold", groupId: 107, endpoint: "https://tcgcsv.com/tcgplayer/1/107/ProductsAndPrices.csv" },
  "Tempest": { name: "Tempest", groupId: 108, endpoint: "https://tcgcsv.com/tcgplayer/1/108/ProductsAndPrices.csv" },
  "Time Spiral": { name: "Time Spiral", groupId: 110, endpoint: "https://tcgcsv.com/tcgplayer/1/110/ProductsAndPrices.csv" },
  "Timeshifted": { name: "Timeshifted", groupId: 111, endpoint: "https://tcgcsv.com/tcgplayer/1/111/ProductsAndPrices.csv" },
  "Torment": { name: "Torment", groupId: 112, endpoint: "https://tcgcsv.com/tcgplayer/1/112/ProductsAndPrices.csv" },
  "Urza's Destiny": { name: "Urza's Destiny", groupId: 116, endpoint: "https://tcgcsv.com/tcgplayer/1/116/ProductsAndPrices.csv" },
  "Urza's Legacy": { name: "Urza's Legacy", groupId: 117, endpoint: "https://tcgcsv.com/tcgplayer/1/117/ProductsAndPrices.csv" },
  "Urza's Saga": { name: "Urza's Saga", groupId: 118, endpoint: "https://tcgcsv.com/tcgplayer/1/118/ProductsAndPrices.csv" },
  "Visions": { name: "Visions", groupId: 120, endpoint: "https://tcgcsv.com/tcgplayer/1/120/ProductsAndPrices.csv" },
  "Weatherlight": { name: "Weatherlight", groupId: 121, endpoint: "https://tcgcsv.com/tcgplayer/1/121/ProductsAndPrices.csv" },

  // Special/Un-Sets
  "Unglued": { name: "Unglued", groupId: 113, endpoint: "https://tcgcsv.com/tcgplayer/1/113/ProductsAndPrices.csv" },
  "Unhinged": { name: "Unhinged", groupId: 114, endpoint: "https://tcgcsv.com/tcgplayer/1/114/ProductsAndPrices.csv" },
  "Unstable": { name: "Unstable", groupId: 2092, endpoint: "https://tcgcsv.com/tcgplayer/1/2092/ProductsAndPrices.csv" },
  "Unfinity": { name: "Unfinity", groupId: 2958, endpoint: "https://tcgcsv.com/tcgplayer/1/2958/ProductsAndPrices.csv" },
  "Unsanctioned": { name: "Unsanctioned", groupId: 2598, endpoint: "https://tcgcsv.com/tcgplayer/1/2598/ProductsAndPrices.csv" },
};

/**
 * Helper functions for working with MTG sets
 */
export class MTGSetsHelper {
  /**
   * Get a set by group ID
   */
  static getSetByGroupId(groupId: number): MTGSet | undefined {
    return Object.values(MTG_SETS).find(set => set.groupId === groupId);
  }

  /**
   * Get a set by name
   */
  static getSetByName(name: string): MTGSet | undefined {
    return MTG_SETS[name];
  }

  /**
   * Get all sets
   */
  static getAllSets(): MTGSet[] {
    return Object.values(MTG_SETS);
  }

  /**
   * Get sets by category (basic categorization)
   */
  static getSetsByCategory(category: 'classic' | 'modern' | 'masters' | 'commander' | 'universes-beyond' | 'un-sets'): MTGSet[] {
    const sets = Object.values(MTG_SETS);
    
    switch (category) {
      case 'classic':
        return sets.filter(set => 
          set.name.includes('Alpha') || 
          set.name.includes('Beta') || 
          set.name.includes('Unlimited') || 
          set.name.includes('Revised') ||
          set.groupId <= 124 // Early sets
        );
      case 'modern':
        return sets.filter(set => 
          set.groupId >= 1000 && 
          !set.name.includes('Masters') && 
          !set.name.includes('Commander') && 
          !set.name.includes('Universes Beyond') &&
          !set.name.includes('Un')
        );
      case 'masters':
        return sets.filter(set => set.name.includes('Masters') || set.name.includes('Remastered'));
      case 'commander':
        return sets.filter(set => set.name.includes('Commander'));
      case 'universes-beyond':
        return sets.filter(set => set.name.includes('Universes Beyond') || 
          set.name.includes('FINAL FANTASY') || 
          set.name.includes('Marvel') || 
          set.name.includes('Avatar'));
      case 'un-sets':
        return sets.filter(set => set.name.startsWith('Un'));
      default:
        return sets;
    }
  }

  /**
   * Get popular/high-value sets for testing
   */
  static getPopularSets(): MTGSet[] {
    const popularSetNames = [
      'Alpha Edition',
      'Beta Edition', 
      'Unlimited Edition',
      'Modern Horizons 3',
      'Foundations',
      'The Lost Caverns of Ixalan',
      'Murders at Karlov Manor',
      'Modern Horizons 2',
      'War of the Spark',
      'Throne of Eldraine'
    ];
    
    return popularSetNames
      .map(name => MTG_SETS[name])
      .filter(set => set !== undefined);
  }
}

export default MTG_SETS;