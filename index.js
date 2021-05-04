'use strict'
import fs from 'fs';
import axios from 'axios';
import express from 'express';
import { Telegraf, Markup, session, Scenes } from 'telegraf';
import { getMyTasks, addTask, deleteTask } from './db.js'
// import { MenuTemplate, MenuMiddleware } from 'telegraf-inline-menu'

// export function getMainMenu(ctx) {
//     return ctx.reply('task keyboard', Markup.keyboard([
//         ['Мои задачи', 'Удалить задачу'],
//         ['Смотивируй меня']
//     ]).resize()
//     )
// }

// export function yesNoKeyboard() {
//     return Markup.inlineKeyboard([
//         Markup.callbackButton('Да', 'yes'),
//         Markup.callbackButton('Нет', 'no')
//     ], { columns: 2 }).extra()
// }
let photo = [];
// let mess_id = '';
let message = {
    name: '',
    description: '',
    photo: [],
    deadline: '',
    price: '',
    username: '',
    messageId: '',
};

// let menuTemplate = new MenuTemplate(ctx => ``)

// menuTemplate.interact('Опубликовать', 'a', {
//     do: async ctx => ctx.reply(`Ваше объявление размещено!`)
// })

// const menuMiddleware = new MenuMiddleware('/', menuTemplate)

const exit_keyboard = Markup.keyboard(['exit']).oneTime()
const remove_keyboard = Markup.removeKeyboard()
// Name Scene
const orderNameScrene = new Scenes.BaseScene('orderNameScene');
orderNameScrene.enter(ctx => ctx.reply('Напишите название предмета', exit_keyboard))
orderNameScrene.on('text', ctx => {
    ctx.reply(`Опишите задание как можно подробнее`)
    return ctx.scene.enter('orderDescScene', { name: ctx.message.text }, true)
})
orderNameScrene.leave(ctx => ctx.reply('Exiting name scene'))
// Description Scene
const orderDescScene = new Scenes.BaseScene('orderDescScene')
orderDescScene.enter(ctx => ctx.reply('Опишите задание как можно подробнее', exit_keyboard))
orderDescScene.on('text', ctx => {

    ctx.reply(`Дополните описание (фото)`, exit_keyboard)
    return ctx.scene.enter('orderPhotoScene', { name: ctx.scene.state.name, description: ctx.message.text }, true)

})
orderDescScene.leave(ctx => ctx.reply('Сохраняю информацию...'))
// Photo Scene
const orderPhotoScene = new Scenes.BaseScene('orderPhotoScene')
orderPhotoScene.enter(ctx => ctx.reply('Дополните описание (фото)', exit_keyboard))
orderPhotoScene.on('text', ctx => {
    ctx.reply('Я ожидаю фото')
})
orderPhotoScene.on('message', ctx => {

    //mediaGroup

    // console.log(ctx.message.photo)
    ctx.reply("Установите дедлайн")
    photo.push(ctx.message.photo[2])
    return ctx.scene.enter('orderDeadlineScene', { name: ctx.scene.state.name, description: ctx.scene.state.description, photo: photo }, true)

})
orderPhotoScene.leave(ctx => ctx.reply('Сохраняю информацию...'))
// Deadline Scene
const orderDeadlineScene = new Scenes.BaseScene('orderDeadlineScene')
orderDeadlineScene.enter(ctx => ctx.reply('Установите дедлайн', exit_keyboard))
orderDeadlineScene.on('text', ctx => {

    ctx.reply('Установите цену')
    return ctx.scene.enter('orderPriceScene', { name: ctx.scene.state.name, description: ctx.scene.state.description, photo: ctx.scene.state.photo, deadline: ctx.message.text }, true)

})
orderDeadlineScene.leave(ctx => ctx.reply('Сохраняю информацию...'))
// Price Scene
const orderPriceScene = new Scenes.BaseScene('orderPriceScene')
orderPriceScene.enter(ctx => ctx.reply('Установите цену', exit_keyboard))
orderPriceScene.on('text', ctx => {
    // console.log(ctx.scene.state.photo)
    // ctx.session.name = ctx.scene.state.name
    message.name = ctx.scene.state.name
    message.description = ctx.scene.state.description
    message.photo = ctx.scene.state.photo
    message.deadline = ctx.scene.state.deadline
    message.price = ctx.message.text
    message.username = ctx.message.chat.username
    // ctx.session.description = ctx.scene.state.description
    // ctx.session.photo = ctx.scene.state.photo
    // ctx.session.deadline = ctx.scene.state.deadline
    // ctx.session.price = ctx.message.text
    // ctx.session.username = ctx.message.chat.username
    // ctx.session.mess_id = ctx.message.message_id
    // console.log(ctx.session.photo)
    photo = []
    ctx.replyWithMediaGroup(replyMedia(message, ctx))
    message.messageId = ctx.message.message_id
    console.log(message.messageId)
    ctx.telegram.sendMediaGroup('@testBotFunc', replyMedia(message))
    message = {};
    // ctx.session.mess_id = ctx.message.message_id
    // ctx.reply('/upload чтобы опубликовать')
    // menuMiddleware.replyToContext(ctx);

    return ctx.scene.leave()
})
orderPriceScene.leave(ctx => ctx.reply('Ваше объявление опубликовано!', remove_keyboard))
const stage = new Scenes.Stage([orderNameScrene, orderDescScene, orderPhotoScene, orderDeadlineScene, orderPriceScene])
stage.hears('exit', ctx => ctx.scene.leave())

