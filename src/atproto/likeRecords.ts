import type { Agent } from '@atproto/api';

export async function likePatch(agent: Agent, uri: string, cid: string) {
  return agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: 'club.miren.mosh.like',
    record: {
      $type: 'club.miren.mosh.like',
      subject: { uri, cid },
      createdAt: new Date().toISOString(),
    },
  });
}

export async function unlikePatch(agent: Agent, likeRkey: string) {
  return agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: 'club.miren.mosh.like',
    rkey: likeRkey,
  });
}
