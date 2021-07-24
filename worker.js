import AMI from 'asterisk-manager';
import winston from 'winston';
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

const asterisk = new AMI(config.AMI_PORT,
  config.AMI_HOST, config.AMI_USERNAME, config.AMI_PASSWORD, true);
asterisk.keepConnected();

if (process.env.workerName === 'eventhandler') {
  logger.debug('Event handler started');

  const OKNumbers = [];

  asterisk.on('managerevent', (event) => {
    logger.debug(event);

    if (event.event === 'Hangup') {
      process.send({ decreaseCurrentCalls: true });
    }

    if ((event.event === 'Newstate' && (event.channelstate === config.CHANNELSTATE_RINGING || event.channelstate === config.CHANNELSTATE_UP))
    || (event.event === 'RTCPSent' && event.channelstatedesc === 'Up')) {
      logger.info(`${event.calleridnum} OK!`);

      asterisk.action({
        action: 'hangup',
        channel: event.channel,
      }, (err, res) => {
        if (err) logger.error(err);
        logger.debug(res);
      });

      if (!OKNumbers.includes(event.calleridnum)) {
        OKNumbers.push(event.calleridnum);
        fs.appendFile(config.OK_FILE, `${event.calleridnum}\n`, (err) => {
          if (err) logger.error(err);
        });
      }
    } else if (event.event === 'Hangup' && !OKNumbers.includes(event.calleridnum)) {
      logger.info(`${event.calleridnum} BAD!`);

      fs.appendFile(config.BAD_FILE, `${event.calleridnum}\n`, (err) => {
        if (err) logger.error(err);
      });
    }
  });
}

if (process.env.workerName === 'originator') {
  const data = JSON.parse(process.env.data);
  logger.debug(`Dialing number ${data.callerId}`);

  asterisk.action(data, (err, res) => {
    if (err) {
      fs.appendFile(config.BAD_FILE, `${data.callerId.toString()}\n`, (error) => {
        if (error) logger.error(data.callerId);
      });
      logger.error(err);
      process.send({ decreaseCurrentCalls: true });
    }
    logger.debug(res);
    return process.abort();
  });
}
