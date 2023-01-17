import { beforeAll, describe, expect, jest, test } from '@jest/globals';
import axios, { AxiosResponse, isAxiosError } from 'axios';

import { getEnv } from '../utils/common';

jest.mock('axios');

describe('functions test', () => {
  describe('greet実行', () => {
    let res = {} as AxiosResponse;
    beforeAll(async () => {
      res = await axios.get('http://localhost:5001/vision-ocr-d46ac/us-central1/greet');
    });

    test('レスポンスOK', () => {
      expect(res.status).toBe(200);
    });
  });

  describe('lineWebhook実行', () => {
    test('環境変数が正しくセットされている', () => {
      const { channelSecret, channelAccessToken, privateKey, clientEmail } = getEnv();
      expect(channelSecret).toBeDefined();
      expect(channelAccessToken).toBeDefined();
      expect(privateKey).toBeDefined();
      expect(clientEmail).toBeDefined();
    });

    test('eventタイプがimage以外は処理しない', async () => {
      try {
        await axios.post(
          'http://localhost:5001/vision-ocr-d46ac/us-central1/lineWebhook',
          {
            events: [
              {
                message: {
                  id: 1,
                  type: 'text',
                  text: 'text',
                  replyToken: 'token',
                },
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (e) {
        if (isAxiosError(e)) {
          expect(e.response?.status).toBe(400);
        }
      }
    });
  });
});
