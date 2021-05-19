'use strict';
const express = require('express');
const { Telegraf, Scenes, session, Markup } = require("telegraf");
const Order = require('./model');
const mongoose = require('mongoose');
const { getBodyText } = require('telegraf-inline-menu/dist/source/body');
require('dotenv').config();

// db init
const db_url = 'mongodb+srv://su_admin:llonelinesss16@cluster0.rilpd.mongodb.net/Supp?retryWrites=true&w=majority';
mongoose
    .connect(db_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    })
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection
// invite links for chats
const chat_invite_links = ['https://t.me/joinchat/dDSP_btKULljMmNi', 'https://t.me/joinchat/m78OZJyS_3tiNGIy', 'https://t.me/joinchat/sqU87QB2qdplMWFi',];
const chats_id = ['-569193560', '']
// keyboards init
const exit_keyboard = Markup.keyboard(['exit']).resize();
const remove_keyboard = Markup.removeKeyboard();
const main_keyboard = Markup.keyboard([
    ['🗒 Создать задание', '🗄 Мои задания'],
    ['💸 Оплатить задачу', '✅ Завершить задачу'],
    ['💎 Вывести деньги', 'exit'],
    ['👤 Поддержка'],
]).resize();

const app = express(); // server init
const bot = new Telegraf(process.env.TOKEN); // bot init
// pay invoice
const getInvoice = (id, price) => {
    const invoice = {
        chat_id: id,
        provider_token: process.env.PROVIDER_TOKEN,
        start_parameter: 'get_access',
        title: 'Telegram bot',
        description: 'Предоплата услуг фрилансера',
        currency: 'UAH',
        prices: [{ label: `Telegram bot`, amount: (Number(price) * 0.08 + Number(price)) * 100 }],
        photo_url: 'https://picsum.photos/300/200',
        photo_width: 300,
        photo_height: 200,
        payload: {
            unique_id: `${id}_${Number(new Date())}`,
            provider_token: process.env.PROVIDER_TOKEN
        }
    }
    return invoice
}
// scenes section
const confirmScene = new Scenes.BaseScene('confirm');
confirmScene.enter(ctx => {
    ctx.reply('Введите айди задания', exit_keyboard);
});
confirmScene.hears('exit', ctx => ctx.scene.leave());
confirmScene.on('text', async ctx => {
    Order.findByIdAndUpdate(ctx.message.text ,{paid: true}).then(data => {
        ctx.reply('Данные обновлены...');
    });
});
confirmScene.leave(ctx => ctx.reply("Выхожу", main_keyboard));

