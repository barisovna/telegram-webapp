export default async function handler(req, res) {
  // ВАЖНО: CORS заголовки должны быть ПЕРВЫМИ
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 часа

  // Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем API ключ
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY не настроен');
      return res.status(500).json({ error: 'API ключ не настроен' });
    }

    // Получаем данные из запроса
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Некорректный формат запроса' });
    }

    // Запрос к DeepSeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }),
      timeout: 30000 // 30 секунд
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API ошибка:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `API ошибка: ${response.status}` 
      });
    }

    const data = await response.json();
    
    // Проверяем структуру ответа
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Некорректный ответ от DeepSeek:', data);
      return res.status(500).json({ error: 'Некорректный ответ от API' });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Ошибка сервера:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
}
