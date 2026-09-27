# Build with tools/reconciliation as the Railway service root/build context.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node run.mjs ./run.mjs
USER node
CMD ["node", "run.mjs"]
