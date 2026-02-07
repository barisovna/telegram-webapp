// /api/speech-to-text.js
// Этот файл обрабатывает аудио и отправляет в Qwen ASR API

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST метод' });
  }

  try {
    // Проверяем API ключ Qwen
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return res.status(500).json({ 
        error: 'Qwen API ключ не настроен. Добавьте QWEN_API_KEY в Environment Variables' 
      });
    }

    // Получаем аудио данные (base64)
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'Нет аудио данных' });
    }

    console.log('📤 Отправляю аудио в Qwen ASR...');

    // Qwen ASR API endpoint для файлов
    // Документация: https://www.alibabacloud.com/help/en/model-studio/qwen-speech-recognition
    const qwenApiUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/transcription';
    
    // Конвертируем base64 в blob для отправки
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Первый запрос: создаём задачу
    const taskResponse = await fetch(qwenApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qwenApiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify({
        model: 'qwen3-asr-flash-filetrans',
        input: {
          // Для Qwen API нужен URL файла, но мы используем упрощённый подход
          // Отправляем base64 напрямую (если поддерживается)
          audio: audio
        },
        parameters: {
          language: 'ru',  // Русский язык
          enable_itn: true  // Нормализация текста (числа, даты)
        }
      })
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      console.error('❌ Qwen API ошибка:', taskResponse.status, errorText);
      return res.status(taskResponse.status).json({ 
        error: `Qwen API ошибка: ${taskResponse.status}`,
        details: errorText
      });
    }

    const taskData = await taskResponse.json();
    console.log('✅ Ответ от Qwen:', taskData);

    // Если API вернул результат сразу
    if (taskData.output && taskData.output.transcription) {
      return res.status(200).json({ 
        text: taskData.output.transcription
      });
    }

    // Если это асинхронная задача, получаем task_id
    const taskId = taskData.output?.task_id;
    
    if (!taskId) {
      return res.status(500).json({ 
        error: 'Не получен task_id от Qwen',
        data: taskData
      });
    }

    // Ждём результат (polling)
    let attempts = 0;
    const maxAttempts = 30;  // 30 секунд максимум
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // Ждём 1 секунду
      
      const resultResponse = await fetch(`${qwenApiUrl}/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${qwenApiKey}`
        }
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        const status = resultData.output?.task_status;
        
        console.log(`🔄 Статус задачи: ${status}`);
        
        if (status === 'SUCCEEDED') {
          const transcription = resultData.output?.transcription || 
                              resultData.output?.results?.[0]?.transcription;
          
          return res.status(200).json({ 
            text: transcription || 'Текст не распознан'
          });
        }
        
        if (status === 'FAILED') {
          return res.status(500).json({ 
            error: 'Распознавание не удалось',
            details: resultData
          });
        }
      }
      
      attempts++;
    }

    return res.status(408).json({ error: 'Timeout: распознавание заняло слишком много времени' });

  } catch (error) {
    console.error('💥 Ошибка:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
}