// payout
const payoutScene = new Scenes.BaseScene("payout");
payoutScene.enter(ctx => {
    ctx.reply("Введите номер карты", exit_keyboard);
})
payoutScene.hears("exit", ctx => ctx.scene.leave());
payoutScene.on('text', async ctx => {
    try {
        if (Number(ctx.message.text) && ctx.message.text.length === 16) {
            let money = 0;
            await Order.find({ performerId: ctx.message.from.id, status: false, moneyOut: false }).then(data => {
                data.map(async d => {
                    money += Number(d.price);
                    await Order.findByIdAndUpdate(d._id, { moneyOut: true })
                })
                bot.telegram.sendMessage('@payouts_bot', `id: ${ctx.message.from.id}\nкарта: ${ctx.message.text}\nсумма: ${money}`);
                ctx.reply("Оплата поступит в течении нескольких часов");
            });
            ctx.scene.leave();
        }
        else {
            ctx.reply('Проверьте номер карты');
        }
    }
    catch (err) {
        ctx.reply('Ошибка');
    }
})
payoutScene.leave(ctx => ctx.reply("Выхожу", main_keyboard));
// pay task
const payScene = new Scenes.BaseScene("pay");
payScene.enter(ctx => {
    ctx.reply("Оплатить задачу\nесли застряли попробуйте нажать 'exit'", { ...exit_keyboard, ...Markup.inlineKeyboard([Markup.button.callback('Оплатить', 'Оплатить')]) });
});
payScene.action('Оплатить', ctx => {
    try {
        Order.find({ userId: ctx.callbackQuery.from.id, status: true, paid: false }).then(data => {
            data.map(async (d) => {
                if (d.imageId) {
                    const link = await ctx.telegram.getFile(d.imageId);
                    ctx.replyWithPhoto(`${link.file_id}`, {
                        caption: `Вы заказчик
                        \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                        \nНазвание предмета:  <b>${d.name}</b>, 
                        \nОписание задания: <b>${d.description}</b>, 
                        \nДедлайн: <b>${d.deadline}</b>, 
                        \nЦена: <b>${d.price}</b>
                        \n${d._id}`,
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('💸 Оплатить', '💸 Оплатить')]),
                    })
                } else {
                    ctx.reply(`Вы заказчик
                    \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
                \nНазвание предмета:  <b>${d.name}</b>, 
                \nОписание задания: <b>${d.description}</b>, 
                \nДедлайн: <b>${d.deadline}</b>, 
                \nЦена: <b>${d.price}</b>
                \n${d._id}`, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('💸 Оплатить', '💸 Оплатить')]),
                    });
                }
            });
        })
    }
    catch (err) {
        ctx.reply('Задание не найдено');
    }
});
payScene.action('💸 Оплатить', ctx => {
    if(ctx.callbackQuery.message.photo){
        ctx.session.id = ctx.callbackQuery.message.caption.slice(ctx.callbackQuery.message.caption.length - 24, ctx.callbackQuery.message.caption.length);
    }
    else{
        ctx.session.id = ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.length - 24, ctx.callbackQuery.message.text.length);
    }
    Order.findById(ctx.session.id).then(data => {
        // ctx.replyWithInvoice(getInvoice(ctx.callbackQuery.from.id, data.price));
        ctx.reply(`Отправьте ${data.price} грн на реквизиты: \n
        4441114423581402 монобанк\n
        5168757333449983 приват\n
        ВАЖНО!!! \nВ комментарии к переводу оставьте id задачи ${ctx.session.id}`);
        ctx.scene.leave();
    })
});
payScene.hears("exit", ctx => ctx.scene.leave());
payScene.on('text', ctx => { });
payScene.leave(ctx => ctx.reply("Выхожу", main_keyboard));
// close task
const closeScene = new Scenes.BaseScene("close");
closeScene.enter(ctx => {
    ctx.reply("Завершить задачу\nесли застряли попробуйте нажать 'exit'", { ...exit_keyboard, ...Markup.inlineKeyboard([Markup.button.callback('Закрыть задачу', 'Закрыть задачу')]) });
});
closeScene.action('Закрыть задачу', ctx => {
    try {
        Order.find({ userId: ctx.callbackQuery.from.id, status: true, paid: true }).then(data => {
            data.map(async (d) => {
                if (d.imageId) {
                    const link = await ctx.telegram.getFile(d.imageId);
                    ctx.replyWithPhoto(`${link.file_id}`, {
                        caption: `Вы заказчик
                        \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                        \nНазвание предмета:  <b>${d.name}</b>, 
                        \nОписание задания: <b>${d.description}</b>, 
                        \nДедлайн: <b>${d.deadline}</b>, 
                        \nЦена: <b>${d.price}</b>
                        \n${d._id}`,
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('✅ Завершить', '✅ Завершить')]),
                    })
                } else {
                    ctx.reply(`Вы заказчик
                    \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>
                    \n${d._id}`, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('✅ Завершить', '✅ Завершить')]),
                    });
                }
            });
        });
        Order.find({userId: ctx.callbackQuery.from.id, status: true, paid: false, performerId: undefined}).then(data => {
            data.map(async d => {
                if (d.imageId) {
                    const link = await ctx.telegram.getFile(d.imageId);
                    ctx.replyWithPhoto(`${link.file_id}`, {
                        caption: `Вы заказчик
                        \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                        \nНазвание предмета:  <b>${d.name}</b>, 
                        \nОписание задания: <b>${d.description}</b>, 
                        \nДедлайн: <b>${d.deadline}</b>, 
                        \nЦена: <b>${d.price}</b>
                        \n${d._id}`,
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('❌ Закрыть задачу', '❌ Закрыть задачу')]),
                    })
                } else {
                    ctx.reply(`Вы заказчик
                    \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>
                    \n${d._id}`, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback('❌ Закрыть задачу', '❌ Закрыть задачу')]),
                    });
                }
            })
        })
    }
    catch (err) {
        ctx.reply('Задание не найдено');
    }
})
closeScene.action('✅ Завершить', ctx => {
    if(ctx.callbackQuery.message.photo){
        Order.findByIdAndUpdate(ctx.callbackQuery.message.caption.slice(ctx.callbackQuery.message.caption.length - 24, ctx.callbackQuery.message.caption.length), {status: false, moneyOut: false})
        .then(data => {
            ctx.reply("Вы закрыли задание", main_keyboard);
            ctx.scene.leave();
        })
    }
    else{
        Order.findByIdAndUpdate(ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.length - 24, ctx.callbackQuery.message.text.length), {status: false, moneyOut: false})
        .then(data => {
            ctx.reply("Вы закрыли задание", main_keyboard);
            ctx.scene.leave();
        })
    }
});
closeScene.action('❌ Закрыть задачу', ctx => {
    if(ctx.callbackQuery.message.photo){
        Order.findByIdAndUpdate(ctx.callbackQuery.message.caption.slice(ctx.callbackQuery.message.caption.length - 24, ctx.callbackQuery.message.caption.length), {status: false, moneyOut: true})
        .then(data => {
            ctx.reply("Вы закрыли задание", main_keyboard);
            bot.telegram.sendMessage('@payouts_bot', /*ctx.telegram.getFile(data.imageId.file_id) ,*/"УДАЛИТЬ\n\n" + ctx.callbackQuery.message.caption);
            ctx.scene.leave();
        })
    }
    else{
        Order.findByIdAndUpdate(ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.length - 24, ctx.callbackQuery.message.text.length), {status: false, moneyOut: true})
        .then(data => {
            ctx.reply("Вы закрыли задание", main_keyboard);
            bot.telegram.sendMessage('@payouts_bot', "УДАЛИТЬ\n\n" + ctx.callbackQuery.message.text);
            ctx.scene.leave();
        })
    }
})
closeScene.hears("exit", ctx => ctx.scene.leave());
closeScene.on('text', ctx => { });
closeScene.leave(ctx => ctx.reply("Выхожу", main_keyboard));
// task name
const nameScene = new Scenes.BaseScene("name");
nameScene.enter((ctx) => {
    ctx.reply("Введите название предмета", exit_keyboard);
    ctx.session.name = "";
    ctx.session.description = "";
    ctx.session.photo = "";
    ctx.session.deadline = "";
    ctx.session.price = "";
});
nameScene.hears("exit", (ctx) => {
    ctx.reply('выхожу', main_keyboard);
    ctx.scene.leave();
});
nameScene.on("text", ctx => {
    ctx.session.name = ctx.message.text;
    return ctx.scene.enter('description');
});
nameScene.on("message", (ctx) => ctx.reply("🥺я не понимаю, попробуйте буквы..."));
// task description
const descriptionScene = new Scenes.BaseScene("description");
descriptionScene.enter((ctx) => ctx.reply("Опишите задание как можно подробнее"));
descriptionScene.hears("exit", (ctx) => {
    ctx.reply('выхожу', main_keyboard);
    ctx.scene.leave();
});

