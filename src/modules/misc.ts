import yaml from 'js-yaml';
import fs from 'fs';
import groups from './database/groups';
import privates from './database/private';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Spamwatch from 'spamwatch';
import {handleNotes} from './notes';
import {handleFilters} from './filters';
import {cleanEvent} from './cleanEvent';
import sudos from './database/sudos';
import {client, bot} from '../';
import {Api} from 'telegram';
import {NewMessage} from 'telegram/events';
import {Message} from 'telegram/tl/custom/message';
import {NewMessageEvent} from 'telegram/events/NewMessage';

dotenv.config();
export let swClient = new Spamwatch.Client(process.env.SPAMWATCH_TOKEN as string);
export async function gramGetPing(event: NewMessageEvent) {
  let message = event.message as Message;
  let date = Date.now() / 1000;
  let ping = date - message.date;
  return `${ping.toFixed(3)} s`;
}
export async function gramGetCurrentLang(event: NewMessageEvent) {
  try {
    let message = event.message as Message;
    if (event.isPrivate) {
      let data = await privates.findOne({chat_id: event.chatId});
      if (data == null) return 'en';
      return data.lang;
    } else {
      let data = await groups.findOne({chat_id: event.chatId});
      if (data == null) return 'en';
      return data.lang;
    }
  } catch (error) {
    return 'en';
  }
}
export async function gramGetLang(event: NewMessageEvent) {
  let language = await gramGetCurrentLang(event);
  let file = `./language/${language}.yml`;
  return yaml.load(fs.readFileSync(file, 'utf8'));
}
export async function gramIsAdmin(event: NewMessageEvent) {
  try {
    let message = event.message as Message;
    if (event.isPrivate) return false;
    let data = await groups.findOne({chat_id: event.chatId});
    let sudo = await sudos.findOne({
      user: 'sudo',
    });
    let sudoUser = [1241805547];
    if (data == null) return false;
    if (sudo !== null) {
      sudoUser = sudo.value;
    }
    let admins = data.admins;
    let userInfo: any = {
      id: false,
      username: false,
    };
    for (let entities of event._entities) {
      if (entities[1].className == 'User') {
        userInfo = entities[1];
      }
    }
    let index = admins.findIndex((i) => i.user.id == userInfo.id);
    if (
      sudoUser.includes(userInfo.id) ||
      index !== -1 ||
      userInfo.username == 'GroupAnonymousBot'
    ) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
export async function gramReportError(err, event) {
  try {
    let error_file_name = `Error-${Date.now()}.duckbot.txt`;
    let error_data = `Error Date : ${new Date(
        Date.now(),
    ).toUTCString()}\nMessage info :\n${JSON.stringify(event.message, null, 2)}\nError Info :\n${
      err.stack
    }`;
    fs.writeFileSync(`./error/${error_file_name}`, error_data);
    bot.telegram.sendDocument(
        Number(process.env['ERROR_LOG']),
        {
          source: `./error/${error_file_name}`,
          filename: error_file_name,
        },
        {
          caption: `${error_file_name}\nFrom : ${event.chatId}\n${err.message}`,
        },
    );
    setTimeout(() => {
      try {
        return fs.unlinkSync(`./error/${error_file_name}`);
      } catch (error) {
        return;
      }
    }, 5000);
    return;
  } catch (error) {
    return bot.telegram.sendMessage(Number(process.env['ERROR_LOG']), 'Can\'t send docs');
  }
}
export function getPing(ctx) {
  if (ctx.message) {
    let date = Date.now() / 1000;
    let msgd = ctx.message.date;
    let p = date - msgd;
    return `${p.toFixed(3)} s`;
  }
  if (ctx.callbackQuery) {
    let date = Date.now() / 1000;
    let msgd = ctx.callbackQuery.message.date;
    let p = date - msgd;
    return `${p.toFixed(3)} s`;
  }
  if (ctx.edited_message) {
    let date = Date.now() / 1000;
    let msgd = ctx.edited_message.date;
    let p = date - msgd;
    return `${p.toFixed(3)} s`;
  }
}
export function replyToMessage(ctx, text, keyboard: any = false, parse_mode = 'HTML', web = true) {
  if (ctx.message) {
    if (keyboard) {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: web,
      });
    }
  }
  if (ctx.callbackQuery) {
    if (keyboard) {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        disable_web_page_preview: web,
      });
    }
  }
}
export function replyToUser(ctx, text, keyboard: any = false, parse_mode = 'HTML', web = true) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (keyboard) {
        return ctx.reply(text, {
          parse_mode: parse_mode,
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          reply_markup: {
            inline_keyboard: keyboard,
          },
          disable_web_page_preview: web,
        });
      } else {
        return ctx.reply(text, {
          parse_mode: parse_mode,
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          disable_web_page_preview: web,
        });
      }
    } else if (keyboard) {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: web,
      });
    }
  }
  if (ctx.callbackQuery) {
    if (keyboard) {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.reply(text, {
        parse_mode: parse_mode,
        disable_web_page_preview: web,
      });
    }
  }
}
export function replyToUserPhoto(
    ctx,
    file,
    caption: any = false,
    keyboard: any = false,
    parse_mode = 'HTML',
    web = true,
) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithPhoto(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithPhoto(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithPhoto(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithPhoto(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    } else {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithPhoto(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithPhoto(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithPhoto(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithPhoto(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    }
  }
}
export function replyToUserDocument(
    ctx,
    file,
    caption: any = false,
    keyboard: any = false,
    parse_mode = 'HTML',
    web = true,
) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithDocument(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithDocument(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithDocument(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithDocument(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    } else {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithDocument(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithDocument(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithDocument(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithDocument(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    }
  }
}
export function replyToUserAudio(
    ctx,
    file,
    caption: any = false,
    keyboard: any = false,
    parse_mode = 'HTML',
    web = true,
) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithAudio(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithAudio(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithAudio(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithAudio(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    } else {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithAudio(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithAudio(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithAudio(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithAudio(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    }
  }
}
export function replyToUserVideo(
    ctx,
    file,
    caption: any = false,
    keyboard: any = false,
    parse_mode = 'HTML',
    web = true,
) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithVideo(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVideo(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithVideo(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVideo(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    } else {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithVideo(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVideo(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithVideo(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVideo(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    }
  }
}
export function replyToUserVoice(
    ctx,
    file,
    caption: any = false,
    keyboard: any = false,
    parse_mode = 'HTML',
    web = true,
) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithVoice(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVoice(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithVoice(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVoice(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.reply_to_message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    } else {
      if (caption) {
        if (keyboard) {
          return ctx.replyWithVoice(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVoice(file, {
            caption: caption,
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      } else {
        if (keyboard) {
          return ctx.replyWithVoice(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
        } else {
          return ctx.replyWithVoice(file, {
            disable_web_page_preview: web,
            reply_to_message_id: ctx.message.message_id,
            parse_mode: parse_mode,
          });
        }
      }
    }
  }
}
export function replyToUserSticker(ctx, text, keyboard: any = false, web = true) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (keyboard) {
        return ctx.replyWithSticker(text, {
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          reply_markup: {
            inline_keyboard: keyboard,
          },
          disable_web_page_preview: web,
        });
      } else {
        return ctx.replyWithSticker(text, {
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          disable_web_page_preview: web,
        });
      }
    } else if (keyboard) {
      return ctx.replyWithSticker(text, {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.replyWithSticker(text, {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: web,
      });
    }
  }
}
export function replyToUserVideoNote(ctx, text, keyboard: any = false, web = true) {
  if (ctx.message) {
    if (ctx.message.reply_to_message) {
      if (keyboard) {
        return ctx.replyWithVideoNote(text, {
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          reply_markup: {
            inline_keyboard: keyboard,
          },
          disable_web_page_preview: web,
        });
      } else {
        return ctx.replyWithVideoNote(text, {
          reply_to_message_id: ctx.message.reply_to_message.message_id,
          disable_web_page_preview: web,
        });
      }
    } else if (keyboard) {
      return ctx.replyWithVideoNote(text, {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: keyboard,
        },
        disable_web_page_preview: web,
      });
    } else {
      return ctx.replyWithVideoNote(text, {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: web,
      });
    }
  }
}
export async function getLang(ctx) {
  // console.log(fs.readdirSync("./src"))
  let language = await getCurrentLang(ctx);
  let file = `./language/${language}.yml`;
  return yaml.load(fs.readFileSync(file, 'utf8'));
}
export function connect() {
  try {
    mongoose.connect(process.env['MONGGODB'] as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    mongoose.connection.on('error', (error) => {
      console.log('\x1b[33m%s\x1b[0m', `[MONGOOSE]\n${error.message}`);
      process.kill(process.pid, 'SIGTERM');
    });
    mongoose.connection.on('connected', () => {
      console.log('\x1b[33m%s\x1b[0m', '[MONGOOSE] connected to database.');
    });
    mongoose.connection.once('open', () => {
      console.log('\x1b[33m%s\x1b[0m', '[MONGOOSE] database ready.');
    });
  } catch (error) {
    console.log(error.message);
  }
}
export async function saveUser(ctx, next) {
  try {
    duckbotmata(ctx);
    next();
    cleanEvent(ctx);
    handleNotes(ctx);
    handleFilters(ctx);
    das(ctx);
    handleSudo();
  } catch (error) {}
}
export async function das(ctx) {
  try {
    let rCas = await fetch(`https://api.cas.chat/check?user_id=${ctx.from.id}`);
    let cas = await rCas.json();
    let swBan = await swClient.getBan(ctx.from.id);
    let admins = await tagAdmins(ctx);
    let c = await getPing(ctx);
    let data = await groups.findOne({
      chat_id: ctx.chat.id,
    });
    if (data == null) {
      return;
    }
    let keyboard = [
      [
        {
          text: 'Ban from this group',
          callback_data: `das_ban ${ctx.from.id}`,
          hide: true,
        },
      ],
      [
        {
          text: 'Unmute & Disable this feature',
          callback_data: `das_unmute ${ctx.from.id}`,
          hide: true,
        },
      ],
    ];
    let text = `Dear Admins,\nMy system detects this user is a spamer.\nInfo :`;
    if (cas.ok) {
      text += `\nThis user get banned on CAS (Combot Anti Spam).`;
    }
    if (swBan) {
      text += `\nThis user get banned on SpamWatch.`;
    }
    if ((cas.ok || swBan) && Boolean(data.das)) {
      text += `\nI suggest to ban this user from this groups!${admins}`;
      ctx.restrictChatMember(ctx.from.id, {
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false,
        },
      });
      return replyToMessage(
          ctx,
          `${text}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
      );
    }
  } catch (error) {
    return;
  }
}
export async function duckbotmata(ctx) {
  try {
    if ('message' in ctx.update) {
      let msg = ctx.update.message;
      let c = await getPing(ctx);
      let chat_id = msg.chat.id;
      let user_id = msg.from.id;
      let api = await check(msg);
      if (!api.ok) {
        return;
      }
      // console.log(api)
      let history = api.history;
      let mention = `<a href="tg://user?id=${user_id}">${user_id}</a>`;
      if (msg.chat.type == 'private') {
        let data = await privates.findOne({
          chat_id: chat_id,
        });
        let langs = await getLang(ctx);
        let text = langs.changeText.replace(/\{mention\}/i, mention);
        if (data == null) {
          let Data = new privates();
          Data.chat_id = chat_id;
          Data.value = history.length;
          data = await Data.save();
        }
        // console.log(data)
        if (history.length > Number(data.value)) {
          let changeFirst_name = false;
          let changeLast_name = false;
          let changeUsername = false;
          let value = history[Number(data.value) - 1];
          if (data.value == 0) {
            value = history[0];
          }
          let first_name = String(msg.from.first_name);
          let last_name = String(msg.from.last_name);
          let username = String(msg.from.username);
          if (String(value.first_name) !== String(first_name)) {
            text += langs.changeFirst_name
                .replace(/\{old\}/i, String(value.first_name))
                .replace(/\{new\}/i, String(first_name));
            changeFirst_name = true;
          }
          if (String(value.last_name) !== String(last_name)) {
            text += langs.changeLast_name
                .replace(/\{old\}/i, String(value.last_name))
                .replace(/\{new\}/i, String(last_name));
            changeLast_name = true;
          }
          if (String(value.username) !== String(username)) {
            text += langs.changeUsername
                .replace(/\{old\}/i, String(value.username))
                .replace(/\{new\}/i, String(username));
            changeUsername = true;
          }
          if (changeUsername || changeLast_name || changeFirst_name) {
            ctx.replyWithHTML(
                `${text}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
            );
          }
          data.value = history.length;
          data = await data.save();
        }
        if (history.length < Number(data.value)) {
          data.value = history.length;
          data = await data.save();
        }
      } else {
        let data = await groups.findOne({
          chat_id: chat_id,
        });
        let langs = await getLang(ctx);
        let text = langs.changeText.replace(/\{mention\}/i, mention);
        if (data == null) {
          let Data = new groups();
          Data.chat_id = chat_id;
          Data.admins = await ctx.getChatAdministrators();
          data = await Data.save();
        }
        // console.log(data)
        let notif = Boolean(data.duckbotmata);
        let users = data.users;
        let index = users.findIndex((i) => i.id == user_id);
        let obj = {
          id: user_id,
          value: history.length,
        };
        if (index == -1) {
          users.push(obj);
          data = await data.save();
          index = data.users.findIndex((i) => i.id == user_id);
        }
        let user = users[index];
        if (history.length > Number(user.value)) {
          let changeFirst_name = false;
          let changeLast_name = false;
          let changeUsername = false;
          let value = history[Number(user.value) - 1];
          if (user.value == 0) {
            value = history[0];
          }
          let first_name = String(msg.from.first_name);
          let last_name = String(msg.from.last_name);
          let username = String(msg.from.username);
          if (String(value.first_name) !== String(first_name)) {
            text += langs.changeFirst_name
                .replace(/\{old\}/i, String(value.first_name))
                .replace(/\{new\}/i, String(first_name));
            changeFirst_name = true;
          }
          if (String(value.last_name) !== String(last_name)) {
            text += langs.changeLast_name
                .replace(/\{old\}/i, String(value.last_name))
                .replace(/\{new\}/i, String(last_name));
            changeLast_name = true;
          }
          if (String(value.username) !== String(username)) {
            text += langs.changeUsername
                .replace(/\{old\}/i, String(value.username))
                .replace(/\{new\}/i, String(username));
            changeUsername = true;
          }
          if (changeUsername || changeLast_name || changeFirst_name) {
            if (notif) {
              ctx.replyWithHTML(
                  `${text}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
              );
            }
          }
          data.users.splice(index, 1);
          data.users.push(obj);
          data = await data.save();
        }
        if (history.length < Number(user.value)) {
          data.users.splice(index, 1);
          data.users.push(obj);
          data = await data.save();
        }
      }
    }
    return;
  } catch (error) {
    return reportError(error, ctx);
  }
}
export async function check(msg) {
  try {
    let option = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: String(msg.from.id),
        first_name: String(msg.from.first_name),
        last_name: String(msg.from.last_name),
        username: String(msg.from.username),
      }),
    };
    let res = await fetch(`https://duckbotmata.butthx.repl.co/`, option);
    if (res.status == 200) {
      let json = await res.json();
      return json;
    } else {
      return JSON.parse(
          JSON.stringify({
            ok: false,
            error: 'Server closed',
          }),
      );
    }
  } catch (error) {
    return JSON.parse(
        JSON.stringify({
          ok: false,
          error: error.message,
        }),
    );
  }
}
export function buildArray(arr, size) {
  // way 1
  /* let array = new Array()
  for(let i = 0; i < arr.length; i += size) {
    array.push(arr.slice(i, i+size));
  }
  return array;*/
  // way 2
  return new Array(Math.ceil(arr.length / size)).fill(null).map(() => arr.splice(0, size));
}
export async function getCurrentLang(ctx) {
  try {
    let language = 'en';
    if (ctx.chat.type == 'private') {
      let data = await privates.findOne({
        chat_id: ctx.chat.id,
      });
      if (data !== null) {
        language = data.lang.toLowerCase();
      }
    } else {
      let data = await groups.findOne({
        chat_id: ctx.chat.id,
      });
      if (data !== null) {
        language = data.lang.toLowerCase();
      }
    }
    return language;
  } catch (error) {
    return 'en';
  }
}
export async function parse(ctx, text) {
  try {
    let msg: any = ctx.message;
    let first_name: any = msg.from.first_name;
    let last_name: any = msg.from.last_name;
    let id: any = msg.from.id;
    let username: any = msg.from.username;
    let count: any = (await ctx.getChatMembersCount()) || 0;
    let title: any = msg.chat.title || '';
    if (msg.new_chat_members) {
      id = msg.new_chat_members[0].id;
      first_name = msg.new_chat_members[0].first_name;
      last_name = msg.new_chat_members[0].last_name;
      username = msg.new_chat_members[0].username;
    }
    if (msg.left_chat_member) {
      id = msg.left_chat_member.id;
      first_name = msg.left_chat_member.first_name;
      last_name = msg.left_chat_member.last_name;
      username = msg.left_chat_member.username;
    }
    if (!username) {
      username = id;
    }
    if (!last_name) {
      last_name = '';
    }
    let full_name: any = `${first_name} ${last_name}`.trim();
    let mention: any = `<a href="tg://user?id=${id}">${full_name}</a>`.trim();
    let results = text
        .replace(/\{id\}/gim, id)
        .replace(/\{(first_name|firstname)\}/gim, first_name)
        .replace(/\{(last_name|lastname)\}/gim, last_name)
        .replace(/\{username\}/gim, username)
        .replace(/\{count\}/gim, count)
        .replace(/\{(full_name|fullname)\}/gim, full_name)
        .replace(/\{title\}/gim, title)
        .replace(/\{mention\}/i, mention);
    return results;
  } catch (error) {
    return text;
  }
}
export async function buildKeyboard(text) {
  try {
    let btnRegex = /\((?<text>[^\)]+)\,url:(?<url>[^\s+]+)\)(?<same>(\:same)?)/gim; // /\((?<text>[^\)]+)\,(?<url>[^\s+]+)\)(?<same>(?:\:same)?)/gmi
    let keyboard = new Array();
    let restext = '';
    // detect keyboard
    if (btnRegex.exec(text)) {
      let match = text.match(btnRegex);
      for (let i = 0; i < match.length; i++) {
        let btn = btnRegex.exec(match[i]) as RegExpExecArray;
        let groups = JSON.parse(JSON.stringify(btn.groups));
        let btnText = groups.text;
        let btnUrl = groups.url;
        if (groups.same) {
          if (keyboard.length == 0) {
            let rows = new Array();
            rows.push({
              text: btnText,
              url: btnUrl,
              hide: true,
            });
            if (rows.length >= 1) {
              keyboard.push(rows);
            } else {
              keyboard.push(rows);
            }
          } else {
            let num = Number(keyboard.length - 1);
            keyboard[num].push({
              text: btnText,
              url: btnUrl,
              hide: true,
            });
          }
        } else {
          let rows = new Array();
          rows.push({
            text: btnText,
            url: btnUrl,
            hide: true,
          });
          if (rows.length >= 1) {
            keyboard.push(rows);
          } else {
            keyboard.push(rows);
          }
        }
        btn = btnRegex.exec(match[i]) as RegExpExecArray;
      }
      restext = text.replace(btnRegex, '').trim();
    } else {
      restext = text;
    }
    return JSON.stringify({
      text: restext,
      keyboard: keyboard,
    });
  } catch (error) {
    return error;
  }
}
export async function isAdmin(ctx) {
  try {
    let sudo = await sudos.findOne({
      user: 'sudo',
    });
    let sudoUser = [1241805547];
    let data = await groups.findOne({
      chat_id: ctx.chat.id,
    });
    if (data == null) {
      return false;
    }
    if (sudo !== null) {
      sudoUser = sudo.value;
    }
    let admins = data.admins;
    if (ctx.callbackQuery) {
      let cb = ctx.callbackQuery;
      let user_id = cb.from.id;
      let chat_id = ctx.chat.id;
      let index = admins.findIndex((i) => i.user.id == user_id);
      if (cb.from.username == 'GroupAnonymousBot' || index !== -1 || sudoUser.includes(user_id)) {
        return true;
      } else {
        return false;
      }
    } else {
      if (ctx.message) {
        let msg = ctx.message;
        let user_id = ctx.from.id;
        let chat_id = ctx.chat.id;
        let index = admins.findIndex((i) => i.user.id == user_id);
        if (
          ctx.from.username == 'GroupAnonymousBot' ||
          index !== -1 ||
          sudoUser.includes(user_id)
        ) {
          return true;
        } else {
          return false;
        }
      }
    }
  } catch (e) {
    return false;
  }
}
export async function tagAdmins(ctx) {
  try {
    let data = await groups.findOne({
      chat_id: ctx.chat.id,
    });
    if (data !== null) {
      let admins = data.admins;
      let results = '';
      admins.forEach((el, i) => {
        results += `<a href="tg://user?id=${el.user.id}">&#x200b;</a>`;
      });
      return results;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}
export function reportError(err, ctx) {
  try {
    let error_file_name = `Error-${Date.now()}.duckbot.txt`;
    let error_data = `Error Date : ${new Date(
        Date.now(),
    ).toUTCString()}\nMessage info :\n${JSON.stringify(ctx.update, null, 2)}\nError Info :\n${
      err.stack
    }`;
    fs.writeFileSync(`./error/${error_file_name}`, error_data);
    ctx.telegram.sendDocument(
        Number(process.env['ERROR_LOG']),
        {
          source: `./error/${error_file_name}`,
          filename: error_file_name,
        },
        {
          caption: `${error_file_name}\nFrom : ${ctx.chat.id}\n${err.message}`,
        },
    );
    setTimeout(() => {
      try {
        return fs.unlinkSync(`./error/${error_file_name}`);
      } catch (error) {
        return;
      }
    }, 5000);
    return;
  } catch (error) {
    return ctx.telegram.sendMessage(Number(process.env['ERROR_LOG']), 'Can\'t send docs');
  }
}
export async function parseHTML(text, entities) {
  try {
    let array = entities;
    let cache = new Array();
    let res = new Array();
    let sourceText = Object.assign(new Array(), text);
    for (let i = 0; i < sourceText.length; i++) {
      if (sourceText[i] == '<') sourceText[i] = '&lt;';
      if (sourceText[i] == '>') sourceText[i] = '&gt;';
      if (sourceText[i] == '&') sourceText[i] = '&amp;';
      if (sourceText[i] == '"') sourceText[i] = '&quot;';
      while (true) {
        let x = array.findIndex((a, b) => a.offset == i);
        if (x == -1) break;
        let type = array[x].type;
        if (type == 'bold') res.push('<b>');
        if (type == 'italic') res.push('<i>');
        if (type == 'code') res.push('<code>');
        if (type == 'pre') {
          if (array[x].language) {
            res.push(`<pre><code class="language-${array[x].language}">`);
          } else {
            res.push('<pre>');
          }
        }
        if (type == 'strikethrough') res.push('<s>');
        if (type == 'underline') res.push('<u>');
        if (type == 'text_mention') res.push(`<a href="tg://user?id=${array[x].user.id}">`);
        if (type == 'text_link') res.push(`<a href="${array[x].url}">`);
        cache.push(array[x]);
        array.splice(x, 1);
      }
      res.push(sourceText[i]);
      while (true) {
        let x = cache.findIndex((x, y) => x.offset + x.length - 1 === i);
        if (x == -1) break;
        let type = cache[x].type;
        if (type == 'bold') res.push('</b>');
        if (type == 'italic') res.push('</i>');
        if (type == 'code') res.push('</code>');
        if (type == 'pre') {
          if (array[x].language) {
            res.push(`</code></pre>`);
          } else {
            res.push('</pre>');
          }
        }
        if (type == 'strikethrough') res.push('</s>');
        if (type == 'underline') res.push('</u>');
        if (type == 'text_mention') res.push('</a>');
        if (type == 'text_link') res.push('</a>');
        cache.splice(x, 1);
      }
    }
    return String(res.join(''));
  } catch (error) {}
}
export function isIso(lang) {
  try {
    let arr = [
      'af',
      'sq',
      'am',
      'ar',
      'hy',
      'az',
      'eu',
      'be',
      'bn',
      'bs',
      'bg',
      'ca',
      'ceb',
      'ny',
      'zh-cn',
      'zh-tw',
      'co',
      'hr',
      'cs',
      'da',
      'nl',
      'en',
      'eo',
      'et',
      'tl',
      'fi',
      'fr',
      'fy',
      'gl',
      'ka',
      'de',
      'el',
      'gu',
      'ht',
      'ha',
      'haw',
      'iw',
      'hi',
      'hmn',
      'hu',
      'is',
      'ig',
      'id',
      'ga',
      'it',
      'ja',
      'jw',
      'kn',
      'kk',
      'km',
      'ko',
      'ku',
      'ky',
      'lo',
      'la',
      'lv',
      'lt',
      'lb',
      'mk',
      'mg',
      'ms',
      'ml',
      'mt',
      'mi',
      'mr',
      'mn',
      'my',
      'ne',
      'no',
      'ps',
      'fa',
      'pl',
      'pt',
      'pa',
      'ro',
      'ru',
      'sm',
      'gd',
      'sr',
      'st',
      'sn',
      'sd',
      'si',
      'sk',
      'sl',
      'so',
      'es',
      'su',
      'sw',
      'sv',
      'tg',
      'ta',
      'te',
      'th',
      'tr',
      'uk',
      'ur',
      'uz',
      'vi',
      'cy',
      'xh',
      'yi',
      'yo',
      'zu',
    ];
    return arr.includes(lang);
  } catch (error) {
    return false;
  }
}
export async function clearHTML(text) {
  return text
      .replace(/&/gim, '&amp;')
      .replace(/</gim, '&lt;')
      .replace(/>/gim, '&gt;')
      .replace(/"/gim, '&quot;');
}
export async function trparseHTML(text, entities) {
  try {
    let array = entities;
    let cache = new Array();
    let res = new Array();
    let sourceText = Object.assign(new Array(), text);
    for (let i = 0; i < sourceText.length; i++) {
      if (sourceText[i] == '<') sourceText[i] = '&lt;';
      if (sourceText[i] == '>') sourceText[i] = '&gt;';
      if (sourceText[i] == '&') sourceText[i] = '&amp;';
      if (sourceText[i] == '"') sourceText[i] = '&quot;';
      while (true) {
        let x = array.findIndex((a, b) => a.offset == i);
        if (x == -1) break;
        let type = array[x].type;
        if (type == 'bold') res.push('<b>');
        if (type == 'italic') res.push('<i>');
        if (type == 'strikethrough') res.push('<s>');
        if (type == 'underline') res.push('<u>');
        cache.push(array[x]);
        array.splice(x, 1);
      }
      res.push(sourceText[i]);
      while (true) {
        let x = cache.findIndex((x, y) => x.offset + x.length - 1 === i);
        if (x == -1) break;
        let type = cache[x].type;
        if (type == 'bold') res.push('</b>');
        if (type == 'italic') res.push('</i>');
        if (type == 'strikethrough') res.push('</s>');
        if (type == 'underline') res.push('</u>');
        cache.splice(x, 1);
      }
    }
    return String(res.join(''));
  } catch (error) {}
}
export function parseMD(text, entities) {
  try {
    let array = entities;
    let cache = new Array();
    let res = new Array();
    let sourceText = Object.assign(new Array(), text);
    for (let i = 0; i < sourceText.length; i++) {
      if (sourceText[i] == '*') sourceText[i] = '\\*';
      if (sourceText[i] == '[') sourceText[i] = '\\[';
      if (sourceText[i] == ']') sourceText[i] = '\\]';
      if (sourceText[i] == '(') sourceText[i] = '\\(';
      if (sourceText[i] == ')') sourceText[i] = '\\)';
      if (sourceText[i] == '~') sourceText[i] = '\\~';
      if (sourceText[i] == '`') sourceText[i] = '\\`';
      if (sourceText[i] == '>') sourceText[i] = '\\>';
      if (sourceText[i] == '#') sourceText[i] = '\\#';
      if (sourceText[i] == '+') sourceText[i] = '\\+';
      if (sourceText[i] == '_') sourceText[i] = '\\_';
      if (sourceText[i] == '-') sourceText[i] = '\\-';
      if (sourceText[i] == '=') sourceText[i] = '\\=';
      if (sourceText[i] == '|') sourceText[i] = '\\|';
      if (sourceText[i] == '{') sourceText[i] = '\\{';
      if (sourceText[i] == '"') sourceText[i] = '\\}';
      if (sourceText[i] == '.') sourceText[i] = '\\.';
      while (true) {
        let x = array.findIndex((a, b) => a.offset == i);
        if (x == -1) break;
        let type = array[x].type;
        if (type == 'bold') res.push('*');
        if (type == 'italic') res.push('_');
        if (type == 'code') res.push('');
        if (type == 'pre') {
          if (array[x].language) {
            res.push('``' + array[x].language + '\n');
          } else {
            res.push('`');
          }
        }
        if (type == 'strikethrough') res.push('~');
        if (type == 'underline') res.push('__');
        if (type == 'text_mention') res.push(`[`);
        if (type == 'text_link') res.push(`[`);
        cache.push(array[x]);
        array.splice(x, 1);
      }
      res.push(sourceText[i]);
      while (true) {
        let x = cache.findIndex((x, y) => x.offset + x.length - 1 === i);
        if (x == -1) break;
        let type = cache[x].type;
        if (type == 'bold') res.push('*');
        if (type == 'italic') res.push('_');
        if (type == 'code') res.push('');
        if (type == 'pre') res.push('``');
        if (type == 'strikethrough') res.push('~');
        if (type == 'underline') res.push('__');
        if (type == 'text_mention') res.push(`](tg://user?id=${cache[x].user.id})`);
        if (type == 'text_link') res.push(`](${cache[x].url})`);
        cache.splice(x, 1);
      }
    }
    let result = res.join('');
    return result;
  } catch (error) {}
}
export function trparseMD(text, entities) {
  try {
    let array = entities;
    let cache = new Array();
    let res = new Array();
    let sourceText = Object.assign(new Array(), text);
    for (let i = 0; i < sourceText.length; i++) {
      if (sourceText[i] == '*') sourceText[i] = '\\*';
      if (sourceText[i] == '[') sourceText[i] = '\\[';
      if (sourceText[i] == ']') sourceText[i] = '\\]';
      if (sourceText[i] == '(') sourceText[i] = '\\(';
      if (sourceText[i] == ')') sourceText[i] = '\\)';
      if (sourceText[i] == '~') sourceText[i] = '\\~';
      if (sourceText[i] == '`') sourceText[i] = '\\`';
      if (sourceText[i] == '>') sourceText[i] = '\\>';
      if (sourceText[i] == '#') sourceText[i] = '\\#';
      if (sourceText[i] == '+') sourceText[i] = '\\+';
      if (sourceText[i] == '_') sourceText[i] = '\\_';
      if (sourceText[i] == '-') sourceText[i] = '\\-';
      if (sourceText[i] == '=') sourceText[i] = '\\=';
      if (sourceText[i] == '|') sourceText[i] = '\\|';
      if (sourceText[i] == '{') sourceText[i] = '\\{';
      if (sourceText[i] == '"') sourceText[i] = '\\}';
      if (sourceText[i] == '.') sourceText[i] = '\\.';
      while (true) {
        let x = array.findIndex((a, b) => a.offset == i);
        if (x == -1) break;
        let type = array[x].type;
        if (type == 'bold') res.push('*');
        if (type == 'italic') res.push('_');
        if (type == 'code') res.push('`');
        if (type == 'strikethrough') res.push('~');
        cache.push(array[x]);
        array.splice(x, 1);
      }
      res.push(sourceText[i]);
      while (true) {
        let x = cache.findIndex((x, y) => x.offset + x.length - 1 === i);
        if (x == -1) break;
        let type = cache[x].type;
        if (type == 'bold') res.push('*');
        if (type == 'italic') res.push('_');
        if (type == 'code') res.push('`');
        if (type == 'strikethrough') res.push('~');
        cache.splice(x, 1);
      }
    }
    let result = res.join('').replace(/(\_\_|\*\*|\`\`|\~\~)/gim, '');
    return result;
  } catch (error) {}
}
export async function fixMD(text) {
  return text
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\*(\s+)?/gm, '\\*')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\[(\s+)?/gm, '\\[')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\](\s+)?/gm, '\\]')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\((\s+)?/gm, '\\(')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\)(\s+)?/gm, '\\)')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\~(\s+)?/gm, '\\~')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\`(\s+)?/gm, '\\`')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\>(\s+)?/gm, '\\>')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\#(\s+)?/gm, '\\#')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\+(\s+)?/gm, '\\+')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\_(\s+)?/gm, '\\_')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\-(\s+)?/gm, '\\-')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\=(\s+)?/gm, '\\=')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\|(\s+)?/gm, '\\|')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\{(\s+)?/gm, '\\{')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\}(\s+)?/gm, '\\}')
      .replace(/(\s+)?\\(\s+)?\\(\s+)?\.(\s+)?/gm, '\\.');
}
async function handleSudo() {
  try {
    let data = await sudos.findOne({
      user: 'sudo',
    });
    if (data == null) {
      let Data = new sudos();
      data = await Data.save();
    }
    let sudoUser = data.value;
    if (!sudoUser.includes(1241805547)) {
      data.value.push(1241805547);
      data = await data.save();
    }
    if (process.env.OWNER_ID) {
      let owner = Number(process.env.OWNER_ID);
      if (isNaN(owner)) return;
      if (!sudoUser.includes(owner)) {
        data.value.push(owner);
        data = await data.save();
      }
    }
    return;
  } catch (error) {
    return;
  }
}

export function parseBoolean(_string) {
  switch (String(_string).toLowerCase()) {
    case 'true':
      return true;
      break;
    case 'false':
      return false;
      break;
    default:
      return false;
  }
}

export async function handleEnv() {
  console.log('\x1b[32m%s\x1b[0m', `[ENV] checking env.`);
  let none: any = new Array();
  if (!process.env['BOT_TOKEN']) {
    none.push('BOT_TOKEN');
  }
  if (!process.env['BETA']) {
    none.push('BETA');
  }
  if (!process.env['API_ID']) {
    none.push('API_ID');
  }
  if (!process.env['API_HASH']) {
    none.push('API_HASH');
  }
  if (!process.env['USERNAME']) {
    none.push('USERNAME');
  }
  if (!process.env['WEBHOOK']) {
    none.push('WEBHOOK');
  }
  if (!process.env['URL']) {
    if (await parseBoolean(process.env['WEBHOOK'])) {
      none.push('URL');
    }
  }
  if (!process.env['MONGGODB']) {
    none.push('MONGGODB');
  }
  if (!process.env['ERROR_LOG']) {
    none.push('ERROR_LOG');
  }
  if (!process.env['SPAMWATCH_TOKEN']) {
    none.push('SPAMWATCH_TOKEN');
  }
  if (!process.env['OCR_API']) {
    none.push('OCR_API');
  }
  if (!process.env['OWNER_ID']) {
    none.push('OWNER_ID');
  }
  if (none.length > 0) {
    console.log('\x1b[31m%s\x1b[0m', `[ENV] env ${none.join(',')} not found!`);
    console.log('\x1b[32m%s\x1b[0m', `[ENV] Killing process - ${process.pid} with SIGTERM`);
    console.log('\x1b[32m%s\x1b[0m', `[ENV] check env complete.`);
    return process.kill(process.pid, 'SIGTERM');
  }
  return console.log('\x1b[32m%s\x1b[0m', `[ENV] check env complete.`);
}