// const app = express();
const bot = new Telegraf('1743417732:AAEugDIUW3v21o0VCGWd4stoBstDseO_JMo') //сюда помещается токен, который дал botFather

function replyMedia(m, ctx) {
    try {
        let length = m.photo.length
        switch (length) {
            case 1:
                // message.messageId = ctx.message.message_id
                return ( //ctx.replyWithMediaGroup([{
                    [{
                        media: `${m.photo[0].file_id}`,
                        caption: `Название: ${m.name}, 
          \nОписание: ${m.description},  
          \nДедлайн: ${m.deadline}, 
          \nЦена: ${m.price}, 
          \nАвтор: t.me/${m.username}`,
                        type: 'photo'
                    }]);
                break;
            case 2:
                // message.messageId = ctx.message.message_id
                return ( //ctx.replyWithMediaGroup([{
                    [{
                        media: `${m.photo[0].file_id}`,
                        caption: `Название: ${m.name}, 
          \nОписание: ${m.description},  
          \nДедлайн: ${m.deadline}, 
          \nЦена: ${m.price}, 
          \nАвтор: t.me/${m.user}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[1].file_id}`,
                        type: 'photo'
                    }]);
                break;
            case 3:
                // message.messageId = ctx.message.message_id
                return ( //ctx.replyWithMediaGroup([{
                    // media: `${ctx.session.photo[0].file_id}`,
                    [{
                        media: `${m.photo[0].file_id}`,
                        caption: `Название: ${m.name}, 
              \nОписание: ${m.description},  
              \nДедлайн: ${m.deadline}, 
              \nЦена: ${m.price}, 
              \nАвтор: t.me/${m.username}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[1].file_id}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[2].file_id}`,
                        type: 'photo'
                    }]);
                break;
            case 4:
                // message.messageId = ctx.message.message_id
                return ( //ctx.replyWithMediaGroup([{
                    // media: `${ctx.session.photo[0].file_id}`,
                    [{
                        media: `${m.photo[0].file_id}`,
                        caption: `Название: ${m.name}, 
              \nОписание: ${m.description},  
              \nДедлайн: ${m.deadline}, 
              \nЦена: ${m.price}, 
              \nАвтор: t.me/${m.username}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[1].file_id}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[2].file_id}`,
                        type: 'photo'
                    }, {
                        media: `${m.photo[3].file_id}`,
                        type: 'photo'
                    }]);
                break;
            default: console.log('switched')
        }
    }
    catch (err) {
        ctx.reply('Произошла ошибка...\nДля начала работы введите /setOrder\nесли ошибка повторится свяжитесь с администратором')
        console.log(err)
    }
}

bot.use(session())
bot.use(stage.middleware())
bot.command('/start', ctx => ctx.reply('Привет'))
bot.command('/help', ctx => ctx.reply('Список доступных команд: \n/start\n/help\n/setOrder\n/getOrder\n'))
bot.command('/setOrder', ctx => ctx.scene.enter('orderNameScene'))
bot.command('/getOrder', ctx => {
    if (ctx.session.photo) {
        ctx.replyWithMediaGroup(replyMedia(message, ctx));
    }
    else {
        ctx.reply('упс... ошибочка')
    }
})
bot.command('/upload', ctx => {
    // try {
    //     let mes = ctx.replyWithMediaGroup(replyMedia(message));
    //     // console.log(await mes)
    //     setTimeout(() => {
    //         ctx.telegram.sendMediaGroup('@testBotFunc', mes)
    //     }, 1000)
    // }
    // catch (err) {
    //     ctx.reply('произошла ошибка')
    //     console.log(err)
    // }
    ctx.forwardMessage('@testBotFunc', message.messageId)
    message = {};
})
// bot.use(menuMiddleware)
bot.launch() // запуск бота