descriptionScene.on("text", ctx => {
    ctx.session.description = ctx.message.text;
    return ctx.scene.enter('photo');
});
descriptionScene.on("message", (ctx) => ctx.reply("🥺я не понимаю, попробуйте буквы..."));
// task photo
const photoScene = new Scenes.BaseScene("photo");
photoScene.enter((ctx) => ctx.reply("Добавьте фото (если есть)", Markup.keyboard(['skip']).oneTime().resize()));
photoScene.hears("exit", (ctx) => {
    ctx.reply('выхожу', main_keyboard);
    ctx.scene.leave();
});
photoScene.hears("skip", (ctx) => ctx.scene.enter('deadline'));

photoScene.on("photo", ctx => {
    ctx.session.photo = ctx.message.photo[ctx.message.photo.length - 1];
    return ctx.scene.enter('deadline');
})
photoScene.on("message", (ctx) => ctx.reply("🥺я не понимаю, попробуйте фото..."));
// task deadline
const deadlineScene = new Scenes.BaseScene("deadline");
deadlineScene.enter((ctx) => ctx.reply("Установите дедлайн", exit_keyboard));
deadlineScene.hears("exit", ctx => {
    ctx.reply('выхожу', main_keyboard);
    ctx.scene.leave();
});
deadlineScene.on("text", ctx => {
    ctx.session.deadline = ctx.message.text;
    return ctx.scene.enter('price');
});
deadlineScene.on("message", ctx => ctx.reply("🥺я не понимаю, попробуйте буквы..."));
// task price
const priceScene = new Scenes.BaseScene("price");
priceScene.enter((ctx) => ctx.reply("Установите цену за задание"));
priceScene.leave(ctx => ctx.reply("👌", main_keyboard));
priceScene.hears("exit", ctx => {
    ctx.reply('выхожу', main_keyboard);
    ctx.scene.leave();
});
priceScene.on("text", async (ctx) => {
    if (Number(ctx.message.text) && Number(ctx.message.text) > 0 && Number(ctx.message.text) < 10000) {
        ctx.session.price = ctx.message.text;
        ctx.session.message = `Название предмета:  <b>${ctx.session.name}</b>, 
    \nОписание задания: <b>${ctx.session.description}</b>, 
    \nДедлайн: <b>${ctx.session.deadline}</b>, 
    \nЦена: <b>${ctx.session.price}</b>`;
        if (ctx.session.photo) {
            ctx.replyWithPhoto(ctx.session.photo.file_id, {
                caption: ctx.session.message,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('✅ Опубликовать', '✅ Опубликовать'),
                ])
            })
        } else {
            await ctx.reply(ctx.session.message, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([Markup.button.callback('✅ Опубликовать', '✅ Опубликовать')])
            });
        }
        return ctx.scene.leave();
    }
    else {
        ctx.reply("Введите число");
    }
});
priceScene.on("message", ctx => ctx.reply("🥺я не понимаю, попробуйте буквы..."));

