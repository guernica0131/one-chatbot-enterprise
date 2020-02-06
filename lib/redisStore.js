const config = require("config");
const One = require("./one");

const REDIS_URL = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : config.get("redisUrl");

const REDIS_PREFIX = process.env.REDIS_PREFIX
  ? process.env.REDIS_URL
  : config.get("redisPrefix");

const redis = require("redis"),
  client = redis.createClient({
    host: REDIS_URL,
    prefix: REDIS_PREFIX
  });

const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

const getKey = event => {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const key = `${senderID}/${recipientID}`;
  return key;
};

module.exports = {
  nextQuestion: async (event, survey) => {
    // now build the question types based on the
    // params
  },
  getKey: getKey,
  get: async event => {
    const key = getKey(event);
    let session = await getAsync(key);
    if (!session) {
      const sessionDetails = await One.startSession(event);
      session = await startSession(sessionDetails, key);
    }
    const parsed = JSON.parse(session);
    return parsed;
  }
};

async function startSession(sessionDetails, key) {
  const index = 0;
  sessionDetails.sessionKey = key;
  sessionDetails.questionIndex = index;
  const storage = JSON.stringify(sessionDetails);
  const session = await setAsync(key, storage);

  if (session === "OK") {
    return storage;
  }
  throw new Error("CANT CREATE A SESSION");
}
