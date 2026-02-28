const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (clientDsn) {
  void import('@sentry/nextjs').then((Sentry) => {
    const replaySessionSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || 0)
    const replayOnErrorSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE || 0.2)

    const integrations =
      replaySessionSampleRate > 0 || replayOnErrorSampleRate > 0
        ? [
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: true,
            }),
          ]
        : []

    Sentry.init({
      dsn: clientDsn,
      enabled: true,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      replaysSessionSampleRate: replaySessionSampleRate,
      replaysOnErrorSampleRate: replayOnErrorSampleRate,
      integrations,
    })
  })
}
