import cluster from 'cluster';

import { Call } from './modules/Calls.class';
import { Event } from './types/Event';

(async () => {
  const config = Call.initConfig();

  const readFileParams = Call.generateReadFileParams();
  const phoneNumbers = await Call.parseNumbersFromConfig(readFileParams);

  Call.setupCluster(cluster);

  const workerInitialDataForEventHandler = { workerName: 'eventHandler' };
  const eventHandler = Call.createEventHandler(workerInitialDataForEventHandler);

  Call.addListener(eventHandler, Event.message, Call.messageHandler);

  const maxConcurrentCalls = parseInt(config.MAX_CONCURRENT_CALLS as string);
  Call.sendCalls(phoneNumbers, maxConcurrentCalls);
})();
