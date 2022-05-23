import { Context, Markup, Telegraf } from 'telegraf';
import { Update } from 'typegram';
// import axios from 'axios';
import { Client } from 'pg';

const token: string = process.env.BOT_TOKEN as string;
const bot: Telegraf<Context<Update>> = new Telegraf(token);

const areasOfUkraine = {
  "Mykolayiv": "Миколаївська",
  "Chernihiv": "ернігівська",
  "Rivne": "Рівенська",
  "Chernivtsi": "Чернігівська",
  "Ivano-Frankivs'k": "Івано-Франківська",
  "Khmel'nyts'kyy": "Хмельницька",
  "L'viv": "Львівська",
  "Ternopil'": "Тернопільська",
  "Transcarpathia": "Закарпатська",
  "Volyn": "Волинська",
  "Cherkasy": "Черкаська",
  "Kirovohrad": "Кіровоградська",
  "Kyiv": "Київська",
  "Odessa": "Одеська",
  "Vinnytsya": "Вінницька",
  "Zhytomyr": "Житомирська",
  "Sumy": "Сумська",
  "Dnipropetrovs'k": "Дніпропетровська",
  "Donets'k": "Донецька",
  "Kharkiv": "Харківська",
  "Poltava": "Полтавська",
  "Zaporizhzhya": "Запоріжська",
  "Kyiv City": "Київ",
  "Kherson": "Херсонська",
  "Luhans'k": "Луганська",
  "Sevastopol": "Севастопіль",
  "Crimea": "Крим",
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// client.connect();

// client.query('SELECT * FROM alarm_users', (err, res) => {
//   if (err) throw err;
//   for (const row of res.rows) {
//     console.log(JSON.stringify(row));
//   }
//   client.end();
// });

bot.start((ctx) => {
  ctx.reply('Вітаю, ' + ctx.from.first_name + '!',
    Markup.keyboard([
      ['🔍 Шукати', '📌 Моя локація'], // Row1 with 2 buttons
      ['⚠️ Для розробника', '📢 Допомога'], // Row2 with 2 buttons
      // ['⭐️ Залишити відгук', '👥 Росказати про нас'] // Row3 with 3 buttons
    ]));
  console.log("Started user: " + ctx.from.id);
});

bot.hears('📢 Допомога', (ctx) => {
  ctx.reply('Введіть /search для визначення вашого міста');
  ctx.reply('Введіть /quit для зупинки бота');
  console.log("User: " + ctx.from.id + ".Comand: '/help'\n");
});

bot.hears('🔍 Шукати', (ctx) => {
  ctx.reply(
    'Виберіть вашу область'
  )
});

bot.hears('📌 Моя локація', ctx => {
  const buttonsArray = [];
  for (const [key, value] of Object.entries(areasOfUkraine)) {
    buttonsArray.push(
      [{ text: value, callback_data: key }]
    )
  }

  ctx.reply("Оберіть ваш регіон", {
    reply_markup: {
      inline_keyboard: buttonsArray
    }
  });
  ctx.reply("Оберіть ваш регіон");
});

bot.hears('⚠️ Для розробника', ctx => {
  ctx.reply(
    "І'мя: " + ctx.from.first_name + "\n" + "Фамілія: " + ctx.from.last_name + "\n" + "Ваш id: " + ctx.from.id + "\n"
  );
  ctx.deleteMessage()
});

bot.on("callback_query", (msg) => {

  const userArea: string = msg.callbackQuery.data;
  const userId: number = msg.from.id;

  const sql = `INSERT INTO alarm_users (id, arrea) VALUES ('${userId}', '${userArea}')`;
  console.log(sql);
  client.connect();
  client.query(sql, (err) => {
    if (err) console.log(err);
    client.end();
  });
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
