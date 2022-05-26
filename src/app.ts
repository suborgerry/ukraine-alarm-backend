import { Context, Markup, Telegraf } from 'telegraf';
import { Update } from 'typegram';
import axios from 'axios';
import { Client } from 'pg';
import { setInterval } from 'timers';

const token: string = process.env.BOT_TOKEN as string;
const tableName: string = process.env.DB_NAME as string; // test_alarm_users or alarm_users
const adresAPI: string = process.env.API_ADRES as string; // http://sirens.in.ua/api/v1/ or http://localhost/fake/fake.json
const bot: Telegraf<Context<Update>> = new Telegraf(token);
const areasOfUkraine: Metadata = {
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

// Custom interfases //
interface Metadata {
    [key: string]: string
}

// end custom interfses //

// Connect to DB
// URl for login at admin panel
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect();


// Bot comands
bot.start(ctx => {
  // check user id
  const sql = `SELECT * FROM ${tableName}`;
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
  });
  console.log("Started user: " + ctx.from.id);
});

bot.command('check', () => {
  console.log('\n \n')
  checkAlarm();
});

bot.command('quit', (ctx) => {
  // Explicit usage
  ctx.telegram.leaveChat(ctx.message.chat.id);

  // Context shortcut
  ctx.leaveChat();
});

// end bot comands


// Hearscommand bot
bot.hears('📢 Допомога', (ctx) => {
  ctx.reply('Введіть /quit для зупинки бота');
});

bot.hears('🟡 Показати регіони', ctx => {
  generateKeyboard(ctx, 'insert')
});

bot.hears('⚙️ Налаштування', ctx => {
  ctx.deleteMessage();
  ctx.reply('⚙️ Меню налаштувань:',
  Markup.keyboard([
    ['🔄 Змінити регіон']
  ]));
  // ctx.deleteMessage();
});

bot.hears('🔄 Змінити регіон', ctx => {
  generateKeyboard(ctx, 'update');
});
// end hears

// Working cycle
setInterval(() => {
  checkAlarm();
}, 2000);


// Working functions
// Functions for check and alarm state
const generateKeyboard = (ctx: Context, type: string) => {
  const buttonsArray = [];
  for (const [key, value] of Object.entries(areasOfUkraine)) {
    buttonsArray.push(
      [{ text: value, callback_data: '{"region": "' + key + '", "type": "' + type + '"}' }]
    )
  }

  ctx.reply("Оберіть ваш регіон", {
    reply_markup: {
      inline_keyboard: buttonsArray
    }
  });
  ctx.reply("Оберіть ваш регіон");
};

const checkAlarm = () => {
  axios.get(adresAPI)
      .then(response => {
          showAlarm(response.data);
      })
      .catch(error => {
          console.log(error);
      })
};

let savedAlarmRegions: Metadata;
const showAlarm = (regions: Metadata) => {
  if (!savedAlarmRegions) savedAlarmRegions = regions;

  for (const key of Object.keys(regions)) {
    const newState = regions[key];
    const savedState = savedAlarmRegions[key];

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
};

const findAlarmUsers = (state: boolean, region: string) => {
  const alarmRegion = region.replace(/'/, "''");
  const sql = `SELECT * FROM ${tableName} WHERE region='${alarmRegion}'`;
  client.query(sql, (err, res) => {
    if (err) console.error(err);

    const alarmUsersId = res.rows;

    const alarmRegionUkr = areasOfUkraine[region];
    alarmUsersId.forEach(user => {
      if (state) {
        bot.telegram.sendMessage(user.id, `📢 В регіоні ${alarmRegionUkr} тевога! 📢`)
      } else {
        bot.telegram.sendMessage(user.id, `🚫 В регіоні ${alarmRegionUkr} відбій тривоги! 🚫`)
      }
    });
  });
};

const updateData = (ctx: Context) => {

  const data: any = ctx.callbackQuery;
  const dataRegion = JSON.parse(data.data).region;
  const newRegion: string = dataRegion.replace(/'/, "''");
  const userId: number = ctx?.from?.id != undefined ? ctx.from.id : 0;
  const newRegionCirillic: string = areasOfUkraine[dataRegion as keyof typeof areasOfUkraine];

  const sql = `UPDATE ${tableName} SET region='${newRegion}', region_cyrillic='${newRegionCirillic}' WHERE id='${userId}'`;
  console.log(sql);
  client.query(sql, (err) => {
    if (err) console.error(err);

    mainKeyboard(ctx);
    deleteAll(ctx);

    return(
      ctx.reply(`Ваш регіон змінено на ${newRegionCirillic}`)
    )
  });
};

const insertData = (ctx: Context) => {

  const data: any = ctx.callbackQuery;
  const dataRegion = JSON.parse(data.data).region;
  const userRegion: string = dataRegion.replace(/'/, "''");
  const userId: number = ctx?.from?.id != undefined ? ctx.from.id : 0;
  const userRegionCirillic: string = areasOfUkraine[dataRegion as keyof typeof areasOfUkraine];

  const sql = `INSERT INTO ${tableName} (id, region, region_cyrillic) VALUES ('${userId}', '${userRegion}', '${userRegionCirillic}')`;
  
  // const userName: string = ctx.from?.first_name ? ctx.from.first_name : "шановний";
  
  client.query(sql, (err) => {
    if (err) console.error(err);
    
    mainKeyboard(ctx);
    deleteAll(ctx);
    
    return(
      ctx.reply(`Ваш регіон: ${userRegionCirillic}`)
    )
  });
};

// end functions


// Function check user`s id with reion. If user have reion pring main keyboard if doesn`t offering to choise region.
const mainKeyboard = async (ctx: Context) => {
    const secondRow = `Головне меню ⬇️`
    return (
      ctx.reply(secondRow,
        Markup.keyboard([
          //['📌 Додати локацію']
          // ['📢 Допомога']
          ['⚙️ Налаштування']
        ]))
    )
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

// Use calback process
bot.on("callback_query", (ctx: Context) => {
  const data: any = ctx.callbackQuery;
  const queryType: string = JSON.parse(data.data).type;
  
  if(queryType == 'insert') {
    insertData(ctx)
  } else if(queryType == 'update'){
    updateData(ctx)
  }
  

});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
