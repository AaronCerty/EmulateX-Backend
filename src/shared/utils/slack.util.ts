import axios from 'axios';
import { sleep } from 'src/shared/utils/sleep';

let limit = 0;

export async function sendTelegramMessage(message: string): Promise<boolean> {
  while (limit == 0) {
    await sleep(5000);
  }

  limit = 1;

  try {
    const botToken = '7732819153:AAGujZDsru4qjxNI_ZcCquxO85hsQYMun4g';
    // const chatId = '1846279021';
    const chatId = '-4667823266';
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    setTimeout(() => {
      limit = 0;
    }, 5000);
    return true;
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
    setTimeout(() => {
      limit = 0;
    }, 5000);
    return false;
  }
}
