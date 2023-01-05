import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'os';
import * as dotenv from 'dotenv';

import * as functions from 'firebase-functions';

import { Client } from '@line/bot-sdk';
import { ImageAnnotatorClient } from '@google-cloud/vision';

import { filterNonNullable, rmExistsFileAsync } from './libs/common';

dotenv.config();

const channelSecret = process.env.CHANNEL_SECRET;
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
const privateKey = process.env.PRIVATE_KEY;
const clientEmail = process.env.CLIENT_EMAIL;

export const lineWebhook = functions.https.onRequest(async (request, response) => {
  functions.logger.info('lineWebhook', { structuredData: true });

  if (!channelSecret || !channelAccessToken) {
    throw new Error('Enviroment Variable Not Setting');
  }

  // https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
  const events = request.body.events;
  functions.logger.info(events);

  const event = events[0];
  const messageId = event.message.id;
  const messageType = event.message.type;
  const messageText = event.message.text;
  const replyToken = event.replyToken;

  if (messageType === 'image') {
    const lineClient = new Client({
      channelSecret,
      channelAccessToken,
    });

    const visionClient = new ImageAnnotatorClient({
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
    });

    const downloadPath = path.join(os.tmpdir(), 'tmp.png');
    await rmExistsFileAsync(downloadPath);

    const stream = await lineClient.getMessageContent(messageId);
    await fs.writeFile(downloadPath, stream);

    const [result] = await visionClient.documentTextDetection(downloadPath);

    const annotations = result.textAnnotations;
    const innerTextArray = annotations?.map((e) => e.description).filter((e) => filterNonNullable(e)) ?? [''];
    const flatText = innerTextArray.reduce((t, c) => (t ?? '') + (c ?? '') + '\n', '');

    functions.logger.info(flatText);

    lineClient.replyMessage(replyToken, { type: 'text', text: `Replay:\n${flatText}` });
    rmExistsFileAsync(downloadPath);
  }

  response.status(200).json('ok');
});

export const testTextDetection = functions.https.onRequest(async (request, response) => {
  functions.logger.info('getMessage', { structuredData: true });

  if (!channelSecret || !channelAccessToken) {
    throw new Error('Enviroment Variable Not Setting');
  }

  const lineClient = new Client({
    channelSecret,
    channelAccessToken,
  });
  // const result = await lineClient.pushMessage('U213d831e5d15fa8588b87724a0f7ad4c', { type: 'text', text: 'hello world' });

  const visionClient = new ImageAnnotatorClient({
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
  });

  const messageId = '17420844161960';
  const rootDir = __dirname;
  const downloadPath = path.join(rootDir, 'tmp.png');
  await rmExistsFileAsync(downloadPath);
  functions.logger.info(downloadPath);

  const stream = await lineClient.getMessageContent(messageId);
  await fs.writeFile(downloadPath, stream);

  const [result] = await visionClient.documentTextDetection(downloadPath);

  const annotations = result.textAnnotations;
  const innerTextArray = annotations?.map((e) => e.description).filter((e) => filterNonNullable(e)) ?? [''];
  const flatText = innerTextArray.reduce((t, c) => (t ?? '') + (c ?? '') + '\n', '');

  functions.logger.info(flatText);

  response.status(200).json('ok');
});
