import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'os';

import * as crypto from 'crypto';

import * as functions from 'firebase-functions';

import { Client } from '@line/bot-sdk';
import { ImageAnnotatorClient } from '@google-cloud/vision';

import { getEnv, rmExistsFileAsync } from './utils/common';

export const greet = functions.https.onRequest((_, response) => {
  response.status(200).send('hello world');
});

export const lineWebhook = functions.https.onRequest(async (request, response) => {
  functions.logger.info('lineWebhook', { structuredData: true });

  const { channelSecret, channelAccessToken, privateKey, clientEmail } = getEnv();
  if (!channelSecret || !channelAccessToken || !privateKey || !clientEmail) {
    response.status(500).send('Not set servece keys');
    return;
  }

  // 署名検証
  const body = request.body;
  const headers = request.headers;
  const signature = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');
  if (headers['x-line-signature'] !== signature) {
    throw new Error('No signature');
  }

  // https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
  const events = request.body.events;
  if (!events) {
    response.status(400).send('Not found events');
    return;
  }

  functions.logger.info(events);

  const event = events[0];
  const messageId = event.message.id;
  const messageType = event.message.type;
  // const messageText = event.message.text;
  const replyToken = event.replyToken;

  if (messageType !== 'image') {
    functions.logger.warn('Not image type message');
    response.status(400).send('Not image type message');
    return;
  }

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
  functions.logger.info(result);

  // const annotations = result.textAnnotations;
  // const innerTextArray = annotations?.map((e) => e.description).filter((e) => filterNonNullable(e)) ?? [''];
  // const flatText = innerTextArray.reduce((t, c) => (t ?? '') + (c ?? '') + '\n', '');
  // functions.logger.info(flatText);

  const fullText = result.fullTextAnnotation?.text ?? '';

  lineClient.replyMessage(replyToken, { type: 'text', text: `【解析結果】\n${fullText}` });
  rmExistsFileAsync(downloadPath);

  response.status(200).send('OK');
});
