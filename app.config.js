const base = require('./app.json');

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
    },
  },
};
