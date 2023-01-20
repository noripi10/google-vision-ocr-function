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

  const body = request.body;
  const headers = request.headers;
  functions.logger.info(body);

  // 署名検証
  // TODO test時はコメントにしないと通らない
  const stringBody = JSON.stringify(body);
  const signature = crypto.createHmac('SHA256', channelSecret).update(stringBody).digest('base64');
  if (headers['x-line-signature'] !== signature) {
    throw new Error('No signature');
  }

  // https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
  const events = request.body.events;
  if (!events) {
    response.status(400).send('Not found events');
    return;
  }

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

  // File Save Mode
  // await fs.writeFile(downloadPath, stream);
  // const [result] = await visionClient.documentTextDetection(downloadPath);

  // File Streaming Mode
  const content = await new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    stream.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', () => reject(new Error('file streaming error')));
  });
  const [result] = await visionClient.documentTextDetection({ image: { content } });

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