const stage = new Scenes.Stage([nameScene, descriptionScene, photoScene, deadlineScene, priceScene, payScene, closeScene, payoutScene, confirmScene]);

bot.use(session());
bot.use(stage.middleware());
bot.use(Telegraf.log());
// bot actions init
bot.action('✅ Опубликовать', async (ctx, next) => {
    let id = '';
    if (ctx.session.photo) {
        const order = new Order({
            created: new Date(),
            name: ctx.session.name,
            description: ctx.session.description,
            deadline: ctx.session.deadline,
            imageId: ctx.session.photo.file_id,
            imageUniqId: ctx.session.photo.file_unique_id,
            status: true,
            price: ctx.session.price,
            userId: ctx.callbackQuery.from.id,
            paid: false,
        })
        await order.save().then(data => {
            id = data._id;
        });
        bot.telegram.sendPhoto('@FastCleverFreelance', ctx.session.photo.file_id, {
            caption: `${ctx.session.message} \n\n#${order.name}\n\nid: ${id}`,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([Markup.button.callback('🤝 Беру', '🤝 Беру')])
        })
    } else {
        const order = new Order({
            created: new Date(),
            name: ctx.session.name,
            description: ctx.session.description,
            deadline: ctx.session.deadline,
            status: true,
            price: ctx.session.price,
            userId: ctx.callbackQuery.from.id,
            paid: false,
        })
        await order.save().then(data => {
            id = data._id
        });
        bot.telegram.sendMessage('@FastCleverFreelance', `${ctx.session.message} \n\n#${order.name}\n\nid: ${id}`, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([Markup.button.callback('🤝 Беру', '🤝 Беру')])
        });
    }
});
bot.action('🤝 Беру', ctx => {
    if (ctx.callbackQuery.message.photo) {
        Order.find({ performerId: ctx.callbackQuery.from.id, status: true }).then(async data => {
            if (data.length > 3) {
                ctx.telegram.sendMessage(ctx.callbackQuery.from.id, "Вы уже взялись за выполнение задачи. Перед тем как взять новую, завершите предыдущие.");
            }
            else {
                await Order.findByIdAndUpdate(ctx.callbackQuery.message.caption.slice(ctx.callbackQuery.message.caption.length - 24, ctx.callbackQuery.message.caption.length), { performerId: ctx.callbackQuery.from.id }).then(data => {
                    ctx.editMessageCaption('В процессе\n\n' + ctx.callbackQuery.message.caption,/*ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, */{...Markup.inlineKeyboard([Markup.button.callback('✅ Забрали', '✅ Забрали')])});
                    bot.telegram.sendPhoto(`${ctx.callbackQuery.from.id}`,
                        ctx.callbackQuery.message.photo[ctx.callbackQuery.message.photo.length - 1].file_id,
                        { caption: `${ctx.callbackQuery.message.caption}\n\nВы приняли задачу, чтобы продолжить вступите в чат: \n${bot.telegram.getChatMembersCount(chat_invite_links[0].slice(22, 38)) <= 2 ? chat_invite_links[0] : bot.telegram.getChatMembersCount(chat_invite_links[1].slice(22, 38)) <= 2 ? chat_invite_links[1] : bot.telegram.getChatMembersCount(chat_invite_links[2].slice(22, 38)) <= 2 ? chat_invite_links[2] : "Пожалуйста обратитесь к администратору"}`, parse_mode: "HTML" });
                    bot.telegram.sendPhoto(data.userId/*ctx.callbackQuery.message.caption.slice(ctx.callbackQuery.message.caption.length - 10, ctx.callbackQuery.message.caption.length).trim()*/,
                        ctx.callbackQuery.message.photo[ctx.callbackQuery.message.photo.length - 1].file_id,
                        { caption: `${ctx.callbackQuery.message.caption}\n\n@${ctx.callbackQuery.from.username} принял вашу задачу, чтобы продолжить вступите в чат: \n${chat_invite_links[0]}`, parse_mode: "HTML" });
                });
            }
        })
    }
    else {
        Order.find({ performerId: ctx.callbackQuery.from.id, status: true }).then(async data => {
            if (data.length > 3) {
                ctx.telegram.sendMessage(ctx.callbackQuery.from.id, "Вы уже взялись за выполнение задачи. Перед тем как взять новую, завершите предыдущие.");
            }
            else {
                await Order.findByIdAndUpdate(ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.length - 24, ctx.callbackQuery.message.text.length), { performerId: ctx.callbackQuery.from.id }).then(data => {
                    ctx.editMessageText('В процессе\n\n' + ctx.callbackQuery.message.text,/*ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, */{...Markup.inlineKeyboard([Markup.button.callback('✅ Забрали', '✅ Забрали')])});
                    bot.telegram.sendMessage(`${ctx.callbackQuery.from.id}`,
                        `${ctx.callbackQuery.message.text}\n\nВы приняли задачу, чтобы продолжить вступите в чат: \n${bot.telegram.getChatMembersCount(chat_invite_links[0].slice(22, 38)) <= 2 ? chat_invite_links[0] : bot.telegram.getChatMembersCount(chat_invite_links[1].slice(22, 38)) <= 2 ? chat_invite_links[1] : bot.telegram.getChatMembersCount(chat_invite_links[2].slice(22, 38)) <= 2 ? chat_invite_links[2] : "Пожалуйста обратитесь к администратору"}`, { parse_mode: "HTML" });
                    bot.telegram.sendMessage(data.userId/*ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.length - 10, ctx.callbackQuery.message.text.length).trim()*/,
                        `${ctx.callbackQuery.message.text}\n\n${ctx.callbackQuery.from.username} принял вашу задачу, чтобы продолжить вступите в чат: \n${chat_invite_links[0]}`, { parse_mode: "HTML" });
                });
            }
        })
    }
});
bot.hears("🗄 Мои задания", (ctx) => {
    ctx.reply("Выберите фильтр", Markup.inlineKeyboard([Markup.button.callback('Открытые задания', 'Открытые задания'), Markup.button.callback('Завершенные задания', 'Завершенные задания')]));
})
bot.action('Открытые задания', async ctx => {
    await Order.find({ userId: ctx.callbackQuery.from.id, status: true }).then(data => {
        data.map(async (d) => {
            if (d.imageId) {
                const link = await ctx.telegram.getFile(d.imageId);
                ctx.replyWithPhoto(`${link.file_id}`, {
                    caption: `Вы заказчик
                    \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>`,
                    parse_mode: "HTML",
                    ...d.paid ? null : Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])),
                    ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу']), Markup.button.callback('❌ Закрыть задачу', '❌ Закрыть задачу')): null,
                })
            } else {
                ctx.reply(`Вы заказчик
                \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
            \nНазвание предмета:  <b>${d.name}</b>, 
            \nОписание задания: <b>${d.description}</b>, 
            \nДедлайн: <b>${d.deadline}</b>, 
            \nЦена: <b>${d.price}</b>`, {
                    parse_mode: "HTML",
                    ...d.paid ? null : Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])),
                    ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу']), Markup.button.callback('❌ Закрыть задачу', '❌ Закрыть задачу')): null,
                });
            }
        });
    });
    await Order.find({ performerId: ctx.callbackQuery.from.id, status: true }).then(data => {
        data.map(async (d) => {
            if (d.imageId) {
                const link = await ctx.telegram.getFile(d.imageId);
                ctx.replyWithPhoto(`${link.file_id}`, {
                    caption: `Вы исполнитель
                    \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>`,
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                })
            } else {
                ctx.reply(`Вы исполнитель
                \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
            \nНазвание предмета:  <b>${d.name}</b>, 
            \nОписание задания: <b>${d.description}</b>, 
            \nДедлайн: <b>${d.deadline}</b>, 
            \nЦена: <b>${d.price}</b>`, {
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                });
            }
        });
    });
});

