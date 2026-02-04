// API endpoint для DeepSeek
module.exports = async (req, res) => {
  // Разрешаем запросы с любых доменов
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Если это проверочный запрос - сразу отвечаем OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Принимаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Используйте POST метод' 
    });
  }

  try {
    // Проверяем что API ключ настроен
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ 
        error: 'API ключ не настроен. Добавьте DEEPSEEK_API_KEY в Environment Variables' 
      });
    }

    // Отправляем запрос к DeepSeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
};
