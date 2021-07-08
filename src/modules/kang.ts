import {replyToMessage, reportError, getLang, getPing} from './misc';
import privates from './database/private';
import https from 'https';
import fs from 'fs';
import path from 'path';
import lipo from 'lipo';

let Lipo = new lipo();

function generateSize(metadata, size) {
  let [x, y] = size;
  let {width, height} = metadata;
  if (width > x) {
    height = Math.max((height * x) / width, 1);
    width = x;
  }
  if (height > y) {
    width = Math.max((width * y) / height, 1);
    height = y;
  }
  return [Math.floor(width), Math.floor(height)];
}

export async function kang(ctx) {
  let langs = await getLang(ctx);
  let c = await getPing(ctx);
  try {
    if (!ctx.message.reply_to_message) {
      return replyToMessage(ctx, langs.mustReply);
    }
    let data = await privates.findOne({chat_id: ctx.from.id});
    if (data == null) {
      return replyToMessage(ctx, langs.kangPm, [
        [
          {
            text: langs.pmButton,
            url: `https://t.me/${ctx.botInfo.username}?start`,
            hide: true,
          },
        ],
      ]);
    }
    let file_id: any = false;
    if (ctx.message.reply_to_message.sticker) {
      file_id = ctx.message.reply_to_message.sticker.file_id;
    }
    if (ctx.message.reply_to_message.photo) {
      file_id =
        ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id;
    }
    if (!file_id) {
      return replyToMessage(
          ctx,
          `${langs.mustReply}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
      );
    }
    if (ctx.message.reply_to_message.sticker?.is_animated) {
      let packName = `animate${ctx.from.id}_by_${String(process.env.USERNAME)
          .replace(/^\@/, '')
          .trim()}`;
      let found: any = false;
      let packNum = 0;
      while (true) {
        try {
          let pack = await ctx.telegram.getStickerSet(packName);
          if (pack.stickers.length > 50) {
            packNum++;
            packName = `animate${packNum}${ctx.from.id}_by_${String(process.env.USERNAME)
                .replace(/^\@/, '')
                .trim()}`;
          } else {
            found = pack;
            break;
          }
        } catch (error) {
          break;
        }
      }
      let url = await ctx.telegram.getFileLink(file_id);
      let basename = `kang${Date.now()}-${await path.basename(url.href)}.tgs`;
      let spl = ctx.message.text.split(' ');
      let emoji = '❤️';
      if (spl[1]) {
        emoji = spl[1];
      } else {
        if (ctx.message.reply_to_message.sticker?.emoji) {
          emoji = ctx.message.reply_to_message.sticker.emoji;
        }
      }
      https.get(url, async (res) => {
        let file = fs.createWriteStream(`./download/${basename}`);
        res.pipe(file);
        file.on('error', async (error) => {
          replyToMessage(
              ctx,
              `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
          );
          return reportError(error, ctx);
        });
        file.on('finish', async () => {
          if (found) {
            let error = false;
            await ctx.telegram
                .addStickerToSet(ctx.from.id, packName, {
                  tgs_sticker: {
                    source: `./download/${basename}`,
                  },
                  emojis: emoji,
                })
                .catch(async (e) => {
                  error = true;
                  fs.unlinkSync(`./download/${basename}`);
                  reportError(e, ctx);
                  return replyToMessage(
                      ctx,
                      `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
                  );
                });
            if (!error) {
              fs.unlinkSync(`./download/${basename}`);
              return replyToMessage(
                  ctx,
                  `${langs.kangSuccess.replace(
                      /\{packname\}/i,
                      packName,
                  )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
              );
            }
          } else {
            let error = false;
            await ctx.telegram
                .createNewStickerSet(
                    ctx.from.id,
                    packName,
                    `${ctx.from.first_name} Kang Pack Vol ${packNum + 1}`,
                    {
                      tgs_sticker: {
                        source: `./download/${basename}`,
                      },
                      emojis: emoji,
                    },
                )
                .catch(async (e) => {
                  error = true;
                  fs.unlinkSync(`./download/${basename}`);
                  reportError(e, ctx);
                  return replyToMessage(
                      ctx,
                      `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
                  );
                });
            if (!error) {
              fs.unlinkSync(`./download/${basename}`);
              return replyToMessage(
                  ctx,
                  `${langs.kangSuccess.replace(
                      /\{packname\}/i,
                      packName,
                  )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
              );
            }
          }
        });
      });
    } else {
      let packName = `a${ctx.from.id}_by_${String(process.env.USERNAME).replace(/^\@/, '').trim()}`;
      let found: any = false;
      let packNum = 0;
      while (true) {
        try {
          let pack = await ctx.telegram.getStickerSet(packName);
          if (pack.stickers.length > 120) {
            packNum++;
            packName = `a${packNum}${ctx.from.id}_by_${String(process.env.USERNAME)
                .replace(/^\@/, '')
                .trim()}`;
          } else {
            found = pack;
            break;
          }
        } catch (error) {
          break;
        }
      }
      let url = await ctx.telegram.getFileLink(file_id);
      let basename = `kang${Date.now()}-${await path.basename(url.href)}.png`;
      let spl = ctx.message.text.split(' ');
      let emoji = '❤️';
      if (spl[1]) {
        emoji = spl[1];
      } else {
        if (ctx.message.reply_to_message.sticker?.emoji) {
          emoji = ctx.message.reply_to_message.sticker.emoji;
        }
      }
      https.get(url, async (res) => {
        let file = fs.createWriteStream(`./download/${basename}`);
        res.pipe(file);
        file.on('error', async (error) => {
          replyToMessage(
              ctx,
              `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
          );
          return reportError(error, ctx);
        });
        file.on('finish', async () => {
          if (found) {
            let error = false;
            let quality = 80;
            if (fs.statSync(`./download/${basename}`).size > 512000) {
              quality = 100 - (fs.statSync(`./download/${basename}`).size - 512000) / 100;
            }
            let metadata = await Lipo(`./download/${basename}`).metadata();
            let {width, height} = metadata;
            if (width && height < 512) {
              if (width > height) {
                let scale = 512 / width;
                width = 512;
                height = Math.floor(height * scale);
              } else {
                let scale = 512 / height;
                height = 512;
                width = Math.floor(width * scale);
              }
            } else {
              let [x, y] = await generateSize(metadata, [512, 512]);
              width = x;
              height = y;
            }
            await ctx.telegram
                .addStickerToSet(ctx.from.id, packName, {
                  png_sticker: {
                    source: await Lipo(`./download/${basename}`)
                        .resize({
                          width: width,
                          height: height,
                          // fit: 'contain',
                          // background: { r: 225, g: 225, b: 225, alpha: 0 }
                        })
                        .jpeg({
                          quality: quality,
                        })
                        .toBuffer(),
                  },
                  emojis: emoji,
                })
                .catch(async (e) => {
                  error = true;
                  fs.unlinkSync(`./download/${basename}`);
                  reportError(e, ctx);
                  return replyToMessage(
                      ctx,
                      `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
                  );
                });
            if (!error) {
              fs.unlinkSync(`./download/${basename}`);
              return replyToMessage(
                  ctx,
                  `${langs.kangSuccess.replace(
                      /\{packname\}/i,
                      packName,
                  )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
              );
            }
          } else {
            let error = false;
            let quality = 80;
            if (fs.statSync(`./download/${basename}`).size > 512000) {
              quality = 100 - (fs.statSync(`./download/${basename}`).size - 512000) / 100;
            }
            let metadata = await Lipo(`./download/${basename}`).metadata();
            let {width, height} = metadata;
            if (width && height < 512) {
              if (width > height) {
                let scale = 512 / width;
                width = 512;
                height = Math.floor(height * scale);
              } else {
                let scale = 512 / height;
                height = 512;
                width = Math.floor(width * scale);
              }
            } else {
              let [x, y] = await generateSize(metadata, [512, 512]);
              width = x;
              height = y;
            }
            await ctx.telegram
                .createNewStickerSet(
                    ctx.from.id,
                    packName,
                    `${ctx.from.first_name} Kang Pack Vol ${packNum + 1}`,
                    {
                      png_sticker: {
                        source: await Lipo(`./download/${basename}`)
                            .resize({
                              width: width,
                              height: height,
                              // fit: 'contain',
                              // background: { r: 255, g: 225, b: 255, alpha: 0 }
                            })
                            .jpeg({
                              quality: quality,
                            })
                            .toBuffer(),
                      },
                      emojis: emoji,
                    },
                )
                .catch(async (e) => {
                  error = true;
                  fs.unlinkSync(`./download/${basename}`);
                  reportError(e, ctx);
                  return replyToMessage(
                      ctx,
                      `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
                  );
                });
            if (!error) {
              fs.unlinkSync(`./download/${basename}`);
              return replyToMessage(
                  ctx,
                  `${langs.kangSuccess.replace(
                      /\{packname\}/i,
                      packName,
                  )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
              );
            }
          }
        });
      });
    }
  } catch (error) {
    replyToMessage(
        ctx,
        `${langs.kangError}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
    );
    return reportError(error, ctx);
  }
}
