export interface MarketplaceUrls {
  tcgplayer: string;
  manapool: string;
}

export function generateMarketUrls(name: string, setCode: string): MarketplaceUrls {
  const tcgQuery = `${name} ${setCode}`.replace(/ /g, '+');
  const tcgplayer = `https://www.tcgplayer.com/search?productLineName=magic&q=${tcgQuery}&view=grid`;

  const mpQuery = `${name} #set:${setCode.toLowerCase()}`.replace(/ /g, '+');
  const manapool = `https://manapool.com/search?q=${mpQuery}`;

  return { tcgplayer, manapool };
}
