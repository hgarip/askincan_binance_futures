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
    const { symbol, positionSide, slPrice, quantity, orderType, triggerCondition } = req.body;

    if (!symbol || !positionSide || !slPrice || !quantity || !orderType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      futures: true
    });

    // Pozisyon yönüne göre SL emri gönder
    const side = positionSide === 'LONG' ? 'SELL' : 'BUY';
    
    const orderParams = {
      symbol: symbol,
      side: side,
      stopPrice: slPrice,
      quantity: quantity,
      type: 'STOP_MARKET',
      reduceOnly: true
    };

    // Tetikleme koşulu varsa ekle
    if (triggerCondition) {
      orderParams.priceProtect = true;
      orderParams.workingType = triggerCondition;
    }

    const order = await client.futuresOrder(orderParams);
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Stop-loss emri hatası:', error);
    res.status(500).json({ error: error.message });
  }
} 