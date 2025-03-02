import Binance from 'binance-api-node';
import { validateApiKey } from '../../../utils/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { symbol, quantity, leverage, orderType, limitPrice } = req.body;

    if (!symbol || !quantity || !orderType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      futures: true
    });

    if (leverage) {
      await client.futuresLeverage({
        symbol: symbol,
        leverage: parseInt(leverage)
      });
    }

    const orderParams = {
      symbol: symbol,
      side: 'SELL',
      quantity: quantity,
      type: orderType
    };

    if (orderType === 'LIMIT' && limitPrice) {
      orderParams.price = limitPrice;
      orderParams.timeInForce = 'GTC';
    }

    const order = await client.futuresOrder(orderParams);
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Short pozisyon açma hatası:', error);
    res.status(500).json({ error: error.message });
  }
} 