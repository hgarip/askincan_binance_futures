import Binance from 'binance-api-node';
import { validateApiKey } from '../../../utils/auth';

export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // API anahtarı doğrulama
  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { symbol, quantity, leverage, orderType, limitPrice } = req.body;

    // Gerekli alanları kontrol et
    if (!symbol || !quantity || !orderType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Binance client oluştur
    const client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      futures: true
    });

    // Kaldıraç ayarla (eğer belirtilmişse)
    if (leverage) {
      await client.futuresLeverage({
        symbol: symbol,
        leverage: parseInt(leverage)
      });
    }

    // Long pozisyon aç
    const orderParams = {
      symbol: symbol,
      side: 'BUY',
      quantity: quantity,
      type: orderType
    };

    // Limit emir için fiyat ekle
    if (orderType === 'LIMIT' && limitPrice) {
      orderParams.price = limitPrice;
      orderParams.timeInForce = 'GTC';
    }

    const order = await client.futuresOrder(orderParams);
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Long pozisyon açma hatası:', error);
    res.status(500).json({ error: error.message });
  }
} 