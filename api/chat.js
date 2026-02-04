// ============================================
// VERCEL API: /api/chat.js
// ============================================
// ВАЖНО: Этот файл должен быть в папке /api
// ============================================

module.exports = async (req, res) => {
  
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Метод не разрешён. Используйте POST.' 
    });
  }

  try {
    console.log('📨 Получен запрос от WebApp');

    // Проверяем наличие API ключа в переменных окружения
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('❌ API ключ не найден в переменных окружения');
      return res.status(500).json({ 
        error: 'API ключ не настроен на сервере' 
      });
    }

    // Отправляем запрос к DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    console.log(`📡 Ответ DeepSeek: ${deepseekResponse.status}`);

    // Получаем ответ от DeepSeek
    const data = await deepseekResponse.json();

    // Если DeepSeek вернул ошибку
    if (!deepseekResponse.ok) {
      console.error('❌ Ошибка DeepSeek:', data);
      return res.status(deepseekResponse.status).json(data);
    }

    // Возвращаем успешный ответ
    console.log('✅ Успешный ответ от DeepSeek');
    return res.status(200).json(data);

  } catch (error) {
    console.error('💥 Ошибка обработки:', error.message);
    
    return res.status(500).json({ 
      error: error.message,
      details: 'Произошла ошибка при обработке запроса'
    });
  }
};
