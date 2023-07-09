import cluster, { Worker, Cluster } from 'cluster';
import fs from 'fs';
import dotenv, { DotenvParseOutput } from 'dotenv';

import { WorkerInitialData } from '../types/WorkerInitialData';
import { ChannelData, SIPProtocol } from '../types/ChannelData';
import { Event } from '../types/Event';
import { ReadFileParams } from '../types/ReadFileParams';
import { logger } from '../misc/logger';
import { WorkerApplication } from '../types/WorkerApplication';
import { WorkerAction } from '../types/WorkerAction';
import { MessageEvent } from '../types/MessageEvent';

class Call {
  static currentCalls = 0;
  static config = dotenv.config().parsed;

  static initConfig = (): DotenvParseOutput => {
    if (!Call.config) {
      logger.error(`Can't parse config file — please check your .env file`);
      process.exit(1);
    }
    return Call.config;
  };

  static generateReadFileParams = (): ReadFileParams => {
    const config = Call.initConfig();
    return {
      path: config.NUMBERS_FILE as string,
      options: { encoding: null }
    };
  };

  static parseNumbersFromConfig = async (params: ReadFileParams): Promise<number[]> => {
    try {
      const fileBuffer = await fs.promises.readFile(params.path, params.options);
      return fileBuffer
        .toString()
        .split('\n')
        .map(phoneNumber => parseInt(phoneNumber, 10));
    } catch (err) {
      logger.error(`Can't read phone numbers from file: ${err.message}`);
      process.exit(1);
    }
  };

  static formChannelString = (channelData: ChannelData): string =>
    `${channelData.sipProtocol + channelData.phoneNumber}@${channelData.trunkName}`;

  static forkWorker = (workerInitialData: WorkerInitialData): Worker => {
    return cluster.fork({
      workerName: workerInitialData.workerName,
      data: JSON.stringify({
        action: workerInitialData.data.action,
        channel: workerInitialData.data.channel,
        application: workerInitialData.data.application,
        callerId: workerInitialData.data.callerId
      })
    });
  };

  static createEventHandler = (workerInitialData: Partial<WorkerInitialData>): Worker =>
    cluster.fork({ workerName: workerInitialData.workerName });

  static addListener = (worker: Worker, eventName: Event, listener: (...args: unknown[]) => void): Worker => {
    return worker.on(eventName, listener);
  };

  static generateWorkerInitialDataForCallOrigination = (phoneNumber: number): WorkerInitialData => {
    if (!Call.config) {
      logger.error(`Can't parse config file — please check your .env file`);
      process.exit(1);
    }
    return {
      workerName: 'originator',
      data: {
        action: 'originate' as WorkerAction,
        channel: Call.formChannelString({
          sipProtocol: Call.config.SIP_PROTOCOL as SIPProtocol,
          trunkName: Call.config.SIP_TRUNK_NAME as string,
          phoneNumber
        }),
        application: 'Hangup' as WorkerApplication,
        callerId: phoneNumber
      }
    };
  };

  static messageHandler = async (message: MessageEvent) => {
    if (message.decreaseCurrentCalls) {
      const config = Call.initConfig();
      const readFileParams = Call.generateReadFileParams();

      const phoneNumbers = await Call.parseNumbersFromConfig(readFileParams);
      logger.debug(`Decreasing currentCalls, current value: ${Call.currentCalls}`);
      Call.currentCalls -= 1;
      Call.sendCalls(phoneNumbers, parseInt(config.MAX_CONCURRENT_CALLS as string, 10) - Call.currentCalls);
    }
  };

  static sendCalls = (phoneNumbers: number[], callsQuantity: number): boolean => {
    const slicedPhoneNumbers = phoneNumbers.slice(0, callsQuantity);
    for (const phoneNumber of slicedPhoneNumbers) {
      const workerInitialData = Call.generateWorkerInitialDataForCallOrigination(phoneNumber);
      let originator = Call.forkWorker(workerInitialData);
      originator = Call.addListener(originator, Event.message, Call.messageHandler);

      Call.currentCalls += 1;
    }
    phoneNumbers.splice(0, callsQuantity);
    return true;
  };

  static setupCluster = (cluster: Cluster): void => {
    cluster.setupPrimary({ exec: 'worker.ts' });
  };
}

export { Call };
