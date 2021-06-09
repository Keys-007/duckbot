import Tesseract from 'tesseract.js';
import ocrSpace from 'ocr-space-api-wrapper';
import vision from '@google-cloud/vision';
import {GoogleAuth, grpc} from 'google-gax';
import {
  replyToMessage,
  getPing,
  getLang,
  buildArray,
  getCurrentLang,
  isAdmin,
  clearHTML,
  reportError,
} from './misc';
import https from 'https';
import fs from 'fs';
import path from 'path';
/*
// Because I still don't have the funds to activate billing on Google Vision. Then this feature is not available. If you want to donate an api key. please contact me.I am very grateful to you.

function getApiKeyCredentials() {
  let sslCreds = grpc.credentials.createSsl();
  let googleAuth = new GoogleAuth();
  let authClient = googleAuth.fromAPIKey(String(process.env.VISION));
  let credentials = grpc.credentials.combineChannelCredentials(
    sslCreds,
    grpc.credentials.createFromGoogleCredential(authClient)
  );
  return credentials;
}
let sslCreds = getApiKeyCredentials();
let visionClient = new vision.ImageAnnotatorClient({sslCreds})
*/
export async function tesseract(ctx) {
  let langs = await getLang(ctx);
  try {
    let c = await getPing(ctx);
    let spl = ctx.message.text.split(' ');
    let langOcr = spl[1] || 'eng';
    let onlyLang = [
      'afr',
      'amh',
      'ara',
      'asm',
      'aze',
      'aze_cyrl',
      'bel',
      'ben',
      'bod',
      'bos',
      'bul',
      'cat',
      'ceb',
      'ces',
      'chi_sim',
      'chi_tra',
      'chr',
      'cym',
      'dan',
      'deu',
      'dzo',
      'ell',
      'eng',
      'enm',
      'epo',
      'est',
      'eus',
      'fas',
      'fin',
      'fra',
      'frk',
      'frm',
      'gle',
      'glg',
      'grc',
      'guj',
      'hat',
      'heb',
      'hin',
      'hrv',
      'hun',
      'iku',
      'ind',
      'isl',
      'ita',
      'ita_old',
      'jav',
      'jpn',
      'kan',
      'kat',
      'kat_old',
      'kaz',
      'khm',
      'kir',
      'kor',
      'kur',
      'lao',
      'lat',
      'lav',
      'lit',
      'mal',
      'mar',
      'mkd',
      'mlt',
      'msa',
      'mya',
      'nep',
      'nld',
      'nor',
      'ori',
      'pan',
      'pol',
      'por',
      'pus',
      'ron',
      'rus',
      'san',
      'sin',
      'slk',
      'slv',
      'spa',
      'spa_old',
      'sqi',
      'srp',
      'srp_latn',
      'swa',
      'swe',
      'syr',
      'tam',
      'tel',
      'tgk',
      'tgl',
      'tha',
      'tir',
      'tur',
      'uig',
      'ukr',
      'urd',
      'uzb',
      'uzb_cyrl',
      'vie',
      'yid',
    ];
    if (!ctx.message.reply_to_message) {
      return replyToMessage(ctx, langs.ocrReply, false);
    }
    if (!ctx.message.reply_to_message.photo) {
      return replyToMessage(ctx, langs.ocrReply, false);
    }
    if (!onlyLang.includes(langOcr)) {
      return replyToMessage(ctx, langs.orcLangN.replace(/\{langs\}/i, langOcr), false);
    }
    let msg = await replyToMessage(
        ctx,
        `${langs.ocrLoading.replace(
            /\{langs\}/i,
            langOcr,
        )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
    );
    let file_id =
      ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id;
    let url = await ctx.telegram.getFileLink(file_id);
    let file_name = `${Date.now()}.${await path.basename(url.href)}`;
    https.get(url, async (res) => {
      let file = fs.createWriteStream(`./ocr/${file_name}`);
      res.pipe(file);
      file.on('error', async (error) => {
        return replyToMessage(ctx, langs.ocrError, false);
      });
      file.on('finish', async () => {
        try {
          let data = await Tesseract.recognize(`./ocr/${file_name}`, langOcr);
          let ocrText = `${langs.ocrSuccess.replace(/\{langs\}/i, langOcr)}\n${await clearHTML(
              data.data.text,
          )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`;
          /* {logger: m => {
            ctx.telegram.editMessageText(msg.chat.id,msg.message_id,undefined,`${langs.ocrLoading.replace(/\{langs\}/i,langOcr)}\nStatus: ${m.status}`,{parse_mode:"HTML"})
          }}*/
          fs.unlinkSync(`./ocr/${file_name}`);
          if (ocrText.length > 4096) {
            let filename = `ocr-${file_name}.txt`;
            fs.writeFileSync(`./ocr/${filename}`, ocrText);
            ctx.deleteMessage(msg.message_id);
            ctx.replyWithDocument(
                {
                  source: `./ocr/${filename}`,
                },
                {
                  reply_to_message: ctx.message.message_id,
                },
            );
            return fs.unlinkSync(`./ocr/${filename}`);
          } else {
            return ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, ocrText, {
              parse_mode: 'HTML',
            });
          }
        } catch (error) {
          return ctx.editMessageText(msg.message_id, undefined, langs.ocrError);
        }
      });
    });
  } catch (error) {
    replyToMessage(ctx, langs.ocrError, false);
    return reportError(error, ctx);
  }
}
export async function ocr(ctx) {
  let langs = await getLang(ctx);
  try {
    let c = await getPing(ctx);
    if (!ctx.message.reply_to_message) {
      return replyToMessage(ctx, langs.ocrReply, false);
    }
    if (!ctx.message.reply_to_message.photo) {
      return replyToMessage(ctx, langs.ocrReply, false);
    }
    let msg = await replyToMessage(
        ctx,
        `${langs.ocrLoading.replace(
            /\{langs\}/i,
            'auto',
        )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
        false,
    );
    let file_id =
      ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id;
    let url = await ctx.telegram.getFileLink(file_id);
    let file_name = `${Date.now()}.${await path.basename(url.href)}`;
    https.get(url, async (res) => {
      let file = fs.createWriteStream(`./ocr/${file_name}`);
      res.pipe(file);
      file.on('error', async (error) => {
        return replyToMessage(ctx, langs.ocrError, false);
      });
      file.on('finish', async () => {
        try {
          let ocrText = `${langs.ocrSuccess.replace(/\{langs\}/i, 'auto')}`;
          let ocrRes = '';
          let data = await ocrSpace(`./ocr/${file_name}`, {
            apiKey: String(process.env.OCR_API),
          });
          data.ParsedResults.forEach((item, index) => {
            let ParsedText = item.ParsedText || '';
            ocrRes += `\n${ParsedText.trim()}`;
          });
          ocrText += await clearHTML(ocrRes);
          ocrText += `\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`;
          fs.unlinkSync(`./ocr/${file_name}`);
          if (ocrText.length > 4096) {
            let filename = `ocr-${file_name}.txt`;
            fs.writeFileSync(`./ocr/${filename}`, ocrText);
            ctx.deleteMessage(msg.message_id);
            ctx.replyWithDocument(
                {
                  source: `./ocr/${filename}`,
                },
                {
                  reply_to_message: ctx.message.message_id,
                },
            );
            return fs.unlinkSync(`./ocr/${filename}`);
          } else {
            return ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, ocrText, {
              parse_mode: 'HTML',
            });
          }
        } catch (error) {
          return ctx.editMessageText(msg.message_id, undefined, langs.ocrError, {
            parse_mode: 'HTML',
          });
        }
      });
    });
  } catch (error) {
    replyToMessage(ctx, langs.ocrError, false);
    return reportError(error, ctx);
  }
}
/*
// Because I still don't have the funds to activate billing on Google Vision. Then this feature is not available. If you want to donate an api key. please contact me.I am very grateful to you.

export async function ocrVision(ctx){
  let langs = await getLang(ctx)
  try {
    let c = await getPing(ctx)
    if (!ctx.message.reply_to_message) {
      return replyToMessage(ctx, langs.ocrReply, false)
    }
    if (!ctx.message.reply_to_message.photo) {
      return replyToMessage(ctx, langs.ocrReply, false)
    }
    let msg = await replyToMessage(
      ctx,
      `${langs.ocrLoading.replace(
        /\{langs\}/i,
        'auto'
      )}\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`,
      false
    )
    let file_id =
      ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id
    let url = await ctx.telegram.getFileLink(file_id)
    let file_name = `${Date.now()}.${await path.basename(url.href)}`
    https.get(url, async (res) => {
      let file = fs.createWriteStream(`./ocr/${file_name}`)
      res.pipe(file)
      file.on('error', async (error) => {
        return replyToMessage(ctx, langs.ocrError, false)
      })
      file.on('finish', async () => {
        try {
          let [results] = await visionClient.textDetection(`./ocr/${file_name}`)
          let data = results.textAnnotations
          let ocrText = `${langs.ocrSuccess.replace(/\{langs\}/i, 'auto')}`
          let ocrRes = data[0].description
//          data.forEach((textRes)=>{
//            ocrRes += textRes.description
//          })
          ocrText += await clearHTML(ocrRes)
          ocrText += `\n⏱ <code>${c}</code> | ⏳ <code>${await getPing(ctx)}</code>`
          fs.unlinkSync(`./ocr/${file_name}`)
          if (ocrText.length > 4096) {
            let filename = `ocr-${file_name}.txt`
            fs.writeFileSync(`./ocr/${filename}`, ocrText)
            ctx.deleteMessage(msg.message_id)
            ctx.replyWithDocument(
              {
                source: `./ocr/${filename}`,
              },
              {
                reply_to_message: ctx.message.message_id,
              }
            )
            return fs.unlinkSync(`./ocr/${filename}`)
          } else {
            return ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, ocrText, {
              parse_mode: 'HTML',
            })
          }
        } catch (error) {
          return ctx.editMessageText(msg.message_id, undefined, langs.ocrError, {
            parse_mode: 'HTML',
          })
        }
      })
    })
  } catch (error) {
    replyToMessage(ctx, langs.ocrError, false)
    return reportError(error, ctx)
  }
}*/