bot.action('Завершенные задания', async ctx => {
    await Order.find({ userId: ctx.callbackQuery.from.id, status: false }).then(data => {
        data.map(async (d) => {
            if (d.imageId) {
                const link = await ctx.telegram.getFile(d.imageId);
                ctx.replyWithPhoto(`${link.file_id}`, {
                    caption: `Вы заказчик
                    \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>`,
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                })
            } else {
                ctx.reply(`Вы заказчик
                \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
            \nНазвание предмета:  <b>${d.name}</b>, 
            \nОписание задания: <b>${d.description}</b>, 
            \nДедлайн: <b>${d.deadline}</b>, 
            \nЦена: <b>${d.price}</b>`, {
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                });
            }
        });
    });
    await Order.find({ performerId: ctx.callbackQuery.from.id, status: false }).then(data => {
        data.map(async (d) => {
            if (d.imageId) {
                const link = await ctx.telegram.getFile(d.imageId);
                ctx.replyWithPhoto(`${link.file_id}`, {
                    caption: `Вы исполнитель
                    \nСтатус: ${d.status ? 'открыт' : 'закрыт'}, 
                    \nНазвание предмета:  <b>${d.name}</b>, 
                    \nОписание задания: <b>${d.description}</b>, 
                    \nДедлайн: <b>${d.deadline}</b>, 
                    \nЦена: <b>${d.price}</b>`,
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                })
            } else {
                ctx.reply(`Вы исполнитель
                \nСтатус ${d.status ? 'открыт' : 'закрыт'}, 
            \nНазвание предмета:  <b>${d.name}</b>, 
            \nОписание задания: <b>${d.description}</b>, 
            \nДедлайн: <b>${d.deadline}</b>, 
            \nЦена: <b>${d.price}</b>`, {
                    parse_mode: "HTML",
                    // ...d.paid ? Markup.inlineKeyboard(Markup.button.callback(['💸 Оплатить задачу', '💸 Оплатить задачу'])) : null,
                    // ...d.status ? Markup.inlineKeyboard(Markup.button.callback(['✅ Завершить задачу', '✅ Завершить задачу'])) : null,
                });
            }
        });
    });
});

