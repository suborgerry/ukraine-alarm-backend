import { Context, Markup, Telegraf } from 'telegraf';
import { Update } from 'typegram';
// import axios from 'axios';
import { Client } from 'pg';
import { KeyObjectType } from 'crypto';

const token: string = process.env.BOT_TOKEN as string;
const bot: Telegraf<Context<Update>> = new Telegraf(token);

const areasOfUkraine = {
  "Mykolayiv": "Миколаївська",
  "Chernihiv": "Чернігівська",
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
client.connect();

const mainKeyboard = (ctx: Context) => {
  let region;

  client.query(`SELECT * FROM alarm_users WHERE id='${ctx.from.id}'`, (err, res) => {
    if (err) throw err;

    const cityKey: KeyObjectType = res.rows[0].arrea;
    const userRegion: string = areasOfUkraine[cityKey as keyof typeof areasOfUkraine];
    const userName: string = ctx.from?.first_name ? ctx.from.first_name : "шановний";
    region = userRegion;
    
    const firsRow = `Вітаю ${userName}!`;
    const secondRow = `Ваш регіон: ${region}`
    return (
      ctx.reply(firsRow + "\n" + secondRow,
      Markup.keyboard([
        ['🔍 Шукати',], //'📌 Додати локацію'
        ['⚠️ Для розробника', '📢 Допомога'],
      ]))
    )
  })
};

bot.start((ctx) => {
  // check user id
  client.query('SELECT * FROM alarm_users', (err, res) => {
    if (err) throw err;

    let checkState = false;

    for (const row of res.rows) {
      const idFromDB: number = parseInt(JSON.stringify(row.id), 10);
      if(idFromDB == ctx.from.id) {
        checkState = true
      }      
    }

    // define keyborad
    if(checkState) {
        mainKeyboard(ctx);
    } else {
      ctx.reply('Вітаю, ' + ctx.from.first_name + '! Будь ласка, визначте свій регіон',
      Markup.keyboard([
        ['🟡 Показати регіони']
      ]));
    }
    // client.end();
  });
  console.log("Started user: " + ctx.from.id);
});

bot.hears('📢 Допомога', (ctx) => {
  ctx.reply('Введіть /search для визначення вашого міста');
  ctx.reply('Введіть /quit для зупинки бота');
  console.log("User: " + ctx.from.id + ".Comand: '/help'");
});

bot.hears('🔍 Шукати', (ctx) => {
  ctx.reply(
    'Виберіть вашу область'
  )
});

bot.hears(/📌 Моя локація|🟡 Показати регіони/, ctx => {
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

  const userArea: string = msg.callbackQuery.data.replace(/'/, "''");
  const userId: number = msg.from.id;

  const sql = `INSERT INTO alarm_users (id, arrea) VALUES ('${userId}', '${userArea}')`;
  console.log(sql);
  // client.connect();
  client.query(sql, (err) => {
    if (err) console.log(err);
    // client.end();
  });
  mainKeyboard(msg);
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
