import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'os';

import * as functions from 'firebase-functions';

import { Client } from '@line/bot-sdk';
import { ImageAnnotatorClient } from '@google-cloud/vision';

import { filterNonNullable, getEnv, rmExistsFileAsync } from './utils/common';

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

  // https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
  const events = request.body.events;
  functions.logger.info(events);

  const event = events[0];
  const messageId = event.message.id;
  const messageType = event.message.type;
  // const messageText = event.message.text;
  const replyToken = event.replyToken;

  if (messageType !== 'image') {
    functions.logger.info('Not image type message');
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

  const annotations = result.textAnnotations;
  const innerTextArray = annotations?.map((e) => e.description).filter((e) => filterNonNullable(e)) ?? [''];
  const flatText = innerTextArray.reduce((t, c) => (t ?? '') + (c ?? '') + '\n', '');

  functions.logger.info(flatText);

  lineClient.replyMessage(replyToken, { type: 'text', text: `Replay:\n${flatText}` });
  rmExistsFileAsync(downloadPath);

  response.status(200).send('OK');
});
