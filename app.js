import winston from 'winston';
import cluster from 'cluster';
import fs from 'fs';
import dotenv from 'dotenv';

const config = dotenv.config().parsed;

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.logstash(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: config.LOG_FILE }),
    new winston.transports.Console(),
  ],
});

logger.debug(`Starting with config: ${JSON.stringify(config)}`);

let currentCalls = 0;
let numbers;

try {
  numbers = fs.readFileSync(config.NUMBERS_FILE, 'utf8').toString().split('\n').map((number) => parseInt(number, 10));
} catch (err) {
  logger.error(`Numbers file read error: ${err.message}`);
  process.exit(1);
}

const sendCalls = async (callsQuantity) => {
  const slicedNumbers = numbers.slice(0, callsQuantity);
  slicedNumbers.forEach((number) => {
    const originator = cluster.fork({
      workerName: 'originator',
      data: JSON.stringify({
        action: 'originate',
        channel: `${config.SIP_PROTOCOL + number}@${config.SIP_TRUNK_NAME}`,
        application: 'Hangup',
        callerId: number,
      }),
    });
    originator.on('message', (msg) => {
      if (msg.decreaseCurrentCalls) {
        logger.debug(`Decreasing currentCalls, current value: ${currentCalls}`);
        currentCalls -= 1;
        sendCalls(config.MAX_CONCURRENT_CALLS - currentCalls);
      }
    });
    currentCalls += 1;
  });
  numbers.splice(0, callsQuantity);
  return true;
};

cluster.setupMaster({
  exec: 'worker.js',
});
const eventhandler = cluster.fork({ workerName: 'eventhandler' });

eventhandler.on('message', (msg) => {
  if (msg.decreaseCurrentCalls) {
    logger.debug(`Decreasing currentCalls, current value: ${currentCalls}`);
    currentCalls -= 1;
    sendCalls(config.MAX_CONCURRENT_CALLS - currentCalls);
  }
});

sendCalls(config.MAX_CONCURRENT_CALLS);
