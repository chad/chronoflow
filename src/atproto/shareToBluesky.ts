import type { Agent } from '@atproto/api';

export async function shareToBluesky(agent: Agent, patch: { name: string; uri: string }) {
  const url = `https://mosh.miren.club/?patch=${encodeURIComponent(patch.uri)}`;
  const text = `Check out my patch "${patch.name}" on Mosh!`;

  await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: url,
          title: patch.name,
          description: 'A modular synth patch on Mosh',
        },
      },
    },
  });
}
