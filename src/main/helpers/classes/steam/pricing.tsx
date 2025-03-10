import { getValue, setValue } from './settings';

require('dotenv').config();
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const pricingEmitter = new MyEmitter();

// Get latest prices, if fail use backup

interface SkinportItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number;
  item_page: string;
  market_page: string;
  min_price: number;
  max_price: number;
  mean_price: number;
  median_price: number;
  quantity: number;
  created_at: number;
  updated_at: number;
}

interface SkinledgerPricing {
  steam: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
    last_90d: number;
  };
  buff163: {
    starting_at: {
      price: number;
    };
  };
  skinport: {
    starting_at: number;
  };
}

interface CasInterface {
  setPricing(
    pricingData: { [key: string]: SkinledgerPricing },
    commandFrom: string
  ): void;
}

// Fallback function to load backup prices
async function getPricesBackup(cas: CasInterface): Promise<void> {
  const pricesBackup = require('./backup/prices.json');
  cas.setPricing(pricesBackup, 'backup');
}

// Get prices from Skinport API and transform them to Skinledger format
async function getPrices(cas: CasInterface): Promise<void> {
  const params = new URLSearchParams({
    app_id: '730', // CS:GO app ID
    currency: 'EUR', // Currency set to EUR
    tradable: '0', // Filter items by tradable status (0 means not tradable)
  });

  try {
    const response = await fetch(
      `https://api.skinport.com/v1/items?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'br',
        },
      }
    );

    // Check if the response status is OK (200)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SkinportItem[] = await response.json();
    console.log('prices, response', Array.isArray(data), data !== null);

    if (Array.isArray(data) && data.length > 0) {
      const transformedPrices = transformSkinportToSkinledger(data);
      cas.setPricing(transformedPrices, 'normal');
    } else {
      getPricesBackup(cas); // Fallback to backup if the data isn't valid
    }
  } catch (error) {
    console.log('Error prices', error);
    getPricesBackup(cas); // Fallback to backup in case of an error
  }
}

// Function to transform Skinport data to Skinledger format
function transformSkinportToSkinledger(skinportData: SkinportItem[]): {
  [key: string]: SkinledgerPricing;
} {
  const transformedData: { [key: string]: SkinledgerPricing } = {};

  skinportData.forEach((item) => {
    // Extract the necessary data from Skinport and map it to Skinledger format
    const skinledgerPricing: SkinledgerPricing = {
      steam: {
        last_24h: item.median_price, // You can adjust this if needed
        last_7d: item.median_price, // Using median_price for all timeframes as an example
        last_30d: item.median_price,
        last_90d: item.median_price,
      },
      buff163: {
        starting_at: {
          price: item.median_price, // Assigning median_price to buff163 starting_at
        },
      },
      skinport: {
        starting_at: item.median_price, // Assigning median_price to skinport starting_at
      },
    };

    // Use the market_hash_name as the key, and assign the transformed pricing data
    transformedData[item.market_hash_name] = skinledgerPricing;
  });

  return transformedData;
}

let currencyCodes = {
  1: 'USD',
  2: 'GBP',
  3: 'EUR',
  4: 'CHF',
  5: 'RUB',
  6: 'PLN',
  7: 'BRL',
  8: 'JPY',
  9: 'NOK',
  10: 'IDR',
  11: 'MYR',
  12: 'PHP',
  13: 'SGD',
  14: 'THB',
  15: 'VND',
  16: 'KRW',
  17: 'TRY',
  18: 'UAH',
  19: 'MXN',
  20: 'CAD',
  21: 'AUD',
  22: 'NZD',
  23: 'CNY',
  24: 'INR',
  25: 'CLP',
  26: 'PEN',
  27: 'COP',
  28: 'ZAR',
  29: 'HKD',
  30: 'TWD',
  31: 'SAR',
  32: 'AED',
  33: 'SEK',
  34: 'ARS',
  35: 'ILS',
  36: 'BYN',
  37: 'KZT',
  38: 'KWD',
  39: 'QAR',
  40: 'CRC',
  41: 'UYU',
  42: 'BGN',
  43: 'HRK',
  44: 'CZK',
  45: 'DKK',
  46: 'HUF',
  47: 'RON',
};

// import { DOMParser } from 'xmldom'
// RUN PROGRAMS
class runItems {
  steamUser;
  seenItems;
  packageToSend;
  header;
  currency;
  headers;
  prices;

  constructor(steamUser) {
    this.steamUser = steamUser;
    this.seenItems = {};
    this.packageToSend = {};
    getPrices(this);
    getValue('pricing.currency').then((returnValue) => {
      if (returnValue == undefined) {
        setValue('pricing.currency', currencyCodes[steamUser.wallet.currency]);
      }
    });
  }
  async setPricing(pricingData, commandFrom) {
    console.log('pricingSet', commandFrom);
    this.prices = pricingData;
  }
  async makeSinglerequest(itemRow) {
    let itemNamePricing = itemRow.item_name.replaceAll(
      '(Holo/Foil)',
      '(Holo-Foil)'
    );
    if (itemRow.item_wear_name !== undefined) {
      itemNamePricing = itemRow.item_name + ' (' + itemRow.item_wear_name + ')';
      if (!this.prices[itemNamePricing] && this.prices[itemRow.item_name]) {
        itemNamePricing = itemRow.item_name;
      }
    }

    if (this.prices[itemNamePricing] !== undefined) {
      let pricingDict = {
        buff163: this.prices[itemNamePricing]?.buff163.starting_at?.price,
        steam_listing: this.prices[itemNamePricing]?.steam?.last_90d,
        skinport: this.prices[itemNamePricing]?.skinport?.starting_at,
        bitskins: 0,
      };
      if (this.prices[itemNamePricing]?.steam?.last_30d) {
        pricingDict.steam_listing =
          this.prices[itemNamePricing]?.steam?.last_30d;
      }
      if (this.prices[itemNamePricing]?.steam?.last_7d) {
        pricingDict.steam_listing =
          this.prices[itemNamePricing]?.steam?.last_7d;
      }

      if (this.prices[itemNamePricing]?.steam?.last_24h) {
        pricingDict.steam_listing =
          this.prices[itemNamePricing]?.steam?.last_24h;
      }
      if (
        this.prices[itemNamePricing]?.steam?.last_7d == 0 &&
        this.prices[itemNamePricing]?.buff163.starting_at?.price > 2000
      ) {
        pricingDict.steam_listing =
          this.prices[itemNamePricing]?.buff163.starting_at?.price * 0.8;
      }
      itemRow['pricing'] = pricingDict;
      return itemRow;
    } else {
      let pricingDict = {
        buff163: 0,
        steam_listing: 0,
        skinport: 0,
        bitskins: 0,
      };
      itemRow['pricing'] = pricingDict;
      return itemRow;
    }
  }
  async handleItem(itemRow) {
    let returnRows = [] as any;
    itemRow.forEach((element) => {
      if (element.item_name !== undefined && element.item_moveable == true) {
        this.makeSinglerequest(element).then((returnValue) => {
          returnRows.push(returnValue);
        });
      }
    });
    pricingEmitter.emit('result', itemRow);
  }

  async handleTradeUp(itemRow) {
    let returnRows = [] as any;
    itemRow.forEach((element) => {
      this.makeSinglerequest(element).then((returnValue) => {
        returnRows.push(returnValue);
      });
    });
    pricingEmitter.emit('result', itemRow);
  }
}
module.exports = {
  runItems,
  pricingEmitter,
  currencyCodes,
};
export { runItems, pricingEmitter, currencyCodes };