bot.hears('💎 Вывести деньги', async ctx => {
    let money = 0;
    await Order.find({ performerId: ctx.message.from.id, status: false, moneyOut: false }).then(data => {
        data.map(d => {
            money += Number(d.price);
        })
    })
    ctx.reply("Ваш баланс: " + money, Markup.inlineKeyboard([Markup.button.callback('💰 Вывести', '💰 Вывести')]));
})

bot.command('payout', async ctx => {
    let money = 0;
    await Order.find({ performerId: ctx.message.from.id, status: false, moneyOut: false }).then(data => {
        data.map(d => {
            money += Number(d.price);
        })
    })
    ctx.reply("Ваш баланс: " + money, Markup.inlineKeyboard([Markup.button.callback('💰 Вывести', '💰 Вывести')]));
});

bot.action('💰 Вывести', ctx => {
    ctx.scene.enter('payout');
});

bot.action('✅ Забрали', ctx => {

});

bot.hears('✅ Завершить задачу', ctx => {
    ctx.scene.enter('close');
})

bot.command('close', ctx => {
    ctx.scene.enter('close');
});

bot.hears('💸 Оплатить задачу', ctx => {
    ctx.scene.enter('pay');
})

bot.command('pay', (ctx) => {
    ctx.scene.enter("pay");
});

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true)); // ответ на предварительный запрос по оплате

