import { Context, Markup, Telegraf } from 'telegraf';
import { Update } from 'typegram';
import axios from 'axios';
import { Client } from 'pg';
import { setInterval } from 'timers';
import { stat } from 'fs';

const token: string = process.env.BOT_TOKEN as string;
const bot: Telegraf<Context<Update>> = new Telegraf(token);

const areasOfUkraine = {
  "Mykolayiv": "Миколаївська обл.",
  "Chernihiv": "Чернігівська обл.",
  "Rivne": "Рівенська обл.",
  "Chernivtsi": "Чернігівська обл.",
  "Ivano-Frankivs'k": "Івано-Франківська обл.",
  "Khmel'nyts'kyy": "Хмельницька обл.",
  "L'viv": "Львівська обл.",
  "Ternopil'": "Тернопільська обл.",
  "Transcarpathia": "Закарпатська обл.",
  "Volyn": "Волинська обл.",
  "Cherkasy": "Черкаська обл.",
  "Kirovohrad": "Кіровоградська обл.",
  "Kyiv": "Київська обл.",
  "Odessa": "Одеська обл.",
  "Vinnytsya": "Вінницька обл.",
  "Zhytomyr": "Житомирська обл.",
  "Sumy": "Сумська обл.",
  "Dnipropetrovs'k": "Дніпропетровська обл.",
  "Donets'k": "Донецька обл.",
  "Kharkiv": "Харківська обл.",
  "Poltava": "Полтавська обл.",
  "Zaporizhzhya": "Запоріжська обл.",
  "Kyiv City": "м. Київ",
  "Kherson": "Херсонська обл.",
  "Luhans'k": "Луганська обл.",
  "Sevastopol": "м. Севастопіль",
  "Crimea": "АР Крим",
};

bot.command('check', () => {
  console.log('\n \n')
  checkAlarm();
});

setInterval(() => {
  checkAlarm();
}, 2000);

const checkAlarm = () => {
  axios.get('http://localhost/fake/fake.json') // http://sirens.in.ua/api/v1/
      .then(response => {
          showAlarm(response.data);
      })
      .catch(error => {
          console.log(error);
      })
      .finally(()=>{
          // console.log('Finaly.')
      });
};

let savedAlarmRegions: string;
const showAlarm = (regions: string) => {
  if (!savedAlarmRegions) savedAlarmRegions = regions;

  for (const key of Object.keys(regions)) {

    const newState = regions[key as unknown as number];
    const savedState = savedAlarmRegions[key as unknown as number];

    if(newState != savedState) {

      if(newState === 'full') {
        console.log('Alarm at ' + key);
        findAlarmUsers(true, key);
      } else {
        console.log('Break at ' + key);
        findAlarmUsers(false, key);
      } 
    }

  }

  savedAlarmRegions = regions;

}

const findAlarmUsers = (state: boolean, region: string) => {
  const alarmRegion = region.replace(/'/, "''");
  client.query(`SELECT * FROM alarm_users WHERE region='${alarmRegion}'`, (err, res) => {
    if (err) console.error(err);

    const alarmUsersId = res.rows;

    // if(alarmUsersId.length > 1) {
      alarmUsersId.forEach(user => {
        if (state) {
          bot.telegram.sendMessage(user.id, '📢 В вашому регіоні тевога! 📢')
        } else {
          bot.telegram.sendMessage(user.id, '🚫 В вашому регіоні відбій тривоги! 🚫')
        }
      });
    // }
  });
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect();

// Function check user`s id with reion. If user have reion pring main keyboard if doesn`t offering to choise region.
const mainKeyboard = async (ctx: Context) => {
  client.query(`SELECT * FROM alarm_users WHERE id='${ctx.from?.id}'`, (err, res) => {
    if (err) console.error(err);

    const userRegion: string = res.rows[0].region_cyrillic;
    const userName: string = ctx.from?.first_name ? ctx.from.first_name : "шановний";

    const firsRow = `Вітаю ${userName}!`;
    const secondRow = `Ваш регіон: ${userRegion}`
    return (
      ctx.reply(firsRow + "\n" + secondRow,
        Markup.keyboard([
          ['🔍 Шукати',], //'📌 Додати локацію'
          ['📢 Допомога']
        ]))
    )
  });
};

const deleteAll = async (msg: Context) => {
  const messageId: number = msg?.callbackQuery?.message?.message_id != undefined ? msg.callbackQuery.message.message_id : 0;
  const chatId: number = msg?.callbackQuery?.message?.chat.id != undefined ? msg.callbackQuery.message.chat.id : 0;

  for (let i = messageId; i >= 0; i--) {
    try {
      await msg.telegram.deleteMessage(chatId, i);
    } catch (e) {
      console.error(e);
      break;
    }
  }
  return 0;
};

bot.start((ctx) => {
  // check user id
  const sql = "SELECT * FROM alarm_users";
  client.query(sql, (err, res) => {
    if (err) console.error(err);

    let checkState = false;

    for (const row of res.rows) {
      const idFromDB: number = row.id;
      if (idFromDB == ctx.from.id) {
        checkState = true
      }
    }

    // define keyborad
    if (checkState) {
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

bot.on("callback_query", (msg: Context) => {
  const data: any = msg.callbackQuery;

  const userRegion: string = data.data.replace(/'/, "''");
  const userId: number = msg?.from?.id != undefined ? msg.from.id : 0;
  const userRegionCirillic: string = areasOfUkraine[data.data as keyof typeof areasOfUkraine]

  const sql = `INSERT INTO alarm_users (id, region, region_cyrillic) VALUES ('${userId}', '${userRegion}', '${userRegionCirillic}')`;
  // client.connect();
  client.query(sql, (err) => {
    if (err) console.error(err);
    // client.end();
  });
  mainKeyboard(msg);
  deleteAll(msg);
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
