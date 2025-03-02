import Binance from 'binance-api-node';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      apiKey, 
      symbol, 
      quantity, 
      leverage, 
      type, 
      limitPrice, 
      positionSide,
      stopPrice,
      tpPrice
    } = req.body;
    
    // Action parametresini ekle (varsayılan olarak OPEN)
    const action = req.body.action || 'OPEN';

    // API anahtarı doğrulama
    if (!apiKey || apiKey !== process.env.API_AUTH_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Gerekli alanları kontrol et
    if (!symbol || !quantity || !type || !positionSide) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Binance client oluştur
    const client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      futures: true
    });

    // Pozisyon modunu kontrol et ve ayarla
    try {
      // Önce hesap bilgilerini al
      const accountInfo = await client.futuresAccountInfo();
      
      // Pozisyon modunu kontrol et (HEDGE veya ONE_WAY)
      const positionMode = accountInfo.multiAssetsMode ? 'HEDGE' : 'ONE_WAY';
      
      // Eğer HEDGE modu değilse ve positionSide belirtilmişse, pozisyon modunu değiştir
      if (positionMode === 'ONE_WAY' && positionSide) {
        // Pozisyon modunu HEDGE olarak değiştir
        await client.futuresChangePositionMode({ dualSidePosition: true });
        console.log('Pozisyon modu HEDGE olarak değiştirildi');
      }
    } catch (modeError) {
      console.error('Pozisyon modu ayarlama hatası:', modeError);
      // Hata olsa bile devam et, çünkü zaten doğru modda olabilir
    }

    // Kaldıraç ayarla (eğer belirtilmişse)
    if (leverage) {
      await client.futuresLeverage({
        symbol: symbol,
        leverage: parseInt(leverage)
      });
    }

    let orderParams = {
      symbol: symbol,
      quantity: quantity,
      type: type
    };

    // Pozisyon tarafını ekle (HEDGE modu için)
    orderParams.positionSide = positionSide;

    // İşlem tipine göre parametreleri ayarla
    if (action === 'CLOSE') {
      // Pozisyon kapatma
      orderParams.side = positionSide === 'LONG' ? 'SELL' : 'BUY';
      orderParams.reduceOnly = true;
    } else if (action === 'TP') {
      // Take profit
      orderParams.side = positionSide === 'LONG' ? 'SELL' : 'BUY';
      orderParams.price = tpPrice;
      orderParams.type = 'LIMIT';
      orderParams.timeInForce = 'GTC';
      orderParams.reduceOnly = true;
    } else if (action === 'SL') {
      // Stop loss
      orderParams.side = positionSide === 'LONG' ? 'SELL' : 'BUY';
      orderParams.stopPrice = stopPrice;
      orderParams.type = 'STOP_MARKET';
      orderParams.reduceOnly = true;
    } else {
      // Pozisyon açma (long veya short)
      orderParams.side = positionSide === 'LONG' ? 'BUY' : 'SELL';
    }

    // Limit emir için fiyat ekle
    if (type === 'LIMIT' && limitPrice) {
      orderParams.price = limitPrice;
      orderParams.timeInForce = 'GTC';
    }

    const order = await client.futuresOrder(orderParams);
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Emir işleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
} 