bot.on('successful_payment', async (ctx, next) => { // ответ в случае положительной оплаты
    await Order.findByIdAndUpdate(ctx.session.id, { paid: true }).then(data => {
        ctx.reply('Успешно оплачено');
        ctx.telegram.sendMessage(data.performerId, "Заказчик оплатил задачу, можете приступать к выполнению.");
    });
});

bot.command('help', ctx => {
    ctx.reply('/start\n/help\n/pay\n/close\n/payout\n/admin');
});

bot.hears('👤 Поддержка', ctx => {
    ctx.reply("За помощью обратитесь к администратору @Supp_freelance_bot");
})

bot.command('admin', ctx => {
    ctx.reply("За помощью обратитесь к администратору @Supp_freelance_bot");
})

bot.command('confirm', ctx => {
    ctx.scene.enter('confirm');
})

bot.command('start', (ctx) => {
    ctx.reply("Привет", main_keyboard);
});

bot.hears("🗒 Создать задание", (ctx) => {
    Order.find({ userId: ctx.message.from.id, status: true }).then(data => {
        if (data.length > 3) {
            ctx.reply("Максимальное количество одновременно открытых сделок 3. Чтобы создать новую, завершите открытые сделки");
        }
        else {
            ctx.scene.enter("name");
        }
    });
});

bot.on('message', (ctx) => ctx.reply('Я вас не понимаю\n/help'));
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

app.listen(process.env.PORT);
// TODO: rating