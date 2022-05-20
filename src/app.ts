import { Context, Markup, Telegraf, Telegram } from 'telegraf';
import { Update } from 'typegram';

const token: string = process.env.BOT_TOKEN as string;
const telegram: Telegram = new Telegram(token);
const bot: Telegraf<Context<Update>> = new Telegraf(token);
const chatId: string = process.env.CHAT_ID as string;

bot.start((ctx) => {
  ctx.reply('Вітаю, ' + ctx.from.first_name + '!');
});

bot.help((ctx) => {
  ctx.reply('Введіть /search для визначення вашого міста');
  ctx.reply('Введіть /quit для зупинки бота');
});

bot.command('start', (ctx) => {
  ctx.reply(
    'Визначитssи геолокацію',
    Markup.keyboard([
      ['🔍 Шукати', '☸ Налаштування'], // Row1 with 2 buttons
      [ '📞 Контакти', '⭐️ Залишити відгук'], // Row2 with 2 buttons
      ['📢 Допомога', '👥 Росказати про нас'] // Row3 with 3 buttons
    ])
  );
});

bot.hears('🔍 Шукати', ctx => {
  ctx.reply('Запит успішно оброблено')
});

bot.command('quit', (ctx) => {
  // Explicit usage
  ctx.telegram.leaveChat(ctx.message.chat.id);

  // Context shortcut
  ctx.leaveChat();
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
