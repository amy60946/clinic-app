// app.json'u olduğu gibi kullanır; yalnız web sitesi derlemesinde uygulama /app altında yayınlanır (site/build.sh).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.CLINICAPP_BASE_URL ? { baseUrl: process.env.CLINICAPP_BASE_URL } : {}),
  },
});
